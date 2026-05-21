import type { VideoQualityPreset } from "./types";

// kbps per output height. Reference points roughly match YouTube SDR
// upload recommendations and x264 medium-preset at similar visual quality.
const TABLE: Record<VideoQualityPreset, ReadonlyArray<readonly [number, number]>> =
  {
    low: [
      [480, 700],
      [720, 1500],
      [1080, 3000],
      [1440, 5500],
      [2160, 12000],
    ],
    medium: [
      [480, 1200],
      [720, 2500],
      [1080, 5000],
      [1440, 9000],
      [2160, 20000],
    ],
    high: [
      [480, 2000],
      [720, 4000],
      [1080, 8000],
      [1440, 16000],
      [2160, 35000],
    ],
  };

export const MIN_VIDEO_BPS = 100_000; // 100 kbps
export const MAX_VIDEO_BPS = 100_000_000; // 100 Mbps

/**
 * Recommended bitrate (bps) for a given quality preset at a given output height.
 * Linearly interpolates between reference points; clamps at the edges.
 */
export const bitrateForPreset = (
  preset: VideoQualityPreset,
  outputHeight: number,
): number => {
  const points = TABLE[preset];
  if (outputHeight <= points[0][0]) return points[0][1] * 1000;
  const last = points[points.length - 1];
  if (outputHeight >= last[0]) return last[1] * 1000;
  for (let i = 0; i < points.length - 1; i++) {
    const [h1, k1] = points[i];
    const [h2, k2] = points[i + 1];
    if (outputHeight >= h1 && outputHeight <= h2) {
      const t = (outputHeight - h1) / (h2 - h1);
      return Math.round((k1 + (k2 - k1) * t) * 1000);
    }
  }
  return last[1] * 1000;
};

export const clampVideoBps = (bps: number): number =>
  Math.max(MIN_VIDEO_BPS, Math.min(MAX_VIDEO_BPS, Math.round(bps)));
