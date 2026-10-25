import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { competitionSeason } from "../../src/career/season-state";
import type { LeagueSeason } from "../../src/career/types";
import { sealDropIns } from "../../src/continental/dropins";
import { tieState } from "../../src/knockout/tie";
import { groupTables } from "../../src/stages/classification";
import { cupView } from "../../src/stages/cup-view";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactWorld, editedWorld, playUntil } from "../career/continental-helpers";
import { worldState } from "../career/world-helpers";

const SEED = "continental-ligacao";
const DROP_IN = "terceiros-dos-grupos";

/** A menor sem `dropIns` para o jogo andar sem a ponte, começando cedo ou tarde (`startWeek`). */
function scenario(options: { startWeek: number; eliminated?: boolean }) {
  const real = editedWorld(compactWorld(SEED), CONTINENTAL_IDS.minor, (minor) => ({
    ...minor,
    schedule: { weekday: 4, startWeek: options.startWeek, everyWeeks: 2 },
    divisions: minor.divisions.map((division) => ({
      ...division,
      dropIns: options.eliminated
        ? [
            {
              id: DROP_IN,
              source: {
                kind: "eliminated" as const,
                competitionId: CONTINENTAL_IDS.major,
                stage: 2,
                phase: 1,
              },
              entry: { stage: 2 },
            },
          ]
        : division.dropIns,
    })),
  }));
  const stepping = editedWorld(real, CONTINENTAL_IDS.minor, (minor) => ({
    ...minor,
    divisions: minor.divisions.map(({ dropIns: _ignored, ...division }) => division),
  }));
  const major = stepping.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major);
  const manager = major?.divisions[0]?.clubIds[0] ?? "";
  return { real, state: worldState(stepping, SEED, manager), manager };
}

const leaguesOf = (state: CareerSeasonState): LeagueSeason[] => [
  state.league,
  ...state.competitions,
];
const major = (state: CareerSeasonState) =>
  competitionSeason(state, CONTINENTAL_IDS.major).divisions[0];
const minor = (state: CareerSeasonState) =>
  competitionSeason(state, CONTINENTAL_IDS.minor).divisions[0];

function groupsFinished(state: CareerSeasonState): boolean {
  const season = major(state);
  const stage = season?.stages?.[0];
  return !!season && !!stage && season.nextRound > Math.max(...stage.rounds);
}

function quartersFinished(state: CareerSeasonState): boolean {
  const season = major(state);
  const stage = season?.stages?.[1];
  if (!season || !stage?.started) return false;
  const view = cupView(season, state.world, 1);
  const phase = view.bracket?.phases[0];
  return !!phase?.drawn && phase.ties.every((tie) => tieState(view, 0, tie.id).decided);
}

