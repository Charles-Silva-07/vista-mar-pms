import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain Vite SPA config (no server/SSR framework) so the build is a static
// bundle GitHub Pages can serve directly.
export default defineConfig({
  base: "/vista-mar-pms/", // Configura o subcaminho do GitHub Pages
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 8080,
  },
});
