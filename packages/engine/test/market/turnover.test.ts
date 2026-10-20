import { describe, expect, it } from "vitest";
import { seasonTurnover } from "../../src/career/turnover";
import { advanceCareer } from "../../src/finance/round";
import { toFreeAgent } from "../../src/market/free-agents";
import { proposeContract, startNegotiation } from "../../src/market/negotiation";
import { wageDemand } from "../../src/market/player-response";
import type { MarketContext, MarketState } from "../../src/market/types";
import type { CompletedBank, CompletedPlayer } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { squadProblems } from "../../src/renewal/squads";
import { applied, MANAGER, marketContext, SEED, YEAR } from "./helpers";

const start = marketContext();
const played = advanceCareer(
  start.league,
  start.finances,
  start.world,
  { toEnd: true },
  MANAGER,
  undefined,
  { state: initialRenewal(start.world), careerSeed: SEED },
);
if (!played.ok) throw new Error(JSON.stringify(played.error));
const finished: MarketContext = {
  ...start,
  league: played.league,
  finances: played.finances,
  world: played.world,
};

function turn(world: CompletedBank, market: MarketState = start.market) {
  const result = seasonTurnover(finished.league, world, [], {
    careerSeed: SEED,
    finances: finished.finances,
    managerClubId: MANAGER,
    renewal: initialRenewal(world),
    market,
  });
  if (!result.ok || !result.market) throw new Error(JSON.stringify(result));
  return { ...result, market: result.market };
}

function edit(world: CompletedBank, change: (player: CompletedPlayer) => CompletedPlayer) {
  return { ...world, players: world.players.map(change) };
}

function ownPlayers(world: CompletedBank) {
  return world.players.filter((player) => player.clubId === MANAGER);
}

