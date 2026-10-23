import { describe, expect, it } from "vitest";
import {
  QUICK_SALE_PCT,
  quoteSale,
  quoteTermination,
  sellNow,
  TERMINATION_PCT,
  terminateContract,
} from "../../src/market/disposal";
import { marketValue } from "../../src/market/value";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { contextAfter, MANAGER, marketContext, totalCash, YEAR } from "./helpers";

const context = marketContext();
const own = context.world.players
  .filter((player) => player.clubId === MANAGER)
  .sort((a, b) => b.strength - a.strength);

/** Jogador do usuário que pode sair sem quebrar o mínimo do elenco ou da posição. */
const sellable = own[0];
const contract = sellable?.contract;
if (!sellable || !contract) throw new Error("sem jogador do usuário");
const managerFinance = context.finances.clubs[MANAGER];
if (!managerFinance) throw new Error("sem finanças do clube");

describe("venda imediata", () => {
  it("cota uma parte do valor de mercado e escolhe um comprador da IA", () => {
    const quote = quoteSale(context, sellable.id);
    if (!quote.ok) throw new Error(JSON.stringify(quote.error));
    const value = marketValue(sellable, context.world, YEAR);
    expect(quote.value.value).toBe(value);
    expect(quote.value.fee).toBe(Math.round((value * QUICK_SALE_PCT) / 100 / 1000) * 1000);
    expect(quote.value.buyerClubId).not.toBe(MANAGER);
  });

  it("a cotação é a que se executa; o dinheiro só muda de caixa", () => {
    const quote = quoteSale(context, sellable.id);
    if (!quote.ok) throw new Error("sem cotação");
    const sold = sellNow(context, sellable.id);
    if (!sold.ok) throw new Error(JSON.stringify(sold.error));
    const moved = sold.value.world.players.find((player) => player.id === sellable.id);
    expect(moved?.clubId).toBe(quote.value.buyerClubId);
    expect(sold.value.finances.clubs[MANAGER]?.cash).toBe(
      (context.finances.clubs[MANAGER]?.cash ?? 0) + quote.value.fee,
    );
    expect(totalCash({ finances: sold.value.finances })).toBe(totalCash(context));
    expect(sold.value.departed).toEqual([sellable.id]);
    expect(sold.value.market.log.at(-1)).toMatchObject({ kind: "sale", playerId: sellable.id });
  });

  it("é determinística", () => {
    expect(quoteSale(context, sellable.id)).toEqual(quoteSale(context, sellable.id));
  });

  it("só com a janela aberta", () => {
    const closed = contextAfter(4);
    const result = quoteSale(closed, sellable.id);
    expect(result).toMatchObject({ ok: false, error: { code: "market.window_closed" } });
  });

  it("recusa jogador de outro clube e emprestado", () => {
    const other = context.world.players.find((player) => player.clubId !== MANAGER);
    if (!other) throw new Error("sem jogador de outro clube");
    expect(quoteSale(context, other.id)).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
    const loaned = {
      ...context,
      world: {
        ...context.world,
        players: context.world.players.map((player) =>
          player.id === sellable.id && player.contract
            ? {
                ...player,
                contract: { ...player.contract, loan: { fromClubId: "x", untilYear: YEAR } },
              }
            : player,
        ),
      },
    };
    expect(quoteSale(loaned, sellable.id)).toMatchObject({
      ok: false,
      error: { code: "market.player_on_loan" },
    });
  });

  it("não deixa o elenco abaixo do mínimo", () => {
    const keep = own.slice(0, SQUAD_RULES.min);
    const small = {
      ...context,
      world: {
        ...context.world,
        players: context.world.players.filter(
          (player) => player.clubId !== MANAGER || keep.some((entry) => entry.id === player.id),
        ),
      },
    };
    expect(quoteSale(small, sellable.id)).toMatchObject({
      ok: false,
      error: { code: "market.squad_minimum" },
    });
  });
});

describe("rescisão", () => {
  it("cota a multa sobre o salário que restava", () => {
    const quote = quoteTermination(context, sellable.id);
    if (!quote.ok) throw new Error(JSON.stringify(quote.error));
    const years = contract.untilYear - YEAR + 1;
    expect(quote.value.monthsLeft).toBe(12 * (years - 1) + 12);
    expect(quote.value.penalty).toBe(
      Math.round((contract.wage * quote.value.monthsLeft * TERMINATION_PCT) / 100 / 1000) * 1000,
    );
  });

  it("a multa cai conforme a temporada avança", () => {
    const early = quoteTermination(context, sellable.id);
    const late = quoteTermination(contextAfter(10), sellable.id);
    if (!early.ok || !late.ok) throw new Error("sem cotação");
    expect(late.value.monthsLeft).toBeLessThan(early.value.monthsLeft);
    expect(late.value.penalty).toBeLessThan(early.value.penalty);
  });

  it("tira o jogador do elenco, vira livre e a multa sai do caixa", () => {
    const quote = quoteTermination(context, sellable.id);
    if (!quote.ok) throw new Error("sem cotação");
    const done = terminateContract(context, sellable.id);
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const update = done.value;
    expect(update.world.players.some((player) => player.id === sellable.id)).toBe(false);
    const free = update.market.freeAgents.find((agent) => agent.player.id === sellable.id);
    expect(free).toMatchObject({ lastClubId: MANAGER, sinceYear: YEAR });
    expect(update.finances.clubs[MANAGER]?.cash).toBe(
      (context.finances.clubs[MANAGER]?.cash ?? 0) - quote.value.penalty,
    );
    expect(update.finances.ledger.at(-1)).toMatchObject({
      clubId: MANAGER,
      category: "wages",
      amount: -quote.value.penalty,
    });
    expect(update.departed).toEqual([sellable.id]);
    expect(update.market.log.at(-1)).toMatchObject({
      kind: "released",
      playerId: sellable.id,
      fee: quote.value.penalty,
    });
  });

  it("recusa sem caixa para a multa", () => {
    const broke = {
      ...context,
      finances: {
        ...context.finances,
        clubs: {
          ...context.finances.clubs,
          [MANAGER]: { ...managerFinance, cash: 0 },
        },
      },
    };
    expect(terminateContract(broke, sellable.id)).toMatchObject({
      ok: false,
      error: { code: "market.insufficient_cash" },
    });
  });

  it("não mexe no contexto de entrada", () => {
    const before = JSON.stringify(context.finances);
    terminateContract(context, sellable.id);
    expect(JSON.stringify(context.finances)).toBe(before);
  });
});
