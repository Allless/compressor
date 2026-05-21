import { describe, expect, it } from "vitest";
import { isVideoFile } from "../detect-video";

const file = (name: string, type: string): File =>
  new File([new Uint8Array(1)], name, { type });

describe("isVideoFile", () => {
  it("recognises common video MIME types", () => {
    expect(isVideoFile(file("a.mp4", "video/mp4"))).toBe(true);
    expect(isVideoFile(file("a.mov", "video/quicktime"))).toBe(true);
    expect(isVideoFile(file("a.webm", "video/webm"))).toBe(true);
    expect(isVideoFile(file("a.mkv", "video/x-matroska"))).toBe(true);
  });

  it("falls back to extension when MIME is missing", () => {
    expect(isVideoFile(file("clip.mp4", ""))).toBe(true);
    expect(isVideoFile(file("clip.mov", ""))).toBe(true);
    expect(isVideoFile(file("clip.m4v", ""))).toBe(true);
    expect(isVideoFile(file("clip.webm", ""))).toBe(true);
    expect(isVideoFile(file("clip.mkv", ""))).toBe(true);
  });

  it("is case-insensitive on extension", () => {
    expect(isVideoFile(file("CLIP.MP4", ""))).toBe(true);
    expect(isVideoFile(file("Clip.MoV", ""))).toBe(true);
  });

  it("rejects images and unknown extensions", () => {
    expect(isVideoFile(file("photo.jpg", "image/jpeg"))).toBe(false);
    expect(isVideoFile(file("anim.gif", "image/gif"))).toBe(false);
    expect(isVideoFile(file("doc.pdf", "application/pdf"))).toBe(false);
    expect(isVideoFile(file("name.bin", ""))).toBe(false);
  });
});