describe("expire-contracts (SC-003, FR-004)", () => {
  const [kept, lost] = ownPlayers(finished.world)
    .filter((player) => player.position === "MF")
    .sort((a, b) => b.strength - a.strength);
  if (!kept || !lost) throw new Error("sem jogadores");

  const expiring = edit(finished.world, (player) =>
    player.id === kept.id || player.id === lost.id
      ? { ...player, contract: { wage: player.contract?.wage ?? 1, untilYear: YEAR } }
      : player,
  );
  const ctx: MarketContext = { ...finished, world: expiring };
  const renewed = (() => {
    const started = startNegotiation(ctx, { kind: "renew", playerId: kept.id });
    if (!started.ok) throw new Error(JSON.stringify(started.error));
    const next = applied(ctx, started.value.update);
    const demand = wageDemand(next, kept, MANAGER, true);
    const done = proposeContract(next, started.value.negotiation?.id ?? "", {
      wage: demand * 2,
      years: 2,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    return applied(next, done.value.update);
  })();

  it("o renovado continua e o não renovado vira livre, sem pagamento", () => {
    const result = turn(renewed.world, renewed.market);
    const keptPlayer = result.world.players.find((player) => player.id === kept.id);
    expect(keptPlayer?.clubId).toBe(MANAGER);
    expect(keptPlayer?.contract?.untilYear).toBe(YEAR + 2);
    expect(result.world.players.some((player) => player.id === lost.id)).toBe(false);
    const agent = result.market.freeAgents.find((entry) => entry.player.id === lost.id);
    expect(agent).toMatchObject({ lastClubId: MANAGER, sinceYear: YEAR });
    expect(agent?.player).not.toHaveProperty("clubId");
    expect(agent?.player).not.toHaveProperty("contract");
    expect(
      result.market.log.some((entry) => entry.kind === "expired" && entry.playerId === lost.id),
    ).toBe(true);
    expect(result.finances?.clubs[MANAGER]?.debt).toBe(finished.finances.clubs[MANAGER]?.debt);
  });

  it("clubes da IA renovam quem é jovem e importante, o resto vira livre; elencos seguem válidos", () => {
    const allExpiring = edit(finished.world, (player) =>
      player.contract ? { ...player, contract: { ...player.contract, untilYear: YEAR } } : player,
    );
    const result = turn(allExpiring);
    for (const player of result.world.players) {
      expect(player.contract?.untilYear ?? 0).toBeGreaterThan(YEAR);
    }
    expect(result.market.freeAgents.length).toBeGreaterThan(0);
    expect(squadProblems(result.world, result.league)).toEqual([]);
    for (const clubId of result.league.divisions.flatMap((season) => season.clubIds)) {
      const size = result.world.players.filter((player) => player.clubId === clubId).length;
      expect(size).toBeGreaterThanOrEqual(SQUAD_RULES.min);
      expect(size).toBeLessThanOrEqual(SQUAD_RULES.max);
    }
  }, 60000);

  it("sem mercado no contexto nada expira", () => {
    const allExpiring = edit(finished.world, (player) =>
      player.contract ? { ...player, contract: { ...player.contract, untilYear: YEAR } } : player,
    );
    const result = seasonTurnover(finished.league, allExpiring, [], {
      careerSeed: SEED,
      finances: finished.finances,
      managerClubId: MANAGER,
      renewal: initialRenewal(allExpiring),
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.market).toBeUndefined();
    expect(
      result.world.players.filter((player) => player.contract?.untilYear === YEAR).length,
    ).toBeGreaterThan(300);
  }, 60000);
});

describe("empréstimos na virada (FR-018, FR-019)", () => {
  const owner = finished.world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";
  const squad = finished.world.players.filter((player) => player.clubId === owner);
  const loaned = squad.find((player) => player.position === "MF");
  if (!loaned?.contract) throw new Error("sem jogador");

  function withLoan(parentUntil: number) {
    return edit(finished.world, (player) =>
      player.id === loaned?.id && player.contract
        ? {
            ...player,
            clubId: MANAGER,
            contract: {
              wage: player.contract.wage,
              untilYear: parentUntil,
              loan: { fromClubId: owner, untilYear: YEAR },
            },
          }
        : player,
    );
  }

  it("volta ao clube de origem sem o empréstimo", () => {
    const result = turn(withLoan(YEAR + 3));
    const back = result.world.players.find((player) => player.id === loaned.id);
    expect(back?.clubId).toBe(owner);
    expect(back?.contract?.loan).toBeUndefined();
    expect(back?.contract?.untilYear).toBe(YEAR + 3);
  });

  it("contrato que termina durante o empréstimo não volta ao clube: vira livre ou é renovado pela IA", () => {
    const result = turn(withLoan(YEAR));
    const inWorld = result.world.players.find((player) => player.id === loaned.id);
    const free = result.market.freeAgents.some((entry) => entry.player.id === loaned.id);
    expect(Boolean(inWorld) !== free).toBe(true);
    if (inWorld) expect(inWorld.clubId).toBe(owner);
  });
});

describe("livres e limpeza do mercado (FR-021, FR-014)", () => {
  const sample = finished.world.players.find((player) => player.clubId !== MANAGER);
  if (!sample) throw new Error("sem jogador");
  const without = {
    ...finished.world,
    players: finished.world.players.filter((p) => p.id !== sample.id),
  };
  const young = { ...sample, id: "livre-novo" };
  const old = { ...sample, id: "livre-antigo" };

  it("livre há uma temporada inteira sai do mercado; o recém-liberado fica", () => {
    const market: MarketState = {
      ...start.market,
      freeAgents: [
        toFreeAgent(old, sample.clubId, YEAR - 1),
        toFreeAgent(young, sample.clubId, YEAR),
      ],
    };
    const result = turn(without, market);
    const ids = result.market.freeAgents.map((entry) => entry.player.id);
    expect(ids).toContain("livre-novo");
    expect(ids).not.toContain("livre-antigo");
  });

  it("livres nunca entram no banco e o grupo não cresce sem limite", () => {
    const result = turn(without);
    const ids = new Set(result.world.players.map((player) => player.id));
    expect(result.market.freeAgents.every((entry) => !ids.has(entry.player.id))).toBe(true);
    expect(result.market.freeAgents.length).toBeLessThanOrEqual(150);
  });

  it("negociações e propostas expiram na virada", () => {
    const market: MarketState = {
      ...start.market,
      negotiations: [
        {
          id: "neg-0001",
          playerId: sample.id,
          kind: "buy",
          clubId: MANAGER,
          stage: "club_offer",
          openedRound: 1,
        },
      ],
      incoming: [
        {
          id: "off-0002",
          playerId: sample.id,
          fromClubId: sample.clubId,
          fee: 1,
          kind: "buy",
          expiresRound: 99,
        },
      ],
      nextSeq: 3,
    };
    const result = turn(finished.world, market);
    expect(result.market.negotiations).toEqual([]);
    expect(result.market.incoming).toEqual([]);
    expect(result.market.nextSeq).toBe(3);
  });
});
