export interface EstimateInput {
  videoBps: number;
  audioBps: number;
  durationSec: number;
}

// Container metadata (moov atom, packet headers, etc.) adds roughly 1–3% on top
// of the raw stream sizes. 2% is a reasonable middle estimate.
const CONTAINER_OVERHEAD = 1.02;

/**
 * Predicted output size in bytes for a given bitrate/duration combo.
 * Returns 0 if any input is non-positive.
 */
export const estimateBytes = ({
  videoBps,
  audioBps,
  durationSec,
}: EstimateInput): number => {
  if (videoBps <= 0 || durationSec <= 0) return 0;
  const totalBits = (videoBps + Math.max(0, audioBps)) * durationSec;
  return Math.round((totalBits / 8) * CONTAINER_OVERHEAD);
};
