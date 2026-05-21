export const VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|mkv)$/i;

export const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT_RE.test(file.name);
};
