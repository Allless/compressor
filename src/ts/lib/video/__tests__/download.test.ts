import { describe, expect, it } from "vitest";
import { downloadName } from "../download";

const f = (name: string) =>
  new File([new Uint8Array(1)], name, { type: "video/mp4" });

describe("downloadName", () => {
  it("replaces a common video extension with .mp4", () => {
    expect(downloadName(f("clip.mov"))).toBe("clip.mp4");
    expect(downloadName(f("clip.webm"))).toBe("clip.mp4");
    expect(downloadName(f("clip.mkv"))).toBe("clip.mp4");
  });

  it("keeps the original basename", () => {
    expect(downloadName(f("My Birthday Party 2024.MOV"))).toBe(
      "My Birthday Party 2024.mp4",
    );
  });

  it("appends .mp4 when there is no extension", () => {
    expect(downloadName(f("noext"))).toBe("noext.mp4");
  });

  it("only strips the last segment after the final dot", () => {
    expect(downloadName(f("trailer.v2.mov"))).toBe("trailer.v2.mp4");
  });
});
