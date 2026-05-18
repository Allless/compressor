import { defineConfig } from "vite";
import { readdirSync } from "node:fs";
import { resolve } from "path";
import preact from "@preact/preset-vite";

// Pick up auto-generated single-format SEO route directories (managed by `scripts/gen-routes.mjs`).
// Anything under `src/` that isn't a known project dir is treated as a route.
const NON_ROUTE_DIRS = new Set(["public", "ts"]);
const routeInputs = Object.fromEntries(
  readdirSync(resolve(__dirname, "src"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NON_ROUTE_DIRS.has(d.name))
    .map((d) => [d.name, resolve(__dirname, `src/${d.name}/index.html`)]),
);

export default defineConfig({
  base: "/compressor/",
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
