import type { Confederation, WorldProfile } from "../profile";
import { DEFAULT_CONFEDERATIONS } from "./default";

/** Os 4 primeiros países (dos mais fortes) de cada confederação, em pirâmides pequenas. */
const COMPACT_CONFEDERATIONS: Confederation[] = DEFAULT_CONFEDERATIONS.map((confederation) => ({
  ...confederation,
  minor: false,
  countries: confederation.countries.slice(0, 4).map((spec) => ({
    ...spec,
    tier: 3,
    divisions: 1,
    clubsPerDivision: 8,
  })),
}));

/**
 * Mundo reduzido (024 R1, R14): as seis confederações com 4 países cada, uma divisão de 8 clubes por
 * país (o Brasil mantém as 4 divisões, com 12 clubes) e 4 estaduais (12 e 8 clubes). Serve a testes e a máquinas
 * fracas; a estrutura é a mesma do perfil padrão.
 */
export const COMPACT_PROFILE: WorldProfile = {
  id: "reduzido",
  manifest: {
    id: "mundo-reduzido",
    name: "Mundo reduzido",
    author: "brasfoot-like",
    version: "1.0.0",
  },
  confederations: COMPACT_CONFEDERATIONS,
  brazil: { clubsPerDivision: 12, states: 4, estadual: { firstDivision: 12, secondDivision: 8 } },
};
