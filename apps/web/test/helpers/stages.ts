import { completeCareerDay, generateStagesBank, type ModPackage } from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  migrateSave,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";

/** Clube da divisão de baixo (a disputada em fases) comandado pelo jogador. */
export const STAGES_CLUB = "clube-021";

let counter = 0;
let base: SaveFile | undefined;

/**
 * Carreira no banco de exemplo das fases (019): a divisão de baixo tem 20 clubes em 4 grupos de 5
 * seguidos de mata-mata; a de cima, 8 clubes (para os testes serem rápidos).
 */
export function stagesSave(id: string, clubId = STAGES_CLUB): SaveFile {
  if (!base || base.clubId !== clubId) {
    const result = createSave({
      id: "base-fases",
      now: "2026-10-23T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: "teste-web-fases",
      defaultBank: generateStagesBank({ topClubs: 8 }),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    base = result.save;
  }
  return { ...(JSON.parse(JSON.stringify(base)) as SaveFile), id };
}

/** Joga `days` dias de jogos (o jogo do clube do jogador é simulado com a escalação dele). */
export function playDays(save: SaveFile, days: number): SaveFile {
  let current = save;
  for (let day = 0; day < days; day++) {
    const managed = managedClubId(current);
    const result = completeCareerDay(
      seasonStateOf(current),
      current.seed,
      managed,
      undefined,
      managed ? { [managed]: current.lineup } : undefined,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    current = withDayResult(current, result.state);
  }
  return current;
}

/** Carreira de fases salva num IndexedDB novo, com `days` dias já jogados. */
export async function storedStages(
  days = 0,
  id = "fases",
  edit?: (save: SaveFile) => SaveFile,
  from: SaveFile = stagesSave(id),
): Promise<{ store: SaveStore; save: SaveFile }> {
  const played = playDays(from, days);
  const save = edit ? edit(played) : played;
  const store = createIndexedDbStore(`fases-${counter++}`, migrateSave);
  await store.save(save);
  return { store, save };
}

/** Joga até o fim da temporada. */
export function playToSeasonEnd(save: SaveFile): SaveFile {
  let current = save;
  while (!isCareerSeasonOver(current)) current = playDays(current, 1);
  return current;
}

/** A carreira de fases com a 1ª temporada jogada e virada (o histórico tem uma entrada). */
export function stagesAfterSeason(id = "fases"): SaveFile {
  const turned = advanceCareerSeason(playToSeasonEnd(stagesSave(id)), "2026-10-24T00:00:00.000Z");
  if (!turned.ok) throw new Error(JSON.stringify(turned.error));
  return turned.save;
}

/**
 * Carreira com a divisão em fases no TOPO (20 clubes, rebaixa 2) e a liga de 8 clubes embaixo:
 * deixa ver quem "cairia hoje" na classificação geral.
 */
export function stagesTopSave(id = "fases-topo"): SaveFile {
  const bank = JSON.parse(JSON.stringify(generateStagesBank({ topClubs: 8 }))) as ModPackage;
  const competition = bank.competitions[0];
  const [small, big] = competition?.divisions ?? [];
  if (!competition || !small || !big) throw new Error("sem divisões");
  big.level = 1;
  big.promotionSlots = 0;
  big.relegationSlots = 2;
  small.level = 2;
  small.promotionSlots = 2;
  small.relegationSlots = 0;
  competition.divisions = [big, small];
  const result = createSave({
    id,
    now: "2026-10-23T12:00:00.000Z",
    managerName: "Ana Souza",
    clubId: STAGES_CLUB,
    seed: "teste-web-topo",
    defaultBank: bank,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.save;
}
