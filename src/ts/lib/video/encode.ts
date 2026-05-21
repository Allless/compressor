import type { Conversion } from "mediabunny";
import { clampVideoBps, bitrateForPreset } from "./bitrate";
import { targetHeight } from "./dimensions";
import { parseEncodeError } from "./errors";
import {
  DEFAULT_AUDIO_BPS,
  type EncodeHandle,
  type EncodeOptions,
  type SourceDimensions,
  type VideoSettings,
} from "./types";

const resolveVideoBps = (
  settings: VideoSettings,
  source: SourceDimensions,
  outHeight: number | undefined,
): number => {
  if (settings.quality.kind === "bitrate") {
    return clampVideoBps(settings.quality.videoBps);
  }
  const effectiveHeight = outHeight ?? source.height;
  return bitrateForPreset(settings.quality.preset, effectiveHeight);
};

export const encodeVideo = ({
  file,
  settings,
  onProgress,
}: EncodeOptions): EncodeHandle => {
  let conversion: Conversion | null = null;
  let cancelled = false;

  const result = (async () => {
    const mb = await import("mediabunny");
    const input = new mb.Input({
      formats: mb.ALL_FORMATS,
      source: new mb.BlobSource(file),
    });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error("This file has no video track.");
    }
    const [srcWidth, srcHeight] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
    ]);
    const source: SourceDimensions = { width: srcWidth, height: srcHeight };
    const outHeight = targetHeight(source, settings.maxHeight);
    const videoBps = resolveVideoBps(settings, source, outHeight);
    const audioBps = settings.audioBps ?? DEFAULT_AUDIO_BPS;

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat(),
      target: new mb.BufferTarget(),
    });
    const conv = await mb.Conversion.init({
      input,
      output,
      video: {
        codec: "avc",
        bitrate: videoBps,
        ...(outHeight === undefined ? {} : { height: outHeight }),
      },
      // Passthrough: empty audio options → mediabunny copies the source audio
      // track when its codec is compatible with the output container (AAC in
      // MP4), and re-encodes only when it has to. Re-encode: pin codec +
      // bitrate and force a transcode so the chosen bitrate is honored even
      // when the source could have been copied.
      audio: settings.audioPassthrough
        ? {}
        : { codec: "aac", bitrate: audioBps, forceTranscode: true },
    });
    if (cancelled) {
      await conv.cancel();
      throw new DOMException("Cancelled", "AbortError");
    }
    conversion = conv;
    if (onProgress) conv.onProgress = (p) => onProgress(p);
    if (!conv.isValid) {
      throw new Error(
        parseEncodeError(
          conv.discardedTracks
            .filter((t) => t.track.type === "video" || t.track.type === "audio")
            .map((t) => ({
              type: t.track.type as "video" | "audio",
              reason: t.reason,
            })),
        ),
      );
    }
    await conv.execute();
    const buf = output.target.buffer;
    if (!buf) throw new Error("Encoding produced no output.");
    return new Blob([buf], { type: "video/mp4" });
  })();

  const cancel = async () => {
    cancelled = true;
    if (conversion) await conversion.cancel();
  };

  return { result, cancel };
};
