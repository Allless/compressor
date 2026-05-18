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

interface CompressorProps {
  file: File;
  onReset: () => void;
}

const ALL_TARGETS: { value: TargetFormat; label: string }[] = [
  { value: "auto", label: "Auto (keep)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "gif", label: "GIF" },
];

const downloadName = (original: File, format: EncodableFormat): string => {
  const base = original.name.replace(/\.[^.]+$/, "");
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}.${ext}`;
};

export const Compressor = ({ file, onReset }: CompressorProps) => {
  const [target, setTarget] = useState<TargetFormat>("auto");
  const [quality, setQuality] = useState(75);
  const [output, setOutput] = useState<{
    blob: Blob;
    format: EncodableFormat;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  useEffect(() => {
    if (!effectiveTarget) {
      setErr("Unsupported file type.");
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr(null);
    compress(file, effectiveTarget, quality)
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
  }, [file, effectiveTarget, quality]);

  const originalSize = file.size;
  const newSize = output?.blob.size ?? 0;
  const savings = output ? ((originalSize - newSize) / originalSize) * 100 : 0;

  return (
    <div class="compressor">
      <header class="compressor__header">
        <h1>Lessly</h1>
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
          {outputUrl && !busy ? (
            <img src={outputUrl} alt="Compressed" class="compressor__img" />
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

      <div class="controls">
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
