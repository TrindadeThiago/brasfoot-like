import type { MatchEvent, MatchInput, Side } from "../../../src/match/types";

/**
 * Reproduz os eventos de uma partida acompanhando quem está em campo, e devolve as violações de
 * consistência encontradas (jogador que age sem estar em campo, assistência inválida etc.).
 */
export function replayViolations(input: MatchInput, events: MatchEvent[]): string[] {
  const onField: Record<Side, Set<string>> = {
    home: new Set(Object.values(input.home.lineup.starters)),
    away: new Set(Object.values(input.away.lineup.starters)),
  };
  const gone = new Set<string>();
  const violations: string[] = [];
  const where = (event: MatchEvent) => `seq ${event.seq} (${event.type})`;
  const requireOnField = (event: MatchEvent, side: Side, playerId: string, role: string) => {
    if (!onField[side].has(playerId)) {
      violations.push(`${where(event)}: ${role} ${playerId} não está em campo`);
    }
  };

  for (const event of events) {
    switch (event.type) {
      case "shot": {
        requireOnField(event, event.side, event.playerId, "finalizador");
        if (event.assistId !== undefined) {
          requireOnField(event, event.side, event.assistId, "assistente");
          if (event.assistId === event.playerId)
            violations.push(`${where(event)}: autoassistência`);
        }
        break;
      }
      case "penalty_awarded": {
        requireOnField(event, event.side, event.playerId, "sofreu o pênalti");
        const other: Side = event.side === "home" ? "away" : "home";
        requireOnField(event, other, event.foulerId, "faltoso");
        break;
      }
      case "yellow_card":
        requireOnField(event, event.side, event.playerId, "advertido");
        break;
      case "red_card":
      case "injury":
        requireOnField(event, event.side, event.playerId, event.type);
        onField[event.side].delete(event.playerId);
        gone.add(event.playerId);
        break;
      case "substitution": {
        if (onField[event.side].has(event.outId)) {
          onField[event.side].delete(event.outId);
        } else if (!gone.has(event.outId)) {
          violations.push(`${where(event)}: ${event.outId} saiu sem estar em campo`);
        }
        if (gone.has(event.inId)) violations.push(`${where(event)}: ${event.inId} voltou`);
        onField[event.side].add(event.inId);
        gone.add(event.outId);
        break;
      }
      default:
        break;
    }
  }
  return violations;
}
