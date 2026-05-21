import { describe, expect, it } from "vitest";
import { routeFiles } from "../route-files";

const img = (name = "photo.jpg") =>
  new File([new Uint8Array(1)], name, { type: "image/jpeg" });
const vid = (name = "clip.mp4") =>
  new File([new Uint8Array(1)], name, { type: "video/mp4" });
const vidByExt = (name = "clip.mov") =>
  new File([new Uint8Array(1)], name, { type: "" });

describe("routeFiles", () => {
  it("returns empty + no notice for empty input", () => {
    expect(routeFiles([])).toEqual({ files: [], notice: null });
  });

  it("passes a single image through unchanged", () => {
    const f = img();
    expect(routeFiles([f])).toEqual({ files: [f], notice: null });
  });

  it("passes a single video through unchanged", () => {
    const f = vid();
    expect(routeFiles([f])).toEqual({ files: [f], notice: null });
  });

  it("returns all images with no notice for an all-image batch", () => {
    const fs = [img("a.jpg"), img("b.png"), img("c.webp")];
    expect(routeFiles(fs)).toEqual({ files: fs, notice: null });
  });

  it("filters videos out of a mixed batch and explains why", () => {
    const a = img("a.jpg");
    const b = img("b.png");
    const v = vid();
    const result = routeFiles([a, v, b]);
    expect(result.files).toEqual([a, b]);
    expect(result.notice).toMatch(/ignored 1 video file/);
  });

  it("pluralises 'files' when multiple videos are filtered", () => {
    const a = img("a.jpg");
    const v1 = vid("1.mp4");
    const v2 = vid("2.mp4");
    const result = routeFiles([a, v1, v2]);
    expect(result.files).toEqual([a]);
    expect(result.notice).toMatch(/ignored 2 video files/);
  });

  it("falls back to first video when the whole batch is videos", () => {
    const v1 = vid("1.mp4");
    const v2 = vid("2.mp4");
    const v3 = vidByExt("3.mov");
    const result = routeFiles([v1, v2, v3]);
    expect(result.files).toEqual([v1]);
    expect(result.notice).toMatch(/only the first of 3 videos/);
  });

  it("treats extension-only video files as videos in mixed batches", () => {
    const i = img();
    const v = vidByExt();
    const result = routeFiles([i, v]);
    expect(result.files).toEqual([i]);
    expect(result.notice).toMatch(/ignored 1 video file/);
  });
});
