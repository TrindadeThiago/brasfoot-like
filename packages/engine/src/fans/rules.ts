import type { CompletedBank } from "../model/types";

/** Parâmetros da torcida (research.md R14 da 013). Calibrados pelo teste de 30 temporadas. */
export interface FansRules {
  neutral: number;
  win: number;
  draw: number;
  loss: number;
  /** A distância da expectativa só pesa a partir desta rodada. */
  checkFromRound: number;
  /** Alvo abaixo da expectativa: neutral − posições × gapWeight. */
  gapWeight: number;
  /** Alvo acima: neutral + min(aheadCap, posições × aheadWeight). */
  aheadWeight: number;
  aheadCap: number;
  /** O humor anda (alvo − humor) / driftDivisor por rodada. */
  driftDivisor: number;
  /** Sem parcela de expectativa, volta (neutral − humor) / calmDivisor. */
  calmDivisor: number;
  keepRecent: number;
  /** Resultado de clássico × (100 + intensidade × derbyPct) / 100. */
  derbyPct: number;
  idolCount: number;
  idolLoss: number;
  starSigning: number;
  /** Público × 1 + (humor − 50) × gateSwingPct / 5000. */
  gateSwingPct: number;
  fanPressureBelow: number;
  fanSupportAbove: number;
  fanDivisor: number;
  /** Na virada, o humor guarda esta fração da distância ao neutro. */
  carryPct: number;
  titleBoost: number;
  promotionBoost: number;
  relegationDrop: number;
  /** Limites das faixas: revoltada < [0] ≤ insatisfeita < [1] ≤ neutra ≤ [2] < animada ≤ [3] < eufórica. */
  bands: [number, number, number, number];
}

export const DEFAULT_FANS: FansRules = {
  neutral: 50,
  win: 4,
  draw: 0,
  loss: 4,
  checkFromRound: 5,
  gapWeight: 4,
  aheadWeight: 4,
  aheadCap: 30,
  driftDivisor: 6,
  calmDivisor: 8,
  keepRecent: 10,
  derbyPct: 40,
  idolCount: 3,
  idolLoss: 8,
  starSigning: 4,
  gateSwingPct: 30,
  fanPressureBelow: 35,
  fanSupportAbove: 70,
  fanDivisor: 10,
  carryPct: 50,
  titleBoost: 10,
  promotionBoost: 10,
  relegationDrop: 10,
  bands: [20, 40, 60, 80],
};

/** Regras da torcida: `competition.fans` com os padrões preenchidos. */
export function fansRules(world: CompletedBank, competitionId: string): FansRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const override = competition?.fans ?? {};
  const merged: FansRules = { ...DEFAULT_FANS, bands: [...DEFAULT_FANS.bands] };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "number" && key in merged) {
      (merged as unknown as Record<string, number>)[key] = value;
    }
  }
  if (override.bands) merged.bands = [...override.bands];
  return merged;
}
