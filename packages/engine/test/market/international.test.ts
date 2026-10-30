import { describe, expect, it } from "vitest";
import { annualWageBill } from "../../src/finance/create";
import { completeLoan, completeSigning, completeTransfer } from "../../src/market/effects";
import { canAddPlayer, canRemovePlayer } from "../../src/market/squad";
import { emptyMarket, type MarketContext } from "../../src/market/types";
import { marketValue } from "../../src/market/value";
import type { CompletedBank, CompletedPlayer } from "../../src/model/types";
import { canSignForeign, foreignCount } from "../../src/world/foreign";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

const SEED = "internacional";

function setup(edit?: (world: CompletedBank) => void) {
  const base = worldBank();
  if (edit) edit(base as CompletedBank);
  const manager = clubOfCountry(base, 0);
  const state = worldState(base, SEED, manager);
  const context: MarketContext = {
    world: state.world,
    league: state.league,
    finances: state.finances,
    market: emptyMarket(),
    managerClubId: manager,
    careerSeed: SEED,
  };
  return { context, manager };
}

function countryOf(world: CompletedBank, clubId: string): string | undefined {
  return world.clubs.find((club) => club.id === clubId)?.countryId;
}

/** Jogador de um clube de outro país que o comprador pode receber e o vendedor pode ceder. */
function foreignTarget(context: MarketContext, buyer: string): CompletedPlayer {
  const own = countryOf(context.world, buyer);
  const player = context.world.players.find(
    (entry) =>
      countryOf(context.world, entry.clubId) !== own &&
      !entry.contract?.loan &&
      canAddPlayer(context.world, buyer, entry.position, context.managerClubId) &&
      canRemovePlayer(context.world, entry.clubId, entry.id),
  );
  if (!player) throw new Error("sem alvo");
  return player;
}

function totalCash(context: MarketContext): number {
  return Object.values(context.finances.clubs).reduce((sum, club) => sum + club.cash, 0);
}

describe("transferência internacional (020 R8, Q1)", () => {
  it("a taxa é paga em valor de mercado, sem conversão, e o dinheiro total não muda", () => {
    const { context, manager } = setup();
    const player = foreignTarget(context, manager);
    const seller = player.clubId;
    const fee = 1_000_000;
    const done = completeTransfer(context, { playerId: player.id, toClubId: manager, fee });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    const after = done.value;
    expect(after.finances.clubs[manager]?.cash).toBe(
      (context.finances.clubs[manager]?.cash ?? 0) - fee,
    );
    expect(after.finances.clubs[seller]?.cash).toBe(
      (context.finances.clubs[seller]?.cash ?? 0) + fee,
    );
    expect(totalCash({ ...context, finances: after.finances })).toBe(totalCash(context));
    expect(after.world.players.find((p) => p.id === player.id)?.clubId).toBe(manager);
  });

  it("o valor de mercado do jogador é o mesmo em qualquer país", () => {
    const { context } = setup();
    const player = context.world.players.find((entry) => entry.contract);
    if (!player) throw new Error("sem jogador");
    const year = context.league.year;
    const before = marketValue(player, context.world, year);
    // Muda só as regras de mercado do país do jogador: o valor não depende delas.
    const edited: CompletedBank = JSON.parse(JSON.stringify(context.world));
    const country = edited.clubs.find((club) => club.id === player.clubId)?.countryId;
    const main = edited.competitions.find((entry) => entry.countryId === country);
    if (main) main.market = { lastYearValuePct: 10, twoYearsValuePct: 10 };
    const worldCompetition = edited.competitions[0];
    expect(worldCompetition).toBeDefined();
    if (main && main !== worldCompetition) {
      expect(marketValue(player, edited, year)).toBe(before);
    }
  });

  it("a folha do clube segue a escala do país de destino", () => {
    const { context, manager } = setup();
    const player = foreignTarget(context, manager);
    const date = `${context.league.year}-01-01`;
    const origin = player.clubId;
    const rate = (clubId: string) =>
      context.world.competitions.find((c) => c.countryId === countryOf(context.world, clubId))
        ?.economy?.wageFactorPct ?? 100;
    const wage = player.contract?.wage ?? 0;
    const done = completeTransfer(context, { playerId: player.id, toClubId: manager, fee: 0 });
    if (!done.ok) throw new Error(JSON.stringify(done));
    const gain =
      annualWageBill(done.value.world, manager, date) -
      annualWageBill(context.world, manager, date);
    expect(gain).toBe(Math.round((12 * wage * rate(manager)) / 100));
    const loss =
      annualWageBill(context.world, origin, date) - annualWageBill(done.value.world, origin, date);
    expect(loss).toBe(Math.round((12 * wage * rate(origin)) / 100));
    expect(rate(manager)).not.toBe(rate(origin));
  });

  it("empréstimo entre países funciona como o nacional", () => {
    const { context, manager } = setup();
    const player = foreignTarget(context, manager);
    const done = completeLoan(context, { playerId: player.id, toClubId: manager, fee: 0 });
    expect(done.ok).toBe(true);
  });
});

