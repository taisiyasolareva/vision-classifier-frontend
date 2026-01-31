import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load .env* files from this frontend folder.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_URL || "https://solarevat-cv200.hf.space";

  return {
    plugins: [react()],
    server: {
      // Dev-only proxy so local UI can call the HF API without CORS.
      //
      // In code, we call:
      //   DEV:  /api/predict      (proxied → ${VITE_API_URL}/predict)
      //   PROD: ${VITE_API_URL}/predict
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});

