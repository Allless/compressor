import type { EncodableFormat } from "./compress";

export interface Route {
  from: string;
  to: EncodableFormat;
  fromLabel: string;
  toLabel: string;
}

const TO_FORMAT: Record<string, EncodableFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
  gif: "gif",
};

const LABEL: Record<string, string> = {
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
  avif: "AVIF",
  heic: "HEIC",
  heif: "HEIF",
  gif: "GIF",
};

// Parse a path like "/lessly/heic-to-jpg/" → { from: "heic", to: "jpeg", ... }
export const parseRoute = (pathname: string): Route | null => {
  const match = pathname.match(/\/([a-z]+)-to-([a-z]+)(?:\/|\.html)?$/);
  if (!match) return null;
  const [, from, to] = match;
  const target = TO_FORMAT[to];
  if (!target) return null;
  return {
    from,
    to: target,
    fromLabel: LABEL[from] ?? from.toUpperCase(),
    toLabel: LABEL[to] ?? to.toUpperCase(),
  };
};
