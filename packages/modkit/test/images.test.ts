import { describe, expect, it } from "vitest";
import { dataUriBytes, imageInfo } from "../src/images";
import { MOD_LIMITS } from "../src/limits";
import { readModPackage, writeModPackage } from "../src/package";
import { jpegOf, modBank, modZipEntries, pngOf, webpOf, zipOf } from "./fixtures";

function withCrest(path: string) {
  return modZipEntries((files) => {
    const clubs = files["clubs.json"] as { crest: { image?: string } }[];
    (clubs[0] as { crest: { image?: string } }).crest.image = path;
  });
}

describe("escudos em imagem (015 US5, R4, R5)", () => {
  it("lê formato e dimensões pelo cabeçalho; SVG e lixo não são imagem", () => {
    expect(imageInfo(pngOf(64, 48))).toEqual({ format: "png", width: 64, height: 48 });
    expect(imageInfo(jpegOf(120, 90))).toEqual({ format: "jpeg", width: 120, height: 90 });
    expect(imageInfo(webpOf(200, 100))).toEqual({ format: "webp", width: 200, height: 100 });
    expect(imageInfo(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toBeUndefined();
    expect(imageInfo(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });

  it("imagem referenciada é aceita e volta como data URI", () => {
    const entries = { ...withCrest("images/clube-001.png"), "images/clube-001.png": pngOf(64, 64) };
    const result = readModPackage(zipOf(entries));
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.images["images/clube-001.png"]).toMatch(/^data:image\/png;base64,/);
    expect(dataUriBytes(result.images["images/clube-001.png"] ?? "")).toEqual(pngOf(64, 64));
    expect(result.summary.images).toBe(1);
  });

  it("imagem que falta, sem uso, formato, tamanho e dimensões", () => {
    const missing = readModPackage(zipOf(withCrest("images/nao-existe.png")));
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors[0]).toMatchObject({
        code: "image.missing",
        section: "clubs",
        path: [0, "crest", "image"],
        params: { clubId: "clube-001", file: "images/nao-existe.png" },
      });
    }
    const unused = readModPackage(zipOf({ ...modZipEntries(), "images/sobra.png": pngOf(10, 10) }));
    expect(unused.ok).toBe(true);
    if (unused.ok) expect(unused.warnings.map((issue) => issue.code)).toContain("image.unused");
    const svg = readModPackage(
      zipOf({ ...withCrest("images/clube-001.png"), "images/clube-001.png": "<svg></svg>" }),
    );
    expect(svg.ok ? [] : svg.errors.map((issue) => issue.code)).toContain("image.bad_format");
    const big = readModPackage(
      zipOf({ ...withCrest("images/clube-001.png"), "images/clube-001.png": pngOf(1024, 64) }),
    );
    expect(big.ok ? [] : big.errors.map((issue) => issue.code)).toContain(
      "image.too_big_dimensions",
    );
    const heavy = readModPackage(
      zipOf({ ...withCrest("images/clube-001.png"), "images/clube-001.png": pngOf(10, 10, 5000) }),
      { ...MOD_LIMITS, image: 1000, images: 2000 },
    );
    expect(heavy.ok ? [] : heavy.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["image.too_large", "package.images_too_large"]),
    );
  });

  it("o pacote gerado leva as imagens", () => {
    const bank = modBank();
    (bank.clubs[0] as { crest: { image?: string } }).crest.image = "images/clube-001.png";
    const first = readModPackage(
      zipOf({ ...withCrest("images/clube-001.png"), "images/clube-001.png": pngOf(32, 32) }),
    );
    if (!first.ok) throw new Error("pacote inválido");
    const again = readModPackage(writeModPackage(first.bank, first.images));
    expect(again.ok && again.images).toEqual(first.images);
  });
});
