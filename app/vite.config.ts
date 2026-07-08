import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // In dev, proxy API calls to the local Express server (npm run server)
      // so `/api/flows` + `/api/repos` behave the same as in prod.
      "/api": "http://localhost:3100",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
