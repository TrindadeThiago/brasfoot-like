import { describe, expect, it } from "vitest";
import { autoLineup } from "../../src/match/auto-lineup.js";
import { startMatch } from "../../src/match/engine.js";
import { FORMATION_IDS, FORMATIONS, slotPosition } from "../../src/match/formations.js";
import { effectiveStrength, slotWeight } from "../../src/match/strength.js";
import type { Lineup } from "../../src/match/types.js";
import type { CompletedPlayer } from "../../src/model/types.js";
import { clubIds, squadOf } from "./helpers/teams.js";

function value(lineup: Lineup, squad: CompletedPlayer[]): number {
  const byId = new Map(squad.map((player) => [player.id, player]));
  let sum = 0;
  for (const [slotId, playerId] of Object.entries(lineup.starters)) {
    const position = slotPosition(lineup.formation, slotId);
    const player = byId.get(playerId);
    if (position && player) sum += effectiveStrength(player, position) * slotWeight(position);
  }
  return sum;
}

function ok(result: ReturnType<typeof autoLineup>): Lineup {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.lineup;
}

const CLUBS = clubIds();

describe("autoLineup (FR-027 a FR-030, SC-005)", () => {
  it.each(FORMATION_IDS)(
    "todos os clubes no %s: válida, goleiro de ofício e banco ≤ 12",
    (formation) => {
      for (const clubId of CLUBS) {
        const squad = squadOf(clubId);
        const lineup = ok(autoLineup({ squad, formation }));
        const opponent = CLUBS.find((id) => id !== clubId) as string;
        const opponentSquad = squadOf(opponent);
        const started = startMatch({
          home: { clubId, squad, lineup },
          away: {
            clubId: opponent,
            squad: opponentSquad,
            lineup: ok(autoLineup({ squad: opponentSquad, formation })),
          },
          seed: 1,
        });
        expect(started.ok).toBe(true);
        const keeper = squad.find((player) => player.id === lineup.starters.gk);
        expect(keeper?.position).toBe("GK");
        expect(lineup.bench.length).toBeLessThanOrEqual(12);
      }
    },
  );

  it("nenhuma troca titular ↔ reserva aumenta a força efetiva", () => {
    for (const clubId of CLUBS.slice(0, 10)) {
      for (const formation of FORMATION_IDS) {
        const squad = squadOf(clubId);
        const lineup = ok(autoLineup({ squad, formation }));
        const best = value(lineup, squad);
        const starters = Object.entries(lineup.starters);
        const reserves = squad.filter(
          (player) => !Object.values(lineup.starters).includes(player.id),
        );
        for (const [slotId] of starters) {
          for (const reserve of reserves) {
            const swapped = { ...lineup, starters: { ...lineup.starters, [slotId]: reserve.id } };
            expect(value(swapped, squad)).toBeLessThanOrEqual(best + 1e-9);
          }
        }
      }
    }
  });

  it("nunca escala indisponíveis", () => {
    const squad = squadOf(CLUBS[0] as string);
    const first = ok(autoLineup({ squad, formation: "4-3-3" }));
    const unavailable = Object.values(first.starters).slice(0, 4);
    const second = ok(autoLineup({ squad, formation: "4-3-3", unavailable }));
    for (const playerId of [...Object.values(second.starters), ...second.bench]) {
      expect(unavailable).not.toContain(playerId);
    }
  });

  it("com 2 goleiros, um começa e o outro vai para o banco", () => {
    const squad = squadOf(CLUBS[1] as string);
    const keepers = squad.filter((player) => player.position === "GK").slice(0, 2);
    const reduced = squad.filter((player) => player.position !== "GK" || keepers.includes(player));
    const lineup = ok(autoLineup({ squad: reduced, formation: "4-4-2" }));
    const ids = keepers.map((player) => player.id);
    expect(ids).toContain(lineup.starters.gk);
    expect(lineup.bench.filter((playerId) => ids.includes(playerId))).toHaveLength(1);
  });

  it("o banco cobre defesa, meio e ataque", () => {
    const squad = squadOf(CLUBS[2] as string);
    const lineup = ok(autoLineup({ squad, formation: "4-4-2" }));
    const byId = new Map(squad.map((player) => [player.id, player]));
    const positions = lineup.bench.map((playerId) => byId.get(playerId)?.position);
    expect(positions.some((position) => position === "CB" || position === "FB")).toBe(true);
    expect(positions.some((position) => position === "DM" || position === "MF")).toBe(true);
    expect(positions).toContain("FW");
  });

  it("sem goleiro disponível, o mais adequado vai ao gol", () => {
    const squad = squadOf(CLUBS[3] as string);
    const unavailable = squad
      .filter((player) => player.position === "GK")
      .map((player) => player.id);
    const lineup = ok(autoLineup({ squad, formation: "4-4-2", unavailable }));
    expect(lineup.starters.gk).toBeDefined();
    expect(unavailable).not.toContain(lineup.starters.gk);
  });

  it("menos de 11 disponíveis ⇒ erro codificado", () => {
    const squad = squadOf(CLUBS[4] as string).slice(0, 10);
    const result = autoLineup({ squad, formation: "4-4-2" });
    expect(result).toEqual({
      ok: false,
      error: { code: "auto_lineup.not_enough_players", params: { available: 10, required: 11 } },
    });
  });

  it("é determinística", () => {
    const squad = squadOf(CLUBS[5] as string);
    expect(autoLineup({ squad, formation: "3-5-2" })).toEqual(
      autoLineup({ squad: [...squad].reverse(), formation: "3-5-2" }),
    );
    expect(FORMATIONS["3-5-2"].slots).toHaveLength(11);
  });
});
