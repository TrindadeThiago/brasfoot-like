import type { Club, Competition, Country, Manifest, Player } from "../model/types.js";
import type { Section, ValidationIssue } from "./issues.js";

/** Item que passou na validação estrutural, com seu índice original na seção. */
export interface ParsedItem<T> {
  index: number;
  value: T;
}

/** Clube e posição declarados por um jogador, mesmo que o jogador seja inválido. */
export interface PlayerRef {
  index: number;
  clubId: string | undefined;
  position: string | undefined;
}

export interface IdLocation {
  section: Section;
  index: number;
}

/**
 * Dados disponíveis para as regras semânticas: apenas itens estruturalmente válidos, mais o
 * registro de todos os ids encontrados (válidos ou não), para evitar erros em cascata.
 */
export interface SemanticContext {
  manifest: Manifest | undefined;
  countries: ParsedItem<Country>[];
  competitions: ParsedItem<Competition>[];
  clubs: ParsedItem<Club>[];
  players: ParsedItem<Player>[];
  ids: Map<string, IdLocation[]>;
  /** Todos os jogadores da entrada (válidos ou não), para contar elencos sem cascata. */
  playerRefs: PlayerRef[];
}

export type SemanticRule = (context: SemanticContext) => ValidationIssue[];
