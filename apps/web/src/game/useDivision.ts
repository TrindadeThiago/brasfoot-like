"use client";

import { divisionSeason, type Season } from "@brasfoot-like/engine";
import { type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";

/** Divisão escolhida na URL (`d`); padrão e valor inválido: a do clube do jogador. */
export function useDivision(save: SaveFile): { level: number; season: Season } {
  const params = useSearchParams();
  const requested = Number(params?.get("d"));
  const chosen = Number.isInteger(requested) ? divisionSeason(save.league, requested) : undefined;
  const season = chosen ?? divisionSeason(save.league, userDivisionLevel(save));
  if (!season) throw new Error("carreira sem a divisão do jogador");
  return { level: season.divisionLevel, season };
}

/** Link de uma tela da competição numa divisão. */
export function divisionHref(path: string, careerId: string, level: number): string {
  return `${path}/?c=${careerId}&d=${level}`;
}
