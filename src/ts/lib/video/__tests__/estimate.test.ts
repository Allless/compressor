import { describe, expect, it } from "vitest";
import { estimateBytes } from "../estimate";

describe("estimateBytes", () => {
  it("computes bytes from video + audio bitrate × duration with container overhead", () => {
    // 5 Mbps video + 128 kbps audio for 10 s = (5_128_000 b/s) × 10 / 8 = 6.41 MB
    // × 1.02 overhead ≈ 6.53 MB
    const bytes = estimateBytes({
      videoBps: 5_000_000,
      audioBps: 128_000,
      durationSec: 10,
    });
    expect(bytes).toBeCloseTo(6_538_200, -3);
  });

  it("ignores audioBps when zero (no audio track)", () => {
    const bytes = estimateBytes({
      videoBps: 4_000_000,
      audioBps: 0,
      durationSec: 5,
    });
    // 4_000_000 × 5 / 8 × 1.02 = 2_550_000
    expect(bytes).toBe(2_550_000);
  });

  it("treats negative audioBps as zero (defensive)", () => {
    expect(
      estimateBytes({ videoBps: 1_000_000, audioBps: -1, durationSec: 1 }),
    ).toBe(estimateBytes({ videoBps: 1_000_000, audioBps: 0, durationSec: 1 }));
  });

  it("returns 0 for non-positive video bitrate", () => {
    expect(
      estimateBytes({ videoBps: 0, audioBps: 128_000, durationSec: 10 }),
    ).toBe(0);
    expect(
      estimateBytes({ videoBps: -1, audioBps: 128_000, durationSec: 10 }),
    ).toBe(0);
  });

  it("returns 0 for non-positive duration", () => {
    expect(
      estimateBytes({ videoBps: 5_000_000, audioBps: 128_000, durationSec: 0 }),
    ).toBe(0);
  });

  it("scales linearly with duration", () => {
    const a = estimateBytes({
      videoBps: 3_000_000,
      audioBps: 128_000,
      durationSec: 10,
    });
    const b = estimateBytes({
      videoBps: 3_000_000,
      audioBps: 128_000,
      durationSec: 60,
    });
    expect(b / a).toBeCloseTo(6, 4);
  });
});
