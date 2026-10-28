import { describe, expect, it } from "vitest";
import { generateFootballWorld } from "../../../src/worldgen/football-world";
import { COMPACT_PROFILE } from "../../../src/worldgen/football-world/profiles/compact";
import {
  DEFAULT_PROFILE,
  MEDIUM_PROFILE,
} from "../../../src/worldgen/football-world/profiles/default";
import { clubNameProblems, competitionNameProblems, isRealPlayer } from "../../helpers/blocklist";

describe("verificador de nomes (024 R13)", () => {
  it("cidade que também é clube só é problema como nome inteiro", () => {
    expect(clubNameProblems("Santos")).toEqual(["Santos"]);
    expect(clubNameProblems("Esporte Clube Santos Paulista")).toEqual([]);
    expect(clubNameProblems("Atlético Manchester")).toEqual([]);
    expect(clubNameProblems("Manchester")).toEqual(["Manchester"]);
  });

  it("apelido distintivo de clube real é problema em qualquer posição", () => {
    expect(clubNameProblems("Flamengo de Teresina")).toContain("Flamengo");
    expect(clubNameProblems("União Corinthians")).toContain("Corinthians");
  });

  it("competição real e jogador real", () => {
    expect(competitionNameProblems("Copa Libertadores do Norte")).toContain("Libertadores");
    expect(competitionNameProblems("Campeonato Nacional do Brasil")).toEqual([]);
    expect(isRealPlayer("Lionel Messi")).toBe(true);
    expect(isRealPlayer("João Silva")).toBe(false);
  });
});

describe("nenhum nome real nos clubes, competições e jogadores gerados (024 FR-010, SC-008)", () => {
  const worlds = [
    ["reduzido", COMPACT_PROFILE, "a"],
    ["reduzido", COMPACT_PROFILE, "b"],
    ["medio", MEDIUM_PROFILE, "mundo-completo-1"],
    ["medio", MEDIUM_PROFILE, "outra"],
    ["completo", DEFAULT_PROFILE, "mundo-completo-1"],
    ["completo", DEFAULT_PROFILE, "c"],
    ["completo", DEFAULT_PROFILE, "d"],
  ] as const;
  it.each(worlds)("perfil %s, seed %s", (_label, profile, seed) => {
    const bank = generateFootballWorld(profile, seed);
    const hits: string[] = [];
    for (const club of bank.clubs) {
      for (const hit of clubNameProblems(club.name)) hits.push(`clube ${club.name} ⊃ ${hit}`);
    }
    for (const competition of bank.competitions) {
      const names = [competition.name, ...competition.divisions.map((division) => division.name)];
      for (const name of names) {
        for (const hit of competitionNameProblems(name)) hits.push(`competição ${name} ⊃ ${hit}`);
      }
    }
    for (const player of bank.players) {
      if (isRealPlayer(player.displayName)) hits.push(`jogador ${player.displayName}`);
    }
    expect(hits).toEqual([]);
  });
});
