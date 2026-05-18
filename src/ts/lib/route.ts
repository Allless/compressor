import type { DecodableFormat } from "./compress";

export interface Route {
  slug: string;
  format: DecodableFormat;
  label: string;
  verb: "Compressor" | "Converter" | "Optimizer";
}

const SLUG_TO_FORMAT: Record<string, DecodableFormat> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  avif: "avif",
  heic: "heic",
  heif: "heif",
  gif: "gif",
};

const LABEL: Record<string, string> = {
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  webp: "WebP",
  avif: "AVIF",
  heic: "HEIC",
  heif: "HEIF",
  gif: "GIF",
};

const VERB: Record<string, "Compressor" | "Converter" | "Optimizer"> = {
  png: "Compressor",
  jpg: "Compressor",
  jpeg: "Compressor",
  webp: "Compressor",
  avif: "Compressor",
  heic: "Converter",
  heif: "Converter",
  gif: "Optimizer",
};

// Parse a path like "/image-compressor/png/" → { slug, format, label, verb }.
// Matches the trailing single-segment slug (lowercase letters only).
export const parseRoute = (pathname: string): Route | null => {
  const match = pathname.match(/\/([a-z]+)\/?$/);
  if (!match) return null;
  const slug = match[1];
  const format = SLUG_TO_FORMAT[slug];
  if (!format) return null;
  return {
    slug,
    format,
    label: LABEL[slug] ?? slug.toUpperCase(),
    verb: VERB[slug] ?? "Compressor",
  };
};
