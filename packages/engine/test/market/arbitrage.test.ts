import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { askingPrice, buyAskingPrice, respondToOffer } from "../../src/market/club-response";
import { contractYearsRange } from "../../src/market/contracts";
import { QUICK_SALE_PCT } from "../../src/market/disposal";
import { marketRules } from "../../src/market/rules";
import { canRemovePlayer } from "../../src/market/squad";
import { marketValue } from "../../src/market/value";
import { MANAGER, marketContext, YEAR } from "./helpers";

/**
 * Ciclo comprar e revender na hora: paga a pedida do clube, assina contrato de 5 anos (o valor passa
 * a valer 100%) e vende pela venda imediata. Auditoria v1.0.0 (A2): com o último ano a 60% e a
 * venda a 75%, 58% dos jogadores com contrato no último ano davam lucro, até 35%. A correção é o
 * piso de `buyAskingPrice`.
 */
function roundTrips() {
  const context = marketContext();
  const rules = marketRules(context.world, context.league.competitionId);
  const trips: { ratio: number; lastYear: boolean }[] = [];
  for (const player of context.world.players) {
    if (player.clubId === MANAGER || !player.contract || player.contract.loan) continue;
    const ask = buyAskingPrice(context, player);
    const age = ageOn(player.birthDate, seasonDate(context.world.manifest.referenceDate, YEAR));
    const [, longest] = contractYearsRange(age, rules);
    const signed = {
      ...player,
      clubId: MANAGER,
      contract: { wage: player.contract.wage, untilYear: YEAR + longest - 1 },
    };
    const fee =
      Math.round((marketValue(signed, context.world, YEAR) * QUICK_SALE_PCT) / 100 / 1000) * 1000;
    trips.push({ ratio: fee / ask, lastYear: player.contract.untilYear <= YEAR });
  }
  return trips;
}

describe("comprar e revender na hora não é um ganho fácil (A2)", () => {
  const trips = roundTrips();

  it("o mundo de teste tem jogadores no último ano de contrato", () => {
    expect(trips.filter((trip) => trip.lastYear).length).toBeGreaterThan(50);
  });

  it("nenhum ciclo rende lucro: o piso da pedida cobre a revenda", () => {
    expect(Math.max(...trips.map((trip) => trip.ratio))).toBeLessThanOrEqual(1);
  });

  it("o piso não encarece quem já tem contrato longo, só o do último ano", () => {
    const last = trips.filter((trip) => trip.lastYear);
    expect(last.length).toBeGreaterThan(0);
    expect(trips.some((trip) => trip.ratio < 0.9)).toBe(true);
  });

  it("a pedida normal do clube já não basta para um jogador no último ano", () => {
    const context = marketContext();
    const player = context.world.players.find(
      (entry) =>
        entry.clubId !== MANAGER &&
        entry.contract &&
        !entry.contract.loan &&
        entry.contract.untilYear <= YEAR &&
        canRemovePlayer(context.world, entry.clubId, entry.id) &&
        buyAskingPrice(context, entry) > askingPrice(context, entry) &&
        askingPrice(context, entry) * 100 >= buyAskingPrice(context, entry) * 70,
    );
    if (!player) throw new Error("sem jogador com piso acima da pedida");
    const response = respondToOffer(context, player, askingPrice(context, player), "buy");
    expect(response).toMatchObject({ kind: "countered", fee: buyAskingPrice(context, player) });
    expect(respondToOffer(context, player, buyAskingPrice(context, player), "buy")).toEqual({
      kind: "accepted",
    });
  });
});
