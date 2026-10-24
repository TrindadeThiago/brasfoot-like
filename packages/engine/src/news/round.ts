import { coachOf } from "../board/coaches";
import { divisionExpectations } from "../board/goals";
import type { BoardState } from "../board/types";
import { clubDivision } from "../career/league";
import type { CupEvent } from "../knockout/events";
import { knockoutFormat } from "../knockout/rules";
import { marketValue } from "../market/value";
import type { KnockoutFormat } from "../model/types";
import type { MatchRecord, Season } from "../season/types";
import { clinched } from "./clinched";
import { type Fact, matchFacts, matchKey, streakOf } from "./facts";
import { compare as compareHeadlines, rankFeed } from "./feed";
import { type RecordCandidate, updateRecords } from "./records";
import { newsRules } from "./rules";
import type { Headline, HeadlineType, NewsContext, NewsState } from "./types";
import { variantOf } from "./variants";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Gols de cada jogador na temporada da divisão até a rodada. */
function seasonGoals(season: Season, round: number): Map<string, number> {
  const goals = new Map<string, number>();
  for (const record of season.records) {
    if (record.round > round) continue;
    for (const [playerId, line] of Object.entries(record.players)) {
      if (line.goals > 0) goals.set(playerId, (goals.get(playerId) ?? 0) + line.goals);
    }
  }
  return goals;
}

/** Marcas da rodada que podem virar recorde (research.md R5). */
function recordCandidates(
  context: NewsContext,
  record: MatchRecord,
  goals: ReadonlyMap<string, number>,
): RecordCandidate[] {
  const season = clubDivision(context.league, record.home);
  if (!season) return [];
  const at = { season: context.league.number, year: context.league.year, round: record.round };
  const match = matchKey(record);
  const candidates: (RecordCandidate & { match?: string })[] = [];
  const total = record.score.home + record.score.away;
  candidates.push({
    scope: "league",
    kind: "mostGoalsMatch",
    entry: {
      value: total,
      clubId: record.home,
      opponentId: record.away,
      score: [record.score.home, record.score.away],
      ...at,
    },
    match,
  });
  const homeWon = record.score.home > record.score.away;
  const awayWon = record.score.away > record.score.home;
  if (homeWon || awayWon) {
    const winner = homeWon ? record.home : record.away;
    const loser = homeWon ? record.away : record.home;
    const goalsFor = homeWon ? record.score.home : record.score.away;
    const goalsAgainst = homeWon ? record.score.away : record.score.home;
    const margin = goalsFor - goalsAgainst;
    const win = {
      value: margin,
      secondary: goalsFor,
      clubId: winner,
      opponentId: loser,
      score: [goalsFor, goalsAgainst] as [number, number],
      ...at,
    };
    candidates.push({ scope: "league", kind: "biggestWin", entry: win, match });
    candidates.push({ scope: "club", kind: "biggestWin", owner: winner, entry: win, match });
    candidates.push({
      scope: "club",
      kind: "biggestLoss",
      owner: loser,
      entry: {
        value: margin,
        secondary: goalsFor,
        clubId: loser,
        opponentId: winner,
        score: [goalsAgainst, goalsFor],
        ...at,
      },
      match,
    });
    const streak = streakOf(season, winner, record.round);
    if (streak.kind === "win") {
      candidates.push({
        scope: "league",
        kind: "longestWinStreak",
        entry: { value: streak.length, clubId: winner, ...at },
        sameHolder: (previous) =>
          previous.clubId === winner && previous.season === context.league.number,
        match,
      });
    }
  }
  for (const [playerId, line] of Object.entries(record.players).sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    if (line.goals <= 0) continue;
    const clubId = line.side === "home" ? record.home : record.away;
    const player = context.world.players.find((entry) => entry.id === playerId);
    const entry = {
      value: goals.get(playerId) ?? line.goals,
      clubId,
      playerId,
      playerName: player?.displayName ?? playerId,
      ...at,
    };
    const sameHolder = (previous: { playerId?: string; season: number }) =>
      previous.playerId === playerId && previous.season === context.league.number;
    candidates.push({ scope: "league", kind: "mostPlayerGoalsSeason", entry, sameHolder, match });
    candidates.push({
      scope: "club",
      kind: "mostPlayerGoalsSeason",
      owner: clubId,
      entry,
      sameHolder,
      match,
    });
  }
  return candidates;
}

