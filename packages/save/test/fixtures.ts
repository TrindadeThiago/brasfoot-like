import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import { joinBankFiles } from "@brasfoot-like/engine";
import { createSave, type SaveFile } from "../src";

export const SERIE_A = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];

let cached: SaveFile | undefined;

/** Save válido da versão atual (memorizado; clonar antes de alterar). */
export function validSave(): SaveFile {
  if (!cached) {
    const result = createSave({
      id: "carreira-teste",
      now: "2026-10-16T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId: SERIE_A[0] as string,
      seed: "teste",
      defaultBank: joinBankFiles({
        "mod.json": mod,
        "countries.json": countries,
        "competitions.json": competitions,
        "clubs.json": clubs,
        "players.json": players,
      }),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    cached = result.save;
  }
  return JSON.parse(JSON.stringify(cached)) as SaveFile;
}
