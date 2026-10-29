import { isEmployed, type SaveFile } from "@brasfoot-like/save";
import type { IconName } from "./icons";

/** Telas do clube; `club` = só para o técnico empregado (012: somem quando desempregado). */
export const GAME_SCREENS = [
  { path: "/jogo", key: "nav.home", club: false, icon: "home" },
  { path: "/jogo/elenco", key: "nav.squad", club: true, icon: "squad" },
  { path: "/jogo/escalacao", key: "nav.lineup", club: true, icon: "lineup" },
  { path: "/jogo/competicao", key: "nav.competition", club: false, icon: "trophy" },
  { path: "/jogo/calendario", key: "nav.calendar", club: false, icon: "calendar" },
  { path: "/jogo/financas", key: "nav.finance", club: true, icon: "coins" },
  { path: "/jogo/historico", key: "nav.history", club: false, icon: "history" },
  { path: "/jogo/mercado", key: "nav.market", club: true, icon: "market" },
  { path: "/jogo/carreira", key: "nav.career", club: false, icon: "career" },
  { path: "/jogo/noticias", key: "nav.news", club: false, icon: "news" },
] as const satisfies readonly {
  path: string;
  key: string;
  club: boolean;
  icon: IconName;
}[];

/** Telas disponíveis para a carreira (sem as do clube quando desempregado). */
export function availableScreens(save: SaveFile) {
  const employed = isEmployed(save);
  return GAME_SCREENS.filter((screen) => employed || !screen.club);
}

export function screenHref(path: string, careerId: string): string {
  return `${path}/?c=${careerId}`;
}

/** A tela da navegação está ativa (Competição inclui as abas de resultados e artilharia). */
export function isActiveScreen(pathname: string, path: string): boolean {
  return path === "/jogo"
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

/** Telas de foco (025): sem barra lateral, para a rodada ao vivo e o fim de temporada. */
export const FOCUS_PATHS = ["/jogo/rodada", "/jogo/fim-de-temporada"] as const;

export function isFocusPath(pathname: string): boolean {
  return FOCUS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Contador de atenção de uma tela (propostas de emprego pendentes, negociações do mercado). */
export function attentionCount(save: SaveFile, path: string): number {
  if (path === "/jogo/mercado") return save.market.incoming.length;
  if (path === "/jogo/carreira")
    return save.board.offers.filter((offer) => offer.status === "pending").length;
  return 0;
}
