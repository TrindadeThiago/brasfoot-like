import type { TurnoverStep } from "../career/types";
import { isCountryMain, rulesCompetitionOf } from "../world/countries";
import { fansRules } from "./rules";
import type { FansState } from "./types";

/**
 * Etapa "fans-new-season" (research.md R9), depois de "record-history": o humor guarda parte da
 * distância ao neutro; título e acesso animam, rebaixamento derruba.
 */
export const fansNewSeasonStep: TurnoverStep = {
  id: "fans-new-season",
  run: (context) => {
    if (!context.fans) return context;
    // A temporada que acabou: a liga do técnico e as dos outros países (020), cada clube com as
    // regras do país dele.
    const entries = [
      ...(context.history.at(-1) ? [context.history.at(-1)] : []),
      ...(context.competitionHistory ?? []).filter(
        (entry) =>
          entry.number === context.finished.number &&
          isCountryMain(context.world, entry.competitionId),
      ),
    ];
    const divisions = entries.flatMap((entry) => entry?.divisions ?? []);
    const champions = new Set(divisions.map((division) => division.championId));
    const promoted = new Set(divisions.flatMap((division) => division.promoted));
    const relegated = new Set(divisions.flatMap((division) => division.relegated));
    const fans: FansState = { clubs: {} };
    for (const clubId of Object.keys(context.fans.clubs).sort()) {
      const rules = fansRules(context.world, rulesCompetitionOf(context.world, clubId).id);
      const mood = context.fans.clubs[clubId]?.mood ?? rules.neutral;
      let next = rules.neutral + Math.trunc(((mood - rules.neutral) * rules.carryPct) / 100);
      if (champions.has(clubId)) next += rules.titleBoost;
      if (promoted.has(clubId)) next += rules.promotionBoost;
      if (relegated.has(clubId)) next -= rules.relegationDrop;
      fans.clubs[clubId] = { mood: Math.min(100, Math.max(0, next)), recent: [] };
    }
    return { ...context, fans };
  },
};
