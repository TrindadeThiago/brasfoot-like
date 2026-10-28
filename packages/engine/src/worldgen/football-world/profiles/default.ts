import type { Confederation, CountrySpec, WorldProfile } from "../profile";

const country = (geoId: string, strength: number): CountrySpec => ({
  geoId,
  tier: 3,
  strength,
  divisions: 1,
  clubsPerDivision: 20,
});

/**
 * As cinco confederações do mundo padrão (024 R1): os 3 países mais fortes de cada uma, em ligas de
 * uma divisão de 20 clubes. A América do Sul vem primeiro, para o Brasil ser o primeiro país da lista e a
 * liga em foco. A força é relativa: reputação, economia e vagas continentais seguem ela.
 */
const CONFEDERATIONS: Confederation[] = [
  {
    id: "conmebol",
    name: "Confederação da América do Sul",
    minor: false,
    countries: [country("brasil", 1.5), country("argentina", 1.4), country("colombia", 1.1)],
  },
  {
    id: "uefa",
    name: "Confederação Europeia",
    minor: false,
    countries: [country("inglaterra", 1.5), country("espanha", 1.45), country("italia", 1.4)],
  },
  {
    id: "concacaf",
    name: "Confederação da América do Norte, Central e Caribe",
    minor: false,
    countries: [
      country("mexico", 1.3),
      country("estados-unidos", 1.25),
      country("costa-rica", 0.8),
    ],
  },
  {
    id: "caf",
    name: "Confederação Africana",
    minor: false,
    countries: [country("egito", 1.1), country("marrocos", 1.05), country("africa-do-sul", 0.95)],
  },
  {
    id: "afc",
    name: "Confederação Asiática",
    minor: false,
    countries: [country("japao", 1.25), country("coreia-do-sul", 1.15), country("china", 1.1)],
  },
];

/**
 * O mundo padrão do jogo (024): 15 países em cinco confederações (sem Oceania), o Brasil com as
 * Séries A a D de 20 clubes e 5 estaduais de duas divisões de 16. Cada país tem uma divisão de 20 clubes
 * e a copa nacional; cada confederação, a competição continental.
 */
export const DEFAULT_PROFILE: WorldProfile = {
  id: "padrao",
  manifest: {
    id: "mundo-padrao",
    name: "Mundo padrão",
    author: "brasfoot-like",
    version: "1.0.0",
  },
  confederations: CONFEDERATIONS,
  brazil: { clubsPerDivision: 20, states: 5, estadual: { firstDivision: 16, secondDivision: 16 } },
};
