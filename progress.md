# Progress

Working tracker for **Compressor** — the image-compression tool in the `Lessly` family (umbrella site at `lessly.me` once the domain is set up; currently at `allless.github.io/compressor/`). README is the public-facing roadmap; this is the unedited TODO.

## UI / UX — image flow

- [ ] **Quality slider helper text**
  Explain what quality does and why pushing it above the source's quality grows the file with no visible gain. One line under the slider.

- [ ] **"Don't enlarge" toggle**
  When the re-encoded output is larger than the input, return the original bytes instead. Useful default for batch flows so the user can't accidentally bloat files.

- [ ] **Clearer "file got bigger" state**
  Currently shows `+X%` in red — subtle. Consider a banner / icon when output > input.

- [ ] **Compressing state**
  The "Compressing…" placeholder replaces the image. Better: keep the previous output visible with a dimmer/spinner overlay so the user can see the comparison update smoothly.

- [ ] **Before/after slider**
  Interactive split view (drag a vertical handle to compare). Better than side-by-side for spotting compression artifacts.

- [ ] **Drop affordance off the drop zone**
  Right now only the dropzone reacts to drag. A subtle full-page overlay on drag-enter would catch sloppy drops.

- [ ] **Mobile polish**
  Side-by-side panes already stack on narrow screens, but the controls row could use more breathing room. Test on real phone.

- [ ] **Keyboard shortcut**
  `Esc` or `←` to return to landing from the compressor view.

- [ ] **Paste support**
  `Cmd+V` with an image in clipboard should trigger compression (screenshot workflow).

## Image features — bigger

- [ ] **Batch / multi-file mode**
  Drop a folder or multiple files → compress all → zip download or per-file. Likely needs a queue + worker.

- [ ] **Resize before encode**
  Width/height inputs with aspect lock. Could use `@jsquash/resize`.

- [ ] **Strip / preserve EXIF toggle**
  Default = strip for privacy. Show what's being stripped (GPS, camera model, etc.).

- [ ] **PNG re-optimization via `@jsquash/oxipng`**
  Better PNG savings without quality loss. Worth toggling on automatically for PNG → PNG.

- [ ] **JPEG XL support**
  `@jsquash/jxl`. Browser support is still patchy — gate via `canEncode` style check or just expose unconditionally and let the user download.

- [ ] **Codec / encode info on output**
  Show the chosen quality, dimensions, and (for AVIF) speed setting in the caption.

- [x] **HEIC / HEIF input** — `libheif-js/wasm-bundle`. Decode-only; no HEIC output. "Auto" target falls back to WebP. ⚠️ **License: LGPL-3.0** — fine for the open-source GH-Pages build (attribution required); revisit if Lessly ever becomes closed-source. The libheif chunk is ~500 KB gzipped, dynamically imported only when a HEIC is uploaded.

- [x] **Animated GIF — optimize in place** — `gifsicle-wasm-browser`, MIT. Bypasses the decode/encode pipeline (gifsicle takes/returns GIF bytes directly). Quality slider drives `--lossy` (0–200), mapped linearly from 1–100. Bundle ~145 KB gzipped, dynamically imported.

- [ ] **GIF → WebP / MP4 conversion** (power-user toggle)
  Once mediabunny is in for video, optionally convert animated GIF to WebP or MP4 for 90%+ savings. Default stays gifsicle-in-place; this is a checkbox.

## Batch mode — side feature in the optimizer

**Decision (after three-agent discussion + user direction)**: Lessly is one tool. The optimizer is the primary identity. Batch ("convert N files to format X") is a side feature on the same page, activated by the file count of the drop. No separate `/convert/` URL.

Behavior:
- Drop **1 file** → optimizer (`Compressor`) — preview, quality, format ("Auto = keep" default). UX unchanged.
- Drop **2+ files** → `BatchView` — queue UI with shared format + quality controls, per-file status, per-file download, "Download all (zip)".

Implementation notes:
- `Dropzone` now accepts `multiple`; subtitle hints "drop multiple to batch" but doesn't shout it.
- `main.tsx` switches between `Compressor` and `BatchView` based on `files.length`.
- `BatchView` processes sequentially (one WASM codec at a time to avoid memory pressure) and uses a `processingRef` + `itemsRef` pattern to avoid the useEffect race that previously caused `Converting…` to hang. The fix: don't re-trigger processing on every state change; mark "in-flight" via a ref and drain pending items in a loop.

### Shipped

