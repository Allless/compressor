/** Build the suggested download filename for a re-encoded MP4 from the source file. */
export const downloadName = (original: File): string => {
  const base = original.name.replace(/\.[^.]+$/, "");
  return `${base}.mp4`;
};
