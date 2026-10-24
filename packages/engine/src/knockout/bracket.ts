import type { CompletedBank } from "../model/types";
import { fixtureSeed } from "../season/calendar";
import { type SeasonError, seasonError } from "../season/errors";
import { squadsByClub } from "../season/fixture";
import { preferredFormation } from "../season/lineups";
import type { DisciplineRules, Fixture, PlayerStatus, Round, Season } from "../season/types";
import { DEFAULT_DISCIPLINE_RULES } from "../season/types";
import { type DrawClub, type DrawnPair, drawPhase } from "./draw";
import {
  cupFormat,
  DEFAULT_KNOCKOUT,
  knockoutFormat,
  openingClubs,
  phaseOf,
  phaseRounds,
} from "./rules";
import { phaseDecided, phaseWinners } from "./tie";
import type { Bracket, BracketPhase, Tie } from "./types";

export interface CreateCupOptions {
  competitionId: string;
  seed: string | number;
  rules?: Partial<DisciplineRules>;
  status?: Record<string, PlayerStatus>;
}

/**
 * Temporada de uma copa (018 R1): uma `Season` com uma rodada vazia por perna de cada fase e o
 * chaveamento ainda sem sorteio. Os confrontos saem de `ensurePhaseDrawn`, fase a fase.
 */
export function createCupSeason(
  world: CompletedBank,
  options: CreateCupOptions,
): { ok: true; season: Season } | { ok: false; error: SeasonError } {
  const competition = world.competitions.find((entry) => entry.id === options.competitionId);
  if (!competition) {
    return {
      ok: false,
      error: seasonError("season.unknown_competition", { competitionId: options.competitionId }),
    };
  }
  if (competition.format.type !== "knockout") {
    return {
      ok: false,
      error: seasonError("season.unsupported_format", { format: competition.format.type }),
    };
  }
  const format = knockoutFormat(world, competition.id);
  const clubIds = [...(competition.divisions[0]?.clubIds ?? [])].sort();
  const squads = squadsByClub(world);
  const formations: Season["formations"] = {};
  for (const clubId of clubIds) formations[clubId] = preferredFormation(squads.get(clubId) ?? []);
  const rounds = phaseRounds(format);
  const bracket: Bracket = {
    phases: rounds.map((list, index) => ({ index, drawn: false, rounds: list, ties: [] })),
  };
  const calendar: Round[] = rounds.flat().map((number) => ({ number, fixtures: [] }));
  return {
    ok: true,
    season: {
      competitionId: competition.id,
      divisionLevel: competition.divisions[0]?.level ?? 1,
      seed: options.seed,
      rules: { ...DEFAULT_DISCIPLINE_RULES, ...options.rules },
      clubIds,
      formations,
      calendar,
      nextRound: 1,
      records: [],
      status: Object.fromEntries(
        Object.entries(options.status ?? {}).map(([id, entry]) => [id, { ...entry }]),
      ),
      warnings: [],
      bracket,
    },
  };
}

/** Clubes que disputam a fase: os vencedores da anterior mais os que entram nela (R6). */
export function phaseParticipants(season: Season, world: CompletedBank, phase: number): string[] {
  const format = cupFormat(world, season);
  const entering = format.entries?.find((entry) => entry.phase === phase)?.clubIds ?? [];
  const base = phase === 0 ? openingClubs(format, season.clubIds) : phaseWinners(season, phase - 1);
  return [...new Set([...base, ...(phase === 0 ? [] : entering)])].sort();
}

/** Nível de divisão de cada clube na competição principal (1 se não estiver nela). */
export function divisionLevels(world: CompletedBank): Map<string, number> {
  const levels = new Map<string, number>();
  const main = world.competitions.find((entry) => entry.format.type === "league");
  for (const division of main?.divisions ?? []) {
    for (const clubId of division.clubIds) levels.set(clubId, division.level);
  }
  return levels;
}

/**
 * Sorteia a fase se ainda não foi sorteada (idempotente): preenche os confrontos e as `fixtures`
 * de cada perna, com o mando da regra da fase e a volta invertida. Exige a fase anterior decidida.
 * Não altera a entrada. `pairs` (019) substitui o sorteio: a 1ª fase depois de uma fase de pontos
 * vem do pareamento por posição.
 */
export function ensurePhaseDrawn(
  season: Season,
  world: CompletedBank,
  phaseIndex: number,
  pairs?: readonly DrawnPair[],
): Season {
  const bracket = season.bracket;
  const current = bracket?.phases[phaseIndex];
  if (!bracket || !current) throw new Error(`fase inexistente: ${phaseIndex}`);
  if (current.drawn) return season;
  if (phaseIndex > 0 && !phaseDecided(season, phaseIndex - 1)) {
    throw new Error(`a fase ${phaseIndex - 1} ainda não terminou`);
  }
  const format = cupFormat(world, season);
  const phase = phaseOf(format, phaseIndex);
  const levels = divisionLevels(world);
  const ranks = season.cupView?.ranks ?? {};
  const clubs: DrawClub[] = phaseParticipants(season, world, phaseIndex).map((id) => ({
    id,
    reputation: world.clubs.find((club) => club.id === id)?.reputation ?? 0,
    division: levels.get(id) ?? 1,
    ...(ranks[id] !== undefined ? { rank: ranks[id] } : {}),
  }));
  const drawn =
    pairs ??
    drawPhase(
      clubs,
      {
        home: phase.home,
        seeded: phase.seeded ?? DEFAULT_KNOCKOUT.seeded,
        legs: phase.legs,
        neutral: phase.neutral ?? DEFAULT_KNOCKOUT.neutral,
      },
      `${season.seed}:cup:${season.competitionId}:draw:${phaseIndex}${season.cupView ? `:s${season.cupView.stage}` : ""}`,
    );
  const ties: Tie[] = drawn.map((pair, index) => ({
    id: `f${phaseIndex}-${index}`,
    home: pair.home,
    away: pair.away,
  }));
  const calendar = season.calendar.map((round) => ({ ...round, fixtures: [...round.fixtures] }));
  for (const tie of ties) {
    current.rounds.forEach((number, legIndex) => {
      const swapped = legIndex === 1;
      const home = swapped ? tie.away : tie.home;
      const away = swapped ? tie.home : tie.away;
      const fixture: Fixture = {
        round: number,
        home,
        away,
        seed: fixtureSeed(season.seed, number, home, away),
        tie: { phase: phaseIndex, id: tie.id, leg: (legIndex + 1) as 1 | 2, legs: phase.legs },
        ...(phase.neutral ? { neutral: true } : {}),
      };
      calendar[number - 1]?.fixtures.push(fixture);
    });
  }
  const phases: BracketPhase[] = bracket.phases.map((entry) =>
    entry.index === phaseIndex ? { ...entry, drawn: true, ties } : entry,
  );
  return { ...season, calendar, bracket: { phases } };
}

/**
 * Sorteia todas as fases prontas: a primeira e cada fase cuja anterior já foi decidida. Chamado ao
 * criar a copa e ao fim de cada rodada dela, para os confrontos serem conhecidos assim que
 * existem (o jogador vê o próximo adversário antes do dia do jogo).
 */
export function drawReady(season: Season, world: CompletedBank): Season {
  let current = season;
  for (const phase of season.bracket?.phases ?? []) {
    if (phase.drawn) continue;
    if (phase.index > 0 && !phaseDecided(current, phase.index - 1)) break;
    current = ensurePhaseDrawn(current, world, phase.index);
  }
  return current;
}