- [x] **Unified entry point** — single `index.html`, single `main.tsx`. No `/convert.html` page.
- [x] **Adaptive UX** — 0 / 1 / many file count drives view selection.
- [x] **Multi-file dropzone** — same `Dropzone` component, accepts `multiple`.
- [x] **Batch queue** — sequential processing, per-file status (pending / processing / done / error), per-file remove + download.
- [x] **Download all as ZIP** — `client-zip` (MIT, ~5 KB gzipped, Streams API).
- [x] **Per-file error display** — surfaces format-mismatch failures from `compress()` cleanly (e.g., "Cannot encode pixel data to GIF" when picking WebP output on a GIF input).
- [x] **Race fix** — `useEffect` race that caused `Converting…` to hang on small images (state mutation re-triggered the effect, which cancelled the in-flight promise) replaced with ref-based processing loop.

### Deferred to v1.1

- [ ] **Resize during convert** — width / height inputs with aspect lock. Useful for both single (optimizer flow) and batch.
- [ ] **Strip / preserve EXIF toggle** — non-trivial: jSquash encoders strip EXIF by default; preserving requires reading via something like `exifr` and re-embedding into the encoded output. For v1 EXIF is stripped silently.
- [ ] **Inline preview in batch rows** — expand any queue item to show before/after thumbnails (Agent 1 suggestion — removes the "I need to tune quality but I have 20 files" dead-end).
- [x] **Format-specific SEO landing routes** — single-format pages, one per supported input: `/png`, `/jpg`, `/webp`, `/avif`, `/heic`, `/gif`. Each has a route-specific title / H1 / meta tags driven by `scripts/gen-routes.mjs` (with a per-format `verb` like "Compressor" / "Converter" / "Optimizer"). `main.tsx` reads `window.location.pathname` and uses the matched route for the landing heading and tagline. Run `pnpm run gen:routes` to regenerate after editing the `FORMATS` config — sitemap is regenerated by the same script. (Earlier `<from>-to-<to>` pair-routes were swapped out — they targeted conversion intent but pair-naming was inconsistent with the unified `compressor.lessly.me` tool concept and the future video-format routes like `/mp4`.)

### Format extensions — add over time

Each item adds an input or output codec. Ordered roughly by user value. Since the project is open source, LGPL components are fine — just track them for attribution.

- [ ] **TIFF (in + out)** — `utif` (~60 KB, MIT). Scan + design-export workflow. Multi-page TIFF is a v2 concern.
- [ ] **BMP (in + out)** — `bmp-js` or DIY canvas (tiny, MIT). Legacy / screenshot workflow.
- [ ] **SVG → raster** — Browser canvas rasterizes SVG to PNG/JPEG/WebP at chosen size. Plus `svgo` (~200 KB, MIT) for SVG-to-SVG minify. Different pipeline from the others — no decode-to-`ImageData` step in the usual sense.
- [ ] **JPEG XL (in + out)** — `@jsquash/jxl` (~1 MB WASM, Apache-2.0). Modern format, growing adoption.
- [ ] **ICO (in + out)** — `to-ico` for encode (tiny, MIT), DIY decode. Favicon workflow.
- [ ] **HEIC encode** — `libheif-js` already in bundle (LGPL-3.0); expose its encode entry. Round-trip support for Apple users.
- [ ] **RAW decode (NEF / CR2 / CR3 / DNG / ARW / RAF)** — `libraw-wasm` (~3–5 MB, LGPL-3.0). Photographer market, big library. Lazy-load with explicit "this may take a moment" hint.
- [ ] **PSD read** — `ag-psd` (~150 KB, MIT). Designer workflow — extract layers or flatten to PNG/JPEG.
- [ ] **PDF image extraction** — `pdfjs-dist` (~500 KB, Apache-2.0). Niche "pull images from PDF" use case.
- [ ] **More AVIF / JPEG XL knobs** — speed presets, animation support, HDR / 10-bit pixel formats.

## Video optimizer — next chapter

Decision recap (from brainstorm): **mediabunny + WebCodecs, no ffmpeg.wasm**. Reasons:
- ffmpeg.wasm has a 4 GB linear-memory ceiling and is software-only.
- ffmpeg.wasm bundled binaries include GPL components (x264/x265) — distributing ours under a closed source product would open license obligations.
- WebCodecs taps the device's hardware codec block, giving ~30–100× speedup with no memory wall.
- mediabunny is MPL-2.0, TypeScript-first, tree-shakable, and built by the author of `mp4-muxer`/`webm-muxer`.

### Shipped

