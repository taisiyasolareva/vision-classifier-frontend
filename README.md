# End-to-End Vision Classification System — UI (vision-classifier-ui)

**Production Computer Vision: 200‑Class Image Classification.**  
React + Vite single-page UI for the vision-classifier-api (repo: **vision-classifier-frontend**).

**CTAs:** [Live Demo](https://vision-classifier-ui.vercel.app/) · [API Docs](https://solarevat-cv200.hf.space/docs)

## Live API (backend)

- **HF Spaces API base URL**: `https://solarevat-cv200.hf.space`
  - **API docs**: `https://solarevat-cv200.hf.space/docs`
  - **Health**: `https://solarevat-cv200.hf.space/healthz`

## UI deployment

- **Live app:** [https://vision-classifier-ui.vercel.app/](https://vision-classifier-ui.vercel.app/) (Vercel)

## Configure

Copy the example env file:

```bash
cp .env.example .env
```

Set:
- `VITE_API_URL=https://solarevat-cv200.hf.space`

Notes:
- No trailing slash.
- In dev mode, the app calls `/api/...` and Vite proxies that to `VITE_API_URL` (see `vite.config.ts`) to avoid browser CORS restrictions.
- The backend routes are **root** paths (`/predict`, `/predict_batch`, `/healthz`, `/docs`). `/api/*` is a **frontend dev proxy prefix**, not a backend route.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

## Build (for production hosting)

```bash
npm run build
npm run preview
```

## Sample images (Try sample images)

The main page includes a **Try sample images** section with 3 built-in images from the validation set so reviewers can test the model without the full dataset.

- **Where they live:** `public/samples/` (served at `/samples/` in dev and production; Vite copies `public/` into `dist/` on build).
- **How to update:** Replace the 3 files in `public/samples/` and ensure `src/lib/samples.ts` has matching `src` paths and `label` values. Labels must match the model’s label mapping (e.g. folder names from `val/` such as `class_000`, `class_001`, `class_002`).
- **Optimization:** Resize/compress images before adding (e.g. max 400px, JPEG quality 85) to keep bundle size small.

## Production CORS note

If the UI and API are on different domains (e.g., Vercel UI → HF Spaces API), the backend must allow the UI origin via CORS. Configure the backend to allow your deployed UI URL (do not use `*` in production).
