/**
 * Registro único dos atalhos de teclado (016 R5): define o comportamento (`useShortcuts`) e a
 * ajuda (`ShortcutsHelp`). `passive` = tecla tratada pelo próprio componente (Esc nos diálogos,
 * Enter/Espaço na escalação); aparece na ajuda, mas não é despachada pelo registro.
 */

export type ScreenId =
  | "opening"
  | "saves"
  | "new-career"
  | "mods"
  | "settings"
  | "about"
  | "release-notes"
  | "game-home"
  | "squad"
  | "lineup"
  | "competition"
  | "calendar"
  | "finance"
  | "history"
  | "market"
  | "career"
  | "news"
  | "round"
  | "season-end";

/** `global` vale em todas as telas; `game`, em todas as telas do jogo. */
export type ShortcutScope = "global" | "game" | ScreenId;

export interface Shortcut {
  id: string;
  keys: readonly string[];
  /** Texto da tecla na ajuda (chave de `ui.json` ou o próprio rótulo, como "1"). */
  display: string;
  labelKey: string;
  scope: ShortcutScope;
  passive?: boolean;
  /** Despachado, mas não listado (a outra metade de um par já listado, como `-` de `+ / -`). */
  hidden?: boolean;
}

export const SHORTCUTS = [
  { id: "help", keys: ["?"], display: "?", labelKey: "help.help", scope: "global" },
  { id: "settings", keys: [","], display: ",", labelKey: "help.settings", scope: "global" },
  {
    id: "close",
    keys: ["Escape"],
    display: "Esc",
    labelKey: "help.close",
    scope: "global",
    passive: true,
  },
  { id: "go-home", keys: ["1"], display: "1", labelKey: "help.home", scope: "game" },
  { id: "go-squad", keys: ["2"], display: "2", labelKey: "help.squad", scope: "game" },
  { id: "go-lineup", keys: ["3"], display: "3", labelKey: "help.lineup", scope: "game" },
  { id: "go-competition", keys: ["4"], display: "4", labelKey: "help.competition", scope: "game" },
  { id: "go-calendar", keys: ["5"], display: "5", labelKey: "help.calendar", scope: "game" },
  { id: "go-finance", keys: ["6"], display: "6", labelKey: "help.finance", scope: "game" },
  { id: "go-history", keys: ["h"], display: "H", labelKey: "help.history", scope: "game" },
  { id: "go-market", keys: ["m"], display: "M", labelKey: "help.market", scope: "game" },
  { id: "go-career", keys: ["c"], display: "C", labelKey: "help.career", scope: "game" },
  { id: "go-news", keys: ["j"], display: "J", labelKey: "help.news", scope: "game" },
  { id: "play", keys: ["s"], display: "S", labelKey: "help.playLive", scope: "game" },
  { id: "play-direct", keys: ["d"], display: "D", labelKey: "help.direct", scope: "game" },
  {
    id: "division-prev",
    keys: ["["],
    display: "[ / ]",
    labelKey: "help.divisions",
    scope: "competition",
  },
  {
    id: "division-next",
    keys: ["]"],
    display: "]",
    labelKey: "help.divisions",
    scope: "competition",
    hidden: true,
  },
  {
    id: "next-season",
    keys: ["n"],
    display: "N",
    labelKey: "help.nextSeason",
    scope: "season-end",
  },
  { id: "pause", keys: [" "], display: "help.key.space", labelKey: "help.pause", scope: "round" },
  { id: "faster", keys: ["+", "="], display: "+ / -", labelKey: "help.speed", scope: "round" },
  {
    id: "slower",
    keys: ["-"],
    display: "-",
    labelKey: "help.speed",
    scope: "round",
    hidden: true,
  },
  { id: "finish", keys: ["f"], display: "F", labelKey: "help.finish", scope: "round" },
  { id: "auto-lineup", keys: ["a"], display: "A", labelKey: "help.auto", scope: "lineup" },
  { id: "details", keys: ["i"], display: "I", labelKey: "help.details", scope: "lineup" },
  {
    id: "select",
    keys: ["Enter"],
    display: "Enter",
    labelKey: "help.select",
    scope: "lineup",
    passive: true,
  },
  {
    id: "cancel",
    keys: ["Escape"],
    display: "Esc",
    labelKey: "help.cancel",
    scope: "lineup",
  },
] as const satisfies readonly Shortcut[];

export type ShortcutId = (typeof SHORTCUTS)[number]["id"];

const GAME_SCREENS: readonly ScreenId[] = [
  "game-home",
  "squad",
  "lineup",
  "competition",
  "calendar",
  "finance",
  "history",
  "market",
  "career",
  "news",
  "round",
  "season-end",
];

/** A tela está dentro do jogo (vale o escopo `game`). */
export function isGameScreen(screen: ScreenId): boolean {
  return GAME_SCREENS.includes(screen);
}

const ROUTES: readonly [string, ScreenId][] = [
  ["/carreiras", "saves"],
  ["/nova-carreira", "new-career"],
  ["/mods", "mods"],
  ["/configuracoes", "settings"],
  ["/sobre", "about"],
  ["/notas-de-versao", "release-notes"],
  ["/jogo/elenco", "squad"],
  ["/jogo/escalacao", "lineup"],
  ["/jogo/competicao", "competition"],
  ["/jogo/calendario", "calendar"],
  ["/jogo/financas", "finance"],
  ["/jogo/historico", "history"],
  ["/jogo/mercado", "market"],
  ["/jogo/carreira", "career"],
  ["/jogo/noticias", "news"],
  ["/jogo/rodada", "round"],
  ["/jogo/fim-de-temporada", "season-end"],
  ["/jogo", "game-home"],
];

/** Tela de uma rota (`/jogo/competicao/resultados` → `competition`). */
export function screenOf(pathname: string): ScreenId {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const [prefix, screen] of ROUTES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return screen;
  }
  return "opening";
}

/** Escopos ativos numa tela, do mais geral ao mais específico. */
export function scopesOf(screen: ScreenId): ShortcutScope[] {
  return isGameScreen(screen) ? ["global", "game", screen] : ["global", screen];
}

/** Tecla normalizada do evento (uma letra → minúscula). */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function shortcutById(id: ShortcutId): Shortcut {
  return SHORTCUTS.find((entry) => entry.id === id) as Shortcut;
}
