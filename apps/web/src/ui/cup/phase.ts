import { knockoutFormat, phaseOfRound } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { t } from "../../i18n";

/** Nome da fase (e a perna, se ida e volta) da rodada de uma copa; undefined se não for copa. */
export function phaseLabel(
  save: SaveFile,
  competitionId: string,
  round: number,
): string | undefined {
  const competition = save.bank.competitions.find((entry) => entry.id === competitionId);
  if (competition?.format.type !== "knockout") return undefined;
  const format = knockoutFormat(save.bank, competitionId);
  const at = phaseOfRound(format, round);
  const phase = at ? format.phases[at.phase] : undefined;
  if (!at || !phase) return undefined;
  return phase.legs === 2
    ? t("cup.phaseLeg", { phase: phase.name, leg: t(`cup.leg.${at.leg}`) })
    : phase.name;
}
