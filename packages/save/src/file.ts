import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";
import type { SaveFile } from "./format";
import { migrateSave } from "./migrate";

/** Marca do envelope do arquivo de save (015 R2). */
export const SAVE_FILE_FORMAT = "brasfoot-like-save";

export type ImportResult =
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "not_a_save" }
  | { status: "corrupt"; reason: string }
  | { status: "future_version"; version: number };

/** Arquivo `.blsave`: gzip de `{ format, exportedAt, save }`. */
export function exportSave(save: SaveFile, now: string): Uint8Array {
  const envelope = { format: SAVE_FILE_FORMAT, exportedAt: now, save };
  return gzipSync(strToU8(JSON.stringify(envelope)), { level: 6 });
}

/** Maior save descompactado aceito na importação (o maior medido em 30 temporadas é ~12 MB). */
export const MAX_SAVE_BYTES = 128 * 1024 * 1024;

/**
 * Descompacta o gzip só se o tamanho declarado no rodapé (ISIZE) couber no limite, e nunca além
 * dele: a saída tem o tamanho declarado + 1, então um rodapé mentiroso trunca e é recusado em vez
 * de inflar na memória. Devolve `undefined` para entrada inválida ou grande demais.
 */
function gunzipLimited(bytes: Uint8Array): Uint8Array | undefined {
  if (bytes.length < 18) return undefined;
  const declared = new DataView(bytes.buffer, bytes.byteOffset, bytes.length).getUint32(
    bytes.length - 4,
    true,
  );
  if (declared > MAX_SAVE_BYTES) return undefined;
  const out = gunzipSync(bytes, { out: new Uint8Array(declared + 1) });
  return out.length === declared ? out : undefined;
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * Lê um arquivo de save, reconhecido pelo conteúdo (gzip ou JSON puro), e passa pelas migrações e
 * pela validação do save. Nunca lança para entrada inválida.
 */
export function importSave(bytes: Uint8Array): ImportResult {
  let parsed: unknown;
  try {
    const raw = isGzip(bytes) ? gunzipLimited(bytes) : bytes;
    if (!raw) return { status: "not_a_save" };
    const text = strFromU8(raw);
    parsed = JSON.parse(text);
  } catch {
    return { status: "not_a_save" };
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    (parsed as { format?: unknown }).format !== SAVE_FILE_FORMAT
  ) {
    return { status: "not_a_save" };
  }
  const result = migrateSave((parsed as { save?: unknown }).save);
  if (result.status === "ok") {
    return result.migratedFrom === undefined
      ? { status: "ok", save: result.save }
      : { status: "ok", save: result.save, migratedFrom: result.migratedFrom };
  }
  return result;
}

/** A mesma carreira com outra identificação (importar como cópia). */
export function asCopy(save: SaveFile, id: string, now: string): SaveFile {
  return { ...save, id, createdAt: now, savedAt: now };
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Nome do arquivo: técnico, clube e data do último salvamento. */
export function saveFileName(save: SaveFile): string {
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId)?.shortName ?? save.clubId;
  const date = save.savedAt.slice(0, 10);
  return `${[slug(save.managerName), slug(club), date].filter(Boolean).join("-")}.blsave`;
}
