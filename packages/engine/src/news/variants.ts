import { cyrb128 } from "../rng/hash";
import type { NewsRules } from "./rules";
import type { HeadlineType } from "./types";

/** Índice da variação de texto, por hash da seed e do fato (research.md R6): determinístico. */
export function variantOf(
  rules: NewsRules,
  careerSeed: string,
  key: string,
  type: HeadlineType,
): number {
  const count = Math.max(1, rules.variants[type]);
  const [hash] = cyrb128(`${careerSeed}:${key}:${type}`);
  return hash % count;
}
