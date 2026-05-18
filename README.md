# Lessly

A 100% client-side image compressor. Compress JPEG, PNG, WebP, and AVIF in your browser — no upload, no signup, no server.

**https://allless.github.io/lessly**

## Stack

- **Preact** — UI framework
- **jSquash** — WASM image codecs (MozJPEG, OxiPNG, libwebp, libavif)
- **Vite** — build tool
- **TypeScript** — strict mode

## How it works

1. Drop or pick an image
2. Choose output format and quality
3. Compress runs locally via WASM
4. Download the result

Files never leave the browser. Everything runs on your machine.

## Development

```sh
pnpm install
pnpm dev           # dev server on localhost:5173
pnpm test          # run tests
pnpm build         # production build to dist/
```

## Roadmap

- [ ] Batch / multi-file mode
- [ ] JPEG XL (`@jsquash/jxl`)
- [ ] PNG re-optimization via `@jsquash/oxipng`
- [ ] Resize before encode
- [ ] Strip / preserve EXIF toggle
- [ ] Video compression (via [mediabunny](https://mediabunny.dev) + WebCodecs)
