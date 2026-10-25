import { describe, expect, it } from "vitest";
import { expectationOf, goalProgress, goalTiersFor, seasonGoals } from "../../src/board/goals";
import type { Competition } from "../../src/model/types";
import { contractWorld } from "../market/helpers";
import { divisionClubs, newCareer, play } from "./helpers";

// Meta "classificar para X" (021 R8): uma vaga direta por posição na divisão vira um nível de meta.
const TARGET = "taca-alimentada";

function fedWorld() {
  return contractWorld((world) => {
    const main = world.competitions[0] as Competition;
    const clubs = main.divisions[0]?.clubIds ?? [];
    world.competitions.push({
      id: TARGET,
      countryId: main.countryId,
      name: "Taça Alimentada",
      format: JSON.parse(JSON.stringify(main.format)),
      divisions: [
        {
          level: 1,
          name: "Taça",
          clubIds: clubs.slice(0, 3),
          promotionSlots: 0,
          relegationSlots: 0,
          berths: [
            {
              id: "top6",
              source: {
                kind: "position",
                competitionId: main.id,
                level: 1,
                from: 1,
                to: 6,
              },
              fallback: [
                { kind: "position", competitionId: main.id, level: 1, from: 1, to: clubs.length },
              ],
            },
          ],
        },
      ],
    });
  });
}

describe("meta de classificação (021 US6)", () => {
  const career = newCareer({ world: fedWorld() });

  it("a divisão com zona de vaga ganha o nível qualify entre os níveis existentes", () => {
    const tiers = goalTiersFor(career.world, career.league, 1);
    const qualify = tiers.find((entry) => entry.tier === "qualify");
    expect(qualify).toEqual({ tier: "qualify", position: 6, competitionId: TARGET });
    const positions = tiers.map((entry) => entry.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(new Set(positions).size).toBe(positions.length);
    expect(tiers.map((entry) => entry.tier).slice(0, 3)).toEqual(["title", "top4", "qualify"]);
  });

  it("sem vagas, os níveis são os de antes", () => {
    const plain = newCareer();
    expect(
      goalTiersFor(plain.world, plain.league, 1).some((entry) => entry.tier === "qualify"),
    ).toBe(false);
  });

  it("algum clube recebe a meta de classificar, com a competição de destino", () => {
    const clubs = divisionClubs(career, 1);
    const goals = clubs.map((clubId) => seasonGoals(career, clubId, 60).sport);
    const chosen = goals.filter((sport) => sport.tier === "qualify");
    expect(chosen.length).toBeGreaterThan(0);
    for (const sport of chosen) {
      expect(sport.competitionId).toBe(TARGET);
      expect(sport.position).toBe(6);
    }
    expect(
      goals
        .filter((sport) => sport.tier !== "qualify")
        .every((sport) => sport.competitionId === undefined),
    ).toBe(true);
  });

  it("a meta é cumprida pela posição dentro da zona e o progresso leva a competição", () => {
    // O técnico recebe a meta conforme a expectativa do próprio clube: acha um a quem toca `qualify`.
    const clubs = [...divisionClubs(career, 1)].sort(
      (a, b) => expectationOf(career, a) - expectationOf(career, b),
    );
    let mine = career;
    let manager = "";
    for (const clubId of clubs.slice(0, 12)) {
      const candidate = newCareer({ world: career.world, managerClubId: clubId, noFiring: true });
      if (goalProgress(candidate, clubId)?.sport.tier === "qualify") {
        mine = candidate;
        manager = clubId;
        break;
      }
    }
    expect(manager).not.toBe("");
    const progress = goalProgress(mine, manager);
    expect(progress?.sport.tier).toBe("qualify");
    expect(progress?.sport.competitionId).toBe(TARGET);
    expect(progress?.sport.required).toBe(6);
    const ended = play(mine, { toEnd: true });
    const evaluation = ended.board.evaluation;
    expect(evaluation?.sport.competitionId).toBe(TARGET);
    expect(evaluation?.sport.met).toBe((evaluation?.sport.final ?? 99) <= 6);
  }, 120_000);
});
