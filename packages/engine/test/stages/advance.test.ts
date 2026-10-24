import { describe, expect, it } from "vitest";
import { tieState } from "../../src/knockout/tie";
import type { CompletedBank, StageFormat } from "../../src/model/types";
import { advanceSeason, isSeasonOver } from "../../src/season/season";
import { advanceStages } from "../../src/stages/advance";
import { stageQualifiers } from "../../src/stages/classification";
import { cupView } from "../../src/stages/cup-view";
import { knockoutAfterGroups, LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";
import { playRounds, playToEnd, stagedSeason } from "./helpers";

// 019 (T024): avanço das fases a cada rodada fechada (research.md R4).
const world = regionalBank();

function withStages(base: CompletedBank, stages: StageFormat[]): CompletedBank {
  const copy = JSON.parse(JSON.stringify(base)) as CompletedBank;
  const lower = copy.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  if (lower) lower.stages = stages;
  return copy;
}

describe("advanceStages", () => {
  it("devolve a mesma Season quando nada precisa avançar", () => {
    const season = stagedSeason(world, "avanco-1");
    expect(advanceStages(season, world)).toBe(season);
    const mid = playRounds(world, season, 2);
    expect(advanceStages(mid, world)).toBe(mid);
  });

  it("não faz nada numa Season sem fases", () => {
    const plain = { competitionId: "x", seed: "s", calendar: [] } as never;
    expect(advanceStages(plain, world)).toBe(plain);
  });

  it("a fase eliminatória só é sorteada depois da última rodada de grupos", () => {
    const season = stagedSeason(world, "avanco-2");
    const before = playRounds(world, season, 4);
    expect(before.stages?.[1]?.started).toBe(false);
    expect(before.calendar[5]?.fixtures).toHaveLength(0);

    const after = playRounds(world, before, 1);
    const knockout = after.stages?.[1];
    expect(knockout?.started).toBe(true);
    expect(knockout?.clubIds).toHaveLength(8);
    expect(knockout?.bracket?.phases[0]?.drawn).toBe(true);
    expect(knockout?.bracket?.phases[0]?.ties).toHaveLength(4);
    expect(after.calendar[5]?.fixtures).toHaveLength(4);
    expect(after.calendar[5]?.fixtures.every((fixture) => fixture.stage?.kind === "knockout")).toBe(
      true,
    );
    expect(after.calendar[6]?.fixtures).toHaveLength(0);
  });

  it("os classificados são os 2 primeiros de cada grupo e o chaveamento cruza as posições", () => {
    const after = playRounds(world, stagedSeason(world, "avanco-3"), 5);
    const qualifiers = stageQualifiers(after, world, 0);
    expect(after.stages?.[1]?.clubIds).toEqual(qualifiers.map((q) => q.clubId).sort());
    const byClub = new Map(qualifiers.map((q) => [q.clubId, q]));
    for (const tie of after.stages?.[1]?.bracket?.phases[0]?.ties ?? []) {
      const home = byClub.get(tie.home);
      const away = byClub.get(tie.away);
      expect(home?.group).not.toBe(away?.group);
      expect([home?.groupPosition, away?.groupPosition].sort()).toEqual([1, 2]);
    }
  });

  it("é idempotente e não toca nos registros", () => {
    const after = playRounds(world, stagedSeason(world, "avanco-4"), 5);
    expect(advanceStages(after, world)).toBe(after);
    expect(advanceStages(advanceStages(after, world), world)).toBe(after);
    const records = JSON.stringify(after.records);
    expect(JSON.stringify(advanceStages(after, world).records)).toBe(records);
  });

  it("a fase seguinte do mata-mata é sorteada quando a anterior termina", () => {
    const quarters = playRounds(world, stagedSeason(world, "avanco-5"), 6);
    expect(quarters.stages?.[1]?.bracket?.phases[1]?.drawn).toBe(true);
    expect(quarters.calendar[6]?.fixtures).toHaveLength(2);
    const view = cupView(quarters, world, 1);
    const winners = (view.bracket?.phases[0]?.ties ?? []).map(
      (tie) => tieState(view, 0, tie.id).winner,
    );
    const playing = (quarters.calendar[6]?.fixtures ?? []).flatMap((f) => [f.home, f.away]).sort();
    expect(playing).toEqual([...winners].sort());
  });
});

describe("temporada inteira", () => {
  it("termina com um campeão, e jogar em passos é igual a jogar de uma vez", () => {
    const start = stagedSeason(world, "avanco-6");
    const whole = playToEnd(world, start);
    expect(isSeasonOver(whole)).toBe(true);
    let stepped = start;
    for (let round = 0; round < 8; round++) stepped = playRounds(world, stepped, 1);
    expect(stepped).toEqual(whole);
    const finalTie = whole.stages?.[1]?.bracket?.phases[2]?.ties[0];
    const view = cupView(whole, world, 1);
    expect(finalTie && tieState(view, 2, finalTie.id).decided).toBe(true);
  });

  it("salvar e carregar no meio da fase não muda o resultado", () => {
    const start = stagedSeason(world, "avanco-7");
    const middle = playRounds(world, start, 3);
    const loaded = JSON.parse(JSON.stringify(middle)) as typeof middle;
    expect(playToEnd(world, loaded)).toEqual(playToEnd(world, middle));
    const knockout = playRounds(world, start, 6);
    const reloaded = JSON.parse(JSON.stringify(knockout)) as typeof knockout;
    expect(playToEnd(world, reloaded)).toEqual(playToEnd(world, knockout));
  });

  it("advanceSeason devolve a mesma temporada que o jogo rodada a rodada pelo ao vivo", () => {
    const start = stagedSeason(world, "avanco-8");
    const direct = advanceSeason(start, world, { toEnd: true });
    expect(direct.ok && direct.season).toEqual(playToEnd(world, start));
  });
});

describe("pontos corridos → mata-mata", () => {
  const own = withStages(world, [
    {
      type: "league",
      rounds: 1,
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["goal-difference", "goals-for", "draw-lots"],
      qualified: 4,
    },
    knockoutAfterGroups(4),
  ]);

  it("depois da última rodada da liga, os 4 primeiros jogam 1×4 e 2×3", () => {
    const start = stagedSeason(own, "avanco-9");
    const after = playRounds(own, start, 19);
    const table = stageQualifiers(after, own, 0).map((q) => q.clubId);
    expect(table).toHaveLength(4);
    const ties = after.stages?.[1]?.bracket?.phases[0]?.ties ?? [];
    const pairs = ties.map((tie) => new Set([tie.home, tie.away]));
    expect(pairs).toEqual([new Set([table[0], table[3]]), new Set([table[1], table[2]])]);
  });
});
