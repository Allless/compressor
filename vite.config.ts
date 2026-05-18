import { defineConfig } from "vite";
import { resolve } from "path";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: "/lessly/",
  root: "src",
  plugins: [preact()],
  appType: "mpa",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        "404": resolve(__dirname, "src/404.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: [
      "@jsquash/jpeg",
      "@jsquash/png",
      "@jsquash/webp",
      "@jsquash/avif",
      "libheif-js/wasm-bundle",
      "gifsicle-wasm-browser",
    ],
  },
  test: {
    root: ".",
  },
});
