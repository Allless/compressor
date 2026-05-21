import { describe, expect, it } from "vitest";
import {
  bitrateForPreset,
  clampVideoBps,
  MAX_VIDEO_BPS,
  MIN_VIDEO_BPS,
} from "../bitrate";

describe("bitrateForPreset", () => {
  it("returns the reference value at each preset's anchor height", () => {
    expect(bitrateForPreset("low", 480)).toBe(700_000);
    expect(bitrateForPreset("low", 720)).toBe(1_500_000);
    expect(bitrateForPreset("low", 1080)).toBe(3_000_000);
    expect(bitrateForPreset("medium", 480)).toBe(1_200_000);
    expect(bitrateForPreset("medium", 1080)).toBe(5_000_000);
    expect(bitrateForPreset("medium", 2160)).toBe(20_000_000);
    expect(bitrateForPreset("high", 1080)).toBe(8_000_000);
    expect(bitrateForPreset("high", 2160)).toBe(35_000_000);
  });

  it("clamps below the lowest anchor", () => {
    expect(bitrateForPreset("medium", 360)).toBe(1_200_000);
    expect(bitrateForPreset("medium", 0)).toBe(1_200_000);
  });

  it("clamps above the highest anchor", () => {
    expect(bitrateForPreset("medium", 4320)).toBe(20_000_000);
    expect(bitrateForPreset("high", 8000)).toBe(35_000_000);
  });

  it("interpolates linearly between anchors", () => {
    // midpoint between 720 (2500k) and 1080 (5000k) → ~3750k
    const mid = bitrateForPreset("medium", 900);
    expect(mid).toBeGreaterThan(2_500_000);
    expect(mid).toBeLessThan(5_000_000);
    expect(mid).toBe(3_750_000);
  });

  it("scales monotonically with height for a given preset", () => {
    let prev = -1;
    for (const h of [480, 720, 900, 1080, 1280, 1440, 1800, 2160]) {
      const v = bitrateForPreset("medium", h);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("scales monotonically across presets at a given height", () => {
    expect(bitrateForPreset("low", 1080)).toBeLessThan(
      bitrateForPreset("medium", 1080),
    );
    expect(bitrateForPreset("medium", 1080)).toBeLessThan(
      bitrateForPreset("high", 1080),
    );
  });
});

describe("clampVideoBps", () => {
  it("rounds the input to an integer", () => {
    expect(clampVideoBps(1_500_000.7)).toBe(1_500_001);
  });

  it("enforces the min", () => {
    expect(clampVideoBps(50_000)).toBe(MIN_VIDEO_BPS);
    expect(clampVideoBps(0)).toBe(MIN_VIDEO_BPS);
    expect(clampVideoBps(-1)).toBe(MIN_VIDEO_BPS);
  });

  it("enforces the max", () => {
    expect(clampVideoBps(200_000_000)).toBe(MAX_VIDEO_BPS);
  });

  it("passes mid-range values through", () => {
    expect(clampVideoBps(3_000_000)).toBe(3_000_000);
  });
});
