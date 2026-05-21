import type { VideoMeta } from "./types";

export const probeH264Encode = async (): Promise<boolean> => {
  const { canEncodeVideo } = await import("mediabunny");
  return canEncodeVideo("avc");
};

/**
 * Reads source metadata (dimensions, duration, audio presence) without scanning
 * the full file. Used to populate the resolution display and live size estimate
 * before any encoding starts.
 */
export const probeFile = async (file: File): Promise<VideoMeta> => {
  const mb = await import("mediabunny");
  const input = new mb.Input({
    formats: mb.ALL_FORMATS,
    source: new mb.BlobSource(file),
  });
  const track = await input.getPrimaryVideoTrack();
  if (!track) {
    throw new Error("This file has no video track.");
  }
  const [displayWidth, displayHeight, durationSec, audioTrack] = await Promise.all([
    track.getDisplayWidth(),
    track.getDisplayHeight(),
    input.getDurationFromMetadata().then((d) => d ?? 0),
    input.getPrimaryAudioTrack(),
  ]);
  return {
    displayWidth,
    displayHeight,
    durationSec,
    hasAudio: audioTrack !== null,
  };
};
