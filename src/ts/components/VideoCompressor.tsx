import { useEffect, useMemo, useState } from "preact/hooks";
import { formatBytes } from "../lib/format";
import { useDebounced } from "../hooks/use-debounced";
import { useEncode } from "../hooks/use-encode";
import { ModeTabs, type Mode } from "./ModeTabs";
import {
  bitrateForPreset,
  clampVideoBps,
  computeOutputDimensions,
  DEFAULT_AUDIO_BPS,
  downloadName,
  estimateBytes,
  MIN_VIDEO_BPS,
  targetHeight,
  type VideoQualityPreset,
  type VideoSettings,
} from "../lib/video";

interface Props {
  file: File;
  onReset: () => void;
}

const HEIGHT_PRESETS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: null, label: "Original" },
  { value: 1440, label: "1440p" },
  { value: 1080, label: "1080p" },
  { value: 720, label: "720p" },
  { value: 480, label: "480p" },
];

const QUALITY_PRESETS: ReadonlyArray<{
  value: VideoQualityPreset;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const MIN_KBPS = Math.round(MIN_VIDEO_BPS / 1000);

const MIN_CUSTOM_HEIGHT = 144;
const MAX_CUSTOM_HEIGHT = 4320;

const clampHeight = (h: number): number =>
  Math.max(MIN_CUSTOM_HEIGHT, Math.min(MAX_CUSTOM_HEIGHT, Math.round(h || 0)));

export const VideoCompressor = ({ file, onReset }: Props) => {
  const [heightMode, setHeightMode] = useState<Mode>("preset");
  const [presetHeight, setPresetHeight] = useState<number | null>(null);
  const [customHeight, setCustomHeight] = useState<number>(720);

  const [qualityMode, setQualityMode] = useState<Mode>("preset");
  const [preset, setPreset] = useState<VideoQualityPreset>("medium");
  const [customKbps, setCustomKbps] = useState<number>(3000);

  const [audioPassthrough, setAudioPassthrough] = useState<boolean>(false);

  // Debounce only the values that flow into `settings` (and therefore re-trigger
  // the encode). Display elements keep reading the live values so the slider
  // and pre-encode readout stay responsive while the user drags.
  const settledHeight = useDebounced(customHeight, 250);
  const settledKbps = useDebounced(customKbps, 250);

  const maxHeight =
    heightMode === "preset" ? presetHeight : clampHeight(customHeight);
  const settledMaxHeight =
    heightMode === "preset" ? presetHeight : clampHeight(settledHeight);

  const settings: VideoSettings = useMemo(
    () => ({
      maxHeight: settledMaxHeight,
      quality:
        qualityMode === "preset"
          ? { kind: "preset", preset }
          : { kind: "bitrate", videoBps: clampVideoBps(settledKbps * 1000) },
      audioPassthrough,
    }),
    [settledMaxHeight, qualityMode, preset, settledKbps, audioPassthrough],
  );

  const switchHeightMode = (next: Mode) => {
    if (next === heightMode) return;
    if (next === "custom" && presetHeight !== null) {
      setCustomHeight(presetHeight);
    }
    setHeightMode(next);
  };

  const switchQualityMode = (next: Mode) => {
    if (next === qualityMode) return;
    if (next === "custom") {
      const h = maxHeight ?? 1080;
      setCustomKbps(Math.round(bitrateForPreset(preset, h) / 1000));
    }
    setQualityMode(next);
  };

  const enc = useEncode(file, settings);

  const outputDims = useMemo(() => {
    if (!enc.meta) return null;
    const source = {
      width: enc.meta.displayWidth,
      height: enc.meta.displayHeight,
    };
    const h = targetHeight(source, maxHeight);
    return computeOutputDimensions(source, h);
  }, [enc.meta, maxHeight]);

  const effectiveVideoBps = useMemo(() => {
    if (qualityMode === "custom") return clampVideoBps(customKbps * 1000);
    const h = outputDims?.height ?? enc.meta?.displayHeight ?? 1080;
    return bitrateForPreset(preset, h);
  }, [qualityMode, customKbps, preset, outputDims, enc.meta]);

  const estimate = useMemo(() => {
    if (!enc.meta) return 0;
    return estimateBytes({
      videoBps: effectiveVideoBps,
      audioBps: enc.meta.hasAudio ? DEFAULT_AUDIO_BPS : 0,
      durationSec: enc.meta.durationSec,
    });
  }, [enc.meta, effectiveVideoBps]);

  const originalUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const outputUrl = useMemo(
    () => (enc.output ? URL.createObjectURL(enc.output) : null),
    [enc.output],
  );
  useEffect(() => () => URL.revokeObjectURL(originalUrl), [originalUrl]);
  useEffect(
    () => () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    },
    [outputUrl],
  );

  if (enc.probe === "checking") {
    return (
      <div class="compressor">
        <Header onReset={onReset} />
        <div class="compressor__placeholder">Checking browser support…</div>
      </div>
    );
  }

  if (enc.probe === "unsupported") {
    return (
      <div class="compressor">
        <Header onReset={onReset} />
        <div class="compressor__placeholder">
          <span class="compressor__error">
            Your browser can't encode H.264 video in-page. Try a recent Chrome,
            Edge, or Safari.
          </span>
        </div>
      </div>
    );
  }

  const originalSize = file.size;
  const newSize = enc.output?.size ?? 0;
  const savings = enc.output
    ? ((originalSize - newSize) / originalSize) * 100
    : 0;

  const encodingDone = enc.output !== null && !enc.busy;
  const sizeTier: "warn" | "info" | null = encodingDone
    ? null
    : originalSize > 1_610_612_736
      ? "warn"
      : originalSize > 524_288_000
        ? "info"
        : null;

  return (
    <div class="compressor">
      <Header onReset={onReset} />

      {sizeTier === "warn" ? (
        <div class="notice notice--warn">
          Very large file (~{formatBytes(originalSize)}). Your browser may run
          out of memory; consider splitting or downsizing externally first.
        </div>
      ) : sizeTier === "info" ? (
        <div class="notice">
          Large file (~{formatBytes(originalSize)}). Encoding may take a few
          minutes.
        </div>
      ) : null}

      <div class="compressor__grid">
        <figure class="compressor__pane">
          <video
            src={originalUrl}
            controls
            class="compressor__img"
            preload="metadata"
          />
          <figcaption class="compressor__caption">
            <span class="compressor__caption-label">Original</span>
            <span class="compressor__caption-size">
              {formatBytes(originalSize)}
              {enc.meta && (
                <span class="compressor__caption-detail">
                  {" "}· {enc.meta.displayWidth}×{enc.meta.displayHeight}
                  {enc.meta.durationSec > 0 &&
                    ` · ${formatDuration(enc.meta.durationSec)}`}
                </span>
              )}
            </span>
          </figcaption>
        </figure>

        <figure class="compressor__pane">
          {outputUrl && !enc.busy ? (
            <video
              src={outputUrl}
              controls
              class="compressor__img"
              preload="metadata"
            />
          ) : (
            <div class="compressor__placeholder">
              {enc.busy ? (
                <span>Encoding… {(enc.progress * 100).toFixed(0)}%</span>
              ) : enc.err ? (
                <span class="compressor__error">{enc.err}</span>
              ) : enc.metaError ? (
                <span class="compressor__error">{enc.metaError}</span>
              ) : (
                "—"
              )}
            </div>
          )}
          <figcaption class="compressor__caption">
            <span class="compressor__caption-label">Compressed</span>
            {enc.output && !enc.busy ? (
              <span class="compressor__caption-size">
                {formatBytes(newSize)} · MP4
                <span
                  class={`compressor__savings ${savings < 0 ? "compressor__savings--negative" : ""}`}
                >
                  {savings >= 0
                    ? ` −${savings.toFixed(0)}%`
                    : ` +${(-savings).toFixed(0)}%`}
                </span>
              </span>
            ) : outputDims && estimate > 0 ? (
              <span class="compressor__caption-size compressor__caption-size--muted">
                {outputDims.width}×{outputDims.height} · ~{formatBytes(estimate)}{" "}
                · {Math.round(effectiveVideoBps / 1000)} kbps
              </span>
            ) : (
              <span class="compressor__caption-size">—</span>
            )}
          </figcaption>
        </figure>
      </div>

      <div class="controls">
        <div class="control">
          <div class="control__head">
            <span class="control__label">Resolution</span>
            <ModeTabs
              value={heightMode}
              onChange={switchHeightMode}
              disabled={enc.busy}
            />
          </div>
          {heightMode === "preset" ? (
            <select
              class="control__select"
              value={presetHeight === null ? "original" : String(presetHeight)}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setPresetHeight(v === "original" ? null : Number(v));
              }}
              disabled={enc.busy}
            >
              {HEIGHT_PRESETS.map((p) => (
                <option
                  key={p.label}
                  value={p.value === null ? "original" : String(p.value)}
                  disabled={
                    p.value !== null &&
                    enc.meta !== null &&
                    enc.meta.displayHeight <= p.value
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
              value={customHeight}
              min={MIN_CUSTOM_HEIGHT}
              max={MAX_CUSTOM_HEIGHT}
              step={1}
              onInput={(e) => {
                const n = Number(e.currentTarget.value);
                if (Number.isFinite(n)) setCustomHeight(n);
              }}
              disabled={enc.busy}
              aria-label="Max output height in pixels"
            />
          )}
          {enc.meta &&
            heightMode === "custom" &&
            clampHeight(customHeight) >= enc.meta.displayHeight && (
              <span class="control__hint">
                Source is {enc.meta.displayHeight}px tall — won't upscale.
              </span>
            )}
        </div>

        <div class="control">
          <div class="control__head">
            <span class="control__label">Quality</span>
            <ModeTabs
              value={qualityMode}
              onChange={switchQualityMode}
              disabled={enc.busy}
            />
          </div>
          {qualityMode === "preset" ? (
            <select
              class="control__select"
              value={preset}
              onChange={(e) =>
                setPreset(e.currentTarget.value as VideoQualityPreset)
              }
              disabled={enc.busy}
            >
              {QUALITY_PRESETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <div class="control__slider">
              <input
                type="range"
                class="control__range"
                min={MIN_KBPS}
                max={20000}
                step={100}
                value={customKbps}
                onInput={(e) => setCustomKbps(Number(e.currentTarget.value))}
                disabled={enc.busy}
                aria-label="Video bitrate in kilobits per second"
              />
              <span class="control__value">{customKbps} kbps</span>
            </div>
          )}
        </div>

        {enc.meta?.hasAudio && (
          <label class="control control--checkbox">
            <input
              type="checkbox"
              checked={audioPassthrough}
              onChange={(e) =>
                setAudioPassthrough(e.currentTarget.checked)
              }
              disabled={enc.busy}
            />
            <span class="control__label">Keep source audio</span>
          </label>
        )}

        {enc.busy ? (
          <button
            class="btn controls__download"
            onClick={enc.cancel}
            type="button"
          >
            Cancel
          </button>
        ) : (
          <a
            class="btn btn--primary controls__download"
            href={outputUrl ?? "#"}
            download={enc.output ? downloadName(file) : undefined}
            aria-disabled={!enc.output}
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
};

const Header = ({ onReset }: { onReset: () => void }) => (
  <header class="compressor__header">
    <h1>Lessly · Compressor</h1>
    <button class="btn btn--small" onClick={onReset}>
      ← New file
    </button>
  </header>
);

const formatDuration = (sec: number): string => {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

