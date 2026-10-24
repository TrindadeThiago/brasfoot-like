import type { DrawRule } from "../model/types";
import { createRng, type Rng } from "../rng/xoshiro";
import { GROUP_DRAW_TUNING } from "./rules";
import type { DrawRuleRef, DrawWarning, GroupState } from "./types";

/** Sorteio dos grupos de uma fase de grupos (019 R6). */

/** Clube que entra no sorteio, com o que as regras leem. */
export interface GroupDrawClub {
  id: string;
  reputation: number;
  countryId: string;
  region?: string;
  /** Veio classificado da fase anterior (pote de origem). */
  fromPreviousStage: boolean;
}

/** A fase de grupos que está sendo sorteada. */
export interface GroupsRule {
  stage: number;
  groups: number;
  groupSize: number;
  pots?: number;
  previousStagePot: boolean;
  rules: readonly DrawRule[];
}

/** Falha do sorteio em modo `strict`: a separação não tem solução. */
export interface DrawError {
  code: "stages.draw_impossible";
  stage: number;
  rule: DrawRuleRef;
  clubIds: string[];
}

export type DrawResult =
  | { ok: true; groups: GroupState[]; warnings: DrawWarning[]; nodes: number }
  | { ok: false; error: DrawError };

/** `career` nunca falha (afrouxa a separação com aviso); `strict` devolve o erro. */
export type DrawMode = "career" | "strict";

/** Letra do grupo de índice `index` (`A`, `B`, …). */
export function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

const byId = (a: GroupDrawClub, b: GroupDrawClub) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

interface Separation {
  attribute: "country" | "region";
  exempt: ReadonlySet<number>;
}

interface Context {
  rule: GroupsRule;
  sorted: GroupDrawClub[];
  /** Pote de cada clube, a partir de 1; vazio sem potes. */
  potOf: ReadonlyMap<string, number>;
  separations: Separation[];
  concentrate: boolean;
  rng: Rng;
}

/** Potes (FR-010): blocos pela reputação; com `previousStagePot`, o último é o dos classificados. */
function makePots(sorted: readonly GroupDrawClub[], rule: GroupsRule): Map<string, number> {
  const pots = rule.pots as number;
  const potOf = new Map<string, number>();
  const origin = rule.previousStagePot ? sorted.filter((club) => club.fromPreviousStage) : [];
  const rest = rule.previousStagePot ? sorted.filter((club) => !club.fromPreviousStage) : sorted;
  if (rule.previousStagePot && origin.length !== rule.groups) {
    throw new Error(`o pote de origem tem ${origin.length} clubes e devia ter ${rule.groups}`);
  }
  const direct = rule.previousStagePot ? pots - 1 : pots;
  if (rest.length !== direct * rule.groups) {
    throw new Error(`${rest.length} clubes não formam ${direct} potes de ${rule.groups}`);
  }
  const ranked = [...rest].sort((a, b) => b.reputation - a.reputation || byId(a, b));
  for (const [index, club] of ranked.entries()) {
    potOf.set(club.id, Math.floor(index / rule.groups) + 1);
  }
  for (const club of origin) potOf.set(club.id, pots);
  return potOf;
}

function attributeOf(club: GroupDrawClub, attribute: "country" | "region"): string | undefined {
  return attribute === "country" ? club.countryId : club.region;
}

/** Os clubes violam alguma separação se dividem o grupo (os de pote isento não estão sujeitos). */
function conflict(ctx: Context, a: GroupDrawClub, b: GroupDrawClub): boolean {
  for (const separation of ctx.separations) {
    const value = attributeOf(a, separation.attribute);
    if (value === undefined || value !== attributeOf(b, separation.attribute)) continue;
    if (separation.exempt.has(ctx.potOf.get(a.id) ?? 0)) continue;
    if (separation.exempt.has(ctx.potOf.get(b.id) ?? 0)) continue;
    return true;
  }
  return false;
}

/** Ordem em que os clubes de uma lista são colocados: por região (concentração) ou pela seed. */
function orderList(ctx: Context, list: readonly GroupDrawClub[], label: string): GroupDrawClub[] {
  if (!ctx.concentrate) return ctx.rng.fork(`order:${label}`).shuffle([...list].sort(byId));
  const clusters = new Map<string, GroupDrawClub[]>();
  const without: GroupDrawClub[] = [];
  for (const club of [...list].sort(byId)) {
    if (club.region === undefined) without.push(club);
    else clusters.set(club.region, [...(clusters.get(club.region) ?? []), club]);
  }
  const names = ctx.rng.fork(`regions:${label}`).shuffle([...clusters.keys()].sort(byText));
  return [
    ...names.flatMap((name) =>
      ctx.rng.fork(`cluster:${label}:${name}`).shuffle(clusters.get(name) as GroupDrawClub[]),
    ),
    ...ctx.rng.fork(`without:${label}`).shuffle(without),
  ];
}

