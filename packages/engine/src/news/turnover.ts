import type { TurnoverStep } from "../career/types";
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
