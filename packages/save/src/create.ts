import {
  clubDivision,
  completeHiddenAttributes,
  createFinances,
  createLeagueSeason,
  initialRenewal,
  validateBank,
} from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveError, type SaveFile } from "./format";
import { initialLineup } from "./lineup";

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
 * seed da carreira e cria a temporada da liga (todas as divisões) com a mesma seed (007 R10).
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
  if (!competition?.divisions.some((division) => division.clubIds.includes(input.clubId))) {
    return {
      ok: false,
      error: { code: "save.club_not_in_league", params: { clubId: input.clubId } },
    };
  }
  const league = createLeagueSeason(bank, {
    competitionId: competition.id,
    careerSeed: input.seed,
  });
  const season = league.ok ? clubDivision(league.league, input.clubId) : undefined;
  if (!league.ok || !season) {
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
      league: league.league,
      history: [],
      finances: createFinances(bank, league.league),
      renewal: initialRenewal(bank),
      lineup: initialLineup(bank, season, input.clubId),
    },
  };
}
