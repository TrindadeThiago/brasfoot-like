import { type LineupChange, type LineupIssue, slotPosition } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { label, t } from "../i18n";

export function playerName(save: SaveFile, playerId: string): string {
  return save.bank.players.find((player) => player.id === playerId)?.displayName ?? playerId;
}

function positionOfSlot(save: SaveFile, slotId: string | undefined): string {
  const position = slotId ? slotPosition(save.lineup.formation, slotId) : undefined;
  return position ? label(`position.${position}`) : "";
}

/** Texto de um problema da escalação. */
export function issueText(issue: LineupIssue, save: SaveFile): string {
  return t(`lineupIssue.${issue.code}`, {
    ...issue.params,
    name: issue.playerId ? playerName(save, issue.playerId) : "",
    position: positionOfSlot(save, issue.slotId),
  });
}

/** Texto de uma troca do ajuste automático. */
export function changeText(change: LineupChange, save: SaveFile): string {
  switch (change.kind) {
    case "starter_replaced":
      return t("lineupChange.starter_replaced", {
        out: playerName(save, change.outId),
        in: playerName(save, change.inId),
        reason: change.reason,
        position: positionOfSlot(save, change.slotId),
      });
    case "bench_removed":
      return t("lineupChange.bench_removed", {
        out: playerName(save, change.outId),
        reason: change.reason,
      });
    case "short_squad":
      return t("lineupChange.short_squad");
  }
}
