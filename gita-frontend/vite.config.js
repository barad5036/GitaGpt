import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/ai": {
        target: "https://text.pollinations.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, "/openai")
      },
      "/api/chat": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      },
      "/api/auth": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      },
      "/api/privacy": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      },
      "/api/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  }
});
