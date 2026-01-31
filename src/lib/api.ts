export type HealthzResponse = {
  status: string;
  artifact_dir?: string | null;
  artifact_ok?: boolean;
};

export type Prediction = {
  class_name: string;
  confidence: number; // 0..1
  class_id: number;
};

export type PredictResponse = {
  top_k: number;
  predictions: Prediction[];
};

function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  const cleaned = configured?.replace(/\/+$/, "");

  // Dev: always call the local Vite proxy to avoid browser CORS.
  if (import.meta.env.DEV) return "/api";

  // Prod: require a real API base URL (e.g. your HF Space).
  if (!cleaned) {
    throw new Error(
      "Missing VITE_API_URL. Set it to your API base URL (e.g. https://<your-space>.hf.space).",
    );
  }

  return cleaned;
}

export const API_BASE = getApiBase();

export function apiDocsUrl(): string | null {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  return configured ? `${configured.replace(/\/+$/, "")}/docs` : null;
}

export async function fetchHealthz(signal?: AbortSignal): Promise<HealthzResponse> {
  const res = await fetch(`${API_BASE}/healthz`, { signal });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return (await res.json()) as HealthzResponse;
}

export async function predictImage(args: {
  file: File;
  topK: number;
  signal?: AbortSignal;
}): Promise<PredictResponse> {
  const fd = new FormData();
  fd.append("file", args.file);
  fd.append("top_k", String(args.topK));

  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: fd,
    signal: args.signal,
  });

  // FastAPI returns JSON on both success and error (HTTPException).
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const detail =
      json && typeof json === "object" && json !== null && "detail" in json
        ? String((json as any).detail)
        : `Request failed (${res.status})`;
    throw new Error(detail);
  }

  return json as PredictResponse;
}

