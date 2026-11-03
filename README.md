# Compressor

The image-compression tool in the [Allless](https://allless.github.io/) family of small in-browser utilities.

100% client-side. Compress JPEG, PNG, WebP, AVIF, HEIC, and GIF in your browser — no upload, no signup, no server.

**Live**: https://allless.github.io/compressor/

## Stack

- **Preact** — UI framework
- **jSquash** — WASM image codecs (MozJPEG, OxiPNG, libwebp, libavif)
- **libheif-js** — HEIC/HEIF decode (LGPL-3.0, lazy-loaded)
- **gifsicle-wasm-browser** — animated GIF re-optimization (MIT)
- **client-zip** — batch ZIP download (MIT, streaming)
- **Vite** — build tool
- **TypeScript** — strict mode

## How it works

1. Drop one or more images
2. Choose output format and quality (or accept the defaults)
3. WASM codecs compress locally
4. Download — single file, or ZIP for batch

Files never leave the browser. Everything runs on your machine.

## Development

```sh
pnpm install
pnpm dev           # dev server on localhost:5173
pnpm test          # run tests
pnpm build         # production build to dist/
pnpm gen:routes    # regenerate SEO routes + sitemap
```

## Roadmap

See [progress.md](./progress.md) for the working tracker. Highlights still pending:

- Resize before encode
- EXIF strip / preserve toggle
- JPEG XL (`@jsquash/jxl`)
- PNG re-optimization via `@jsquash/oxipng`
- Inline preview in batch rows
- Eventually: a sibling video compressor (mediabunny + WebCodecs)
