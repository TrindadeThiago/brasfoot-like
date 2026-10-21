import { describe, expect, it } from "vitest";
import { createCupSeason, ensurePhaseDrawn, phaseParticipants } from "../../src/knockout/bracket";
import { knockoutFormat, phaseRounds } from "../../src/knockout/rules";
import { CUP_ID, cupBank, lateEntryCup } from "../fixtures/cup-bank";
import { playNextRound } from "./helpers";

function cup(edit?: Parameters<typeof cupBank>[0]) {
  const world = cupBank(edit);
  const created = createCupSeason(world, { competitionId: CUP_ID, seed: "copa-1" });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return { world, season: created.season };
}

describe("createCupSeason (018 R1, R4)", () => {
  it("cria uma Season com uma rodada vazia por perna e o chaveamento sem sorteio", () => {
    const { world, season } = cup();
    expect(knockoutFormat(world, CUP_ID).phases).toHaveLength(4);
    expect(season.competitionId).toBe(CUP_ID);
    expect(season.calendar).toHaveLength(5);
    expect(season.calendar.every((round) => round.fixtures.length === 0)).toBe(true);
    expect(season.clubIds).toHaveLength(16);
    expect(season.bracket?.phases.map((phase) => phase.rounds)).toEqual([[1], [2], [3, 4], [5]]);
    expect(season.bracket?.phases.every((phase) => !phase.drawn)).toBe(true);
    expect(phaseRounds(knockoutFormat(world, CUP_ID))).toEqual([[1], [2], [3, 4], [5]]);
  });
});

describe("ensurePhaseDrawn", () => {
  it("sorteia a fase: 8 confrontos, cada clube uma vez, fixtures na rodada com o confronto", () => {
    const { world, season } = cup();
    const drawn = ensurePhaseDrawn(season, world, 0);
    const phase = drawn.bracket?.phases[0];
    expect(phase?.drawn).toBe(true);
    expect(phase?.ties).toHaveLength(8);
    const fixtures = drawn.calendar[0]?.fixtures ?? [];
    expect(fixtures).toHaveLength(8);
    const clubs = fixtures.flatMap((fixture) => [fixture.home, fixture.away]);
    expect(new Set(clubs).size).toBe(16);
    expect(fixtures.every((fixture) => fixture.tie?.phase === 0 && fixture.tie.legs === 1)).toBe(
      true,
    );
    expect(fixtures.every((fixture) => fixture.seed.length > 0)).toBe(true);
    // A entrada não é alterada.
    expect(season.bracket?.phases[0]?.drawn).toBe(false);
  });

  it("é idempotente e determinístico", () => {
    const { world, season } = cup();
    const once = ensurePhaseDrawn(season, world, 0);
    expect(ensurePhaseDrawn(once, world, 0)).toBe(once);
    expect(ensurePhaseDrawn(season, world, 0)).toEqual(once);
  });

  it("recusa sortear uma fase antes de decidir a anterior", () => {
    const { world, season } = cup();
    expect(() => ensurePhaseDrawn(season, world, 1)).toThrow();
    const drawn = ensurePhaseDrawn(season, world, 0);
    expect(() => ensurePhaseDrawn(drawn, world, 1)).toThrow();
  });

  it("fase de ida e volta: duas rodadas, a volta com o mando invertido", () => {
    let { world, season } = cup();
    for (let round = 1; round <= 2; round++) season = playNextRound(world, season);
    const drawn = ensurePhaseDrawn(season, world, 2);
    const first = drawn.calendar[2]?.fixtures ?? [];
    const second = drawn.calendar[3]?.fixtures ?? [];
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    for (const fixture of first) {
      const back = second.find((entry) => entry.tie?.id === fixture.tie?.id);
      expect(back?.home).toBe(fixture.away);
      expect(back?.away).toBe(fixture.home);
      expect(fixture.tie?.leg).toBe(1);
      expect(back?.tie?.leg).toBe(2);
    }
    void world;
  });

  it("a final é em campo neutro", () => {
    let { world, season } = cup();
    while (season.nextRound < 5) season = playNextRound(world, season);
    const drawn = ensurePhaseDrawn(season, world, 3);
    expect(drawn.calendar[4]?.fixtures[0]?.neutral).toBe(true);
    expect(drawn.calendar[0]?.fixtures.every((fixture) => !fixture.neutral)).toBe(true);
    void world;
  });
});

describe("phaseParticipants com entradas tardias", () => {
  it("fase 0 só com quem não tem entrada; fase 1 = vencedores + entrantes", () => {
    let { world, season } = cup(lateEntryCup);
    expect(phaseParticipants(season, world, 0)).toHaveLength(8);
    season = playNextRound(world, season);
    const next = phaseParticipants(season, world, 1);
    expect(next).toHaveLength(8);
    const entering = knockoutFormat(world, CUP_ID).entries?.[0]?.clubIds ?? [];
    for (const clubId of entering) expect(next).toContain(clubId);
    expect(entering.every((clubId) => !phaseParticipants(season, world, 0).includes(clubId))).toBe(
      true,
    );
    void world;
  });
});

describe("ida e volta, neutro e entradas (018 US4)", () => {
  it("a volta inverte o mando; fases neutras marcam o jogo como neutro", () => {
    const world = cupBank();
    const created = createCupSeason(world, { competitionId: CUP_ID, seed: "copa-mando" });
    if (!created.ok) throw new Error("falhou");
    let season = created.season;
    while (season.nextRound <= season.calendar.length) season = playNextRound(world, season);
    const fixtures = season.calendar.flatMap((round) => round.fixtures);
    const semi = fixtures.filter((fixture) => fixture.tie?.phase === 2);
    for (const first of semi.filter((fixture) => fixture.tie?.leg === 1)) {
      const second = semi.find(
        (fixture) => fixture.tie?.id === first.tie?.id && fixture.tie?.leg === 2,
      );
      expect(second?.home).toBe(first.away);
    }
    const final = fixtures.filter((fixture) => fixture.tie?.phase === 3);
    expect(final.every((fixture) => fixture.neutral)).toBe(true);
    expect(
      fixtures.filter((fixture) => fixture.tie?.phase !== 3).some((fixture) => fixture.neutral),
    ).toBe(false);
  });

  it("clubes de entrada tardia só aparecem a partir da fase de entrada", () => {
    const world = cupBank(lateEntryCup);
    const created = createCupSeason(world, { competitionId: CUP_ID, seed: "copa-entrada" });
    if (!created.ok) throw new Error("falhou");
    const format = world.competitions.find((c) => c.id === CUP_ID)?.format;
    const entering = new Set(
      format?.type === "knockout" ? (format.entries ?? []).flatMap((entry) => entry.clubIds) : [],
    );
    let season = ensurePhaseDrawn(created.season, world, 0);
    const first = season.bracket?.phases[0]?.ties.flatMap((tie) => [tie.home, tie.away]) ?? [];
    expect(first.some((id) => entering.has(id))).toBe(false);
    expect(first).toHaveLength(8);
    season = playNextRound(world, season);
    season = ensurePhaseDrawn(season, world, 1);
    const second = season.bracket?.phases[1]?.ties.flatMap((tie) => [tie.home, tie.away]) ?? [];
    expect(second).toHaveLength(8);
    for (const id of entering) expect(second).toContain(id);
  });
});
