# End-to-End Vision Classification System — UI (vision-classifier-ui)

**Production Computer Vision: 200‑Class Image Classification.**  
React + Vite single-page UI for the vision-classifier-api (repo: **vision-classifier-frontend**).

**CTAs:** Live Demo · [Read the Report](../cv200-backend/REPORT.md) · [API Docs](https://solarevat-cv200.hf.space/docs) *(Links: TODO — set Live Demo URL when deployed.)*

## Live API (backend)

- **HF Spaces API base URL**: `https://solarevat-cv200.hf.space`
  - **API docs**: `https://solarevat-cv200.hf.space/docs`
  - **Health**: `https://solarevat-cv200.hf.space/healthz`

## UI deployment

Add your deployed UI URL here once the app is live (e.g. after pushing the repo and deploying to Vercel).

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

## Production CORS note

If the UI and API are on different domains (e.g., Vercel UI → HF Spaces API), the backend must allow the UI origin via CORS. Configure the backend to allow your deployed UI URL (do not use `*` in production).