/** Técnicos demitidos e contratados na rodada, pela diferença da diretoria (012). */
function boardFacts(context: NewsContext, round: number): Fact[] {
  const before = context.boardBefore;
  const after = context.boardAfter;
  if (!before || !after) return [];
  const season = context.league.number;
  const facts: Fact[] = [];
  const coachName = (board: BoardState, clubId: string) => coachOf(board, clubId)?.name ?? "";
  if (
    after.notice?.kind === "fired" &&
    after.notice.season === season &&
    after.notice.round === round
  ) {
    facts.push({
      type: "managerFired",
      clubIds: [after.notice.clubId],
      playerIds: [],
      vars: { club: after.notice.clubId },
    });
  }
  const hired = after.manager.hired;
  if (after.manager.clubId !== null && hired?.season === season && hired.round === round - 1) {
    facts.push({
      type: "managerHired",
      clubIds: [after.manager.clubId],
      playerIds: [],
      vars: { club: after.manager.clubId },
    });
  }
  for (const vacancy of [...after.vacancies].sort((a, b) => (a.clubId < b.clubId ? -1 : 1))) {
    if (vacancy.season !== season || vacancy.round !== round) continue;
    if (vacancy.clubId === before.manager.clubId) continue;
    facts.push({
      type: "coachFired",
      clubIds: [vacancy.clubId],
      playerIds: [],
      vars: { club: vacancy.clubId, coach: coachName(before, vacancy.clubId) },
    });
  }
  for (const clubId of Object.keys(after.clubs).sort()) {
    const now = after.clubs[clubId]?.coachId ?? null;
    const was = before.clubs[clubId]?.coachId ?? null;
    if (now === null || now === was) continue;
    facts.push({
      type: "coachHired",
      clubIds: [clubId],
      playerIds: [],
      vars: { club: clubId, coach: coachName(after, clubId) },
    });
  }
  return facts;
}

/** Maior transferência relevante da rodada (research.md R3). */
function transferFacts(context: NewsContext, round: number): Fact[] {
  const deals = (context.market?.log ?? []).filter(
    (entry) =>
      entry.season === context.league.number &&
      entry.round === round &&
      entry.outcome === undefined &&
      (entry.kind === "buy" ||
        entry.kind === "sale" ||
        entry.kind === "loan" ||
        entry.kind === "loan_out" ||
        entry.kind === "free"),
  );
  if (deals.length === 0) return [];
  const rules = newsRules(context.world, context.league.competitionId);
  const values = context.world.players
    .map((player) => marketValue(player, context.world, context.league.year))
    .sort((a, b) => a - b);
  const threshold = values[Math.floor(((values.length - 1) * rules.bigTransferPct) / 100)] ?? 0;
  const mine = (entry: (typeof deals)[number]) =>
    context.managerClubId !== "" &&
    (entry.toClubId === context.managerClubId || entry.fromClubId === context.managerClubId);
  const relevant = deals
    .filter((entry) => entry.fee >= threshold || mine(entry))
    .sort((a, b) => b.fee - a.fee || (a.playerId < b.playerId ? -1 : 1));
  const top = relevant[0];
  if (!top) return [];
  return [
    {
      type: "bigTransfer",
      clubIds: [top.toClubId ?? "", top.fromClubId ?? ""].filter(Boolean),
      playerIds: [top.playerId],
      vars: {
        player: top.displayName,
        fee: top.fee,
        kind: top.kind,
        ...(top.toClubId ? { club: top.toClubId } : {}),
        ...(top.fromClubId ? { opponent: top.fromClubId } : {}),
      },
    },
  ];
}

