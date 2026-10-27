import type { TurnoverStep } from "../career/types";
import { regionalCompetitionOf } from "../regional/scope";
import { seasonStats, topScorers } from "../season/stats";
import type { Fact } from "./facts";
import { accumulate, pruneAllTime } from "./history";
import { type RecordCandidate, updateRecords } from "./records";
import { toHeadlines } from "./round";
import { newsRules } from "./rules";
import type { NewsState, SeasonNews } from "./types";

/**
 * Etapa "news-new-season" (research.md R2, R8, R9), depois de "record-history": artilheiros da
 * temporada, acumulados com poda, recordes de pontos, resumo da temporada (rodada 0 da nova) e
 * poda do feed (só a temporada encerrada e a nova).
 */
export const newsNewSeasonStep: TurnoverStep = {
  id: "news-new-season",
  run: (context) => {
    if (!context.news) return context;
    const finished = context.finished;
    const rules = newsRules(context.world, finished.competitionId);
    const names = new Map(context.world.players.map((player) => [player.id, player.displayName]));
    const at = { season: finished.number, year: finished.year };
    const scorers: SeasonNews["scorers"] = [];
    let allTime = context.news.allTime;
    const candidates: RecordCandidate[] = [];
    for (const season of [...finished.divisions].sort(
      (a, b) => a.divisionLevel - b.divisionLevel,
    )) {
      const best = topScorers(season, 1)[0];
      scorers.push(
        best
          ? {
              level: season.divisionLevel,
              playerId: best.playerId,
              name: names.get(best.playerId) ?? best.playerId,
              clubId: best.clubId,
              goals: best.goals,
            }
          : { level: season.divisionLevel, goals: 0 },
      );
      allTime = accumulate(allTime, seasonStats(season), context.world);
      for (const row of context.finalStandings[season.divisionLevel] ?? []) {
        const entry = { value: row.points, clubId: row.clubId, ...at };
        candidates.push({ scope: "league", kind: "mostPointsSeason", entry });
        candidates.push({ scope: "club", kind: "mostPointsSeason", owner: row.clubId, entry });
      }
    }
    const updated = updateRecords(context.news.records, candidates);
    // Esta etapa roda antes de "advance-year": a próxima temporada é a encerrada + 1.
    const next = finished.number + 1;
    const entry = context.history.at(-1);
    const summary: Fact[] = (entry?.divisions ?? []).map((division) => {
      const scorer = scorers.find((item) => item.level === division.level);
      return {
        type: "seasonSummary",
        clubIds: [division.championId],
        playerIds: scorer?.playerId ? [scorer.playerId] : [],
        vars: {
          club: division.championId,
          level: division.level,
          year: finished.year,
          promoted: division.promoted.length,
          relegated: division.relegated.length,
          ...(scorer?.name ? { player: scorer.name, goals: scorer.goals } : {}),
        },
      };
    });
    const managerClubId = context.board?.manager.clubId ?? context.managerClubId ?? "";
    const summaryHeadlines = toHeadlines(
      {
        world: context.world,
        league: { ...finished, number: next, year: finished.year + 1 },
        careerSeed: context.careerSeed,
        managerClubId,
      },
      0,
      [...summary, ...updated.broken],
    );
    const news: NewsState = {
      // A temporada encerrada fica só com as manchetes mais relevantes de cada rodada (R9, R11).
      feed: [
        ...context.news.feed
          .filter((round) => round.season >= finished.number)
          .map((round) => ({ ...round, headlines: round.headlines.slice(0, rules.homeLimit) })),
        { season: next, year: finished.year + 1, round: 0, headlines: summaryHeadlines },
      ],
      records: updated.records,
      allTime: pruneAllTime(allTime, context.world, rules.allTimeTop, rules.legendsPerClub),
      seasons: [...context.news.seasons, { ...at, scorers }],
    };
    return { ...context, news };
  },
};

/** No máximo estas classificações de outros clubes viram manchete por virada (021). */
const QUALIFICATION_HEADLINES = 8;

