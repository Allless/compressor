import { describe, expect, it } from "vitest";
import {
  allowedTargets,
  autoTarget,
  detectFormat,
  targetWidth,
} from "../compress";

const fakeFile = (name: string, type: string): File =>
  new File([new Uint8Array(1)], name, { type });

describe("detectFormat", () => {
  it("detects from mime type", () => {
    expect(detectFormat(fakeFile("x.jpg", "image/jpeg"))).toBe("jpeg");
    expect(detectFormat(fakeFile("x.png", "image/png"))).toBe("png");
    expect(detectFormat(fakeFile("x.webp", "image/webp"))).toBe("webp");
    expect(detectFormat(fakeFile("x.avif", "image/avif"))).toBe("avif");
    expect(detectFormat(fakeFile("x.heic", "image/heic"))).toBe("heic");
    expect(detectFormat(fakeFile("x.heif", "image/heif"))).toBe("heif");
    expect(detectFormat(fakeFile("x.gif", "image/gif"))).toBe("gif");
  });

  it("falls back to extension when mime is missing", () => {
    expect(detectFormat(fakeFile("photo.JPG", ""))).toBe("jpeg");
    expect(detectFormat(fakeFile("photo.png", ""))).toBe("png");
    expect(detectFormat(fakeFile("iphone.HEIC", ""))).toBe("heic");
    expect(detectFormat(fakeFile("anim.gif", ""))).toBe("gif");
  });

  it("throws on unknown format", () => {
    expect(() => detectFormat(fakeFile("x.bmp", "image/bmp"))).toThrow();
  });
});

describe("allowedTargets", () => {
  it("limits gif input to gif output", () => {
    expect(allowedTargets("gif")).toEqual(["gif"]);
  });

  it("allows standard outputs for everything else", () => {
    const standard = ["jpeg", "png", "webp", "avif"];
    expect(allowedTargets("jpeg")).toEqual(standard);
    expect(allowedTargets("heic")).toEqual(standard);
    expect(allowedTargets("heif")).toEqual(standard);
  });
});

describe("autoTarget", () => {
  it("keeps the same format for jSquash inputs", () => {
    expect(autoTarget("jpeg")).toBe("jpeg");
    expect(autoTarget("png")).toBe("png");
    expect(autoTarget("webp")).toBe("webp");
    expect(autoTarget("avif")).toBe("avif");
  });

  it("falls back to webp for HEIC/HEIF (no encoder)", () => {
    expect(autoTarget("heic")).toBe("webp");
    expect(autoTarget("heif")).toBe("webp");
  });

  it("keeps gif as gif", () => {
    expect(autoTarget("gif")).toBe("gif");
  });
});

describe("targetWidth", () => {
  it("returns undefined when no max is set", () => {
    expect(targetWidth(3840, null)).toBeUndefined();
    expect(targetWidth(3840, undefined)).toBeUndefined();
  });

  it("returns undefined when max would upscale", () => {
    expect(targetWidth(800, 1920)).toBeUndefined();
    expect(targetWidth(800, 800)).toBeUndefined();
  });

  it("returns the max when it would shrink", () => {
    expect(targetWidth(3840, 1920)).toBe(1920);
    expect(targetWidth(2000, 1280)).toBe(1280);
  });

  it("rounds non-integer max", () => {
    expect(targetWidth(3840, 1919.6)).toBe(1920);
  });

  it("rejects invalid maxes", () => {
    expect(targetWidth(3840, 0)).toBeUndefined();
    expect(targetWidth(3840, -100)).toBeUndefined();
    expect(targetWidth(3840, Number.NaN)).toBeUndefined();
    expect(targetWidth(3840, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
