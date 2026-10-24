import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BANK_FILES, joinBankFiles, type ModPackage } from "@brasfoot-like/engine";
import { strToU8, zipSync } from "fflate";

export const DEFAULT_MOD = join(import.meta.dirname, "../../../mods/default");
export const EXAMPLE_MOD = join(import.meta.dirname, "../../../mods/exemplo");
export const WORLD_MOD = join(import.meta.dirname, "../../../mods/exemplo-mundo");
export const STAGES_MOD = join(import.meta.dirname, "../../../mods/exemplo-fases");

/** Arquivos de um mod em disco, já lidos como JSON. */
export function modFiles(dir: string = DEFAULT_MOD): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const file of Object.values(BANK_FILES)) {
    try {
      files[file] = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch {
      // arquivo opcional ausente
    }
  }
  return files;
}

export function modBank(dir: string = DEFAULT_MOD): ModPackage {
  return joinBankFiles(modFiles(dir)) as ModPackage;
}

/** `.zip` a partir de `{ caminho: conteúdo }` (texto ou bytes). */
export function zipOf(entries: Record<string, string | Uint8Array>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([path, content]) => [
        path,
        typeof content === "string" ? strToU8(content) : content,
      ]),
    ),
  );
}

/** Arquivos do mod como texto JSON, com edições opcionais. */
export function modZipEntries(
  edit?: (files: Record<string, unknown>) => void,
  dir: string = DEFAULT_MOD,
): Record<string, string | Uint8Array> {
  const files = structuredClone(modFiles(dir));
  edit?.(files);
  return Object.fromEntries(
    Object.entries(files).map(([file, content]) => [file, JSON.stringify(content)]),
  );
}

/** PNG mínimo (só assinatura + IHDR) com as dimensões pedidas. */
export function pngOf(width: number, height: number, padding = 0): Uint8Array {
  const bytes = new Uint8Array(33 + padding);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

/** JPEG mínimo com um segmento SOF0. */
export function jpegOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 255,
    height & 255,
    (width >> 8) & 255,
    width & 255,
    0x03,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
  return bytes;
}

/** WebP mínimo (VP8X) com as dimensões pedidas. */
export function webpOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set(strToU8("RIFF"), 0);
  bytes.set(strToU8("WEBP"), 8);
  bytes.set(strToU8("VP8X"), 12);
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 255, (w >> 8) & 255, (w >> 16) & 255], 24);
  bytes.set([h & 255, (h >> 8) & 255, (h >> 16) & 255], 27);
  return bytes;
}
