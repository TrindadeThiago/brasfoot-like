import { describe, expect, it } from "vitest";
import {
  attraction,
  exigency,
  respondToContract,
  wageDemand,
} from "../../src/market/player-response";
import { MANAGER, marketContext, playerOf } from "./helpers";

const context = marketContext();
const player = playerOf(context, (entry) => entry.strength > 55 && entry.strength < 65);
const superstar = playerOf(context, () => true, "strongest");

describe("resposta do atleta (R7, FR-013)", () => {
  it("exigência cresce com a força e fica em [0, 90]", () => {
    expect(exigency({ strength: 40 })).toBe(0);
    expect(exigency({ strength: 60 })).toBe(20);
    expect(exigency({ strength: 99 })).toBe(90);
  });

  it("atração soma reputação e bônus da divisão", () => {
    const club = context.world.clubs.find((entry) => entry.id === MANAGER);
    expect(attraction(context, MANAGER)).toBe((club?.reputation ?? 0) + 10);
  });

  it("proposta acima da pedida é aceita, até 80% gera pedido, abaixo recusa", () => {
    const demand = wageDemand(context, player, MANAGER);
    expect(respondToContract(context, player, MANAGER, demand)).toEqual({ kind: "accepted" });
    expect(respondToContract(context, player, MANAGER, demand * 3)).toEqual({ kind: "accepted" });
    expect(respondToContract(context, player, MANAGER, Math.ceil(demand * 0.85))).toEqual({
      kind: "demanded",
      wage: demand,
    });
    expect(respondToContract(context, player, MANAGER, Math.floor(demand * 0.5))).toEqual({
      kind: "refused",
      reason: "low_wage",
    });
  });

  it("atleta muito acima do nível do clube recusa por falta de interesse", () => {
    const weakClub = context.world.clubs.reduce((min, club) =>
      club.reputation < min.reputation ? club : min,
    );
    const stronger = { ...superstar, strength: 95 };
    expect(attraction(context, weakClub.id)).toBeLessThan(exigency(stronger) - 25);
    expect(respondToContract(context, stronger, weakClub.id, 100_000_000)).toEqual({
      kind: "refused",
      reason: "no_interest",
    });
  });

  it("renovação nunca pede menos que o salário atual e ignora interesse", () => {
    const own = playerOf(context, () => true, "strongest");
    const demand = wageDemand(context, own, own.clubId, true);
    expect(demand).toBeGreaterThanOrEqual(own.contract?.wage ?? 0);
    expect(respondToContract(context, own, own.clubId, demand, true)).toEqual({ kind: "accepted" });
  });

  it("é determinístico", () => {
    expect(wageDemand(context, player, MANAGER)).toBe(wageDemand(context, player, MANAGER));
  });
});
