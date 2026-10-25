import type { QualificationOrigin } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import type { t as translate } from "../../i18n";

type T = typeof translate;

/** Nome da competição no banco da carreira (nomes de competição vêm do mod). */
export function competitionName(save: Pick<SaveFile, "bank">, competitionId: string): string {
  return save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? competitionId;
}

/** Texto de como o clube chegou à competição (021 R7). */
export function originText(
  t: T,
  save: Pick<SaveFile, "bank">,
  origin: QualificationOrigin,
): string {
  switch (origin.kind) {
    case "bank":
    case "stay":
    case "promotion":
    case "relegation":
      return t(`origin.${origin.kind}`);
    case "berth":
      return t(`origin.berth.${origin.source}`, {
        competition: competitionName(save, origin.from),
        position: origin.position ?? 0,
      });
    case "pass": {
      const club = save.bank.clubs.find((entry) => entry.id === origin.fromClubId);
      return t("origin.pass", {
        club: club ? club.name : "none",
        reason: origin.reason,
      });
    }
  }
}
