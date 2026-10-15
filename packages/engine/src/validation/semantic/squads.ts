import { ageOn } from "../../calendar/date.js";
import { POSITIONS } from "../../model/catalogs.js";
import type { SemanticContext } from "../context.js";
import { makeIssue, type ValidationIssue } from "../issues.js";

const SQUAD_MIN = 16;
const SQUAD_MAX = 40;
const MIN_GOALKEEPERS = 2;
const AGE_MIN = 15;
const AGE_MAX = 45;

/** Elencos (FR-019) e regras de cada jogador (FR-012, FR-014, edge cases de idade/potencial). */
export function checkSquads(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Conta a partir de todos os jogadores da entrada: um jogador com outro defeito não deve gerar
  // também um erro de tamanho de elenco (SC-004).
  const squadSize = new Map<string, number>();
  const goalkeepers = new Map<string, number>();
  // Clubes com jogador de posição inválida: a contagem de goleiros seria incerta.
  const unknownPositions = new Set<string>();
  for (const { clubId, position } of context.playerRefs) {
    if (clubId === undefined) continue;
    squadSize.set(clubId, (squadSize.get(clubId) ?? 0) + 1);
    if (!(POSITIONS as readonly (string | undefined)[]).includes(position)) {
      unknownPositions.add(clubId);
    }
    if (position === "GK") {
      goalkeepers.set(clubId, (goalkeepers.get(clubId) ?? 0) + 1);
    }
  }

  for (const { index, value: club } of context.clubs) {
    const count = squadSize.get(club.id) ?? 0;
    if (count < SQUAD_MIN || count > SQUAD_MAX) {
      issues.push(
        makeIssue(
          "squad.size",
          "clubs",
          [index],
          { clubId: club.id, count, min: SQUAD_MIN, max: SQUAD_MAX },
          club.id,
        ),
      );
    }
    const keepers = goalkeepers.get(club.id) ?? 0;
    if (keepers < MIN_GOALKEEPERS && !unknownPositions.has(club.id)) {
      issues.push(
        makeIssue(
          "squad.min_goalkeepers",
          "clubs",
          [index],
          { clubId: club.id, count: keepers, min: MIN_GOALKEEPERS },
          club.id,
        ),
      );
    }
  }

  const referenceDate = context.manifest?.referenceDate;
  for (const { index, value: player } of context.players) {
    const potential = player.hidden?.potential;
    if (potential !== undefined && potential < player.strength) {
      issues.push(
        makeIssue(
          "player.potential_below_strength",
          "players",
          [index, "hidden", "potential"],
          { potential, strength: player.strength },
          player.id,
        ),
      );
    }
    const seen = new Set<string>();
    player.traits.forEach((trait, position) => {
      if (seen.has(trait)) {
        issues.push(
          makeIssue(
            "player.duplicate_trait",
            "players",
            [index, "traits", position],
            { trait },
            player.id,
          ),
        );
      }
      seen.add(trait);
    });
    if (referenceDate !== undefined) {
      const age = ageOn(player.birthDate, referenceDate);
      if (age < AGE_MIN || age > AGE_MAX) {
        issues.push(
          makeIssue(
            "player.age_out_of_range",
            "players",
            [index, "birthDate"],
            { age, min: AGE_MIN, max: AGE_MAX },
            player.id,
          ),
        );
      }
    }
  }
  return issues;
}
