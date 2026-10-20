import { describe, expect, it } from "vitest";
import { loanAskingPrice } from "../../src/market/club-response";
import { addFreeAgents, toFreeAgent } from "../../src/market/free-agents";
import { answerClubCounter, proposeContract, startNegotiation } from "../../src/market/negotiation";
import { wageDemand } from "../../src/market/player-response";
import { SQUAD_RULES } from "../../src/renewal/rules";
import {
  applied,
  contextAfter,
  MANAGER,
  marketContext,
  playerOf,
  totalCash,
  YEAR,
} from "./helpers";

const open = marketContext();
const weak = playerOf(open, (player) => player.position === "MF");
const strong = playerOf(open, (player) => player.position === "MF", "strongest");

describe("empréstimo (US5)", () => {
  it("jogador fora dos 16 mais fortes sai sem taxa e o empréstimo se conclui na hora", () => {
    const result = startNegotiation(open, { kind: "loan", playerId: weak.id, fee: 0 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.clubResponse).toEqual({ kind: "accepted" });
    expect(result.value.negotiation).toBeUndefined();
    const loaned = result.value.update.world.players.find((player) => player.id === weak.id);
    expect(loaned?.clubId).toBe(MANAGER);
    expect(loaned?.contract?.loan).toEqual({ fromClubId: weak.clubId, untilYear: YEAR });
    expect(result.value.update.market.negotiations).toEqual([]);
    expect(totalCash(result.value.update)).toBe(totalCash(open));
  });

  it("titular: taxa baixa gera uma contraproposta; aceitar conclui, com taxa nos caixas", () => {
    const ask = loanAskingPrice(open, strong);
    expect(ask).toBeGreaterThan(0);
    const result = startNegotiation(open, {
      kind: "loan",
      playerId: strong.id,
      fee: Math.ceil(ask * 0.75),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.clubResponse).toEqual({ kind: "countered", fee: ask });
    const ctx = applied(open, result.value.update);
    const done = answerClubCounter(ctx, result.value.negotiation?.id ?? "", true);
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.update.finances.clubs[MANAGER]?.cash).toBe(
      (open.finances.clubs[MANAGER]?.cash ?? 0) - ask,
    );
    expect(
      done.value.update.world.players.find((p) => p.id === strong.id)?.contract?.loan,
    ).toBeDefined();
  });

  it("fora da janela o empréstimo é recusado", () => {
    expect(
      startNegotiation(contextAfter(5), { kind: "loan", playerId: weak.id, fee: 0 }),
    ).toMatchObject({ ok: false, error: { code: "market.window_closed" } });
  });

  it("emprestado não pode ser comprado nem emprestado de novo (FR-019)", () => {
    const loan = startNegotiation(open, { kind: "loan", playerId: weak.id, fee: 0 });
    if (!loan.ok) throw new Error("falhou");
    const ctx = applied(open, loan.value.update);
    for (const kind of ["buy", "loan"] as const) {
      expect(startNegotiation(ctx, { kind, playerId: weak.id, fee: 1000 })).toMatchObject({
        ok: false,
        error: { code: "market.player_on_loan" },
      });
    }
  });

  it("não empresta com o elenco cheio", () => {
    const extras = Array.from({ length: SQUAD_RULES.max }, (_, index) => ({
      ...weak,
      id: `extra-${index}`,
      clubId: MANAGER,
    }));
    const full = { ...open, world: { ...open.world, players: [...open.world.players, ...extras] } };
    expect(startNegotiation(full, { kind: "loan", playerId: weak.id, fee: 0 })).toMatchObject({
      ok: false,
      error: { code: "market.squad_full" },
    });
  });
});

describe("jogadores livres (US7, SC-001)", () => {
  const agent = toFreeAgent(weak, weak.clubId, YEAR - 1);
  const base = contextAfter(8);
  const ctx = {
    ...base,
    world: { ...base.world, players: base.world.players.filter((player) => player.id !== weak.id) },
    market: addFreeAgents(base.market, [agent]),
  };

  it("fora da janela a contratação começa no contrato, sem taxa", () => {
    const result = startNegotiation(ctx, { kind: "free", playerId: weak.id });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.negotiation).toMatchObject({ kind: "free", stage: "contract" });
    expect(result.value.negotiation?.fee).toBeUndefined();
  });

  it("assinar leva o jogador do mercado para o elenco, com contrato e salário", () => {
    const started = startNegotiation(ctx, { kind: "free", playerId: weak.id });
    if (!started.ok) throw new Error("falhou");
    const next = applied(ctx, started.value.update);
    const demand = wageDemand(next, agent.player, MANAGER);
    const done = proposeContract(next, started.value.negotiation?.id ?? "", {
      wage: demand,
      years: 2,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const { update } = done.value;
    expect(update.market.freeAgents).toEqual([]);
    expect(update.world.players.find((player) => player.id === weak.id)).toMatchObject({
      clubId: MANAGER,
      contract: { wage: demand, untilYear: YEAR + 1 },
    });
    expect(totalCash(update)).toBe(totalCash(ctx));
    expect(update.finances.clubs[MANAGER]?.cash).toBe(ctx.finances.clubs[MANAGER]?.cash);
  });

  it("não contrata com o elenco cheio nem quem não é livre", () => {
    const extras = Array.from({ length: SQUAD_RULES.max }, (_, index) => ({
      ...weak,
      id: `extra-${index}`,
      clubId: MANAGER,
    }));
    const full = { ...ctx, world: { ...ctx.world, players: [...ctx.world.players, ...extras] } };
    expect(startNegotiation(full, { kind: "free", playerId: weak.id })).toMatchObject({
      ok: false,
      error: { code: "market.squad_full" },
    });
    expect(startNegotiation(ctx, { kind: "free", playerId: strong.id })).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
  });
});
