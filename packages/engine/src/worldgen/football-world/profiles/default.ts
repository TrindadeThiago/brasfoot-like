import type { Confederation, CountrySpec, Tier, WorldProfile } from "../profile";

const country = (geoId: string, tier: Tier, strength: number): CountrySpec => ({
  geoId,
  tier,
  strength,
});

/**
 * Perfil padrão do mundo completo (024 R1): as seis confederações do futebol com os principais países
 * de cada uma. O Brasil tem as divisões A a D e os 27 estaduais; os demais países da América do Sul
 * têm duas divisões e copa. A força é relativa dentro do mundo: reputação, economia e vagas
 * continentais seguem ela.
 */
export const DEFAULT_CONFEDERATIONS: Confederation[] = [
  {
    id: "uefa",
    name: "Confederação Europeia",
    minor: true,
    countries: [
      country("inglaterra", 1, 1.5),
      country("espanha", 1, 1.45),
      country("italia", 1, 1.4),
      country("alemanha", 1, 1.4),
      country("franca", 1, 1.3),
      country("portugal", 2, 1.15),
      country("paises-baixos", 2, 1.1),
      country("belgica", 2, 1.0),
      country("turquia", 2, 0.95),
      country("escocia", 3, 0.85),
      country("grecia", 3, 0.8),
      country("suica", 3, 0.8),
    ],
  },
  {
    id: "conmebol",
    name: "Confederação da América do Sul",
    minor: true,
    countries: [
      country("brasil", 1, 1.5),
      country("argentina", 1, 1.4),
      country("colombia", 2, 1.1),
      country("chile", 2, 1.0),
      country("uruguai", 2, 1.0),
      country("equador", 2, 0.9),
      country("paraguai", 2, 0.85),
      country("peru", 2, 0.8),
      country("venezuela", 2, 0.65),
      country("bolivia", 2, 0.6),
    ],
  },
  {
    id: "concacaf",
    name: "Confederação da América do Norte, Central e Caribe",
    minor: false,
    countries: [
      country("mexico", 1, 1.3),
      country("estados-unidos", 1, 1.25),
      country("costa-rica", 3, 0.8),
      country("honduras", 3, 0.7),
      country("panama", 4, 0.65),
      country("jamaica", 4, 0.6),
    ],
  },
  {
    id: "caf",
    name: "Confederação Africana",
    minor: false,
    countries: [
      country("egito", 2, 1.1),
      country("marrocos", 2, 1.05),
      country("africa-do-sul", 3, 0.95),
      country("nigeria", 3, 0.9),
      country("argelia", 3, 0.85),
      country("gana", 4, 0.75),
    ],
  },
  {
    id: "afc",
    name: "Confederação Asiática",
    minor: false,
    countries: [
      country("japao", 1, 1.25),
      country("coreia-do-sul", 2, 1.15),
      country("china", 2, 1.1),
      country("arabia-saudita", 2, 1.05),
      country("ira", 3, 0.95),
      country("australia", 3, 0.9),
    ],
  },
  {
    id: "ofc",
    name: "Confederação da Oceania",
    minor: false,
    countries: [
      country("nova-zelandia", 4, 0.7),
      country("fiji", 4, 0.55),
      country("papua-nova-guine", 4, 0.5),
      country("ilhas-salomao", 4, 0.5),
    ],
  },
];

/** Mundo completo (024): os 44 países e os 27 estaduais do Brasil. O mais pesado dos três tamanhos. */
export const DEFAULT_PROFILE: WorldProfile = {
  id: "completo",
  manifest: {
    id: "mundo-completo",
    name: "Mundo completo",
    author: "brasfoot-like",
    version: "1.0.0",
  },
  confederations: DEFAULT_CONFEDERATIONS,
  brazil: { clubsPerDivision: 20, states: 27, estadual: { firstDivision: 12, secondDivision: 8 } },
};

/** Clubes por divisão do mundo médio, por nível do país: pirâmides menores que as do completo. */
const MEDIUM_CLUBS: Record<Tier, number> = { 1: 16, 2: 12, 3: 10, 4: 8 };

const MEDIUM_CONFEDERATIONS: Confederation[] = DEFAULT_CONFEDERATIONS.map((confederation) => ({
  ...confederation,
  countries: confederation.countries.map((spec) => ({
    ...spec,
    clubsPerDivision: MEDIUM_CLUBS[spec.tier],
  })),
}));

/**
 * Mundo médio (024): os mesmos 44 países com pirâmides menores (16, 12, 10 e 8 clubes por divisão) e
 * o Brasil com as Séries A a D de 16 clubes e 8 estaduais. Perto de 1 000 clubes, contra 1 650 do
 * completo.
 */
export const MEDIUM_PROFILE: WorldProfile = {
  id: "medio",
  manifest: {
    id: "mundo-medio",
    name: "Mundo médio",
    author: "brasfoot-like",
    version: "1.0.0",
  },
  confederations: MEDIUM_CONFEDERATIONS,
  brazil: { clubsPerDivision: 16, states: 8, estadual: { firstDivision: 12, secondDivision: 8 } },
};
