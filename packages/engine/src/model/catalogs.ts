/**
 * Catálogos fixos do jogo. São código (não dados) porque o motor implementa seus efeitos; os
 * bancos só os referenciam por id, e os rótulos visíveis vêm do i18n (research.md R7).
 */
export const POSITIONS = ["GK", "FB", "CB", "DM", "MF", "FW"] as const;
export type Position = (typeof POSITIONS)[number];

export const TRAITS = ["finisher", "wall", "free-kick", "heading", "pace", "playmaker"] as const;
export type Trait = (typeof TRAITS)[number];

export const CREST_SHAPES = ["classic", "round", "triangle", "rectangle"] as const;
export type CrestShape = (typeof CREST_SHAPES)[number];

export const TIEBREAKERS = [
  "wins",
  "goal-difference",
  "goals-for",
  "head-to-head",
  "fewest-red-cards",
  "draw-lots",
] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const FORMAT_TYPES = ["league"] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];

/** Tipos de disputa previstos para versões futuras do formato. */
export const RESERVED_FORMAT_TYPES = ["knockout", "groups"] as const;

export const SUPPORTED_FORMAT_VERSIONS = [1] as const;
