import { describe, expect, it } from "vitest";
import {
  canAddPlayer,
  canRemovePlayer,
  squadLimit,
  squadSize,
  strengthRank,
} from "../../src/market/squad";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { contractWorld, MANAGER } from "./helpers";

const world = contractWorld();

describe("limites de elenco no mercado (FR-016)", () => {
  it("cabe mais um só abaixo do máximo", () => {
    const size = squadSize(world, MANAGER);
    expect(canAddPlayer(world, MANAGER)).toBe(size < SQUAD_RULES.max);
    const full = {
      ...world,
      players: [
        ...world.players,
        ...world.players
          .filter((player) => player.clubId === MANAGER)
          .slice(0, SQUAD_RULES.max)
          .map((player, index) => ({ ...player, id: `extra-${index}` })),
      ],
    };
    expect(canAddPlayer(full, MANAGER)).toBe(false);
  });

  it("não sai ninguém abaixo do mínimo total", () => {
    const squad = world.players.filter((player) => player.clubId === MANAGER);
    const trimmed = {
      ...world,
      players: world.players.filter(
        (player) => player.clubId !== MANAGER || squad.indexOf(player) < SQUAD_RULES.min,
      ),
    };
    const anyone = trimmed.players.find((player) => player.clubId === MANAGER);
    expect(squadSize(trimmed, MANAGER)).toBe(SQUAD_RULES.min);
    expect(canRemovePlayer(trimmed, MANAGER, anyone?.id ?? "")).toBe(false);
  });

  it("não sai goleiro se faltaria cobertura", () => {
    const keepers = world.players.filter(
      (player) => player.clubId === MANAGER && player.position === "GK",
    );
    const reduced = {
      ...world,
      players: world.players.filter(
        (player) =>
          !(player.clubId === MANAGER && player.position === "GK") ||
          keepers.indexOf(player) < SQUAD_RULES.positionMin.GK,
      ),
    };
    const keeper = reduced.players.find(
      (player) => player.clubId === MANAGER && player.position === "GK",
    );
    expect(canRemovePlayer(reduced, MANAGER, keeper?.id ?? "")).toBe(false);
  });

  it("jogador que não é do clube não pode sair dele", () => {
    const other = world.players.find((player) => player.clubId !== MANAGER);
    expect(canRemovePlayer(world, MANAGER, other?.id ?? "")).toBe(false);
  });

  it("ranking por força dentro do clube", () => {
    const squad = world.players
      .filter((player) => player.clubId === MANAGER)
      .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1));
    expect(strengthRank(world, MANAGER, squad[0]?.id ?? "")).toBe(1);
    expect(strengthRank(world, MANAGER, squad[squad.length - 1]?.id ?? "")).toBe(squad.length);
  });
});

describe("limite de elenco do jogador (40) e da IA (28)", () => {
  const AI = world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";

  /** O clube fica com exatamente `target` jogadores (corta ou duplica os que tem). */
  function sized(clubId: string, target: number) {
    const own = world.players.filter((player) => player.clubId === clubId);
    const extra = Array.from({ length: Math.max(0, target - own.length) }, (_, index) => ({
      ...(own[index % own.length] as (typeof own)[number]),
      id: `extra-${clubId}-${index}`,
    }));
    const keep = new Set(own.slice(0, target).map((player) => player.id));
    return {
      ...world,
      players: [
        ...world.players.filter((player) => player.clubId !== clubId || keep.has(player.id)),
        ...extra,
      ],
    };
  }

  it("os limites", () => {
    expect(squadLimit(MANAGER, MANAGER)).toBe(SQUAD_RULES.userMax);
    expect(SQUAD_RULES.userMax).toBe(40);
    expect(squadLimit(AI, MANAGER)).toBe(SQUAD_RULES.max);
    expect(squadLimit(MANAGER)).toBe(SQUAD_RULES.max);
  });

  it("o jogador cabe mais gente até 40, acima dos 28 da IA", () => {
    const at30 = sized(MANAGER, 30);
    expect(squadSize(at30, MANAGER)).toBe(30);
    expect(canAddPlayer(at30, MANAGER, "MF", MANAGER)).toBe(true);
    expect(canAddPlayer(at30, MANAGER, "MF")).toBe(false);
    expect(canAddPlayer(sized(MANAGER, 39), MANAGER, "FW", MANAGER)).toBe(true);
    expect(canAddPlayer(sized(MANAGER, 40), MANAGER, "FW", MANAGER)).toBe(false);
  });

  it("o clube do jogador não tem o teto por posição, só o total", () => {
    const keepers = Array.from({ length: 10 }, (_, index) => ({
      ...(world.players.find(
        (player) => player.clubId === MANAGER && player.position === "GK",
      ) as (typeof world.players)[number]),
      id: `goleiro-${index}`,
    }));
    const many = { ...world, players: [...world.players, ...keepers] };
    expect(canAddPlayer(many, MANAGER, "GK", MANAGER)).toBe(true);
    expect(canAddPlayer(many, MANAGER, "GK")).toBe(false);
  });

  it("a IA segue em 28", () => {
    expect(canAddPlayer(sized(AI, 28), AI, undefined, MANAGER)).toBe(false);
    expect(canAddPlayer(sized(AI, 27), AI, undefined, MANAGER)).toBe(true);
  });
});
