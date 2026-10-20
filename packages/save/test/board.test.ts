import {
  type BoardState,
  completeCareerRound,
  finishRound,
  isLeagueSeasonOver,
  startLeagueRound,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  acceptManagerOffer,
  advanceCareerSeason,
  createSave,
  declineManagerOffer,
  dismissBoardNotice,
  isEmployed,
  managedClubId,
  migrateSave,
  type SaveFile,
  userSeason,
  withRoundResult,
} from "../src";
import { defaultBank, SERIE_A, validSave } from "./fixtures";

/** Uma rodada pelo mesmo caminho do provider (direto, sem escalação quando desempregado). */
function playRound(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const started = startLeagueRound(
    save.league,
    save.bank,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!started.ok) throw new Error(JSON.stringify(started.error));
  const result = completeCareerRound(
    save.league,
    save.finances,
    save.bank,
    finishRound(started.round),
    managed,
    { state: save.renewal, careerSeed: save.seed },
    { state: save.market, careerSeed: save.seed },
    { state: save.board, careerSeed: save.seed },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withRoundResult(save, result);
}

function playRounds(save: SaveFile, rounds: number): SaveFile {
  let current = save;
  for (let index = 0; index < rounds && !isLeagueSeasonOver(current.league); index++) {
    current = playRound(current);
  }
  return current;
}

/** Força a demissão na próxima rodada: meta de título e confiança zerada. */
function doomed(save: SaveFile): SaveFile {
  const board: BoardState = structuredClone(save.board);
  const club = board.clubs[save.clubId];
  if (!club?.goals) throw new Error("sem metas");
  club.goals.sport.position = 1;
  club.confidence = 0;
  return { ...save, board };
}

describe("opção sem demissão na criação (FR-035)", () => {
  it("padrão desativada; ativada fica gravada", () => {
    const base = {
      id: "c",
      now: "2026-10-16T12:00:00.000Z",
      managerName: "Ana",
      clubId: SERIE_A[0] as string,
      seed: "s",
      defaultBank: defaultBank(),
    };
    const off = createSave(base);
    const on = createSave({ ...base, noFiring: true });
    if (!off.ok || !on.ok) throw new Error("criação");
    expect(off.save.board.manager.noFiring).toBe(false);
    expect(on.save.board.manager.noFiring).toBe(true);
    expect(on.save.board.manager.clubId).toBe(base.clubId);
  });
});

describe("demissão e recomeço no mesmo save (US4, critério de aceite 3, SC-003)", () => {
  it("demitido → rodadas sem clube → aceitar → temporada inteira com o novo clube", () => {
    let save = playRounds(validSave(), 10);
    save = playRound(doomed(save));
    expect(isEmployed(save)).toBe(false);
    expect(managedClubId(save)).toBe("");
    expect(save.lineupNotice).toBeUndefined();
    expect(save.board.notice?.kind).toBe("fired");
    const reopened = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(reopened.status).toBe("ok");
    save = dismissBoardNotice(save);
    expect(save.board.notice).toBeUndefined();

    let guard = 0;
    while (!save.board.offers.some((offer) => offer.status === "pending") && guard < 60) {
      if (isLeagueSeasonOver(save.league)) {
        const turned = advanceCareerSeason(save, "2026-10-17T00:00:00.000Z");
        if (!turned.ok) throw new Error(JSON.stringify(turned.error));
        save = turned.save;
      } else {
        save = playRound(save);
      }
      guard += 1;
    }
    const offer = save.board.offers.find((entry) => entry.status === "pending");
    if (!offer) throw new Error("sem proposta");
    const accepted = acceptManagerOffer(save, offer.id);
    if (!accepted.ok) throw new Error(accepted.error.code);
    save = accepted.save;
    expect(save.clubId).toBe(offer.clubId);
    expect(isEmployed(save)).toBe(true);
    expect(userSeason(save).formations[save.clubId]).toBe(save.lineup.formation);
    const squad = new Set(
      save.bank.players.filter((player) => player.clubId === save.clubId).map((p) => p.id),
    );
    expect(Object.values(save.lineup.starters).every((id) => squad.has(id))).toBe(true);
    expect(migrateSave(JSON.parse(JSON.stringify(save))).status).toBe("ok");

    if (!isLeagueSeasonOver(save.league)) save = playRounds(save, 100);
    const turned = advanceCareerSeason(save, "2026-10-18T00:00:00.000Z");
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    save = playRounds(turned.save, 100);
    expect(isLeagueSeasonOver(save.league)).toBe(true);
    expect(save.board.history.stints.length).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it("recusar mantém a proposta como recusada e o técnico desempregado", () => {
    let save = playRound(doomed(playRounds(validSave(), 10)));
    let guard = 0;
    while (!save.board.offers.some((offer) => offer.status === "pending") && guard < 40) {
      if (isLeagueSeasonOver(save.league)) break;
      save = playRound(save);
      guard += 1;
    }
    const offer = save.board.offers.find((entry) => entry.status === "pending");
    if (!offer) return;
    const declined = declineManagerOffer(save, offer.id);
    expect(declined.board.offers.find((entry) => entry.id === offer.id)?.status).toBe("declined");
    expect(isEmployed(declined)).toBe(false);
  });
});