/** Monta as manchetes dos fatos (id, relevância, variação) — ordem estável dos fatos. */
export function toHeadlines(
  context: Pick<NewsContext, "world" | "league" | "careerSeed" | "managerClubId">,
  round: number,
  facts: readonly Fact[],
): Headline[] {
  const rules = newsRules(context.world, context.league.competitionId);
  const season = context.league.number;
  return facts.map((fact, index) => {
    const mine = context.managerClubId !== "" && fact.clubIds.includes(context.managerClubId);
    return {
      id: `${season}-${round}-${index}`,
      type: fact.type,
      relevance: rules.relevance[fact.type] + (mine ? rules.mineBonus : 0),
      variant: variantOf(
        rules,
        context.careerSeed,
        `${season}:${round}:${fact.clubIds.join(",")}:${fact.playerIds.join(",")}`,
        fact.type,
      ),
      clubIds: fact.clubIds,
      ...(fact.playerIds.length > 0 ? { playerIds: fact.playerIds } : {}),
      vars: fact.vars,
      mine,
      ...(fact.match ? { match: fact.match } : {}),
    };
  });
}

/**
 * Notícias de uma rodada fechada (research.md R2–R5): fatos dos jogos, recordes, tabela,
 * diretoria e mercado viram manchetes agrupadas, ordenadas e limitadas no feed da rodada.
 */
export function newsAfterRound(context: NewsContext, round: number): NewsState {
  const rules = newsRules(context.world, context.league.competitionId);
  const facts: Fact[] = [];
  const candidates: (RecordCandidate & { match?: string })[] = [];
  for (const season of context.league.divisions) {
    const records = season.records
      .filter((record) => record.round === round)
      .sort((a, b) => (a.home < b.home ? -1 : a.home > b.home ? 1 : 0));
    const expectations = divisionExpectations(context, season.clubIds);
    const goals = seasonGoals(season, round);
    for (const record of records) {
      facts.push(...matchFacts(context, record, expectations));
      candidates.push(...recordCandidates(context, record, goals));
    }
  }
  const updated = updateRecords(context.news.records, candidates);
  for (const fact of updated.broken) {
    const source = candidates.find(
      (candidate) =>
        candidate.kind === fact.vars.kind &&
        candidate.entry.value === fact.vars.newValue &&
        (candidate.owner ?? "") === (fact.vars.owner ?? ""),
    );
    facts.push(source?.match ? { ...fact, match: source.match } : fact);
  }
  facts.push(...clinched(context, round));
  facts.push(...boardFacts(context, round));
  facts.push(...transferFacts(context, round));
  const headlines = rankFeed(rules, toHeadlines(context, round, facts));
  const news = clone(context.news);
  news.records = updated.records;
  news.feed = [
    ...news.feed.filter(
      (entry) => !(entry.season === context.league.number && entry.round === round),
    ),
    { season: context.league.number, year: context.league.year, round, headlines },
  ];
  return news;
}

/**
 * Manchetes dos jogos do clube do jogador em outras competições num dia (017 FR-029): o resultado
 * entra no feed da rodada da liga principal em que o dia cai, com a variável `competition`. Os
 * recordes, as sequências e a tabela seguem a liga principal. Não altera a entrada.
 */
export function newsAfterExtraMatches(
  context: NewsContext,
  matches: readonly { competitionId: string; record: MatchRecord }[],
  round: number,
): NewsState {
  const mine = matches.filter(
    ({ record }) => record.home === context.managerClubId || record.away === context.managerClubId,
  );
  if (context.managerClubId === "" || mine.length === 0) return context.news;
  const rules = newsRules(context.world, context.league.competitionId);
  const season = context.league.number;
  const news = clone(context.news);
  const entry = news.feed.find((feed) => feed.season === season && feed.round === round);
  const existing = entry?.headlines ?? [];
  const added: Headline[] = mine.map(({ competitionId, record }, index) => {
    const clubId = context.managerClubId;
    const home = record.home === clubId;
    const goalsFor = home ? record.score.home : record.score.away;
    const goalsAgainst = home ? record.score.away : record.score.home;
    const opponent = home ? record.away : record.home;
    const outcome = goalsFor > goalsAgainst ? "win" : goalsFor < goalsAgainst ? "loss" : "draw";
    const vars = {
      club: clubId,
      opponent,
      goalsFor,
      goalsAgainst,
      outcome,
      home: home ? 1 : 0,
      streak: 0,
      streakKind: "none",
      competition: competitionId,
    };
    return {
      id: `${season}-${round}-x${existing.length + index}`,
      type: "result",
      relevance: rules.relevance.result + rules.mineBonus,
      variant: variantOf(
        rules,
        context.careerSeed,
        `${season}:${round}:${competitionId}:${clubId}:${opponent}`,
        "result",
      ),
      clubIds: [clubId, opponent],
      vars,
      mine: true,
      match: `${competitionId}:${matchKey(record)}`,
    };
  });
  const ranked = rankFeed(rules, [...existing, ...added]);
  // O resultado do clube do jogador em outra competição nunca fica de fora do feed da rodada: toma
  // o lugar da manchete menos relevante que não é do clube do jogador (o limite do feed vale).
  const headlines = [...ranked];
  for (const headline of added) {
    if (headlines.some((entry) => entry.id === headline.id)) continue;
    const index = headlines.findLastIndex((entry) => !entry.mine);
    if (index >= 0) headlines[index] = headline;
  }
  headlines.sort(compareHeadlines);
  news.feed = [
    ...news.feed.filter((feed) => !(feed.season === season && feed.round === round)),
    { season, year: context.league.year, round, headlines },
  ];
  return news;
}

