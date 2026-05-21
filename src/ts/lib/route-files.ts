import { isVideoFile } from "./detect-video";

export interface RouteDecision {
  files: File[];
  notice: string | null;
}

const plural = (n: number, singular: string, plural: string) =>
  n === 1 ? singular : plural;

export const routeFiles = (incoming: File[]): RouteDecision => {
  if (incoming.length === 0) return { files: [], notice: null };
  if (incoming.length === 1) return { files: incoming, notice: null };

  const images = incoming.filter((f) => !isVideoFile(f));
  const videos = incoming.filter(isVideoFile);

  if (videos.length === 0) return { files: images, notice: null };

  if (images.length > 0) {
    return {
      files: images,
      notice: `Batch mode doesn't support video yet — ignored ${videos.length} video ${plural(videos.length, "file", "files")}.`,
    };
  }

  return {
    files: [videos[0]],
    notice: `Batch mode doesn't support video yet — processing only the first of ${videos.length} videos.`,
  };
};
