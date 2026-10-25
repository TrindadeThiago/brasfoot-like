import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { clubFixtures, competitionSeason, currentDay } from "../../src/career/season-state";
import { groupTables } from "../../src/stages/classification";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, playDays, playUntil } from "./continental-helpers";

const SEED = "continental-descida";

const major = (state: CareerSeasonState) =>
  competitionSeason(state, CONTINENTAL_IDS.major).divisions[0];
const minor = (state: CareerSeasonState) =>
  competitionSeason(state, CONTINENTAL_IDS.minor).divisions[0];

describe("o clube que desce de uma competição joga a outra (022 US3, FR-009)", () => {
  // O resultado depende do país do técnico (a liga dele é simulada por inteiro), então procura-se
  // um clube que, sendo o técnico, termina em 3º no próprio grupo.
  const groupsDone = (state: CareerSeasonState) => {
    const season = major(state);
    const stage = season?.stages?.[0];
    return !!season && !!stage && season.nextRound > Math.max(...stage.rounds);
  };
  const candidates =
    compactState({ seed: SEED }).state.world.competitions.find(
      (entry) => entry.id === CONTINENTAL_IDS.major,
    )?.divisions[0]?.clubIds ?? [];
  let dropped = "";
  let sealed: CareerSeasonState | undefined;
  for (const candidate of candidates) {
    const probe = compactState({ seed: SEED, manager: candidate });
    const done = playUntil(probe.state, SEED, candidate, groupsDone);
    const third = groupTables(major(done) as never, done.world, 0).some(
      ({ rows }) => rows[2]?.clubId === candidate,
    );
    if (!third) continue;
    dropped = candidate;
    sealed = playUntil(
      probe.state,
      SEED,
      candidate,
      (state) => minor(state)?.stages?.[1]?.started === true,
    );
    break;
  }
  if (!sealed) throw new Error("nenhum clube terminou em 3º no próprio grupo");
  const droppedState = sealed;

  it("o técnico eliminado nos grupos aparece na menor com o calendário novo", () => {
    expect(minor(droppedState)?.clubIds).toContain(dropped);
    expect(minor(droppedState)?.stages?.[1]?.clubIds).toContain(dropped);
    // O calendário do clube passa a ter jogos da menor, todos depois de hoje.
    const fixtures = clubFixtures(droppedState, dropped).filter(
      (fixture) => fixture.competitionId === CONTINENTAL_IDS.minor,
    );
    expect(fixtures.length).toBeGreaterThan(0);
    const today = currentDay(droppedState)?.date ?? "";
    expect(fixtures.every((fixture) => fixture.date > today)).toBe(true);
  });

  it("nada é criado no passado: o clube não tem jogo da menor antes da fase em que entrou", () => {
    const firstRound = Math.min(...(minor(droppedState)?.stages?.[1]?.rounds ?? [0]));
    const records = (minor(droppedState)?.records ?? []).filter(
      (record) => record.home === dropped || record.away === dropped,
    );
    expect(records).toEqual([]);
    expect(firstRound).toBeGreaterThan(1);
  });

  it("os jogos dele na menor são completos e salvar/carregar no meio não muda o resultado", () => {
    const direct = playDays(droppedState, "end", SEED, dropped);
    const restored = JSON.parse(JSON.stringify(droppedState)) as typeof droppedState;
    const resumed = playDays(restored, "end", SEED, dropped);
    expect(JSON.stringify(minor(resumed))).toBe(JSON.stringify(minor(direct)));
    const mine = (minor(direct)?.records ?? []).filter(
      (record) => record.home === dropped || record.away === dropped,
    );
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((record) => record.summary !== true)).toBe(true);
  }, 300_000);
});
