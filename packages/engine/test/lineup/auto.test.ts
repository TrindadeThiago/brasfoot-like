import { describe, expect, it } from "vitest";
import { managerAutoLineup } from "../../src/lineup/auto";
import { validateLineup } from "../../src/lineup/validate";
import { FORMATION_IDS } from "../../src/match/formations";
import { lineupForMatch } from "../../src/season/lineups";
import { injured, serieAClubs, squadOf, suspended } from "./helpers";

describe("managerAutoLineup = escalação do computador (FR-007, SC-002)", () => {
  for (const clubId of serieAClubs().slice(0, 4)) {
    const squad = squadOf(clubId);
    const ids = squad.map((player) => player.id).sort();
    const cases = {
      "sem indisponíveis": [],
      "três indisponíveis": [
        injured(ids[0] as string, 3),
        suspended(ids[5] as string, 1),
        injured(ids[9] as string, 1),
      ],
      "elenco curto": ids.slice(0, ids.length - 9).map((id, index) => injured(id, (index % 4) + 1)),
    };
    for (const [name, unavailable] of Object.entries(cases)) {
      it(`${clubId}: ${name}, todos os esquemas`, () => {
        for (const formation of FORMATION_IDS) {
          const computer = lineupForMatch(squad, formation, unavailable);
          const manager = managerAutoLineup(squad, formation, "defensive", unavailable);
          expect(manager.lineup).toEqual({ ...computer.lineup, posture: "defensive" });
          expect(manager.fielded).toEqual(computer.fielded);
          const validation = validateLineup(manager.lineup, squad, unavailable);
          if (name !== "elenco curto") expect(validation.valid).toBe(true);
        }
      });
    }
  }
});
