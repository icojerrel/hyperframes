import { describe, expect, it } from "vitest";
import { inferOutputFormat, inferInputKind, buildEncoderArgs } from "./pipeline.js";

describe("background-removal/pipeline — inferOutputFormat", () => {
  it("maps .webm → webm", () => {
    expect(inferOutputFormat("/tmp/out.webm")).toBe("webm");
  });
  it("maps .mov → mov", () => {
    expect(inferOutputFormat("/tmp/out.mov")).toBe("mov");
  });
  it("maps .png → png", () => {
    expect(inferOutputFormat("/tmp/out.png")).toBe("png");
  });
  it("rejects unknown extensions", () => {
    expect(() => inferOutputFormat("/tmp/out.mp4")).toThrow(/Unsupported output extension/);
  });
});

describe("background-removal/pipeline — inferInputKind", () => {
  it("recognizes mp4/mov/webm/mkv/avi as video", () => {
    for (const ext of [".mp4", ".mov", ".webm", ".mkv", ".avi"]) {
      expect(inferInputKind(`/tmp/clip${ext}`)).toBe("video");
    }
  });
  it("recognizes jpg/png/webp as image", () => {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
      expect(inferInputKind(`/tmp/img${ext}`)).toBe("image");
    }
  });
  it("rejects unknown extensions", () => {
    expect(() => inferInputKind("/tmp/file.gif")).toThrow(/Unsupported input/);
  });
});

describe("background-removal/pipeline — buildEncoderArgs", () => {
  it("webm preset emits VP9 + alpha_mode metadata", () => {
    const args = buildEncoderArgs("webm", 1920, 1080, 30, "/tmp/out.webm");
    expect(args).toContain("libvpx-vp9");
    expect(args).toContain("yuva420p");
    // The alpha_mode metadata must be present; without it Chrome ignores the alpha plane.
    const idx = args.indexOf("-metadata:s:v:0");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("alpha_mode=1");
    expect(args[args.length - 1]).toBe("/tmp/out.webm");
  });

  it("mov preset emits ProRes 4444 + yuva444p10le", () => {
    const args = buildEncoderArgs("mov", 1920, 1080, 30, "/tmp/out.mov");
    expect(args).toContain("prores_ks");
    expect(args).toContain("4444");
    expect(args).toContain("yuva444p10le");
  });

  it("png preset emits a single RGBA frame", () => {
    const args = buildEncoderArgs("png", 1920, 1080, 30, "/tmp/out.png");
    expect(args).toContain("-frames:v");
    expect(args).toContain("rgba");
  });

  it("threads input dimensions and fps into raw video header", () => {
    const args = buildEncoderArgs("webm", 640, 480, 24, "/tmp/o.webm");
    const sIdx = args.indexOf("-s");
    expect(args[sIdx + 1]).toBe("640x480");
    const rIdx = args.indexOf("-r");
    expect(args[rIdx + 1]).toBe("24");
  });
});
