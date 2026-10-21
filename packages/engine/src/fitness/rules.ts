import type { CompletedBank } from "../model/types";
import type { FitnessRules } from "./types";

/** Padrões (017 R5): 7 dias recuperam 90 minutos por completo, 3 dias não. */
export const DEFAULT_FITNESS: FitnessRules = {
  drainPer90: 30,
  recoveryPerDay: 5,
  penaltyBpPerPoint: 40,
};

/** Regras da condição física: as do mod (`competition.fitness`) sobre os padrões. */
export function fitnessRules(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
): FitnessRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const declared = competition?.fitness ?? {};
  return {
    drainPer90: declared.drainPer90 ?? DEFAULT_FITNESS.drainPer90,
    recoveryPerDay: declared.recoveryPerDay ?? DEFAULT_FITNESS.recoveryPerDay,
    penaltyBpPerPoint: declared.penaltyBpPerPoint ?? DEFAULT_FITNESS.penaltyBpPerPoint,
  };
}
