import { describe, expect, it } from "vitest";
import { POSITIONS } from "../../src/model/catalogs";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { balanceSquads, squadProblems } from "../../src/renewal/squads";
import { validateBank } from "../../src/validation/validate";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

const DATE = "2028-01-01";
const CLUB = "clube-001";

function balance(world: CompletedBank) {
  return balanceSquads(world, newLeague("elencos", {}, world), initialRenewal(world), "s", 1, DATE);
}

describe("elencos válidos (US4, R7)", () => {
  it("repõe goleiros até o mínimo, marcando como promovidos", () => {
    const world = editedWorld((w) => {
      w.players = w.players.filter(
        (player) => !(player.clubId === CLUB && player.position === "GK"),
      );
    });
    const result = balance(world);
    const keepers = result.world.players.filter(
      (player) => player.clubId === CLUB && player.position === "GK",
    );
    expect(keepers).toHaveLength(SQUAD_RULES.positionMin.GK);
    expect(result.promoted.filter((ref) => ref.position === "GK")).toHaveLength(
      SQUAD_RULES.positionMin.GK,
    );
  });

  it("completa elenco abaixo do mínimo", () => {
    const world = editedWorld((w) => {
      const own = w.players.filter((player) => player.clubId === CLUB);
      const keep = new Set(own.slice(0, 18).map((player) => player.id));
      w.players = w.players.filter((player) => player.clubId !== CLUB || keep.has(player.id));
    });
    const result = balance(world);
    expect(
      result.world.players.filter((player) => player.clubId === CLUB).length,
    ).toBeGreaterThanOrEqual(SQUAD_RULES.min);
  });

  it("dispensa os de menor utilidade até o máximo sem quebrar os mínimos", () => {
    const extra = Array.from({ length: 10 }, (_, index) => index);
    const world = editedWorld((w) => {
      const template = w.players.find(
        (player) => player.clubId === CLUB && player.position === "MF",
      );
      if (!template) return;
      for (const index of extra) {
        w.players.push({
          ...template,
          id: `jogador-9${String(index).padStart(4, "0")}`,
          strength: 25 + index,
          birthDate: "1993-01-01",
          hidden: { ...template.hidden, potential: 40 },
        });
      }
    });
    const before = world.players.filter((player) => player.clubId === CLUB).length;
    const result = balance(world);
    const after = result.world.players.filter((player) => player.clubId === CLUB);
    expect(after).toHaveLength(SQUAD_RULES.max);
    expect(result.released.filter((ref) => ref.playerId.startsWith("jogador-9"))).toHaveLength(
      before - SQUAD_RULES.max,
    );
    for (const position of POSITIONS) {
      expect(after.filter((player) => player.position === position).length).toBeGreaterThanOrEqual(
        SQUAD_RULES.positionMin[position],
      );
    }
  });

  it("todo clube termina dentro das regras, o banco segue válido e é determinístico", () => {
    const result = balance(testWorld());
    expect(squadProblems(result.world, newLeague("elencos"))).toEqual([]);
    expect(validateBank(result.world).ok).toBe(true);
    expect(balance(testWorld())).toEqual(result);
  });
});
