// API pública do modkit (015 contracts/modkit-and-save.md): pacotes de mod, imagens e CSV.

export type { CsvResult, CsvRow } from "./csv";
export { applyCsv, CLUB_COLUMNS, clubsToCsv, PLAYER_COLUMNS, parseCsv, playersToCsv } from "./csv";
export type { ImageFormat } from "./images";
export { checkImages, dataUriBytes, imageInfo, toDataUri } from "./images";
export type { ModLimits } from "./limits";
export { MOD_LIMITS } from "./limits";
export type { ModPackageResult } from "./package";
export { readModPackage, writeModPackage } from "./package";
export type { ModSummary } from "./summary";
export { summarizeMod } from "./summary";
