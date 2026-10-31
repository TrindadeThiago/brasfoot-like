import { DEFAULT_PROFILE, generateFootballWorld, type ModPackage } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  createSave,
  isCareerSeasonOver,
  quoteManagerTermination,
  type SaveFile,
  startManagerNegotiation,
  terminateManagerContract,
} from "../src";
import { playDay, SERIE_A, validSave } from "./fixtures";

// Auditoria v1.0.0, A9: rescindir os melhores depois da última rodada baixava a meta da diretoria e
// o jogador voltava como livre sem custo. Agora a rescisão fecha com a temporada e quem o clube
// rescindiu não volta.
function bestPlayers(save: SaveFile, count: number) {
  return save.bank.players
    .filter((player) => player.clubId === save.clubId)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, count);
}

function checkSave(start: SaveFile) {
  // 1) Rescindir (mid-season) deixa o jogador livre, e o próprio clube não o recontrata.
  let save = start;
  const [star] = bestPlayers(save, 1);
  if (!star) throw new Error("sem jogador");
  const terminated = terminateManagerContract(save, star.id);
  if (!terminated.ok) throw new Error(JSON.stringify(terminated.error));
  save = terminated.save;
  expect(save.market.freeAgents.find((agent) => agent.player.id === star.id)).toMatchObject({
    lastClubId: save.clubId,
    releasedByClub: true,
  });
  expect(startManagerNegotiation(save, { kind: "free", playerId: star.id })).toMatchObject({
    ok: false,
    error: { code: "market.recently_released" },
  });

  // 2) Depois da última rodada, a rescisão é recusada (cotação e ação).
  while (!isCareerSeasonOver(save)) save = playDay(save);
  const [next] = bestPlayers(save, 1);
  if (!next) throw new Error("sem jogador");
  expect(quoteManagerTermination(save, next.id)).toMatchObject({
    ok: false,
    error: { code: "market.season_over" },
  });
  expect(terminateManagerContract(save, next.id)).toMatchObject({
    ok: false,
    error: { code: "market.season_over" },
  });
}

describe("rescisão sem recontratação (A9)", () => {
  it("no mundo de uma divisão", () => {
    checkSave(validSave(SERIE_A[2] as string));
  }, 600_000);

  it("no mundo de vários países", () => {
    const bank = structuredClone(
      generateFootballWorld(DEFAULT_PROFILE, "carreira-mundo"),
    ) as ModPackage;
    const clubId = bank.clubs.find((club) => club.countryId === "brasil")?.id as string;
    const created = createSave({
      id: "m",
      now: "2026-10-27T00:00:00.000Z",
      managerName: "Ana",
      clubId,
      seed: "carreira-mundo",
      defaultBank: bank,
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    checkSave(created.save);
  }, 900_000);
});