/** Os clubes na ordem do sorteio: pote a pote, ou todos juntos sem potes. */
function sequence(ctx: Context): GroupDrawClub[] {
  const pots = ctx.rule.pots;
  if (pots === undefined) return orderList(ctx, ctx.sorted, "all");
  return Array.from({ length: pots }, (_, index) =>
    orderList(
      ctx,
      ctx.sorted.filter((club) => ctx.potOf.get(club.id) === index + 1),
      `pot${index + 1}`,
    ),
  ).flat();
}

class Search {
  nodes = 0;
  exhausted = false;
  constructor(
    readonly ctx: Context,
    readonly order: readonly GroupDrawClub[],
    readonly budget: number,
  ) {}

  groups: GroupDrawClub[][] = [];
  private used: boolean[][] = [];
  private perms = new Map<string, number[]>();

  reset(): void {
    const { groups } = this.ctx.rule;
    this.groups = Array.from({ length: groups }, () => []);
    this.used = Array.from({ length: groups }, () => []);
    this.nodes = 0;
    this.exhausted = false;
  }

  /** Grupos em que o clube tenta entrar, do preferido ao menos preferido. */
  private candidates(club: GroupDrawClub): number[] {
    const indexes = Array.from({ length: this.ctx.rule.groups }, (_, index) => index);
    if (this.ctx.concentrate) {
      if (club.region === undefined) return indexes;
      const same = (group: number) =>
        (this.groups[group] as GroupDrawClub[]).filter((member) => member.region === club.region)
          .length;
      return indexes.sort((a, b) => same(b) - same(a) || a - b);
    }
    let perm = this.perms.get(club.id);
    if (!perm) {
      perm = this.ctx.rng.fork(`group-order:${club.id}`).shuffle(indexes);
      this.perms.set(club.id, perm);
    }
    return perm;
  }

  private fits(club: GroupDrawClub, group: number): boolean {
    if ((this.groups[group] as GroupDrawClub[]).length >= this.ctx.rule.groupSize) return false;
    const pot = this.ctx.potOf.get(club.id);
    return !(pot !== undefined && (this.used[group] as boolean[])[pot - 1]);
  }

  private place(club: GroupDrawClub, group: number): void {
    (this.groups[group] as GroupDrawClub[]).push(club);
    const pot = this.ctx.potOf.get(club.id);
    if (pot !== undefined) (this.used[group] as boolean[])[pot - 1] = true;
  }

  private unplace(club: GroupDrawClub, group: number): void {
    (this.groups[group] as GroupDrawClub[]).pop();
    const pot = this.ctx.potOf.get(club.id);
    if (pot !== undefined) (this.used[group] as boolean[])[pot - 1] = false;
  }

  private clash(club: GroupDrawClub, group: number): number {
    return (this.groups[group] as GroupDrawClub[]).filter((member) =>
      conflict(this.ctx, club, member),
    ).length;
  }

  /** Primeira distribuição sem nenhuma violação, ou `false`; `exhausted` marca o fim do teto de nós. */
  solve(position = 0): boolean {
    const club = this.order[position];
    if (!club) return true;
    for (const group of this.candidates(club)) {
      if (!this.fits(club, group) || this.clash(club, group) > 0) continue;
      if (++this.nodes > this.budget) {
        this.exhausted = true;
        return false;
      }
      this.place(club, group);
      if (this.solve(position + 1)) return true;
      this.unplace(club, group);
      if (this.exhausted) return false;
    }
    return false;
  }

