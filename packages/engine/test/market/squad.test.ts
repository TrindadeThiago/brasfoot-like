import { describe, expect, it } from "vitest";
import { canAddPlayer, canRemovePlayer, squadSize, strengthRank } from "../../src/market/squad";
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
