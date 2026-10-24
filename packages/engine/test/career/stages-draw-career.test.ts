import { describe, expect, it } from "vitest";
import { createLeagueSeason, divisionSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import type { CompletedBank } from "../../src/model/types";
import { drawGroups, type GroupDrawClub } from "../../src/stages/groups-draw";
import { drawWarnings } from "../../src/stages/ranking";
import { groupsStage, LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";

// 019 (T055): um sorteio impossível na carreira conclui com aviso e nunca trava a virada.
const SEEDS = ["sorteio-1", "sorteio-2", "sorteio-3", "sorteio-4"];

/**
 * Banco regional em que a divisão de cima é toda do país "x" e a de baixo tem 4 clubes "x" (cabem
 * nos 4 grupos) e os demais em países de no máximo 4 clubes. Os 2 rebaixados da divisão de cima
 * chegam como "x", e a separação por país pode deixar de caber na temporada seguinte.
 */
function separatedWorld(): CompletedBank {
  const world = regionalBank();
  const competition = world.competitions.find((entry) => entry.id === STAGES_ID);
  const top = competition?.divisions[0]?.clubIds ?? [];
  const lower = [...(competition?.divisions[1]?.clubIds ?? [])].sort();
  const country = new Map<string, string>();
  for (const id of top) country.set(id, "x");
  for (const [index, id] of lower.entries()) {
    country.set(id, index < 4 ? "x" : `p${Math.floor((index - 4) / 4)}`);
  }
  for (const club of world.clubs) club.countryId = country.get(club.id) ?? club.countryId;
  const stages = competition?.divisions[1]?.stages;
  if (stages?.[0]?.type !== "groups") throw new Error("sem fase de grupos");
  const rules = [{ kind: "separate", attribute: "country" } as const];
  stages[0] = groupsStage(5, 2, { draw: { rules } });
  return world;
}

function clubsFor(world: CompletedBank, ids: readonly string[]): GroupDrawClub[] {
  return ids.map((id) => {
    const club = world.clubs.find((entry) => entry.id === id);
    return {
      id,
      reputation: club?.reputation ?? 0,
      countryId: club?.countryId ?? "",
      fromPreviousStage: false,
    };
  });
}

describe("virada de temporada com a separação impossível", () => {
  it("o sorteio da temporada seguinte conclui com aviso, e o mesmo sorteio é recusado em modo estrito", () => {
    let sawImpossible = false;
    for (const careerSeed of SEEDS) {
      const world = separatedWorld();
      const created = createLeagueSeason(world, { competitionId: STAGES_ID, careerSeed });
      if (!created.ok) throw new Error(JSON.stringify(created.error));
      const first = divisionSeason(created.league, LOWER_LEVEL);
      expect(first && drawWarnings(first)).toEqual([]);

      const played = advanceLeague(created.league, world, { toEnd: true });
      if (!played.ok) throw new Error(JSON.stringify(played.error));
      const turned = seasonTurnover(played.league, world, [], { careerSeed });
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));

      const next = divisionSeason(turned.league, LOWER_LEVEL);
      const stage = next?.stages?.[0];
      if (!next || !stage) throw new Error("sem a fase de grupos da temporada seguinte");
      // todo clube cai em algum grupo, aconteça o que acontecer
      expect(stage.groups?.flatMap((group) => group.clubIds).sort()).toEqual(
        [...next.clubIds].sort(),
      );
      const xClubs = next.clubIds.filter(
        (id) => turned.world.clubs.find((club) => club.id === id)?.countryId === "x",
      );
      const warnings = drawWarnings(next);
      if (xClubs.length > 4) {
        sawImpossible = true;
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings.every((w) => w.rule.attribute === "country")).toBe(true);
        const strict = drawGroups(
          clubsFor(turned.world, next.clubIds),
          {
            stage: 0,
            groups: 4,
            groupSize: 5,
            previousStagePot: false,
            rules: [{ kind: "separate", attribute: "country" }],
          },
          "estrito",
          "strict",
        );
        expect(strict.ok).toBe(false);
      } else {
        expect(warnings).toEqual([]);
      }
      // a carreira segue: a temporada seguinte joga normalmente
      const again = advanceLeague(turned.league, turned.world, { toEnd: true });
      expect(again.ok).toBe(true);
    }
    expect(sawImpossible).toBe(true);
  }, 300_000);
});
