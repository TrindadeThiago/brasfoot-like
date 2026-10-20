import { describe, expect, it } from "vitest";
import {
  completeLoan,
  completeRenewal,
  completeSigning,
  completeTransfer,
} from "../../src/market/effects";
import { addFreeAgents, toFreeAgent } from "../../src/market/free-agents";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { applied, MANAGER, marketContext, playerOf, totalCash, YEAR } from "./helpers";

const context = marketContext();
const target = playerOf(context, (player) => player.position === "MF");

function transfer(fee = 1_000_000, ctx = context) {
  const result = completeTransfer(ctx, {
    playerId: target.id,
    toClubId: MANAGER,
    fee,
    contract: { wage: 50_000, untilYear: YEAR + 2 },
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

describe("compra concluída (R9, SC-004, SC-005)", () => {
  it("muda de clube e assina o contrato novo", () => {
    const update = transfer();
    const moved = update.world.players.find((player) => player.id === target.id);
    expect(moved?.clubId).toBe(MANAGER);
    expect(moved?.contract).toEqual({ wage: 50_000, untilYear: YEAR + 2 });
    expect(context.world.players.find((player) => player.id === target.id)?.clubId).toBe(
      target.clubId,
    );
  });

  it("move o dinheiro entre os caixas sem mudar a soma", () => {
    const update = transfer(2_000_000);
    expect(update.finances.clubs[MANAGER]?.cash).toBe(
      (context.finances.clubs[MANAGER]?.cash ?? 0) - 2_000_000,
    );
    expect(update.finances.clubs[target.clubId]?.cash).toBe(
      (context.finances.clubs[target.clubId]?.cash ?? 0) + 2_000_000,
    );
    expect(totalCash(update)).toBe(totalCash(context));
    const categories = update.finances.ledger.slice(-2).map((entry) => entry.category);
    expect(categories).toEqual(["transfer_purchase", "transfer_sale"]);
  });

  it("registra a transferência", () => {
    expect(transfer().market.log.at(-1)).toMatchObject({
      kind: "buy",
      playerId: target.id,
      fromClubId: target.clubId,
      toClubId: MANAGER,
      fee: 2_000_000 / 2,
    });
  });

  it("recusa sem caixa", () => {
    const result = completeTransfer(context, {
      playerId: target.id,
      toClubId: MANAGER,
      fee: (context.finances.clubs[MANAGER]?.cash ?? 0) + 1,
    });
    expect(result).toMatchObject({ ok: false, error: { code: "market.insufficient_cash" } });
  });

  it("recusa com elenco cheio", () => {
    const extras = Array.from({ length: SQUAD_RULES.max }, (_, index) => ({
      ...target,
      id: `extra-${index}`,
      clubId: MANAGER,
    }));
    const full = {
      ...context,
      world: { ...context.world, players: [...context.world.players, ...extras] },
    };
    expect(
      completeTransfer(full, { playerId: target.id, toClubId: MANAGER, fee: 1000 }),
    ).toMatchObject({ ok: false, error: { code: "market.squad_full" } });
  });

  it("lista quem sai do clube do usuário", () => {
    const own = context.world.players.find(
      (player) => player.clubId === MANAGER && player.position === "MF",
    );
    const buyer = target.clubId;
    const result = completeTransfer(context, {
      playerId: own?.id ?? "",
      toClubId: buyer,
      fee: 1000,
    });
    expect(result.ok && result.value.departed).toEqual([own?.id]);
    expect(result.ok && result.value.market.log.at(-1)?.kind).toBe("sale");
  });
});

describe("empréstimo concluído (FR-018)", () => {
  it("o jogador joga no clube que recebe, com o contrato de origem", () => {
    const result = completeLoan(context, { playerId: target.id, toClubId: MANAGER, fee: 100_000 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const loaned = result.value.world.players.find((player) => player.id === target.id);
    expect(loaned?.clubId).toBe(MANAGER);
    expect(loaned?.contract?.loan).toEqual({ fromClubId: target.clubId, untilYear: YEAR });
    expect(loaned?.contract?.wage).toBe(target.contract?.wage);
    expect(totalCash(result.value)).toBe(totalCash(context));
    expect(result.value.market.log.at(-1)?.kind).toBe("loan");
  });

  it("não empresta quem já está emprestado", () => {
    const result = completeLoan(context, { playerId: target.id, toClubId: MANAGER, fee: 0 });
    if (!result.ok) throw new Error("falhou");
    const again = completeLoan(applied(context, result.value), {
      playerId: target.id,
      toClubId: MANAGER,
      fee: 0,
    });
    expect(again).toMatchObject({ ok: false, error: { code: "market.player_on_loan" } });
  });
});

describe("contratação de livre e renovação", () => {
  it("o livre entra no banco com clube e contrato", () => {
    const agent = toFreeAgent(target, target.clubId, YEAR);
    const without = {
      ...context,
      world: { ...context.world, players: context.world.players.filter((p) => p.id !== target.id) },
      market: addFreeAgents(context.market, [agent]),
    };
    const result = completeSigning(without, {
      agent,
      clubId: MANAGER,
      contract: { wage: 10_000, untilYear: YEAR + 1 },
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.market.freeAgents).toEqual([]);
    expect(result.value.world.players.find((p) => p.id === target.id)).toMatchObject({
      clubId: MANAGER,
      contract: { wage: 10_000, untilYear: YEAR + 1 },
    });
    expect(result.value.market.log.at(-1)?.kind).toBe("free");
  });

  it("a renovação só troca o contrato", () => {
    const own = context.world.players.find((player) => player.clubId === MANAGER);
    const result = completeRenewal(context, {
      playerId: own?.id ?? "",
      contract: { wage: 77_700, untilYear: YEAR + 4 },
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.value.world.players.find((p) => p.id === own?.id)?.contract).toEqual({
      wage: 77_700,
      untilYear: YEAR + 4,
    });
    expect(totalCash(result.value)).toBe(totalCash(context));
  });
});
