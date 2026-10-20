import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { canAddPlayer } from "../../../src/market/squad";
import { POSITIONS } from "../../../src/model/catalogs";
import type { CompletedBank, CompletedPlayer } from "../../../src/model/types";
import { initialRenewal } from "../../../src/renewal/measure";
import { balanceSquads } from "../../../src/renewal/squads";
import { generateYouth } from "../../../src/renewal/youth";
import { contractWorld, MANAGER, newLeague, SEED } from "../helpers";

const world = contractWorld();
const league = newLeague(SEED, {}, world);
const CLUB = world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";
const found = world.players.find((p) => p.clubId === CLUB && p.position === "GK");
if (!found) throw new Error("sem goleiro");
const keeper: CompletedPlayer = found;

function withKeepers(total: number): CompletedBank {
  const current = world.players.filter((p) => p.clubId === CLUB && p.position === "GK").length;
  const extras = Array.from({ length: Math.max(0, total - current) }, (_, index) => ({
    ...keeper,
    id: `gk-extra-${index}`,
    strength: 10 + index,
  }));
  return { ...world, players: [...world.players, ...extras] };
}

describe("teto por posição (011 R3, FR-009)", () => {
  it("o mundo inicial respeita o teto", () => {
    for (const club of world.clubs) {
      for (const position of POSITIONS) {
        const count = world.players.filter(
          (p) => p.clubId === club.id && p.position === position,
        ).length;
        expect(count, `${club.id} ${position}`).toBeLessThanOrEqual(
          DEFAULT_AI_MARKET.positionMax[position],
        );
      }
    }
  });

  it("canAddPlayer recusa acima do teto da posição", () => {
    const full = withKeepers(DEFAULT_AI_MARKET.positionMax.GK);
    expect(canAddPlayer(full, CLUB, "GK")).toBe(false);
    expect(canAddPlayer(full, CLUB)).toBe(
      full.players.filter((p) => p.clubId === CLUB).length < 28,
    );
  });

  it("balanceSquads libera os de menor utilidade acima do teto", () => {
    const over = withKeepers(6);
    const result = balanceSquads(
      over,
      league,
      initialRenewal(over),
      SEED,
      1,
      over.manifest.referenceDate,
    );
    const keepers = result.world.players.filter((p) => p.clubId === CLUB && p.position === "GK");
    expect(keepers.length).toBeLessThanOrEqual(DEFAULT_AI_MARKET.positionMax.GK);
    expect(result.releasedPlayers.map((p) => p.id)).toContain("gk-extra-0");
  });

  it("a base não gera jovem numa posição no teto", () => {
    const full = withKeepers(DEFAULT_AI_MARKET.positionMax.GK);
    const result = generateYouth(
      full,
      league,
      initialRenewal(full),
      SEED,
      1,
      full.manifest.referenceDate,
    );
    const keepers = result.world.players.filter((p) => p.clubId === CLUB && p.position === "GK");
    expect(keepers.length).toBe(DEFAULT_AI_MARKET.positionMax.GK);
  });
});
