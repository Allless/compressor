import { useEffect, useMemo, useState } from "preact/hooks";
import {
  allowedTargets,
  autoTarget,
  compress,
  detectFormat,
  type DecodableFormat,
  type EncodableFormat,
  type TargetFormat,
} from "../lib/compress";
import { formatBytes } from "../lib/format";
import { useDebounced } from "../hooks/use-debounced";
import { ModeTabs, type Mode } from "./ModeTabs";

interface CompressorProps {
  file: File;
  onReset: () => void;
  initialTarget?: EncodableFormat;
}

const ALL_TARGETS: { value: TargetFormat; label: string }[] = [
  { value: "auto", label: "Auto (keep)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "gif", label: "GIF" },
];

const WIDTH_PRESETS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: null, label: "Original" },
  { value: 2560, label: "2560w" },
  { value: 1920, label: "1920w" },
  { value: 1280, label: "1280w" },
  { value: 800, label: "800w" },
  { value: 480, label: "480w" },
];

const MIN_CUSTOM_WIDTH = 16;
const MAX_CUSTOM_WIDTH = 8192;

const clampWidth = (w: number): number =>
  Math.max(MIN_CUSTOM_WIDTH, Math.min(MAX_CUSTOM_WIDTH, Math.round(w || 0)));

const downloadName = (original: File, format: EncodableFormat): string => {
  const base = original.name.replace(/\.[^.]+$/, "");
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}.${ext}`;
};

export const Compressor = ({
  file,
  onReset,
  initialTarget,
}: CompressorProps) => {
  const [target, setTarget] = useState<TargetFormat>(initialTarget ?? "auto");
  const [quality, setQuality] = useState(75);
  const [output, setOutput] = useState<{
    blob: Blob;
    format: EncodableFormat;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [widthMode, setWidthMode] = useState<Mode>("preset");
  const [presetWidth, setPresetWidth] = useState<number | null>(null);
  const [customWidth, setCustomWidth] = useState<number>(1280);
  const [sourceDims, setSourceDims] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Debounce only what flows into compress(). The live custom-width value
  // still drives the input and any UI hints so the field stays responsive.
  const settledCustomWidth = useDebounced(customWidth, 250);
  const maxWidth =
    widthMode === "preset" ? presetWidth : clampWidth(settledCustomWidth);

  const switchWidthMode = (next: Mode) => {
    if (next === widthMode) return;
    if (next === "custom" && presetWidth !== null) {
      setCustomWidth(presetWidth);
    }
    setWidthMode(next);
  };

  const inputFormat = useMemo<DecodableFormat | null>(() => {
    try {
      return detectFormat(file);
    } catch {
      return null;
    }
  }, [file]);

  const targetOptions = useMemo(() => {
    if (!inputFormat) return ALL_TARGETS;
    const allowed = allowedTargets(inputFormat);
    return ALL_TARGETS.filter(
      (t) =>
        t.value === "auto" || allowed.includes(t.value as EncodableFormat),
    );
  }, [inputFormat]);

  const effectiveTarget: EncodableFormat | null = useMemo(() => {
    if (!inputFormat) return null;
    return target === "auto" ? autoTarget(inputFormat) : target;
  }, [inputFormat, target]);

  const isLossless = effectiveTarget === "png";

  const originalUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const outputUrl = useMemo(
    () => (output ? URL.createObjectURL(output.blob) : null),
    [output],
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  // Source-dimension probe. Browsers can't natively decode HEIC, so for those
  // files this will silently fail and presets stay enabled — resize is still
  // safe because compress() never upscales.
  useEffect(() => {
    let cancelled = false;
    setSourceDims(null);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setSourceDims({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (!cancelled) setSourceDims(null);
    };
    img.src = originalUrl;
    return () => {
      cancelled = true;
    };
  }, [originalUrl]);

  useEffect(() => {
    if (!effectiveTarget) {
      setErr("Unsupported file type.");
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr(null);
    compress(file, effectiveTarget, quality, maxWidth)
      .then((result) => {
        if (!cancelled) setOutput(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, effectiveTarget, quality, maxWidth]);

  const originalSize = file.size;
  const newSize = output?.blob.size ?? 0;
  const savings = output ? ((originalSize - newSize) / originalSize) * 100 : 0;

  return (
    <div class="compressor">
      <header class="compressor__header">
        <h1>Lessly · Compressor</h1>
        <button class="btn btn--small" onClick={onReset}>
          ← New image
        </button>
      </header>

      <div class="compressor__grid">
        <figure class="compressor__pane">
          <img src={originalUrl} alt="Original" class="compressor__img" />
          <figcaption class="compressor__caption">
            <span class="compressor__caption-label">Original</span>
            <span class="compressor__caption-size">
              {formatBytes(originalSize)}
              {inputFormat && ` · ${inputFormat.toUpperCase()}`}
            </span>
          </figcaption>
        </figure>

        <figure class="compressor__pane">
          {outputUrl ? (
            <div class="compressor__media">
              <img src={outputUrl} alt="Compressed" class="compressor__img" />
              {busy && (
                <div class="compressor__overlay">Compressing…</div>
              )}
            </div>
          ) : (
            <div class="compressor__placeholder">
              {busy ? (
                "Compressing…"
              ) : err ? (
                <span class="compressor__error">{err}</span>
              ) : (
                "—"
              )}
            </div>
          )}
          <figcaption class="compressor__caption">
            <span class="compressor__caption-label">Compressed</span>
            {output && !busy ? (
              <span class="compressor__caption-size">
                {formatBytes(newSize)} · {output.format.toUpperCase()}
                <span
                  class={`compressor__savings ${savings < 0 ? "compressor__savings--negative" : ""}`}
                >
                  {savings >= 0
                    ? ` −${savings.toFixed(0)}%`
                    : ` +${(-savings).toFixed(0)}%`}
                </span>
              </span>
            ) : (
              <span class="compressor__caption-size">—</span>
            )}
          </figcaption>
        </figure>
      </div>

      {output && !busy && savings < -3 && (
        <div class="compressor__warning">
          <span class="compressor__warning-icon" aria-hidden="true">⚠</span>
          Output is {Math.round(-savings)}% larger than the original. Try a
          different target format, a higher quality, or download the original
          instead.
        </div>
      )}

      <div class="controls">
        <div class="control">
          <div class="control__head">
            <span class="control__label">Width</span>
            <ModeTabs
              value={widthMode}
              onChange={switchWidthMode}
              disabled={busy}
            />
          </div>
          {widthMode === "preset" ? (
            <select
              class="control__select"
              value={presetWidth === null ? "original" : String(presetWidth)}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setPresetWidth(v === "original" ? null : Number(v));
              }}
              disabled={busy}
            >
              {WIDTH_PRESETS.map((p) => (
                <option
                  key={p.label}
                  value={p.value === null ? "original" : String(p.value)}
                  disabled={
                    p.value !== null &&
                    sourceDims !== null &&
                    sourceDims.width <= p.value
                  }
                >
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              class="control__select"
              value={customWidth}
              min={MIN_CUSTOM_WIDTH}
              max={MAX_CUSTOM_WIDTH}
              step={1}
              onInput={(e) => {
                const n = Number(e.currentTarget.value);
                if (Number.isFinite(n)) setCustomWidth(n);
              }}
              disabled={busy}
              aria-label="Max output width in pixels"
            />
          )}
          {sourceDims &&
            widthMode === "custom" &&
            clampWidth(customWidth) >= sourceDims.width && (
              <span class="control__hint">
                Source is {sourceDims.width}px wide — won't upscale.
              </span>
            )}
        </div>

        <label class="control">
          <span class="control__label">Format</span>
          <select
            class="control__select"
            value={target}
            onChange={(e) =>
              setTarget(e.currentTarget.value as TargetFormat)
            }
          >
            {targetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {!isLossless && (
          <label class="control">
            <span class="control__label">Quality · {quality}</span>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onInput={(e) => setQuality(Number(e.currentTarget.value))}
              class="control__range"
            />
            <span class="control__hint">
              Pushing above the source's quality grows the file with no visible
              gain.
            </span>
          </label>
        )}

        <a
          class="btn btn--primary controls__download"
          href={outputUrl ?? "#"}
          download={
            output ? downloadName(file, output.format) : undefined
          }
          aria-disabled={!output || busy}
        >
          Download
        </a>
      </div>
    </div>
  );
};
