import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { REGULATOR_RULES } from "./rules";
import type { RegulatorState, RenewalState, WorldMeasure } from "./types";

/** País da liga (o da competição). */
function leagueCountry(world: CompletedBank, league: LeagueSeason): string | undefined {
  return world.competitions.find((entry) => entry.id === league.competitionId)?.countryId;
}

/** Regulador do país da liga (020 R13): o primeiro país do banco usa `regulator`, os demais `regulators`. */
export function regulatorFor(
  renewal: Pick<RenewalState, "regulator" | "regulators">,
  world: CompletedBank,
  league: LeagueSeason,
): RegulatorState {
  const country = leagueCountry(world, league);
  if (country === undefined || country === world.competitions[0]?.countryId) {
    return renewal.regulator;
  }
  return renewal.regulators?.[country] ?? { strengthOffset: 0, potentialBonus: 0 };
}

/** Grava o regulador do país da liga. Não altera a entrada. */
export function withRegulator(
  renewal: RenewalState,
  world: CompletedBank,
  league: LeagueSeason,
  state: RegulatorState,
): RenewalState {
  const country = leagueCountry(world, league);
  if (country === undefined || country === world.competitions[0]?.countryId) {
    return { ...renewal, regulator: state };
  }
  return { ...renewal, regulators: { ...renewal.regulators, [country]: state } };
}

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Regulador global (R8, FR-014): controle proporcional do nível geral (offset de força dos jovens,
 * amortecido) e da cauda alta pela promessa de craques (jovens com potencial de craque), que
 * responde já na geração seguinte e evita a oscilação de regular pelos craques atuais.
 * Determinístico.
 */
export function regulate(state: RegulatorState, measure: WorldMeasure): RegulatorState {
  const {
    targetMean,
    gain,
    maxStep,
    leak,
    offsetRange,
    prospectsRange,
    prospectsStep,
    potentialBonusRange,
  } = REGULATOR_RULES;
  const step = clamp(gain * (targetMean - measure.mean), [-maxStep, maxStep]);
  const bonusStep =
    measure.prospects < prospectsRange[0]
      ? prospectsStep
      : measure.prospects > prospectsRange[1]
        ? -prospectsStep
        : 0;
  return {
    strengthOffset: clamp(state.strengthOffset * (1 - leak) + step, offsetRange),
    potentialBonus: clamp(state.potentialBonus + bonusStep, potentialBonusRange),
    lastMeasure: measure,
  };
}
