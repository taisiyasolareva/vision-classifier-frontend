import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiDocsUrl,
  fetchHealthz,
  predictImage,
  type Prediction,
} from "./lib/api";

type Status = "idle" | "loading" | "success" | "error";

function pct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function anonymizedLabel(p: Prediction): string {
  // Intentionally avoids leaking dataset names (mirrors "unknown taxonomy" reality).
  return `Category ${pad3(p.class_id)}`;
}

function relativeConfidenceTier(args: {
  top1: number;
  top2: number | null;
  topKSum: number;
}): { regime: "Confident" | "Mixed" | "Ambiguous"; reason: string } {
  const share = args.topKSum > 0 ? args.top1 / args.topKSum : args.top1;
  const margin = args.top2 == null ? 0 : args.top1 - args.top2;

  // Heuristic: communicate strength without anchoring on tiny raw softmax values.
  if (share >= 0.55 || margin >= 0.15) {
    return {
      regime: "Confident",
      reason: "Clear separation from other likely classes.",
    };
  }
  if (share >= 0.40 || margin >= 0.07) {
    return {
      regime: "Mixed",
      reason: "Multiple classes remain plausible under uncertainty.",
    };
  }
  return {
    regime: "Ambiguous",
    reason: "Several classes exhibit comparable likelihood.",
  };
}