describe("limite de estrangeiros (020 FR-002a)", () => {
  function limited(limit: number) {
    return setup((world) => {
      const own = world.countries[0];
      if (own) own.rules = { foreignLimit: limit };
    });
  }

  it("sem limite declarado qualquer clube contrata estrangeiro", () => {
    const { context, manager } = setup();
    expect(canSignForeign(context.world, manager)).toBe(true);
    const player = foreignTarget(context, manager);
    expect(completeTransfer(context, { playerId: player.id, toClubId: manager, fee: 0 }).ok).toBe(
      true,
    );
  });

  it("clube no limite recusa transferência, empréstimo e livre de outra nacionalidade", () => {
    const { context, manager } = limited(0);
    expect(foreignCount(context.world, manager)).toBe(0);
    expect(canSignForeign(context.world, manager)).toBe(false);
    const player = foreignTarget(context, manager);
    const refused = completeTransfer(context, { playerId: player.id, toClubId: manager, fee: 0 });
    expect(refused).toEqual({
      ok: false,
      error: { code: "market.foreign_limit", params: { limit: 0 } },
    });
    const loan = completeLoan(context, { playerId: player.id, toClubId: manager, fee: 0 });
    expect(loan.ok).toBe(false);
    const agent = {
      player: { ...player, clubId: "" } as CompletedPlayer,
      fromClubId: "",
      sinceYear: context.league.year,
      seasons: 0,
    };
    const free = completeSigning(context, {
      agent: agent as never,
      clubId: manager,
      contract: { wage: 1000, untilYear: context.league.year + 2 },
    });
    expect(free.ok).toBe(false);
  });

  it("jogador do próprio país entra mesmo no limite", () => {
    const { context, manager } = limited(0);
    const own = countryOf(context.world, manager);
    const player = context.world.players.find(
      (entry) =>
        entry.nationalityId === own &&
        entry.clubId !== manager &&
        countryOf(context.world, entry.clubId) === own &&
        canAddPlayer(context.world, manager, entry.position, manager) &&
        canRemovePlayer(context.world, entry.clubId, entry.id),
    );
    if (!player) throw new Error("sem alvo");
    expect(completeTransfer(context, { playerId: player.id, toClubId: manager, fee: 0 }).ok).toBe(
      true,
    );
  });

  it("clube acima do limite não perde ninguém: só deixa de contratar estrangeiros", () => {
    const { context, manager } = limited(1);
    const own = countryOf(context.world, manager);
    const squad = context.world.players.filter((player) => player.clubId === manager);
    for (const player of squad.slice(0, 3))
      player.nationalityId = context.world.countries.find((c) => c.id !== own)?.id ?? "";
    expect(foreignCount(context.world, manager)).toBe(3);
    expect(context.world.players.filter((player) => player.clubId === manager)).toHaveLength(
      squad.length,
    );
    expect(canSignForeign(context.world, manager)).toBe(false);
  });
});

describe("valor de mercado em mundo com vários países (A3)", () => {
  it("usa as regras da competição do país do clube dono, não da primeira", () => {
    const { context, manager } = setup((world) => {
      const second = world.competitions.find(
        (entry) => entry.countryId !== world.competitions[0]?.countryId,
      );
      if (!second) throw new Error("mundo com um país só");
      (second as { market?: object }).market = { lastYearValuePct: 30 };
    });
    const world = context.world;
    const year = context.league.year;
    const firstCountry = world.competitions[0]?.countryId;
    const lastYear = (player: CompletedPlayer) => ({
      ...player,
      contract: { wage: 1, untilYear: year },
    });
    const ofCountry = (same: boolean) =>
      world.players.find(
        (entry) => (countryOf(world, entry.clubId) === firstCountry) === same && entry.contract,
      ) as CompletedPlayer;
    const inFirst = ofCountry(true);
    const inOther = ofCountry(false);
    const longContract = (player: CompletedPlayer) => ({
      ...player,
      contract: { wage: 1, untilYear: year + 4 },
    });
    expect(manager).toBeDefined();
    const ratio = (player: CompletedPlayer) =>
      marketValue(lastYear(player), world, year) / marketValue(longContract(player), world, year);
    expect(ratio(inFirst)).toBeCloseTo(0.6, 1);
    expect(ratio(inOther)).toBeCloseTo(0.3, 1);
  });
});
