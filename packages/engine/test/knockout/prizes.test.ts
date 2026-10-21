import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { type CareerSeasonState, competitionSeason } from "../../src/career/season-state";
import { cupPrizes } from "../../src/knockout/prizes";
import { cupChampion } from "../../src/knockout/tie";
import { MANAGER, newState } from "../career/day-helpers";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";

const SEED = "copa-premios";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

describe("prêmios e bilheteria da copa (018 US5)", () => {
  const world = cupBank();
  const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER));
  const cup = competitionSeason(end, CUP_ID).divisions[0];
  const ledger = end.finances.ledger;

  it("cada confronto paga o prêmio da fase ao vencedor, uma vez, com competição e data", () => {
    const prizes = ledger.filter(
      (entry) => entry.category === "prize" && entry.competitionId === CUP_ID,
    );
    // 8 + 4 + 2 + 1 confrontos.
    expect(prizes).toHaveLength(15);
    expect(prizes.every((entry) => entry.date !== undefined)).toBe(true);
    const champion = cupChampion(cup as never);
    const final = prizes.filter((entry) => entry.amount === 800_000);
    expect(final.map((entry) => entry.clubId)).toEqual([champion?.championId]);
  });

  it("jogo em casa da copa lança bilheteria; a final neutra divide a renda", () => {
    const gates = end.finances.gates.filter((gate) => gate.competitionId === CUP_ID);
    // Um lançamento por jogo, exceto a final: um por clube.
    const finalDate = gates.at(-1)?.date;
    const finalGates = gates.filter((gate) => gate.date === finalDate);
    expect(finalGates).toHaveLength(2);
    const [a, b] = finalGates;
    expect(Math.abs((a?.revenue ?? 0) - (b?.revenue ?? 0))).toBeLessThanOrEqual(1);
    expect(a?.capacity).toBe(40_000);
    expect(gates.length).toBe(8 + 4 + 4 + 2);
  });

  it("dias só de liga não lançam prêmios", () => {
    const early = ok(advanceCareerDays(newState(world, SEED), { days: 1 }, SEED, MANAGER));
    expect(early.finances.ledger.some((entry) => entry.category === "prize")).toBe(false);
  });

  it("cupPrizes ignora jogos que não decidem confronto (ida)", () => {
    expect(cupPrizes(world, cup as never, [])).toEqual([]);
  });
});
