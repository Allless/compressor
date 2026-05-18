import { defineConfig } from "vite";
import { readdirSync } from "node:fs";
import { resolve } from "path";
import preact from "@preact/preset-vite";

// Pick up auto-generated `<from>-to-<to>` SEO route directories.
const routeInputs = Object.fromEntries(
  readdirSync(resolve(__dirname, "src"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[a-z]+-to-[a-z]+$/.test(d.name))
    .map((d) => [d.name, resolve(__dirname, `src/${d.name}/index.html`)]),
);

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
        ...routeInputs,
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