- [x] **Unified entry point** — single `index.html` / `main.tsx`. `routeFiles()` (pure, tested) handles drop decisions: single → `Compressor`/`LazyVideoCompressor`, multi-image → `BatchView`, mixed/multi-video → filter with a banner notice. Image users never pay the mediabunny download.
- [x] **`mediabunny` dep** (v1.45.2). AAC via mediabunny's bundled codec; audio extensions deferred until a real input demands them.
- [x] **Capability probe** — `canEncodeVideo("avc")` runs after lazy chunk loads. "Your browser can't encode H.264" surfaces before any work starts.
- [x] **Decode → encode pipeline** — `Conversion` API, MP4/MOV/WebM/MKV in, MP4 H.264 out. WebM (VP9) / HEVC outputs not yet wired.
- [x] **Resolution control (dual mode)** — Preset tab (Original / 1440p / 1080p / 720p / 480p, presets ≤ source resolution disable themselves) **or** Custom tab (numeric input, 144 – 4320 px). Aspect preserved via mediabunny's single-dimension API; `targetHeight()` enforces never-upscale; an inline hint surfaces when a custom value would exceed source height.
- [x] **Quality control (dual mode)** — Preset tab (Low / Medium / High, resolution-aware bitrate curve) **or** Custom tab (kbps slider, 100 kbps – 20 Mbps, live value readout). Mode switches inline; never both at once.
- [x] **Mode-switch value sync** — Flipping a control from Preset → Custom pre-fills the custom field with the equivalent of the current preset (e.g. preset=720p → custom field starts at 720; preset=Medium at 1080p → bitrate slider starts at the curve's 5000 kbps). No surprising jumps.
- [x] **Source + output info** — Source caption shows native resolution and duration. Pre-encode caption shows predicted output dimensions, bitrate, and size estimate (`estimateBytes()` from duration × bitrate × 1.02 container overhead). After encode lands, swaps to actual size + savings %.
- [x] **Progress bar** — `conv.onProgress` (0–1 fraction) shown as percentage. Frame X/Y + ETA would be a nicer step.
- [x] **Cancel button** — `handle.cancel()` calls `conv.cancel()` and aborts the awaited result.
- [x] **Architecture: testable orchestration** — All decision logic moved into pure modules:
  - `lib/route-files.ts` — drop-routing decisions
  - `lib/video/bitrate.ts` — preset → bitrate curve
  - `lib/video/dimensions.ts` — `targetHeight`, `computeOutputDimensions` (aspect + even-width)
  - `lib/video/estimate.ts` — output size predictor
  - `lib/video/errors.ts` — `parseEncodeError(discardedTracks)`
  - `lib/video/encode-machine.ts` — pure `reduce(state, event) => { state, effects }` for the probe/encode lifecycle
  - `lib/video/probe.ts`, `encode.ts` — the only effectful boundaries; lazy-import mediabunny
  - `hooks/use-encode.ts` — thin shell over `encode-machine`; no decision logic
  - **79 unit tests, no DOM dependency**, no mediabunny mocks needed.

### Pipeline — remaining

- [ ] **Audio passthrough toggle** — currently always re-encodes to AAC 128 kbps. Add a "keep original audio" option for the common case where source is already AAC.
- [ ] **Additional outputs** — WebM (VP9) and MP4 (HEVC). HEVC encode is patchy on Firefox; gate the option.
- [ ] **Audio codec extensions** — pull in `@mediabunny/aac-encoder` / `@mediabunny/mp3-encoder` only if a real input demands a codec mediabunny can't decode natively.

### UX considerations specific to video — remaining

- [ ] **Better progress detail** — show frame X / Y and ETA instead of just a percentage.
- [ ] **Preview the first ~5 seconds** — decode and re-encode just the head before committing to the full file. Helps the user pick quality without waiting through a 10-min encode.
- [ ] **File size warnings** — soft warning over ~500 MB ("this may take a few minutes"), hard warning over ~1.5 GB ("your browser may run out of memory").
- [ ] **Debounce custom-bitrate slider** — currently every slider tick restarts the encode (the machine cancels + restarts on `settings-changed`). Fine while previewing on small files; on long videos add a debounce or an explicit "Apply" affordance.

### Known gaps to be honest about

- [ ] **Safari < 26 quirks**
  Has had partial WebCodecs support since 16.4. Probe everything; degrade gracefully.
- [ ] **Firefox AV1 / HEVC encode**
  Patchy. Don't expose HEVC encode option on Firefox.
- [ ] **No ffmpeg fallback for exotic formats**
  Pro codecs (ProRes, DNxHD) won't decode. Show a clear error rather than silently failing.

## Later / maybe

- [ ] **PWA / offline**
  Service worker so Lessly works offline once loaded. Reinforces the "100% client-side" claim.
- [ ] **Native filesystem API**
  Pick a folder, output side-by-side optimized versions, watch for new files. Chrome-only.
- [ ] **Profile presets**
  "Twitter image", "Discord upload", "Email attachment" — preset format + max-dimension + max-filesize.
- [ ] **CLI / Tauri / extension**
  Same pipeline, different shells. Probably not worth the effort vs just keeping the web one good.
