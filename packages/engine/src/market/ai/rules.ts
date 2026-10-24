import { POSITIONS, type Position } from "../../model/catalogs";
import type { CompletedBank } from "../../model/types";

/** Parâmetros da IA de mercado (research.md R12 da 011). Calibrados pelo teste de 30 temporadas. */
export interface AiMarketRules {
  /** Posição fraca: titular provável abaixo do alvo menos esta folga. */
  weakGap: number;
  /** Força-alvo = targetBase + targetPerAmbitionPct% × ambição. */
  targetBase: number;
  targetPerAmbitionPct: number;
  /** Elenco envelhecido acima desta idade média. */
  oldSquadAge: number;
  /** Meses de folha reservados antes de gastar com reforços. */
  reserveMonths: number;
  /** Ganho mínimo de força sobre o titular provável para valer uma compra. */
  minGain: number;
  /** Bônus de score por ano abaixo de 26 (dobra com elenco envelhecido). */
  youthBonus: number;
  maxBuysPerWindow: number;
  maxSalesPerWindow: number;
  maxDealsPerRound: number;
  /** Titular só é vendido a clube com reputação ao menos esta margem acima. */
  upwardMargin: number;
  /** Excedentes saem por esta fração da pedida. */
  surplusDiscountPct: number;
  loanMaxAge: number;
  loanMinPotential: number;
  /** Jovem fora destes mais fortes do clube pode ser emprestado. */
  loanBenchRank: number;
  maxFreeSigningsPerRound: number;
  /** Teto por posição (R3). */
  positionMax: Record<Position, number>;
  /** Resumos de janela guardados. */
  keepReports: number;
  /** Contratações internacionais da IA por clube e janela (020 R13). */
  maxInternationalPerClub: number;
}

export const DEFAULT_AI_MARKET: AiMarketRules = {
  weakGap: 4,
  targetBase: 56,
  targetPerAmbitionPct: 18,
  oldSquadAge: 28,
  reserveMonths: 6,
  minGain: 2,
  youthBonus: 3,
  maxBuysPerWindow: 2,
  maxSalesPerWindow: 2,
  maxDealsPerRound: 12,
  upwardMargin: 5,
  surplusDiscountPct: 80,
  loanMaxAge: 21,
  loanMinPotential: 75,
  loanBenchRank: 16,
  maxFreeSigningsPerRound: 6,
  positionMax: { GK: 4, FB: 6, CB: 6, DM: 5, MF: 7, FW: 6 },
  keepReports: 4,
  maxInternationalPerClub: 1,
};

/** Regras da IA de mercado: `competition.market.aiMarket` com os padrões preenchidos. */
export function aiMarketRules(world: CompletedBank, competitionId: string): AiMarketRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const override = competition?.market?.aiMarket ?? {};
  const merged = { ...DEFAULT_AI_MARKET };
  for (const [key, value] of Object.entries(override)) {
    if (key !== "positionMax" && typeof value === "number") {
      (merged as unknown as Record<string, number>)[key] = value;
    }
  }
  return {
    ...merged,
    positionMax: Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        override.positionMax?.[position] ?? DEFAULT_AI_MARKET.positionMax[position],
      ]),
    ) as Record<Position, number>,
  };
}
