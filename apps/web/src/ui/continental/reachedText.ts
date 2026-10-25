import type { SaveFile } from "@brasfoot-like/save";
import type { t as translate } from "../../i18n";

type T = typeof translate;

/** Fase alcançada numa competição entre países como o jogador a lê (022): o nome vem do banco. */
export function reachedText(
  t: T,
  save: Pick<SaveFile, "bank">,
  competitionId: string,
  reached: { stage: number; phase?: number | undefined },
): string {
  const format = save.bank.competitions.find((entry) => entry.id === competitionId)?.format;
  const stages = format?.type === "stages" ? format.stages : format ? [format] : [];
  const stage = stages[reached.stage - 1];
  if (stage?.type === "knockout") {
    if (reached.phase !== undefined && reached.phase > stage.phases.length) {
      return t("continental.champion");
    }
    const phase = stage.phases[(reached.phase ?? 1) - 1];
    return phase ? phase.name : t("continental.knockout");
  }
  return t("continental.groups");
}
