import { divisionLevels, ensurePhaseDrawn } from "../knockout/bracket";
import { phaseOf } from "../knockout/rules";
import type { CompletedBank, KnockoutStage } from "../model/types";
import { generateCalendar, mergeGroupCalendars } from "../season/calendar";
import type { Round, Season } from "../season/types";
import { stageQualifiers } from "./classification";
import { applyCupView, cupView } from "./cup-view";
import { drawGroups, type GroupDrawClub, type GroupsRule } from "./groups-draw";
import { type Pair, type PairEntry, pairByPosition, pairByTable } from "./pairing";
import { seasonStages } from "./rules";
import type { FixtureStage, StageState } from "./types";

/** Começa uma fase: define os participantes e preenche as `fixtures` das rodadas dela (019 R4). */

function tagRound(round: Round, stage: FixtureStage): Round {
  return { ...round, fixtures: round.fixtures.map((fixture) => ({ ...fixture, stage })) };
}

/** Marca com a fase os jogos das rodadas dela que ainda não têm marca (sorteios das fases eliminatórias). */
export function tagStageFixtures(season: Season, state: StageState): Season {
  const rounds = new Set(state.rounds);
  const tag: FixtureStage = { index: state.index, kind: state.kind };
  let changed = false;
  const calendar = season.calendar.map((round) => {
    if (!rounds.has(round.number) || round.fixtures.every((fixture) => fixture.stage)) return round;
    changed = true;
    return {
      ...round,
      fixtures: round.fixtures.map((fixture) =>
        fixture.stage ? fixture : { ...fixture, stage: tag },
      ),
    };
  });
  return changed ? { ...season, calendar } : season;
}

function place(season: Season, rounds: readonly Round[]): Season {
  const byNumber = new Map(rounds.map((round) => [round.number, round]));
  return {
    ...season,
    calendar: season.calendar.map((round) => byNumber.get(round.number) ?? round),
  };
}

function withStage(season: Season, index: number, patch: Partial<StageState>): Season {
  return {
    ...season,
    stages: (season.stages ?? []).map((stage) =>
      stage.index === index ? { ...stage, ...patch } : stage,
    ),
  };
}

/** Confrontos da 1ª fase eliminatória a partir da fase de pontos anterior (R7); undefined = sorteio. */
function firstPhasePairs(
  season: Season,
  world: CompletedBank,
  index: number,
  clubIds: readonly string[],
): Pair[] | undefined {
  const formats = seasonStages(world, season);
  const format = formats[index] as KnockoutStage;
  const previous = formats[index - 1];
  if (!previous || previous.type === "knockout") return undefined;
  if ((format.pairing ?? "position") !== "position") return undefined;
  const qualifiers = stageQualifiers(season, world, index - 1);
  const members = new Set(clubIds);
  if (qualifiers.length !== clubIds.length || !qualifiers.every((q) => members.has(q.clubId))) {
    return undefined;
  }
  const levels = divisionLevels(world);
  const entries: PairEntry[] = qualifiers.map((qualifier) => ({
    ...qualifier,
    reputation: world.clubs.find((club) => club.id === qualifier.clubId)?.reputation ?? 0,
    division: levels.get(qualifier.clubId) ?? 1,
  }));
  const options = { home: phaseOf(format, 0).home, seed: `${season.seed}:stage:${index}:pair` };
  return format.pairs
    ? pairByTable(entries, format.pairs, options)
    : pairByPosition(entries, options);
}

/**
 * Começa a fase `index` com os `participants`. `fromPrevious` são os que vieram classificados da
 * fase anterior (o pote de origem de um sorteio de grupos). Não altera a entrada.
 */
export function startStage(
  season: Season,
  world: CompletedBank,
  index: number,
  participants: readonly string[],
  fromPrevious: ReadonlySet<string>,
): Season {
  const format = seasonStages(world, season)[index];
  const state = season.stages?.[index];
  if (!format || !state) throw new Error(`fase inexistente: ${index}`);
  const clubIds = [...new Set(participants)].sort();
  const first = state.rounds[0] ?? 1;

  if (format.type === "league") {
    const calendar = generateCalendar(
      clubIds,
      format.rounds,
      `${season.seed}:stage:${index}`,
      first,
    );
    const placed = place(
      season,
      calendar.map((round) => tagRound(round, { index, kind: "league" })),
    );
    return withStage(placed, index, { started: true, clubIds });
  }

  if (format.type === "groups") {
    const groupCount = clubIds.length / format.groupSize;
    if (!Number.isInteger(groupCount) || groupCount < 1) {
      throw new Error(`${clubIds.length} clubes não formam grupos de ${format.groupSize}`);
    }
    const draw = format.draw;
    const rule: GroupsRule = {
      stage: index,
      groups: groupCount,
      groupSize: format.groupSize,
      ...(draw?.pots !== undefined ? { pots: draw.pots } : {}),
      previousStagePot: draw?.previousStagePot ?? false,
      rules: draw?.rules ?? [],
    };
    const drawClubs: GroupDrawClub[] = clubIds.map((id) => {
      const club = world.clubs.find((entry) => entry.id === id);
      return {
        id,
        reputation: club?.reputation ?? 0,
        countryId: club?.countryId ?? "",
        ...(club?.region !== undefined ? { region: club.region } : {}),
        fromPreviousStage: fromPrevious.has(id),
      };
    });
    const result = drawGroups(drawClubs, rule, `${season.seed}:stage:${index}:draw`, "career");
    if (!result.ok) throw new Error(`sorteio de grupos falhou: ${JSON.stringify(result.error)}`);
    const calendars = result.groups.map((group) =>
      generateCalendar(
        group.clubIds,
        format.rounds,
        `${season.seed}:stage:${index}:${group.id}`,
        first,
      ).map((round) => tagRound(round, { index, kind: "groups", group: group.id })),
    );
    return withStage(place(season, mergeGroupCalendars(calendars)), index, {
      started: true,
      clubIds,
      groups: result.groups,
      ...(result.warnings.length > 0 ? { warnings: result.warnings } : {}),
    });
  }

  const started = withStage(season, index, { started: true, clubIds });
  const pairs = firstPhasePairs(started, world, index, clubIds);
  const drawn = ensurePhaseDrawn(cupView(started, world, index), world, 0, pairs);
  const folded = applyCupView(started, drawn, index);
  return tagStageFixtures(folded, folded.stages?.[index] as StageState);
}