describe("selagem da ligação entre competições (022 US3, FR-007, FR-009)", () => {
  const early = scenario({ startWeek: 6 });
  const atGroups = playUntil(early.state, SEED, early.manager, groupsFinished);
  const thirds = groupTables(major(atGroups) as never, atGroups.world, 0).map(
    ({ rows }) => rows[2]?.clubId as string,
  );

  it("antes de a fase de origem terminar nada é selado e as referências não mudam", () => {
    const seasons = leaguesOf(early.state);
    const result = sealDropIns(early.real, seasons);
    expect(result.sealed).toEqual([]);
    expect(result.warnings).toEqual([]);
    for (const [index, league] of result.seasons.entries()) expect(league).toBe(seasons[index]);
  });

  it("sela os terceiros de cada grupo, em ordem de grupo, e estende a temporada da menor", () => {
    expect(thirds).toHaveLength(4);
    const seasons = leaguesOf(atGroups);
    const result = sealDropIns(early.real, seasons);
    expect(result.warnings).toEqual([]);
    expect(result.sealed).toEqual([
      {
        competitionId: CONTINENTAL_IDS.minor,
        dropInId: DROP_IN,
        clubIds: thirds,
        fromCompetitionId: CONTINENTAL_IDS.major,
      },
    ]);
    const league = result.seasons.find((entry) => entry.competitionId === CONTINENTAL_IDS.minor);
    const season = league?.divisions[0];
    expect(season?.stages?.[1]?.incoming).toEqual([{ dropInId: DROP_IN, clubIds: thirds }]);
    for (const clubId of thirds) {
      expect(season?.clubIds).toContain(clubId);
      expect(season?.formations[clubId]).toBeDefined();
      expect(league?.origins?.[clubId]).toEqual({
        kind: "dropIn",
        dropInId: DROP_IN,
        from: CONTINENTAL_IDS.major,
        position: 3,
      });
    }
    // A maior não muda.
    const before = seasons.find((entry) => entry.competitionId === CONTINENTAL_IDS.major);
    expect(result.seasons.find((entry) => entry.competitionId === CONTINENTAL_IDS.major)).toBe(
      before,
    );
  });

  it("é idempotente: selar de novo não muda nada", () => {
    const once = sealDropIns(early.real, leaguesOf(atGroups));
    const twice = sealDropIns(early.real, once.seasons);
    expect(twice.sealed).toEqual([]);
    for (const [index, league] of twice.seasons.entries()) expect(league).toBe(once.seasons[index]);
  });

  it("um clube que já está no destino cede a vaga ao próximo candidato", () => {
    const seasons = leaguesOf(atGroups).map((league) =>
      league.competitionId !== CONTINENTAL_IDS.minor
        ? league
        : {
            ...league,
            divisions: league.divisions.map((season) => ({
              ...season,
              clubIds: [...season.clubIds, thirds[0] as string],
            })),
          },
    );
    const result = sealDropIns(early.real, seasons);
    const sealed = result.sealed[0]?.clubIds ?? [];
    expect(sealed).toHaveLength(4);
    expect(sealed).not.toContain(thirds[0]);
    const fourth = groupTables(major(atGroups) as never, atGroups.world, 0)[0]?.rows[3]?.clubId;
    expect(sealed).toContain(fourth);
  });

  it("sem candidatos suficientes sela o que há e avisa (dropin_exhausted)", () => {
    const every = major(atGroups)?.clubIds ?? [];
    const seasons = leaguesOf(atGroups).map((league) =>
      league.competitionId !== CONTINENTAL_IDS.minor
        ? league
        : {
            ...league,
            divisions: league.divisions.map((season) => ({
              ...season,
              clubIds: [...new Set([...season.clubIds, ...every])],
            })),
          },
    );
    const result = sealDropIns(early.real, seasons);
    expect(result.sealed[0]?.clubIds).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "continental.dropin_exhausted",
        competitionId: CONTINENTAL_IDS.minor,
        dropInId: DROP_IN,
      },
    ]);
  });

  it("se a fase de destino já começou, a ligação fica de fora e avisa (dropin_late)", () => {
    const late = playUntil(atGroups, SEED, early.manager, (state) => {
      return minor(state)?.stages?.[1]?.started === true;
    });
    const result = sealDropIns(early.real, leaguesOf(late));
    expect(result.sealed[0]?.clubIds).toEqual([]);
    expect(result.warnings).toEqual([
      { code: "continental.dropin_late", competitionId: CONTINENTAL_IDS.minor, dropInId: DROP_IN },
    ]);
    const stage = competitionSeason({ ...late } as never, CONTINENTAL_IDS.minor).divisions[0]
      ?.stages?.[1];
    expect(stage?.clubIds).toHaveLength(4);
  });

  it("fonte de eliminados: sela os perdedores da fase, na ordem dos confrontos", () => {
    const quarters = scenario({ startWeek: 14, eliminated: true });
    const done = playUntil(quarters.state, SEED, quarters.manager, quartersFinished);
    const view = cupView(major(done) as never, done.world, 1);
    const losers = (view.bracket?.phases[0]?.ties ?? []).map(
      (tie) => tieState(view, 0, tie.id).loser as string,
    );
    const result = sealDropIns(quarters.real, leaguesOf(done));
    expect(result.warnings).toEqual([]);
    expect(result.sealed[0]?.clubIds).toEqual(losers);
    expect(losers).toHaveLength(4);
  });
});
