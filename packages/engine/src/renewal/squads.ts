import { ageOn } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import { aiMarketRules } from "../market/ai/rules";
import { squadLimit } from "../market/squad";
import { POSITIONS, type Position } from "../model/catalogs";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { regulatorFor } from "./regulator";
import { playerRef } from "./retirement";
import { SQUAD_RULES } from "./rules";
import type { PlayerRef, RenewalState } from "./types";
import { createYouth, neediestPosition } from "./youth";

/** Utilidade para dispensa (R7): força, margem dos jovens e penalidade dos veteranos. */
function utility(player: CompletedPlayer, date: string): number {
  const { youthAge, youthWeight, ageFrom, agePenalty } = SQUAD_RULES.utility;
  const age = ageOn(player.birthDate, date);
  const margin =
    age <= youthAge ? youthWeight * Math.max(0, player.hidden.potential - player.strength) : 0;
  return player.strength + margin - agePenalty * Math.max(0, age - ageFrom);
}

/** Problemas de elenco de cada clube da competição (vazio = todos dentro das regras). */
export function squadProblems(
  world: CompletedBank,
  league: LeagueSeason,
  managerClubId?: string,
): string[] {
  const problems: string[] = [];
  for (const clubId of league.divisions.flatMap((season) => season.clubIds).sort()) {
    const squad = world.players.filter((player) => player.clubId === clubId);
    if (squad.length < SQUAD_RULES.min || squad.length > squadLimit(clubId, managerClubId)) {
      problems.push(`${clubId}: ${squad.length} jogadores`);
    }
    for (const position of POSITIONS) {
      const count = squad.filter((player) => player.position === position).length;
      if (count < SQUAD_RULES.positionMin[position])
        problems.push(`${clubId}: ${count} ${position}`);
    }
  }
  return problems;
}

/**
 * Reposição e dispensa até as regras de elenco (FR-011 a FR-013), clube por clube em ordem de id:
 * jovens extras nas posições abaixo do mínimo e até o tamanho mínimo; dispensa dos de menor
 * utilidade acima do máximo, sem deixar posição abaixo do mínimo.
 */
export function balanceSquads(
  world: CompletedBank,
  league: LeagueSeason,
  renewal: RenewalState,
  careerSeed: string,
  season: number,
  date: string,
  managerClubId?: string,
): {
  world: CompletedBank;
  renewal: RenewalState;
  promoted: PlayerRef[];
  released: PlayerRef[];
  /** Registros completos dos dispensados (viram livres quando há mercado, 010). */
  releasedPlayers: CompletedPlayer[];
} {
  let players = [...world.players];
  const promoted: PlayerRef[] = [];
  const released: PlayerRef[] = [];
  const releasedPlayers: CompletedPlayer[] = [];
  let seq = renewal.nextPlayerSeq;
  const caps = aiMarketRules(world, league.competitionId).positionMax;
  for (const clubId of league.divisions.flatMap((entry) => entry.clubIds).sort()) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) continue;
    const rng = createRng(`${careerSeed}:squad:${season}:${clubId}`);
    const squad = () => players.filter((player) => player.clubId === clubId);
    const count = (position: Position) =>
      squad().filter((player) => player.position === position).length;
    const add = (position: Position) => {
      const youth = createYouth(
        world,
        club,
        position,
        seq,
        regulatorFor(renewal, world, league),
        date,
        rng,
      );
      seq += 1;
      players.push(youth);
      promoted.push(playerRef(youth, date));
    };
    // O elenco do jogador só tem o máximo total: ele decide quem fica (sem teto por posição).
    const isManager = clubId === managerClubId;
    const max = squadLimit(clubId, managerClubId);
    // Teto por posição (011 R3): libera os de menor utilidade acima dele.
    for (const position of isManager ? [] : POSITIONS) {
      while (count(position) > caps[position]) {
        const out = squad()
          .filter((player) => player.position === position)
          .sort((a, b) => utility(a, date) - utility(b, date) || (a.id < b.id ? -1 : 1))[0];
        if (!out) break;
        released.push(playerRef(out, date));
        releasedPlayers.push(out);
        players = players.filter((player) => player.id !== out.id);
      }
    }
    for (const position of POSITIONS) {
      while (count(position) < SQUAD_RULES.positionMin[position]) add(position);
    }
    while (squad().length < SQUAD_RULES.min) add(neediestPosition(squad(), rng, caps));
    while (squad().length > max) {
      const candidates = squad()
        .filter((player) => count(player.position) > SQUAD_RULES.positionMin[player.position])
        .sort((a, b) => utility(a, date) - utility(b, date) || (a.id < b.id ? -1 : 1));
      const out = candidates[0];
      if (!out) break;
      released.push(playerRef(out, date));
      releasedPlayers.push(out);
      players = players.filter((player) => player.id !== out.id);
    }
  }
  return {
    world: { ...world, players },
    renewal: { ...renewal, nextPlayerSeq: seq },
    promoted,
    released,
    releasedPlayers,
  };
}
