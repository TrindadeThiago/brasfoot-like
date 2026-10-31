import { describe, expect, it } from "vitest";
import { askingPrice } from "../../src/market/club-response";
import { addFreeAgents, toFreeAgent } from "../../src/market/free-agents";
import {
  answerClubCounter,
  answerPlayerDemand,
  cancelNegotiation,
  proposeContract,
  startNegotiation,
} from "../../src/market/negotiation";
import { wageDemand } from "../../src/market/player-response";
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
const closed = contextAfter(4);
const target = playerOf(open, (player) => player.position === "MF");
const ask = askingPrice(open, target);

function start(ctx = open, fee = ask) {
  const result = startNegotiation(ctx, { kind: "buy", playerId: target.id, fee });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

describe("janela (SC-001)", () => {
  it("fora da janela compra e empréstimo são recusados com a próxima abertura", () => {
    for (const kind of ["buy", "loan"] as const) {
      const result = startNegotiation(closed, { kind, playerId: target.id, fee: 1000 });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "market.window_closed", params: { round: expect.any(Number) } },
      });
    }
  });

  it("livre e renovação funcionam fora da janela", () => {
    const agent = toFreeAgent(target, target.clubId, YEAR);
    const ctx = {
      ...closed,
      world: { ...closed.world, players: closed.world.players.filter((p) => p.id !== target.id) },
      market: addFreeAgents(closed.market, [agent]),
    };
    expect(startNegotiation(ctx, { kind: "free", playerId: target.id }).ok).toBe(true);
    const own = closed.world.players.find((player) => player.clubId === MANAGER);
    expect(startNegotiation(closed, { kind: "renew", playerId: own?.id ?? "" }).ok).toBe(true);
  });
});

