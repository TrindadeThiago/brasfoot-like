import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import { createBoard, joinBankFiles } from "@brasfoot-like/engine";
import { createSave, initialLineup, type SaveFile, userSeason } from "@brasfoot-like/save";

export const SERIE_A = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];

let base: SaveFile | undefined;

/** Save válido com id, data e clube escolhidos (o banco é calculado uma vez e clonado). */
export function careerSave(
  id: string,
  savedAt = "2026-10-16T12:00:00.000Z",
  clubIndex = 0,
): SaveFile {
  if (!base) {
    const result = createSave({
      id: "base",
      now: savedAt,
      managerName: "Ana Souza",
      clubId: SERIE_A[0] as string,
      seed: "teste-web",
      defaultBank: joinBankFiles({
        "mod.json": mod,
        "countries.json": countries,
        "competitions.json": competitions,
        "clubs.json": clubs,
        "players.json": players,
      }),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    base = result.save;
  }
  const copy = JSON.parse(JSON.stringify(base)) as SaveFile;
  const clubId = SERIE_A[clubIndex] as string;
  if (clubIndex === 0) return { ...copy, id, savedAt, createdAt: savedAt };
  const moved = {
    ...copy,
    clubId,
    board: createBoard(copy.bank, copy.league, copy.finances, copy.seed, {
      clubId,
      noFiring: false,
    }),
  };
  const lineup = initialLineup(copy.bank, userSeason(moved), clubId);
  return { ...moved, id, savedAt, createdAt: savedAt, lineup };
}
