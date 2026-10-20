import { type ModPackage, makeIssue, type ValidationIssue } from "@brasfoot-like/engine";
import type { ModLimits } from "./limits";

export type ImageFormat = "png" | "jpeg" | "webp";

const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function u16be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function u32be(bytes: Uint8Array, at: number): number {
  return (
    (((bytes[at] ?? 0) << 24) >>> 0) +
    (((bytes[at + 1] ?? 0) << 16) | ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0))
  );
}

function u24le(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + length));
}

/**
 * Formato e dimensões de uma imagem lidos só do cabeçalho (PNG IHDR, JPEG SOFn, WebP VP8/VP8L/
 * VP8X), sem decodificar a imagem. Qualquer outra coisa (inclusive SVG) ⇒ `undefined`.
 */
export function imageInfo(
  bytes: Uint8Array,
): { format: ImageFormat; width: number; height: number } | undefined {
  if (bytes.length >= 24 && u32be(bytes, 0) === 0x89504e47 && u32be(bytes, 4) === 0x0d0a1a0a) {
    return { format: "png", width: u32be(bytes, 16), height: u32be(bytes, 20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 9 < bytes.length) {
      if (bytes[at] !== 0xff) return undefined;
      const marker = bytes[at + 1] ?? 0;
      const length = u16be(bytes, at + 2);
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { format: "jpeg", width: u16be(bytes, at + 7), height: u16be(bytes, at + 5) };
      }
      at += 2 + length;
    }
    return undefined;
  }
  if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === "VP8 ") {
      return {
        format: "webp",
        width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff,
        height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const b0 = bytes[21] ?? 0;
      const b1 = bytes[22] ?? 0;
      const b2 = bytes[23] ?? 0;
      const b3 = bytes[24] ?? 0;
      return {
        format: "webp",
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      return { format: "webp", width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
    }
  }
  return undefined;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 sem depender de APIs do navegador ou do Node. */
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += BASE64[(triple >> 18) & 63];
    out += BASE64[(triple >> 12) & 63];
    out += b === undefined ? "=" : BASE64[(triple >> 6) & 63];
    out += c === undefined ? "=" : BASE64[triple & 63];
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let length = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const values = [0, 1, 2, 3].map((offset) => BASE64.indexOf(clean[index + offset] ?? "A"));
    const triple =
      ((values[0] ?? 0) << 18) |
      ((values[1] ?? 0) << 12) |
      ((values[2] ?? 0) << 6) |
      (values[3] ?? 0);
    const remaining = clean.length - index;
    out[length++] = (triple >> 16) & 255;
    if (remaining > 2) out[length++] = (triple >> 8) & 255;
    if (remaining > 3) out[length++] = triple & 255;
  }
  return out.subarray(0, length);
}

export function toDataUri(format: ImageFormat, bytes: Uint8Array): string {
  return `data:${MIME[format]};base64,${toBase64(bytes)}`;
}

/** Bytes de um data URI em base64 (para gerar o pacote). */
export function dataUriBytes(uri: string): Uint8Array {
  return fromBase64(uri.slice(uri.indexOf(",") + 1));
}

/**
 * Confere as imagens do pacote (research.md R4, R5): formato, tamanho, dimensões, soma, imagens
 * referenciadas que faltam e imagens sem uso. Devolve os data URIs das imagens aceitas.
 */
export function checkImages(
  bank: Pick<ModPackage, "clubs">,
  files: Record<string, Uint8Array>,
  limits: ModLimits,
): { images: Record<string, string>; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const images: Record<string, string> = {};
  let total = 0;
  for (const path of Object.keys(files).sort()) {
    const bytes = files[path] as Uint8Array;
    total += bytes.length;
    const info = imageInfo(bytes);
    if (!info) {
      issues.push(makeIssue("image.bad_format", "images", [path], { file: path }));
      continue;
    }
    if (bytes.length > limits.image) {
      issues.push(
        makeIssue("image.too_large", "images", [path], {
          file: path,
          size: bytes.length,
          max: limits.image,
        }),
      );
      continue;
    }
    if (info.width > limits.dimension || info.height > limits.dimension) {
      issues.push(
        makeIssue("image.too_big_dimensions", "images", [path], {
          file: path,
          width: info.width,
          height: info.height,
          max: limits.dimension,
        }),
      );
      continue;
    }
    images[path] = toDataUri(info.format, bytes);
  }
  if (total > limits.images) {
    issues.push(
      makeIssue("package.images_too_large", "package", [], { size: total, max: limits.images }),
    );
  }
  const used = new Set<string>();
  bank.clubs.forEach((club, index) => {
    const path = club.crest.image;
    if (!path) return;
    used.add(path);
    if (!(path in files)) {
      issues.push(
        makeIssue(
          "image.missing",
          "clubs",
          [index, "crest", "image"],
          { clubId: club.id, file: path },
          club.id,
        ),
      );
    }
  });
  for (const path of Object.keys(files).sort()) {
    if (!used.has(path)) issues.push(makeIssue("image.unused", "images", [path], { file: path }));
  }
  return { images, issues };
}
