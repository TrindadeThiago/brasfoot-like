import { completeHiddenAttributes, createSeason, validateBank } from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveError, type SaveFile } from "./format";

export interface CreateSaveInput {
  id: string;
  /** Data/hora ISO vinda da interface (o pacote não lê relógio). */
  now: string;
  managerName: string;
  clubId: string;
  seed: string;
  /** Banco padrão já unido (`joinBankFiles`), ainda não validado. */
  defaultBank: unknown;
}

export type CreateSaveResult = { ok: true; save: SaveFile } | { ok: false; error: SaveError };

/**
 * Cria a carreira (FR-001, FR-003): valida o nome e o banco, completa os atributos ocultos com a
 * seed da carreira e cria a temporada da Série A com a mesma seed.
 */
export function createSave(input: CreateSaveInput): CreateSaveResult {
  const managerName = input.managerName.trim();
  if (managerName.length < 1 || managerName.length > MANAGER_NAME_MAX) {
    return {
      ok: false,
      error: {
        code: "save.invalid_name",
        params: { length: managerName.length, max: MANAGER_NAME_MAX },
      },
    };
  }
  const validation = validateBank(input.defaultBank);
  if (!validation.ok) {
    return {
      ok: false,
      error: { code: "save.invalid_bank", params: { issues: validation.errors.length } },
    };
  }
  const bank = completeHiddenAttributes(validation.bank, input.seed);
  const competition = bank.competitions[0];
  const league = competition?.divisions.find((division) => division.level === 1);
  if (!competition || !league?.clubIds.includes(input.clubId)) {
    return {
      ok: false,
      error: { code: "save.club_not_in_league", params: { clubId: input.clubId } },
    };
  }
  const season = createSeason(bank, {
    competitionId: competition.id,
    divisionLevel: league.level,
    seed: input.seed,
  });
  if (!season.ok) {
    return { ok: false, error: { code: "save.invalid_bank", params: { issues: 1 } } };
  }
  return {
    ok: true,
    save: {
      formatVersion: SAVE_FORMAT_VERSION,
      id: input.id,
      createdAt: input.now,
      savedAt: input.now,
      managerName,
      clubId: input.clubId,
      seed: input.seed,
      bank,
      season: season.season,
    },
  };
}
