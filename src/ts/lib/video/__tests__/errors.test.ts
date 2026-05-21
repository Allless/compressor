import { describe, expect, it } from "vitest";
import { parseEncodeError } from "../errors";

describe("parseEncodeError", () => {
  it("returns a generic message when nothing was discarded", () => {
    expect(parseEncodeError([])).toBe(
      "Cannot convert this file — no usable video or audio track.",
    );
  });

  it("includes the track type and a human reason for each discarded track", () => {
    const msg = parseEncodeError([
      { type: "video", reason: "undecodable_source_codec" },
    ]);
    expect(msg).toMatch(/video/);
    expect(msg).toMatch(/can't be decoded/);
  });

  it("joins multiple discarded tracks with commas", () => {
    const msg = parseEncodeError([
      { type: "video", reason: "undecodable_source_codec" },
      { type: "audio", reason: "no_encodable_target_codec" },
    ]);
    expect(msg).toMatch(/video/);
    expect(msg).toMatch(/audio/);
    expect(msg).toMatch(/, /);
  });

  it("falls back to the raw reason string for unmapped reasons", () => {
    const msg = parseEncodeError([
      // @ts-expect-error — testing fallback for an out-of-union reason
      { type: "video", reason: "future_reason" },
    ]);
    expect(msg).toContain("future_reason");
  });
});
