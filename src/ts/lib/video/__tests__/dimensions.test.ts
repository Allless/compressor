import { describe, expect, it } from "vitest";
import { computeOutputDimensions, targetHeight } from "../dimensions";

describe("targetHeight", () => {
  it("returns undefined when no cap is set", () => {
    expect(targetHeight({ width: 1920, height: 1080 }, null)).toBeUndefined();
    expect(targetHeight({ width: 1920, height: 1080 }, undefined)).toBeUndefined();
  });

  it("returns undefined when the source is already smaller than the cap (never upscale)", () => {
    expect(targetHeight({ width: 1280, height: 720 }, 1080)).toBeUndefined();
  });

  it("returns undefined when the source matches the cap exactly", () => {
    expect(targetHeight({ width: 1920, height: 1080 }, 1080)).toBeUndefined();
  });

  it("returns the cap when the source is taller than it", () => {
    expect(targetHeight({ width: 3840, height: 2160 }, 1080)).toBe(1080);
    expect(targetHeight({ width: 3840, height: 2160 }, 720)).toBe(720);
  });
});

describe("computeOutputDimensions", () => {
  it("returns the source unchanged when no target height is given", () => {
    expect(
      computeOutputDimensions({ width: 1920, height: 1080 }, undefined),
    ).toEqual({ width: 1920, height: 1080 });
  });

  it("returns the source unchanged when target is ≥ source height", () => {
    expect(
      computeOutputDimensions({ width: 1280, height: 720 }, 1080),
    ).toEqual({ width: 1280, height: 720 });
  });

  it("preserves aspect ratio when scaling down", () => {
    // 3840×2160 → cap to 1080 height → expect 1920×1080
    expect(
      computeOutputDimensions({ width: 3840, height: 2160 }, 1080),
    ).toEqual({ width: 1920, height: 1080 });
  });

  it("rounds width to nearest even number", () => {
    // 1920×1080 → cap to 720 → 16:9 → 1280.something
    const out = computeOutputDimensions({ width: 1920, height: 1080 }, 720);
    expect(out.height).toBe(720);
    expect(out.width % 2).toBe(0);
    expect(out.width).toBe(1280);
  });

  it("handles non-16:9 aspect ratios", () => {
    // Portrait phone video: 1080×1920 → cap to 720
    const out = computeOutputDimensions({ width: 1080, height: 1920 }, 720);
    expect(out.height).toBe(720);
    expect(out.width).toBe(406); // 720 * 1080/1920 = 405 → round to even = 406
  });

  it("never returns width below 2", () => {
    const out = computeOutputDimensions({ width: 1, height: 10000 }, 100);
    expect(out.width).toBeGreaterThanOrEqual(2);
  });
});
