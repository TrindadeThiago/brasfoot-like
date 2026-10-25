import type { LeagueSeason } from "../career/types";
import { tieState } from "../knockout/tie";
import type { CompletedBank, DropIn } from "../model/types";
import type { Origin } from "../qualification/types";
import { squadsByClub } from "../season/fixture";
import { preferredFormation } from "../season/lineups";
import type { Season } from "../season/types";
import { groupStandings } from "../stages/classification";
import { cupView } from "../stages/cup-view";
import { dropInSize } from "../stages/incoming";
import type { ContinentalWarning, SealedDropIn } from "./types";

/**
 * Ligação entre competições durante a temporada (022 R3): quando a fase de origem termina, os
 * clubes da fonte entram na fase de destino da outra competição. Esta etapa só sela a lista
 * (`incoming`) e estende a temporada de destino; `advanceStages` começa a fase. Idempotente e
 * determinística: ordem por posição e id.
 */

interface Candidate {
  clubId: string;
  position?: number;
}

/** A fase de origem terminou (todas as rodadas jogadas, ou o confronto da fase decidido)? */
function sourceFinished(world: CompletedBank, season: Season, dropIn: DropIn): boolean {
  const state = season.stages?.[dropIn.source.stage - 1];
  if (!state?.started) return false;
  if (dropIn.source.kind === "eliminated") {
    const view = cupView(season, world, state.index);
    const phase = view.bracket?.phases[dropIn.source.phase - 1];
    return (
      phase?.drawn === true &&
      phase.ties.every((tie) => tieState(view, phase.index, tie.id).decided)
    );
  }
  return state.rounds.length > 0 && season.nextRound > Math.max(...state.rounds);
}

/** Candidatos da fonte, do primeiro ao último: as posições pedidas e, depois, as seguintes. */
function candidates(world: CompletedBank, season: Season, dropIn: DropIn): Candidate[] {
  const { source } = dropIn;
  const state = season.stages?.[source.stage - 1];
  if (!state) return [];
  if (source.kind === "eliminated") {
    const view = cupView(season, world, state.index);
    const phase = view.bracket?.phases[source.phase - 1];
    return (phase?.ties ?? []).flatMap((tie) => {
      const loser = tieState(view, phase?.index ?? 0, tie.id).loser;
      return loser ? [{ clubId: loser }] : [];
    });
  }
  const tables =
    state.kind === "groups"
      ? [...(state.groups ?? [])]
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .map((group) => groupStandings(season, world, state.index, group.id))
      : [];
  const size = Math.max(0, ...tables.map((rows) => rows.length));
  const found: Candidate[] = [];
  for (let position = source.from; position <= size; position++) {
    for (const rows of tables) {
      const row = rows[position - 1];
      if (row) found.push({ clubId: row.clubId, position });
    }
  }
  return found;
}

export function sealDropIns(
  world: CompletedBank,
  seasons: readonly LeagueSeason[],
): { seasons: LeagueSeason[]; sealed: SealedDropIn[]; warnings: ContinentalWarning[] } {
  const sealed: SealedDropIn[] = [];
  const warnings: ContinentalWarning[] = [];
  const squads = squadsByClub(world);
  let current = [...seasons];
  let changed = false;

  for (const target of seasons) {
    const competition = world.competitions.find((entry) => entry.id === target.competitionId);
    for (const division of competition?.divisions ?? []) {
      for (const dropIn of division.dropIns ?? []) {
        const league = current.find((entry) => entry.competitionId === target.competitionId);
        const season = league?.divisions.find((entry) => entry.divisionLevel === division.level);
        const state = season?.stages?.[dropIn.entry.stage - 1];
        if (!league || !season || !state) continue;
        if (state.incoming?.some((entry) => entry.dropInId === dropIn.id)) continue;
        const origin = current.find((entry) => entry.competitionId === dropIn.source.competitionId);
        const from = origin?.divisions[0];
        if (!origin || !from || !sourceFinished(world, from, dropIn)) continue;

        const issue = { competitionId: target.competitionId, dropInId: dropIn.id };
        let chosen: Candidate[] = [];
        if (state.started) {
          // A fase de destino já começou: nada de jogos no passado, a ligação fica de fora.
          warnings.push({ code: "continental.dropin_late", ...issue });
        } else {
          const present = new Set(season.clubIds);
          const wanted = dropInSize(world, dropIn) ?? 0;
          chosen = candidates(world, from, dropIn)
            .filter((candidate) => !present.has(candidate.clubId))
            .slice(0, wanted);
          if (chosen.length < wanted) {
            warnings.push({ code: "continental.dropin_exhausted", ...issue });
          }
        }
        const clubIds = chosen.map((candidate) => candidate.clubId);
        sealed.push({ ...issue, clubIds, fromCompetitionId: dropIn.source.competitionId });

        const formations = { ...season.formations };
        for (const clubId of clubIds) {
          formations[clubId] = preferredFormation(squads.get(clubId) ?? []);
        }
        const nextSeason: Season = {
          ...season,
          clubIds: [...season.clubIds, ...clubIds].sort(),
          formations,
          stages: (season.stages ?? []).map((entry) =>
            entry.index === state.index
              ? {
                  ...entry,
                  incoming: [...(entry.incoming ?? []), { dropInId: dropIn.id, clubIds }],
                }
              : entry,
          ),
        };
        const origins: Record<string, Origin> = { ...league.origins };
        for (const candidate of chosen) {
          origins[candidate.clubId] = {
            kind: "dropIn",
            dropInId: dropIn.id,
            from: dropIn.source.competitionId,
            ...(candidate.position !== undefined ? { position: candidate.position } : {}),
          };
        }
        const nextLeague: LeagueSeason = {
          ...league,
          divisions: league.divisions.map((entry) =>
            entry.divisionLevel === division.level ? nextSeason : entry,
          ),
          ...(chosen.length > 0 ? { origins } : {}),
        };
        current = current.map((entry) => (entry === league ? nextLeague : entry));
        changed = true;
      }
    }
  }
  return { seasons: changed ? current : [...seasons], sealed, warnings };
}