function regimeClass(regime: "Confident" | "Mixed" | "Ambiguous"): string {
  if (regime === "Confident") return "regime regime--confident";
  if (regime === "Mixed") return "regime regime--mixed";
  return "regime regime--ambiguous";
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgInfo, setImgInfo] = useState<{ w: number; h: number } | null>(null);
  const [topK, setTopK] = useState<number>(5);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [inferenceMode, setInferenceMode] = useState<"fast" | "deterministic">(
    "fast",
  );

  const [healthStatus, setHealthStatus] = useState<Status>("idle");
  const [healthText, setHealthText] = useState<string>("");

  const [predictStatus, setPredictStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState<string>("");
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);

  const docs = apiDocsUrl();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setImgInfo(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Load dimensions for a subtle "preprocessing awareness" cue.
    const img = new Image();
    img.onload = () => setImgInfo({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImgInfo(null);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    // Health check on load (and when API_BASE changes).
    const ac = new AbortController();
    setHealthStatus("loading");
    setHealthText("Checking service…");
    fetchHealthz(ac.signal)
      .then((h) => {
        const ok = Boolean(h.artifact_ok);
        setHealthStatus(ok ? "success" : "error");
        setHealthText(
          ok
            ? "Online — model artifact loaded"
            : "Online — model artifact not ready",
        );
      })
      .catch((e) => {
        setHealthStatus("error");
        setHealthText(String(e?.message || e));
      });
    return () => ac.abort();
  }, []);

  const topPrediction = useMemo(() => predictions?.[0] ?? null, [predictions]);
  const topConfidence = useMemo(() => topPrediction?.confidence ?? 0, [topPrediction]);
  const otherPredictions = useMemo(
    () => (predictions ? predictions.slice(1) : null),
    [predictions],
  );

  const confidenceMeta = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    const top1 = predictions[0]!.confidence;
    const top2 = predictions.length > 1 ? predictions[1]!.confidence : null;
    const sum = predictions.reduce((acc, p) => acc + p.confidence, 0);
    return relativeConfidenceTier({ top1, top2, topKSum: sum });
  }, [predictions]);

  const systemStatusLine = useMemo(() => {
    if (healthStatus === "loading") return "🟡 Inference service checking…";
    if (healthStatus === "success") return "🟢 Inference service online · model loaded";
    return "🔴 Inference service degraded · check connectivity/model";
  }, [healthStatus]);

  async function onClassify() {
    if (!file) return;
    setPredictStatus("loading");
    setErrorText("");
    setPredictions(null);

    try {
      const res = await predictImage({ file, topK });
      setPredictions(res.predictions);
      setPredictStatus("success");
    } catch (e: any) {
      setErrorText(String(e?.message || e));
      setPredictStatus("error");
    }
  }

  function onPickAnother() {
    setFile(null);
    setPredictions(null);
    setPredictStatus("idle");
    setErrorText("");
    setShowRaw(false);
    inputRef.current?.click();
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header__brand">
          <div className="logo">VR</div>
          <div>
            <h1 className="t1">Production Computer Vision: 200‑Class Image Classification</h1>
            <p className="subtitle t4">Reproducible training + disciplined experiments + TorchScript export + FastAPI serving + React demo.</p>
          </div>
        </div>

        <nav className="header__links" aria-label="Project links">
          <a className="link t4" href="https://vision-classifier-ui.vercel.app/" target="_blank" rel="noreferrer">Live Demo</a>
          <span className="muted">·</span>
          <a className="link t4" href={docs || "#"} target="_blank" rel="noreferrer">API Docs</a>
        </nav>
      </header>

      <main className="grid">
        <section className="card card--light">
          <h2 className="t2">Input</h2>
          <p className="t3">
            Benchmarking model selection under label ambiguity.{" "}
            <span
              className="info t4"
              title="This project focuses on model selection and tuning under label ambiguity, mirroring real-world non-curated datasets."
            >
              ℹ
            </span>
          </p>

          <div className="upload">
            <input
              ref={inputRef}
              className="file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPredictions(null);
                setPredictStatus("idle");
                setErrorText("");
              }}
            />

            {previewUrl ? (
              <div className="preview">
                <div className="preview__captionRow">
                  <div className="preview__caption t4 caps">Uploaded sample</div>
                  {imgInfo ? (
                    <div className="preview__meta t5">
                      {imgInfo.w}×{imgInfo.h} → resized to model input
                    </div>
                  ) : (
                    <div className="preview__meta t5">—</div>
                  )}
                </div>
                <img src={previewUrl} alt="Uploaded sample preview" />
              </div>
            ) : (
              <div className="preview preview--empty">
                <div>
                  <div className="preview__title t3">No image selected</div>
                  <div className="t5">Pick a JPG/PNG/WebP to begin.</div>
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <label className="field">
              <span className="field__label t4 caps">Top‑k</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              >
                {[1, 3, 5, 10].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="field fieldset">
              <legend className="field__label t4 caps">Inference mode</legend>
              <label className="radio t3">
                <input
                  type="radio"
                  name="mode"
                  checked={inferenceMode === "fast"}
                  onChange={() => {
                    setInferenceMode("fast");
                    // Small, real effect (not deceptive): bias toward faster UI output.
                    setTopK((k) => (k > 5 ? 5 : k));
                  }}
                />
                Low‑latency
              </label>
              <label className="radio t3">
                <input
                  type="radio"
                  name="mode"
                  checked={inferenceMode === "deterministic"}
                  onChange={() => {
                    setInferenceMode("deterministic");
                    setTopK((k) => (k < 5 ? 5 : k));
                  }}
                />
                Deterministic (eval)
              </label>
              <div className="fieldset__hint t5">
                Preset affects request size (top‑k) and display.
              </div>
            </fieldset>

            <button
              className="btn btn--primary"
              onClick={onClassify}
              disabled={!file || predictStatus === "loading"}
            >
              {predictStatus === "loading" ? "Classifying…" : "Classify"}
            </button>

            <button
              className="btn btn--text"
              onClick={onPickAnother}
              disabled={!file}
            >
              Choose a different image
            </button>
          </div>

          {healthText ? (
            <div className="note" data-status={healthStatus}>
              {healthText}
            </div>
          ) : null}

          <div className="subtle">
            <div className="muted">
              Labels are intentionally anonymized to reflect unknown/ambiguous
              taxonomies.
            </div>
          </div>
        </section>

        <section className="card card--heavy">
          <div className="quietBlock">
            <div className="quietBlock__title t4 caps">System status</div>
            <div className="quietBlock__body t3">{systemStatusLine}</div>
          </div>

          <div className="quietBlock">
            <div className="quietBlock__title t4 caps">Interpretation note</div>
            <div className="quietBlock__body t5">
              Label taxonomy is intentionally anonymized to reflect non‑curated data.
            </div>
          </div>

          <h2 className="t2">Model output</h2>

          {predictStatus === "idle" ? (
            <p className="t3">Upload an image and click “Classify”.</p>
          ) : null}

          {predictStatus === "error" ? (
            <div className="error">
              <div className="error__title t3">Request failed</div>
              <div className="error__body t3">{errorText}</div>
              <div className="error__hint t5">
                If you see a CORS error in the browser console, the HF API needs
                to allow your UI origin.
              </div>
            </div>
          ) : null}

          {predictStatus === "loading" ? (
            <div className="skeleton">
              <div className="skeleton__bar" />
              <div className="skeleton__bar" />
              <div className="skeleton__bar" />
            </div>
          ) : null}

          {predictStatus === "success" && predictions ? (
            <div className="results">
              {topPrediction ? (
                <div className="top top--primary">
                  <div className="top__label t4 caps">Top prediction</div>
                  <div className="top__name t3 accentText">
                    {anonymizedLabel(topPrediction)}
                  </div>

                  <div className="top__label t4 caps">Confidence regime</div>
                  <div className="top__oneLine t3">
                    {confidenceMeta ? (
                      <span className={regimeClass(confidenceMeta.regime)}>
                        {confidenceMeta.regime}
                      </span>
                    ) : (
                      <span className="t4">—</span>
                    )}{" "}
                    <span className="t5">·</span>{" "}
                    <span className="t4 caps">Rank</span> 1 / 200
                  </div>

                  {confidenceMeta ? (
                    <div className="top__reason t5">{confidenceMeta.reason}</div>
                  ) : null}

                  <div className="toggleRow">
                    <label className="toggle t5">
                      <input
                        type="checkbox"
                        checked={showRaw}
                        onChange={(e) => setShowRaw(e.target.checked)}
                      />
                      <span>Show raw probabilities</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="sectionTitle t4 caps">Other high‑likelihood categories</div>
              <div className="micro t5">Ordered by relative likelihood</div>

              {otherPredictions && otherPredictions.length > 0 ? (
                <div className="table">
                  {otherPredictions.map((p, i) => (
                    <div className="row" key={`${p.class_id}-${i}`}>
                      <div className="row__name t3">{anonymizedLabel(p)}</div>
                      {showRaw ? (
                        <div className="row__pct t4">{pct(p.confidence)}</div>
                      ) : (
                        <div className="row__pct muted" aria-hidden="true">
                          {" "}
                        </div>
                      )}
                      <div className="row__bar">
                        <div
                          className="row__barFill"
                          style={{
                            // Relative strength vs top prediction (better perception than raw softmax).
                            width: `${Math.round(
                              topConfidence > 0
                                ? (p.confidence / Math.max(1e-9, topConfidence)) * 100
                                : 0,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t5">No secondary predictions returned.</p>
              )}

              {showRaw ? (
                <div className="rawBox">
                  <div className="rawBox__title t4 caps">Raw probabilities (top‑k)</div>
                  <div className="rawGrid">
                    {predictions.map((p, i) => (
                      <div className="rawRow" key={`${p.class_id}-${i}`}>
                        <div className="rawRow__label t3">{anonymizedLabel(p)}</div>
                        <div className="rawRow__val t4">{pct(p.confidence)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <hr className="hr" />

          <h2 className="t2">Model summary</h2>
          <div className="summary summary--bullets">
            <div className="summaryLine">
              <span className="summaryLine__k t4 caps">Classes</span>
              <div className="summaryLine__v t3">200 (unknown taxonomy)</div>
            </div>
            <div className="summaryLine">
              <span className="summaryLine__k t4 caps">Held‑out validation (best‑so‑far)</span>
              <div className="summaryLine__v t3">
                Top‑1: <strong>86.36%</strong> <span className="t5">·</span> Top‑5:{" "}
                <strong>96.75%</strong> <span className="t5">(run completion tracked)</span>
              </div>
            </div>
            <div className="summaryLine">
              <span className="summaryLine__k t4 caps">Training strategy</span>
              <div className="summaryLine__v t3">
                Transfer learning with progressive unfreezing
              </div>
            </div>
            <div className="summaryLine">
              <span className="summaryLine__k t4 caps">Serving</span>
              <div className="summaryLine__v t3">TorchScript (CPU‑optimized); CPU p50 ~37 ms per image (FastAPI, local benchmark)</div>
            </div>
          </div>

          <details className="decisions">
            <summary className="t2">Design decisions</summary>
            <div className="decisions__body">
              <ul className="bullets t3">
                <li>CPU‑first inference for predictable latency</li>
                <li>Shared preprocessing between training and inference</li>
                <li>TorchScript selected for portability and cold‑start stability</li>
              </ul>
            </div>
          </details>
        </section>
      </main>

      <footer className="footer">
        <details className="details">
          <summary className="t4 caps">Technical details</summary>
          <div className="details__body">
            <div className="t5">
              The UI is statically hosted; inference runs behind a dedicated
              service to isolate model lifecycle and latency characteristics.
            </div>
          </div>
        </details>

        <div className="devFooter t5">
          <a className="link link--muted" href="https://vision-classifier-ui.vercel.app/" target="_blank" rel="noreferrer">
            Live Demo
          </a>
          <span className="devFooter__sep">·</span>
          {docs ? (
            <a className="link link--muted" href={docs} target="_blank" rel="noreferrer">
              API Docs
            </a>
          ) : (
            <span>API Docs</span>
          )}
          <span className="devFooter__sep">·</span>
          <span>
            Deployment: <code>VITE_API_URL</code>
          </span>
        </div>
      </footer>
    </div>
  );
}