/**
 * Manchetes de copa do dia (018 R13): zebra (clube de divisão mais baixa elimina um de divisão mais
 * alta), eliminação, chegada à final e título do clube do jogador. Não altera a entrada.
 */
export function newsAfterCup(
  context: NewsContext,
  events: readonly CupEvent[],
  competitionId: string,
  round: number,
  /** Formato do mata-mata de uma divisão em fases (019); sem ele, o da copa da competição. */
  stageFormat?: KnockoutFormat,
): NewsState {
  if (events.length === 0) return context.news;
  const rules = newsRules(context.world, context.league.competitionId);
  const format = stageFormat ?? knockoutFormat(context.world, competitionId);
  const mainLevels = new Map<string, number>();
  const main = context.world.competitions.find((entry) => entry.format.type === "league");
  for (const division of main?.divisions ?? []) {
    for (const clubId of division.clubIds) mainLevels.set(clubId, division.level);
  }
  const season = context.league.number;
  const news = clone(context.news);
  const entry = news.feed.find((feed) => feed.season === season && feed.round === round);
  const existing = entry?.headlines ?? [];
  const mine = context.managerClubId;
  const added: Headline[] = [];
  const add = (
    type: HeadlineType,
    event: CupEvent,
    clubId: string,
    opponentId: string,
    phaseName: string,
  ): void => {
    const isMine = clubId === mine || opponentId === mine;
    added.push({
      id: `${season}-${round}-c${existing.length + added.length}`,
      type,
      relevance: rules.relevance[type] + (isMine ? rules.mineBonus : 0),
      variant: variantOf(
        rules,
        context.careerSeed,
        `${season}:${competitionId}:${event.tie}:${clubId}`,
        type,
      ),
      clubIds: [clubId, opponentId],
      vars: { club: clubId, opponent: opponentId, phase: phaseName, competition: competitionId },
      mine: isMine,
    });
  };
  for (const event of events) {
    const phaseName = format.phases[event.phase]?.name ?? "";
    if (event.kind === "title") {
      add("cupChampion", event, event.clubId, event.opponentId, phaseName);
      continue;
    }
    const winnerLevel = mainLevels.get(event.opponentId) ?? 1;
    const loserLevel = mainLevels.get(event.clubId) ?? 1;
    if (winnerLevel > loserLevel) add("cupUpset", event, event.opponentId, event.clubId, phaseName);
    if (event.clubId === mine)
      add("cupElimination", event, event.clubId, event.opponentId, phaseName);
    if (event.phase === event.phases - 2) {
      const next = format.phases[event.phase + 1]?.name ?? "";
      add("cupFinal", event, event.opponentId, event.clubId, next);
    }
  }
  const headlines = rankFeed(rules, [...existing, ...added]);
  for (const headline of added) {
    if (!headline.mine || headlines.some((item) => item.id === headline.id)) continue;
    const index = headlines.findLastIndex((item) => !item.mine);
    if (index >= 0) headlines[index] = headline;
  }
  headlines.sort(compareHeadlines);
  news.feed = [
    ...news.feed.filter((feed) => !(feed.season === season && feed.round === round)),
    { season, year: context.league.year, round, headlines },
  ];
  return news;
}