/**
 * Etapa "news-qualification" (021 FR-019), depois de "resolve-qualification": manchetes das vagas
 * entre competições na rodada 0 da nova temporada — as do clube do jogador e as de campeões.
 */
export const newsQualificationStep: TurnoverStep = {
  id: "news-qualification",
  run: (context) => {
    const record = context.qualification?.record;
    if (!context.news || !record || record.entries.length === 0) return context;
    const finished = context.finished;
    const next = finished.number + 1;
    const managerClubId = context.board?.manager.clubId ?? context.managerClubId ?? "";
    const championBerth = (entry: (typeof record.entries)[number]) =>
      context.world.competitions
        .find((competition) => competition.id === entry.competitionId)
        ?.divisions.find((division) => division.level === entry.level)
        ?.berths?.find((berth) => berth.id === entry.berthId)?.source.kind === "champion";
    const facts: Fact[] = record.entries
      .filter((entry) => entry.clubId === managerClubId || championBerth(entry))
      .slice(0, QUALIFICATION_HEADLINES)
      .map((entry) => ({
        type: "qualification" as const,
        clubIds: [entry.clubId],
        playerIds: [],
        vars: { club: entry.clubId, competition: entry.competitionId },
      }));
    if (facts.length === 0) return context;
    const headlines = toHeadlines(
      {
        world: context.world,
        league: { ...finished, number: next, year: finished.year + 1 },
        careerSeed: context.careerSeed,
        managerClubId,
      },
      0,
      facts,
    ).map((headline, index) => ({ ...headline, id: `${next}-0-q${index}` }));
    const feed = context.news.feed.map((round) =>
      round.season === next && round.round === 0
        ? { ...round, headlines: [...round.headlines, ...headlines] }
        : round,
    );
    return { ...context, news: { ...context.news, feed } };
  },
};

/** No máximo estas manchetes do estadual do clube do jogador entram por virada (023 R8). */
const REGIONAL_HEADLINES = 8;

/**
 * Etapa "news-regional" (023 FR-012), depois de "news-qualification": campeões das duas divisões do
 * estadual do clube do jogador e os clubes que subiram e caíram, na rodada 0 da nova temporada.
 */
export const newsRegionalStep: TurnoverStep = {
  id: "news-regional",
  run: (context) => {
    const editions = context.regionalHistory ?? [];
    if (!context.news || editions.length === 0) return context;
    const finished = context.finished;
    const managerClubId = context.board?.manager.clubId ?? context.managerClubId ?? "";
    const own = regionalCompetitionOf(context.world, managerClubId);
    const edition = editions.find(
      (item) => item.competitionId === own?.id && item.number === finished.number,
    );
    if (!edition) return context;
    const next = finished.number + 1;
    const facts: Fact[] = [];
    for (const division of edition.divisions) {
      const vars = { competition: edition.competitionId, level: division.level };
      facts.push({
        type: "regionalChampion",
        clubIds: [division.championId, division.runnerUpId],
        playerIds: [],
        vars: { club: division.championId, opponent: division.runnerUpId, ...vars },
      });
      for (const clubId of division.promotedIds) {
        facts.push({
          type: "regionalPromoted",
          clubIds: [clubId],
          playerIds: [],
          vars: { club: clubId, ...vars },
        });
      }
      for (const clubId of division.relegatedIds) {
        facts.push({
          type: "regionalRelegated",
          clubIds: [clubId],
          playerIds: [],
          vars: { club: clubId, ...vars },
        });
      }
    }
    const headlines = toHeadlines(
      {
        world: context.world,
        league: { ...finished, number: next, year: finished.year + 1 },
        careerSeed: context.careerSeed,
        managerClubId,
      },
      0,
      facts.slice(0, REGIONAL_HEADLINES),
    ).map((headline, index) => ({ ...headline, id: `${next}-0-r${index}` }));
    const feed = context.news.feed.map((round) =>
      round.season === next && round.round === 0
        ? { ...round, headlines: [...round.headlines, ...headlines] }
        : round,
    );
    return { ...context, news: { ...context.news, feed } };
  },
};
