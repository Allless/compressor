export type DecodableFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "avif"
  | "heic"
  | "heif"
  | "gif";

export type EncodableFormat = "jpeg" | "png" | "webp" | "avif" | "gif";

export type TargetFormat = "auto" | EncodableFormat;

const EXT_MAP: Record<string, DecodableFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
  heic: "heic",
  heif: "heif",
  gif: "gif",
};

const MIME_MAP: Record<string, DecodableFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export const detectFormat = (file: File): DecodableFormat => {
  const fromMime = MIME_MAP[file.type];
  if (fromMime) return fromMime;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
  throw new Error(`Unsupported format: ${file.type || file.name}`);
};

export const allowedTargets = (input: DecodableFormat): EncodableFormat[] => {
  if (input === "gif") return ["gif"];
  return ["jpeg", "png", "webp", "avif"];
};

export const autoTarget = (input: DecodableFormat): EncodableFormat => {
  if (input === "gif") return "gif";
  if (input === "heic" || input === "heif") return "webp";
  return input;
};

type JSquashFormat = "jpeg" | "png" | "webp" | "avif";

const decodeJsquash = async (
  buffer: ArrayBuffer,
  format: JSquashFormat,
): Promise<ImageData> => {
  switch (format) {
    case "jpeg": {
      const m = await import("@jsquash/jpeg");
      return m.decode(buffer);
    }
    case "png": {
      const m = await import("@jsquash/png");
      return m.decode(buffer);
    }
    case "webp": {
      const m = await import("@jsquash/webp");
      const result = await m.decode(buffer);
      if (!result) throw new Error("Failed to decode WebP image");
      return result;
    }
    case "avif": {
      const m = await import("@jsquash/avif");
      const result = await m.decode(buffer);
      if (!result) throw new Error("Failed to decode AVIF image");
      return result;
    }
  }
};

const decodeHeic = async (buffer: ArrayBuffer): Promise<ImageData> => {
  const libheif = (await import("libheif-js/wasm-bundle")).default;
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  if (!images.length) throw new Error("HEIC file contains no images");
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  const imageData = new ImageData(width, height);
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) reject(new Error("HEIF decode failed"));
      else resolve();
    });
  });
  return imageData;
};

const encodeJsquash = async (
  data: ImageData,
  format: JSquashFormat,
  quality: number,
): Promise<ArrayBuffer> => {
  switch (format) {
    case "jpeg": {
      const m = await import("@jsquash/jpeg");
      return m.encode(data, { quality });
    }
    case "png": {
      const m = await import("@jsquash/png");
      return m.encode(data);
    }
    case "webp": {
      const m = await import("@jsquash/webp");
      return m.encode(data, { quality });
    }
    case "avif": {
      const m = await import("@jsquash/avif");
      return m.encode(data, { quality });
    }
  }
};

// quality 100 -> lossy 0 (lossless); quality 0 -> lossy 200 (max artifacts).
// Gifsicle's docs say --lossy=30..60 is the balanced range.
const optimizeGif = async (
  file: File,
  quality: number,
): Promise<{ blob: Blob; format: "gif" }> => {
  const gifsicle = (await import("gifsicle-wasm-browser")).default;
  const lossy = Math.max(0, Math.min(200, Math.round((100 - quality) * 2)));
  const lossyFlag = lossy > 0 ? `--lossy=${lossy}` : "";
  const result = await gifsicle.run({
    input: [{ file, name: "input.gif" }],
    command: [`-O2 ${lossyFlag} input.gif -o /out/out.gif`],
  });
  if (!result?.length) throw new Error("GIF optimization failed");
  return { blob: result[0], format: "gif" };
};

export const compress = async (
  file: File,
  target: EncodableFormat,
  quality: number,
): Promise<{ blob: Blob; format: EncodableFormat }> => {
  const input = detectFormat(file);

  if (input === "gif") {
    if (target !== "gif") throw new Error("GIF can only be optimized as GIF");
    return optimizeGif(file, quality);
  }

  if (target === "gif") {
    throw new Error("Cannot encode pixel data to GIF");
  }

  const buffer = await file.arrayBuffer();
  const data =
    input === "heic" || input === "heif"
      ? await decodeHeic(buffer)
      : await decodeJsquash(buffer, input);

  const encoded = await encodeJsquash(data, target, quality);
  return {
    blob: new Blob([encoded], { type: `image/${target}` }),
    format: target,
  };
};