describe("negociação com o clube (US2)", () => {
  it("oferta na pedida é aceita e segue para o contrato sem mover dinheiro", () => {
    const step = start();
    expect(step.clubResponse).toEqual({ kind: "accepted" });
    expect(step.negotiation).toMatchObject({ stage: "contract", agreedFee: ask });
    expect(totalCash(step.update)).toBe(totalCash(open));
    expect(step.update.finances.clubs[MANAGER]?.cash).toBe(open.finances.clubs[MANAGER]?.cash);
  });

  it("oferta mais baixa gera uma contraproposta", () => {
    const step = start(open, Math.ceil(ask * 0.75));
    expect(step.clubResponse).toEqual({ kind: "countered", fee: ask });
    expect(step.negotiation).toMatchObject({ stage: "club_countered", counterFee: ask });
  });

  it("oferta muito baixa é recusada e registrada", () => {
    const step = start(open, 1000);
    expect(step.clubResponse?.kind).toBe("refused");
    expect(step.negotiation).toBeUndefined();
    expect(step.update.market.negotiations).toEqual([]);
    expect(step.update.market.log.at(-1)).toMatchObject({ outcome: "refused_club" });
  });

  it("só uma negociação por atleta", () => {
    const step = start(open, Math.ceil(ask * 0.75));
    const again = startNegotiation(applied(open, step.update), {
      kind: "buy",
      playerId: target.id,
      fee: ask,
    });
    expect(again).toMatchObject({ ok: false, error: { code: "market.already_negotiating" } });
  });

  it("não há segunda contraproposta: responder duas vezes é etapa inválida", () => {
    const step = start(open, Math.ceil(ask * 0.75));
    const ctx = applied(open, step.update);
    const id = step.negotiation?.id ?? "";
    const accepted = answerClubCounter(ctx, id, true);
    if (!accepted.ok) throw new Error("falhou");
    const ctx2 = applied(ctx, accepted.value.update);
    expect(answerClubCounter(ctx2, id, true)).toMatchObject({
      ok: false,
      error: { code: "market.invalid_stage" },
    });
    expect(proposeContract(ctx, id, { wage: 1000, years: 2 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_stage" },
    });
  });

  it("recusar a contraproposta encerra sem custo", () => {
    const step = start(open, Math.ceil(ask * 0.75));
    const ctx = applied(open, step.update);
    const refused = answerClubCounter(ctx, step.negotiation?.id ?? "", false);
    if (!refused.ok) throw new Error("falhou");
    expect(refused.value.update.market.negotiations).toEqual([]);
    expect(refused.value.update.market.log.at(-1)).toMatchObject({ outcome: "rejected_by_user" });
    expect(totalCash(refused.value.update)).toBe(totalCash(open));
  });

  it("valores inválidos e caixa insuficiente", () => {
    expect(startNegotiation(open, { kind: "buy", playerId: target.id, fee: 0 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_amount" },
    });
    expect(startNegotiation(open, { kind: "buy", playerId: "x", fee: 10 })).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
    const cash = open.finances.clubs[MANAGER]?.cash ?? 0;
    expect(
      startNegotiation(open, { kind: "buy", playerId: target.id, fee: cash + 1 }),
    ).toMatchObject({ ok: false, error: { code: "market.insufficient_cash" } });
  });
});

describe("contrato com o atleta (US3)", () => {
  const agreed = start();
  const ctx = applied(open, agreed.update);
  const id = agreed.negotiation?.id ?? "";
  const demand = wageDemand(open, target, MANAGER);

  it("duração fora dos limites é inválida antes de qualquer resposta", () => {
    expect(proposeContract(ctx, id, { wage: demand, years: 0 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_duration" },
    });
    expect(proposeContract(ctx, id, { wage: demand, years: 6 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_duration" },
    });
  });

  it("salário na pedida conclui a compra: elenco, caixa e contrato", () => {
    const result = proposeContract(ctx, id, { wage: demand, years: 3 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const { update } = result.value;
    expect(result.value.negotiation).toBeUndefined();
    expect(update.market.negotiations).toEqual([]);
    expect(update.world.players.find((p) => p.id === target.id)).toMatchObject({
      clubId: MANAGER,
      contract: { wage: demand, untilYear: YEAR + 2 },
    });
    expect(update.finances.clubs[MANAGER]?.cash).toBe(
      (open.finances.clubs[MANAGER]?.cash ?? 0) - ask,
    );
    expect(totalCash(update)).toBe(totalCash(open));
  });

  it("salário abaixo da pedida gera um pedido; aceitá-lo conclui", () => {
    const asked = proposeContract(ctx, id, { wage: Math.ceil(demand * 0.85), years: 3 });
    if (!asked.ok) throw new Error(JSON.stringify(asked.error));
    expect(asked.value.playerResponse).toEqual({ kind: "demanded", wage: demand });
    expect(asked.value.negotiation?.stage).toBe("player_demanded");
    const ctx2 = applied(ctx, asked.value.update);
    expect(proposeContract(ctx2, id, { wage: demand, years: 3 })).toMatchObject({
      ok: false,
      error: { code: "market.invalid_stage" },
    });
    const done = answerPlayerDemand(ctx2, id, true);
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.update.world.players.find((p) => p.id === target.id)?.contract?.wage).toBe(
      demand,
    );
    expect(answerPlayerDemand(applied(ctx2, done.value.update), id, true)).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
  });

  it("recusar o pedido ou o atleta desfaz o acordo sem mover dinheiro", () => {
    const asked = proposeContract(ctx, id, { wage: Math.ceil(demand * 0.85), years: 3 });
    if (!asked.ok) throw new Error("falhou");
    const refused = answerPlayerDemand(applied(ctx, asked.value.update), id, false);
    if (!refused.ok) throw new Error("falhou");
    expect(refused.value.update.world.players.find((p) => p.id === target.id)?.clubId).toBe(
      target.clubId,
    );
    expect(totalCash(refused.value.update)).toBe(totalCash(open));
    expect(refused.value.update.finances.ledger).toEqual(open.finances.ledger);

    const low = proposeContract(ctx, id, { wage: 100, years: 3 });
    if (!low.ok) throw new Error("falhou");
    expect(low.value.playerResponse).toEqual({ kind: "refused", reason: "low_wage" });
    expect(low.value.update.market.log.at(-1)).toMatchObject({ outcome: "refused_player" });
    expect(low.value.update.market.negotiations).toEqual([]);
  });

  it("cancelar fecha a negociação sem custo", () => {
    const update = cancelNegotiation(ctx, id);
    expect(update.market.negotiations).toEqual([]);
    expect(totalCash(update)).toBe(totalCash(open));
  });

  it("a conclusão revalida a janela", () => {
    const stale = { ...closed, market: ctx.market };
    expect(proposeContract(stale, id, { wage: demand, years: 3 })).toMatchObject({
      ok: false,
      error: { code: "market.window_closed" },
    });
  });
});

describe("no máximo uma contraproposta de cada lado (SC-002)", () => {
  const cash = open.finances.clubs[MANAGER]?.cash ?? 0;
  const FEES = [1000, Math.ceil(ask * 0.75), ask, Math.min(ask * 2, cash)];
  const WAGE_FACTORS = [0.1, 0.85, 1, 3];

  it("em qualquer caminho há no máximo um pedido do clube e um do atleta", () => {
    const demand = wageDemand(open, target, MANAGER);
    let paths = 0;
    for (const fee of FEES) {
      for (const acceptClub of [true, false]) {
        for (const factor of WAGE_FACTORS) {
          for (const acceptPlayer of [true, false]) {
            let ctx = open;
            let clubCounters = 0;
            let playerDemands = 0;
            const first = startNegotiation(ctx, { kind: "buy", playerId: target.id, fee });
            if (!first.ok) throw new Error("falhou");
            ctx = applied(ctx, first.value.update);
            if (first.value.clubResponse?.kind === "countered") clubCounters++;
            let negotiation = first.value.negotiation;
            if (negotiation?.stage === "club_countered") {
              const answered = answerClubCounter(ctx, negotiation.id, acceptClub);
              if (!answered.ok) throw new Error("falhou");
              ctx = applied(ctx, answered.value.update);
              negotiation = answered.value.negotiation;
              // nenhuma nova contraproposta do clube é possível
              expect(answered.value.clubResponse?.kind ?? "accepted").not.toBe("countered");
            }
            if (negotiation?.stage === "contract") {
              const proposed = proposeContract(ctx, negotiation.id, {
                wage: Math.max(100, Math.round((demand * factor) / 100) * 100),
                years: 2,
              });
              if (!proposed.ok) throw new Error(JSON.stringify(proposed.error));
              ctx = applied(ctx, proposed.value.update);
              if (proposed.value.playerResponse?.kind === "demanded") playerDemands++;
              negotiation = proposed.value.negotiation;
              if (negotiation?.stage === "player_demanded") {
                const answered = answerPlayerDemand(ctx, negotiation.id, acceptPlayer);
                if (!answered.ok) throw new Error("falhou");
                ctx = applied(ctx, answered.value.update);
                expect(answered.value.negotiation).toBeUndefined();
              }
            }
            expect(clubCounters).toBeLessThanOrEqual(1);
            expect(playerDemands).toBeLessThanOrEqual(1);
            expect(ctx.market.negotiations).toEqual([]);
            expect(totalCash(ctx)).toBe(totalCash(open));
            paths++;
          }
        }
      }
    }
    expect(paths).toBe(FEES.length * 2 * WAGE_FACTORS.length * 2);
  });
});

describe("recontratação do jogador rescindido (A9)", () => {
  const own = open.world.players.find((player) => player.clubId === MANAGER) as typeof target;
  const without = (ctx: typeof open, id: string) => ({
    ...ctx,
    world: { ...ctx.world, players: ctx.world.players.filter((p) => p.id !== id) },
  });

  it("o clube não recontrata quem ele mesmo rescindiu", () => {
    const agent = { ...toFreeAgent(own, MANAGER, YEAR), releasedByClub: true as const };
    const ctx = { ...without(open, own.id), market: addFreeAgents(open.market, [agent]) };
    expect(startNegotiation(ctx, { kind: "free", playerId: own.id })).toMatchObject({
      ok: false,
      error: { code: "market.recently_released" },
    });
  });

  it("quem saiu por fim de contrato do próprio clube pode ser recontratado", () => {
    const agent = toFreeAgent(own, MANAGER, YEAR);
    const ctx = { ...without(open, own.id), market: addFreeAgents(open.market, [agent]) };
    expect(startNegotiation(ctx, { kind: "free", playerId: own.id }).ok).toBe(true);
  });

  it("o jogador rescindido por outro clube pode ser contratado", () => {
    const agent = {
      ...toFreeAgent(target, target.clubId, YEAR),
      releasedByClub: true as const,
    };
    const ctx = { ...without(open, target.id), market: addFreeAgents(open.market, [agent]) };
    expect(startNegotiation(ctx, { kind: "free", playerId: target.id }).ok).toBe(true);
  });
});
