import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import type { LeagueClub } from "./selectors";

/** Campos do formulário da Nova carreira que podem ter erro (031 R3); a seed é texto livre. */
export type NewCareerField = "managerName" | "club";

export interface FormError {
  field: NewCareerField;
  /** Chave de i18n da mensagem (a mesma de hoje). */
  code: string;
  params?: Record<string, string | number>;
}

export interface NewCareerFormInput {
  managerName: string;
  clubId: string | undefined;
}

/** Erros do formulário, na ordem da tela (nome, clube); vazio quando tudo é válido. */
export function validateNewCareerForm(input: NewCareerFormInput): FormError[] {
  const errors: FormError[] = [];
  const length = input.managerName.trim().length;
  if (length === 0 || length > MANAGER_NAME_MAX) {
    errors.push({
      field: "managerName",
      code: "save.invalid_name",
      params: { max: MANAGER_NAME_MAX, length },
    });
  }
  if (!input.clubId) errors.push({ field: "club", code: "newCareer.noClub" });
  return errors;
}

/** Texto sem acento e em minúsculas, para a busca por nome. */
export function plain(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export interface ClubFilter {
  /** "" = todos os países. */
  country: string;
  /** 0 = todas as divisões. */
  division: number;
  query: string;
}

/** Clubes que passam pelos filtros de país, divisão e busca por nome ou cidade (031 R5). */
export function filterClubs(clubs: readonly LeagueClub[], filter: ClubFilter): LeagueClub[] {
  const needle = plain(filter.query.trim());
  return clubs.filter(
    (club) =>
      (filter.country === "" || club.countryId === filter.country) &&
      (filter.division === 0 || club.divisionLevel === filter.division) &&
      (needle === "" || plain(club.name).includes(needle) || plain(club.city).includes(needle)),
  );
}
