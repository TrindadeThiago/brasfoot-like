import { describe, expect, it } from "vitest";
import { diffDays } from "../../src/calendar/date";
import {
  buildSeasonCalendar,
  calendarCompetitions,
  dateOfRound,
} from "../../src/calendar/season-calendar";
import type { CompletedBank, StageFormat } from "../../src/model/types";
import {
  CONTINENTAL_ID,
  continentalBank,
  extrasBank,
  groupsStage,
  knockoutAfterGroups,
  LOWER_LEVEL,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";

// 019 (T028): rodadas e respiros de divisões em fases no calendário por datas (research.md R11).
const START = "2027-01-01";

function withLowerStages(base: CompletedBank, stages: StageFormat[]): CompletedBank {
  const copy = JSON.parse(JSON.stringify(base)) as CompletedBank;
  const lower = copy.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  if (lower) lower.stages = stages;
  return copy;
}

const roundsOf = (world: CompletedBank, id: string) =>
  calendarCompetitions(world.competitions).find((entry) => entry.competitionId === id)?.rounds;

describe("rodadas de uma competição com divisão em fases", () => {
  it("é o máximo, entre as divisões, da soma das rodadas das fases", () => {
    // divisão de cima: 8 clubes em turno duplo = 14; de baixo: 5 + 3 = 8
    expect(roundsOf(regionalBank(), STAGES_ID)).toBe(14);
    // divisão de baixo mais longa que a de cima: liga de 20 clubes em turno duplo (38) + 2
    const long = withLowerStages(regionalBank(), [
      {
        type: "league",
        rounds: 2,
        points: { win: 3, draw: 1, loss: 0 },
        tiebreakers: ["goal-difference", "draw-lots"],
        qualified: 4,
      },
      knockoutAfterGroups(4),
    ]);
    expect(roundsOf(long, STAGES_ID)).toBe(38 + 2);
  });

  it("grupos de 4 com 6 grupos e mata-mata de 16: 3 + 4 rodadas", () => {
    expect(roundsOf(extrasBank(), STAGES_ID)).toBe(14);
    const lowerOnly = extrasBank().competitions[0]?.divisions[1];
    expect(lowerOnly?.stages).toHaveLength(2);
  });

  it("uma competição continental conta preliminar, grupos e mata-mata", () => {
    expect(roundsOf(continentalBank(), CONTINENTAL_ID)).toBe(2 + 3 + 3);
  });

  it("o calendário do banco regional cabe na temporada e não duplica jogos de clubes", () => {
    const built = buildSeasonCalendar(calendarCompetitions(regionalBank().competitions), START);
    expect(built.ok).toBe(true);
    const continental = buildSeasonCalendar(
      calendarCompetitions(continentalBank().competitions),
      START,
    );
    expect(continental.ok).toBe(true);
  });
});

describe("respiros (gapWeeks)", () => {
  /** Competição de uma só divisão: a continental, com respiro antes dos grupos e antes da final. */
  function withGaps(groupsGap: number, finalGap: number): CompletedBank {
    const copy = JSON.parse(JSON.stringify(continentalBank())) as CompletedBank;
    const competition = copy.competitions.find((entry) => entry.id === CONTINENTAL_ID);
    if (competition?.format.type !== "stages") throw new Error("sem fases");
    const [preliminary, groups, knockout] = competition.format.stages;
    if (groups?.type === "groups") groups.gapWeeks = groupsGap;
    if (knockout?.type === "knockout") {
      const last = knockout.phases.at(-1);
      if (last) last.gapWeeks = finalGap;
    }
    competition.format.stages = [preliminary, groups, knockout] as StageFormat[];
    return copy;
  }

  it("atrasam as datas das rodadas seguintes à fase que os declara", () => {
    const plain = buildSeasonCalendar(calendarCompetitions(withGaps(0, 0).competitions), START);
    const gapped = buildSeasonCalendar(calendarCompetitions(withGaps(2, 3).competitions), START);
    if (!plain.ok || !gapped.ok) throw new Error("calendário inválido");
    const date = (calendar: typeof plain.calendar, round: number) =>
      dateOfRound(calendar, CONTINENTAL_ID, round) as string;
    // rodadas: 1–2 preliminar, 3–5 grupos, 6–8 mata-mata (a 8ª é a final)
    expect(date(gapped.calendar, 2)).toBe(date(plain.calendar, 2));
    expect(diffDays(date(plain.calendar, 3), date(gapped.calendar, 3))).toBe(14);
    expect(diffDays(date(plain.calendar, 7), date(gapped.calendar, 7))).toBe(14);
    expect(diffDays(date(plain.calendar, 8), date(gapped.calendar, 8))).toBe(14 + 21);
  });

  it("numa competição de mais de uma divisão são recusados (grade de datas única)", () => {
    const world = withLowerStages(regionalBank(), [
      groupsStage(5, 2, { gapWeeks: 1 }),
      knockoutAfterGroups(8),
    ]);
    const built = buildSeasonCalendar(calendarCompetitions(world.competitions), START);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.issues).toContainEqual({ code: "stages.gap_conflict", competitionId: STAGES_ID });
  });
});
