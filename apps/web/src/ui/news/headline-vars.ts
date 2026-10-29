import type { HeadlineVars } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { formatMoney } from "../../i18n";

/** Variáveis que guardam ids de clube e viram nomes na apresentação. */
const CLUB_VARS = [
  "club",
  "opponent",
  "winner",
  "loser",
  "scorerClub",
  "owner",
  "newClub",
  "newOpponent",
  "prevClub",
  "prevOpponent",
];

/** Variáveis prontas para o template: nomes de clube, divisão, técnico e valores formatados. */
export function headlineVars(save: SaveFile, vars: HeadlineVars): HeadlineVars {
  const names = new Map(save.bank.clubs.map((club) => [club.id, club.name]));
  const resolved: HeadlineVars = { ...vars, manager: save.managerName };
  for (const key of CLUB_VARS) {
    const value = vars[key];
    if (typeof value === "string") resolved[key] = names.get(value) ?? value;
  }
  if (typeof vars.level === "number") resolved.division = divisionNameOf(save, vars.level);
  if (typeof vars.fee === "number") resolved.feeText = formatMoney(vars.fee);
  if (typeof vars.competition === "string") {
    const competition = save.bank.competitions.find((entry) => entry.id === vars.competition);
    resolved.competition = competition?.name ?? vars.competition;
  }
  resolved.hasScorer = typeof vars.player === "string" ? "yes" : "no";
  return resolved;
}
