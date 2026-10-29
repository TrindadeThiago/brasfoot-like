import type { GoalStatus as Status } from "../../game/board-view";
import { useT } from "../../i18n";
import { Badge, type BadgeTone } from "../Badge";

const SYMBOL: Record<Status, string> = {
  onTrack: "✓",
  atRisk: "!",
  inProgress: "…",
  met: "✓",
  missed: "✕",
};

const TONE: Record<Status, BadgeTone> = {
  onTrack: "accent",
  atRisk: "warning",
  inProgress: "info",
  met: "accent",
  missed: "danger",
};

/** Situação de uma meta: texto sempre, com um símbolo (`aria-hidden`); a cor só reforça (029 R3). */
export function GoalStatus({ status }: { status: Status }) {
  const t = useT();
  return (
    <Badge tone={TONE[status]}>
      <span aria-hidden="true">{SYMBOL[status]} </span>
      {t(`board.status.${status}`)}
    </Badge>
  );
}