  /** Distribuição que viola o menor número de pares (ramificação e corte, dentro do teto de nós). */
  minimize(): { groups: GroupDrawClub[][]; cost: number } {
    let best: { groups: GroupDrawClub[][]; cost: number } | undefined;
    // Uma primeira distribuição (ignorando a separação) garante que há sempre uma resposta.
    const dive = (position: number, cost: number): boolean => {
      const club = this.order[position];
      if (!club) {
        best = { groups: this.groups.map((members) => [...members]), cost };
        return true;
      }
      for (const group of this.candidates(club)) {
        if (!this.fits(club, group)) continue;
        const extra = this.clash(club, group);
        this.place(club, group);
        const done = dive(position + 1, cost + extra);
        this.unplace(club, group);
        if (done) return true;
      }
      return false;
    };
    dive(0, 0);
    this.reset();
    const bound = (position: number, cost: number): void => {
      if (best && cost >= best.cost) return;
      const club = this.order[position];
      if (!club) {
        best = { groups: this.groups.map((members) => [...members]), cost };
        return;
      }
      const options = this.candidates(club)
        .filter((group) => this.fits(club, group))
        .map((group) => ({ group, extra: this.clash(club, group) }))
        .sort((a, b) => a.extra - b.extra);
      for (const { group, extra } of options) {
        if (this.exhausted) return;
        if (best && cost + extra >= best.cost) continue;
        if (++this.nodes > this.budget) {
          this.exhausted = true;
          return;
        }
        this.place(club, group);
        bound(position + 1, cost + extra);
        this.unplace(club, group);
      }
    };
    bound(0, 0);
    if (!best) throw new Error("sorteio sem nenhuma distribuição possível");
    return best;
  }
}

/** Avisos: cada grupo com clubes do mesmo país (ou região) que a regra mandava separar. */
function warningsOf(ctx: Context, groups: readonly GroupDrawClub[][]): DrawWarning[] {
  const warnings: DrawWarning[] = [];
  ctx.separations.forEach((separation) => {
    for (const members of groups) {
      const buckets = new Map<string, string[]>();
      for (const club of members) {
        const value = attributeOf(club, separation.attribute);
        if (value === undefined || separation.exempt.has(ctx.potOf.get(club.id) ?? 0)) continue;
        buckets.set(value, [...(buckets.get(value) ?? []), club.id]);
      }
      for (const value of [...buckets.keys()].sort(byText)) {
        const ids = (buckets.get(value) as string[]).sort(byText);
        if (ids.length < 2) continue;
        warnings.push({
          stage: ctx.rule.stage,
          rule: { kind: "separate", attribute: separation.attribute },
          clubIds: ids,
        });
      }
    }
  });
  return warnings;
}

function stateOf(groups: readonly GroupDrawClub[][]): GroupState[] {
  return groups.map((members, index) => ({
    id: groupLetter(index),
    clubIds: members.map((club) => club.id).sort(byText),
  }));
}

/**
 * Sorteia os grupos: determinístico pela seed, independente da ordem em que os clubes chegam.
 * Cada grupo recebe no máximo um clube de cada pote (os potes nunca são afrouxados). Procura de
 * forma exata uma distribuição que respeite a separação; sem solução, na carreira (`career`)
 * viola o mínimo possível e avisa, e em `strict` devolve o erro (019 FR-012 a FR-015).
 */
export function drawGroups(
  clubs: readonly GroupDrawClub[],
  rule: GroupsRule,
  seed: string,
  mode: DrawMode,
): DrawResult {
  if (clubs.length !== rule.groups * rule.groupSize) {
    throw new Error(
      `sorteio com ${clubs.length} clubes para ${rule.groups} grupos de ${rule.groupSize}`,
    );
  }
  const sorted = [...clubs].sort(byId);
  const separations: Separation[] = rule.rules.flatMap((entry) =>
    entry.kind === "separate"
      ? [{ attribute: entry.attribute, exempt: new Set(entry.exemptPots ?? []) }]
      : [],
  );
  const ctx: Context = {
    rule,
    sorted,
    potOf: rule.pots === undefined ? new Map() : makePots(sorted, rule),
    separations,
    concentrate: rule.rules.some((entry) => entry.kind === "concentrate"),
    rng: createRng(seed),
  };
  const search = new Search(ctx, sequence(ctx), GROUP_DRAW_TUNING.nodeBudget);
  search.reset();
  if (search.solve()) {
    return { ok: true, groups: stateOf(search.groups), warnings: [], nodes: search.nodes };
  }
  // Sem solução (ou o teto de nós acabou): busca o mínimo de violações.
  const used = search.nodes;
  const best = search.minimize();
  const warnings = warningsOf(ctx, best.groups);
  const nodes = used + search.nodes;
  if (best.cost === 0 || warnings.length === 0) {
    return { ok: true, groups: stateOf(best.groups), warnings: [], nodes };
  }
  if (mode === "strict") {
    const first = warnings[0] as DrawWarning;
    return {
      ok: false,
      error: {
        code: "stages.draw_impossible",
        stage: rule.stage,
        rule: first.rule,
        clubIds: first.clubIds,
      },
    };
  }
  return { ok: true, groups: stateOf(best.groups), warnings, nodes };
}
