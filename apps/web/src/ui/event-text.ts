import type { LiveMatch, MatchEvent, MatchState } from "@brasfoot-like/engine";
import { type EventType, formatEvent } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { label, t } from "../i18n";

/** Minuto como na transmissão: "23'", "45+2'". */
export function minuteText(event: { minute: number; stoppage: number }): string {
  return event.stoppage > 0 ? `${event.minute}+${event.stoppage}'` : `${event.minute}'`;
}

/** Relógio de uma partida: minuto, "Intervalo" ou "Fim". */
export function clockText(state: MatchState): string {
  if (state.status === "not_started") return "0'";
  if (state.status === "half_time") return t("round.halfTime");
  if (state.status === "finished" || state.status === "abandoned") return t("round.fullTime");
  return minuteText(state.clock);
}

function names(save: SaveFile) {
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.shortName]));
  return {
    player: (id: string | undefined) => (id ? (players.get(id) ?? id) : ""),
    club: (id: string) => clubs.get(id) ?? id,
  };
}

/** Texto do feed para um evento (undefined para lances que não entram no feed). */
export function eventText(event: MatchEvent, match: LiveMatch, save: SaveFile): string | undefined {
  const { player, club } = names(save);
  const minute = minuteText(event);
  const home = club(match.sides.home);
  const away = club(match.sides.away);
  const say = (type: EventType, values: Record<string, string | number>) =>
    formatEvent(type, values, match.fixture.seed, event.seq);
  switch (event.type) {
    case "kickoff":
    case "second_half":
      return say(event.type, { home, away });
    case "half_time":
    case "full_time": {
      const score = scoreAt(match.state, event.seq);
      return say(event.type, { home, away, homeScore: score.home, awayScore: score.away });
    }
    case "abandoned":
      return say("abandoned", { club: club(match.sides[event.side]) });
    case "shot": {
      const values = {
        minute,
        player: player(event.playerId),
        club: club(match.sides[event.side]),
      };
      if (event.kind === "penalty") {
        return event.outcome === "goal"
          ? say("penalty_goal", values)
          : say("penalty_missed", values);
      }
      if (event.outcome !== "goal") return undefined;
      return say("goal", { ...values, assist: event.assistId ? player(event.assistId) : "none" });
    }
    case "penalty_awarded":
      return say("penalty_awarded", {
        minute,
        player: player(event.playerId),
        club: club(match.sides[event.side]),
      });
    case "yellow_card":
      return say("yellow", {
        minute,
        player: player(event.playerId),
        club: club(match.sides[event.side]),
      });
    case "red_card":
      return say(event.reason === "second_yellow" ? "red_second_yellow" : "red_direct", {
        minute,
        player: player(event.playerId),
        club: club(match.sides[event.side]),
      });
    case "injury":
      return say("injury", {
        minute,
        player: player(event.playerId),
        club: club(match.sides[event.side]),
      });
    case "substitution":
      return say(event.automatic ? "substitution_auto" : "substitution", {
        minute,
        in: player(event.inId),
        out: player(event.outId),
        club: club(match.sides[event.side]),
      });
    case "formation_change":
      return say("formation", {
        minute,
        club: club(match.sides[event.side]),
        formation: label(`formation.${event.formation}`),
      });
    case "positions_change": {
      const [first, second] = event.moves;
      // Dois jogadores que trocaram de vaga entre si: o texto cita os dois.
      if (
        event.moves.length === 2 &&
        first &&
        second &&
        first.fromSlotId === second.toSlotId &&
        second.fromSlotId === first.toSlotId
      ) {
        return say("position_swap", {
          minute,
          club: club(match.sides[event.side]),
          first: player(first.playerId),
          second: player(second.playerId),
        });
      }
      return say("positions", {
        minute,
        club: club(match.sides[event.side]),
        count: event.moves.length,
      });
    }
    case "posture_change":
      return say("posture", {
        minute,
        club: club(match.sides[event.side]),
        posture: label(`posture.${event.posture}`).toLowerCase(),
      });
    default:
      return undefined;
  }
}

/** Placar até um evento (inclusive), para o texto do intervalo e do fim. */
function scoreAt(state: MatchState, seq: number): { home: number; away: number } {
  const score = { home: 0, away: 0 };
  for (const event of state.events) {
    if (event.seq > seq) break;
    if (event.type === "shot" && event.outcome === "goal") score[event.side] += 1;
  }
  return score;
}
