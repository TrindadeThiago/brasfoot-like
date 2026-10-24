import { divisionZones } from "../career/league";
import { standings } from "../season/standings";
import type { Fact } from "./facts";
import type { HeadlineType, NewsContext } from "./types";

function alreadyReported(
  context: NewsContext,
  type: HeadlineType,
  clubId: string,
  extra: Fact[],
): boolean {
  const season = context.league.number;
  return (
    context.news.feed.some(
      (round) =>
        round.season === season &&
        round.headlines.some(
          (headline) =>
            (headline.type === type && headline.clubIds[0] === clubId) ||
            headline.extras?.some((entry) => entry.type === type && entry.vars.club === clubId),
        ),
    ) || extra.some((fact) => fact.type === type && fact.clubIds[0] === clubId)
  );
}

/**
 * Título, acesso e rebaixamento matemáticos depois da rodada (research.md R3): a diferença de
 * pontos não pode mais ser tirada nos jogos restantes. Cada fato sai uma vez por temporada.
 */
export function clinched(context: NewsContext, round: number): Fact[] {
  const facts: Fact[] = [];
  const competition = context.world.competitions.find(
    (entry) => entry.id === context.league.competitionId,
  );
  const win = competition?.format.type === "league" ? competition.format.points.win : 3;
  for (const season of context.league.divisions) {
    // Divisão em fases (019): sem tabela única, "garantido por pontos restantes" não se aplica.
    if (season.stages) continue;
    const remaining = Math.max(0, season.calendar.length - round);
    const table = standings(season, context.world);
    const size = table.length;
    const zones = divisionZones(context.world, context.league.competitionId, season.divisionLevel);
    const reach = remaining * win;
    const push = (type: HeadlineType, clubId: string, position: number) => {
      if (alreadyReported(context, type, clubId, facts)) return;
      facts.push({
        type,
        clubIds: [clubId],
        playerIds: [],
        vars: { club: clubId, level: season.divisionLevel, round, remaining, position },
      });
    };
    const leader = table[0];
    const second = table[1];
    if (leader && second && leader.points > second.points + reach) {
      push("titleClinched", leader.clubId, 1);
    }
    if (zones.promotion > 0) {
      const firstOut = table[zones.promotion];
      for (const row of table.slice(0, zones.promotion)) {
        if (firstOut && row.points > firstOut.points + reach) {
          push("promotionClinched", row.clubId, row.position);
        }
      }
    }
    if (zones.relegation > 0) {
      const lastSafe = table[size - zones.relegation - 1];
      for (const row of table.slice(size - zones.relegation)) {
        if (lastSafe && row.points + reach < lastSafe.points) {
          push("relegationConfirmed", row.clubId, row.position);
        }
      }
    }
  }
  return facts;
}
