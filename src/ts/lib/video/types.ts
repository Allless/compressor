export type VideoQualityPreset = "low" | "medium" | "high";

export type VideoQualityMode =
  | { kind: "preset"; preset: VideoQualityPreset }
  | { kind: "bitrate"; videoBps: number };

export interface VideoSettings {
  quality: VideoQualityMode;
  /** Cap output height; aspect preserved. `null` / `undefined` keeps original. */
  maxHeight?: number | null;
  /** Audio bitrate in bps. Defaults to 128_000. Ignored when `audioPassthrough` is true. */
  audioBps?: number;
  /**
   * When true, copy the source audio track verbatim (no decode/encode round-trip) when the
   * source codec is compatible with the output container. Falls back to re-encode otherwise.
   */
  audioPassthrough?: boolean;
}

export interface SourceDimensions {
  width: number;
  height: number;
}

export interface VideoMeta {
  displayWidth: number;
  displayHeight: number;
  durationSec: number;
  hasAudio: boolean;
}

export interface EncodeOptions {
  file: File;
  settings: VideoSettings;
  onProgress?: (progress: number) => void;
}

export interface EncodeHandle {
  result: Promise<Blob>;
  cancel: () => Promise<void>;
}

export const DEFAULT_AUDIO_BPS = 128_000;
