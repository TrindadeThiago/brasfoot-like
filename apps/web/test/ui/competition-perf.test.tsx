// 027 SC-003 / FR-017: calendário de temporada completa, classificação de 20 clubes com forma e
// lista de competições de um mundo com vários países abrem dentro de 1 segundo.
import { clubFixtures } from "@brasfoot-like/engine";
import { seasonStateOf, userSeason } from "@brasfoot-like/save";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calendarMonths } from "../../src/game/calendar-month";
import { clubCompetitions } from "../../src/game/competitions";
import { CompetitionList } from "../../src/ui/CompetitionList";
import { StandingsTable } from "../../src/ui/StandingsTable";
import { careerSave, qualificationSave } from "../helpers/saves";

function timed(run: () => void): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("desempenho das telas de acompanhamento (027)", () => {
  it("monta os meses de uma temporada completa em até 1 s", () => {
    const save = careerSave("tela");
    const fixtures = clubFixtures(seasonStateOf(save), save.clubId);
    expect(fixtures.length).toBeGreaterThanOrEqual(38);
    expect(timed(() => calendarMonths(fixtures, "2027-01-03", "2027-01-10"))).toBeLessThan(1000);
  });

  it("renderiza a classificação de 20 clubes com forma em até 1 s", () => {
    const save = careerSave("tela");
    const season = userSeason(save);
    expect(
      timed(() => {
        render(<StandingsTable save={save} season={season} caption="Série A" />);
      }),
    ).toBeLessThan(1000);
  });

  it("classifica e renderiza as competições de um mundo de vários países em até 1 s", () => {
    const save = qualificationSave("tela");
    expect(timed(() => clubCompetitions(save))).toBeLessThan(1000);
    expect(
      timed(() => {
        render(<CompetitionList save={save} competitionId={save.league.competitionId} />);
      }),
    ).toBeLessThan(1000);
  });
});
