import type { ScreenId, ShortcutId } from "../shortcuts";

/** Contexto da carreira que libera dicas que só fazem sentido depois de jogar. */
export interface TipContext {
  /** Já existe ao menos uma rodada jogada na carreira. */
  played: boolean;
}

export interface Tip {
  id: string;
  screen: ScreenId;
  titleKey: string;
  bodyKey: string;
  /** Atalho citado no texto (variável `{key}`), quando houver. */
  shortcutId?: ShortcutId;
  /** Valor de `data-tip-anchor` do elemento destacado na tela. */
  anchor?: string;
  order: number;
  /** Só no primeiro acesso (sem carreira salva). */
  firstRun?: boolean;
  requires?: keyof TipContext;
}

/** Dicas do primeiro acesso (016 R6, contracts/ui.md). */
export const TIPS = [
  {
    id: "welcome",
    screen: "opening",
    titleKey: "tips.welcome.title",
    bodyKey: "tips.welcome.body",
    anchor: "new-career",
    order: 1,
    firstRun: true,
  },
  {
    id: "home-next-step",
    screen: "game-home",
    titleKey: "tips.home.title",
    bodyKey: "tips.home.body",
    shortcutId: "play",
    anchor: "play",
    order: 1,
  },
  {
    id: "round-direct",
    screen: "game-home",
    titleKey: "tips.results.title",
    bodyKey: "tips.results.body",
    shortcutId: "go-competition",
    order: 2,
    requires: "played",
  },
  {
    id: "lineup",
    screen: "lineup",
    titleKey: "tips.lineup.title",
    bodyKey: "tips.lineup.body",
    shortcutId: "auto-lineup",
    anchor: "lineup",
    order: 1,
  },
  {
    id: "round-live",
    screen: "round",
    titleKey: "tips.round.title",
    bodyKey: "tips.round.body",
    shortcutId: "pause",
    anchor: "round-controls",
    order: 1,
  },
  {
    id: "table",
    screen: "competition",
    titleKey: "tips.table.title",
    bodyKey: "tips.table.body",
    shortcutId: "division-prev",
    anchor: "table",
    order: 1,
  },
  {
    id: "market",
    screen: "market",
    titleKey: "tips.market.title",
    bodyKey: "tips.market.body",
    order: 1,
  },
  {
    id: "board",
    screen: "career",
    titleKey: "tips.board.title",
    bodyKey: "tips.board.body",
    anchor: "board",
    order: 1,
  },
] as const satisfies readonly Tip[];

export type TipId = (typeof TIPS)[number]["id"];

/** Primeira dica pendente da tela (nenhuma se o jogador pulou todas). */
export function pendingTip(
  screen: ScreenId,
  state: { dismissed: readonly string[]; skipAll: boolean },
  context: TipContext & { firstRun: boolean },
): Tip | undefined {
  if (state.skipAll) return undefined;
  return (TIPS as readonly Tip[])
    .filter((tip) => tip.screen === screen && !state.dismissed.includes(tip.id))
    .filter((tip) => !tip.firstRun || context.firstRun)
    .filter((tip) => !tip.requires || context[tip.requires])
    .sort((a, b) => a.order - b.order)[0];
}
