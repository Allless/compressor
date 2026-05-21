import type { SourceDimensions } from "./types";

/**
 * Returns the height to pass to the encoder, or `undefined` if no resize is needed
 * (either because `maxHeight` is null/undefined, or the source is already at or
 * below that height). Never returns a value taller than the source — we don't upscale.
 */
export const targetHeight = (
  source: SourceDimensions,
  maxHeight: number | null | undefined,
): number | undefined => {
  if (maxHeight == null) return undefined;
  if (source.height <= maxHeight) return undefined;
  return maxHeight;
};

/**
 * Predicts the output dimensions for a given resize target, preserving aspect ratio.
 * Width is rounded to the nearest even number (H.264 friendly). If the target is
 * `undefined`, the source dimensions are returned unchanged.
 */
export const computeOutputDimensions = (
  source: SourceDimensions,
  height: number | undefined,
): SourceDimensions => {
  if (height == null || height >= source.height) return source;
  const aspect = source.width / source.height;
  const rawWidth = height * aspect;
  const width = Math.max(2, Math.round(rawWidth / 2) * 2);
  return { width, height };
};
