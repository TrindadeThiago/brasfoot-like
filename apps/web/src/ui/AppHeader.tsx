"use client";

import { isLeagueSeasonOver, leagueRound, leagueTotalRounds } from "@brasfoot-like/engine";
import {
  divisionNameOf,
  isEmployed,
  type SaveFile,
  seasonYearOf,
  userDivisionLevel,
} from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../i18n";
import styles from "./AppHeader.module.css";
import { Button } from "./Button";
import { Crest } from "./Crest";
import { confirmLeave } from "./leave-guard";
import { SaveIndicator } from "./SaveIndicator";

/** Telas do jogo; `club` = só para o técnico empregado (012: somem quando desempregado). */
export const GAME_SCREENS = [
  { path: "/jogo", key: "nav.home", club: false },
  { path: "/jogo/elenco", key: "nav.squad", club: true },
  { path: "/jogo/escalacao", key: "nav.lineup", club: true },
  { path: "/jogo/competicao", key: "nav.competition", club: false },
  { path: "/jogo/calendario", key: "nav.calendar", club: false },
  { path: "/jogo/financas", key: "nav.finance", club: true },
  { path: "/jogo/historico", key: "nav.history", club: false },
  { path: "/jogo/mercado", key: "nav.market", club: true },
  { path: "/jogo/carreira", key: "nav.career", club: false },
] as const;

/** Telas disponíveis para a carreira (sem as do clube quando desempregado). */
export function availableScreens(save: SaveFile) {
  const employed = isEmployed(save);
  return GAME_SCREENS.filter((screen) => employed || !screen.club);
}

/** A tela da navegação está ativa (Competição inclui as abas de resultados e artilharia). */
function isActive(pathname: string, path: string): boolean {
  return path === "/jogo"
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

export function screenHref(path: string, careerId: string): string {
  return `${path}/?c=${careerId}`;
}

/** Cabeçalho sempre visível do jogo: clube, técnico, temporada, navegação e salvamento (FR-015). */
export function AppHeader({ save, onHelp }: { save: SaveFile; onHelp: () => void }) {
  const t = useT();
  const pathname = (usePathname() ?? "/jogo").replace(/\/+$/, "") || "/jogo";
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const year = seasonYearOf(save);
  const total = leagueTotalRounds(save.league);
  const division = divisionNameOf(save, userDivisionLevel(save));
  return (
    <header className={styles.header}>
      <div className={styles.club}>
        {club ? <Crest crest={club.crest} label={club.name} size={44} /> : null}
        <div>
          <h1 className={styles.name}>
            {isEmployed(save) ? club?.name : t("header.unemployed", { club: club?.name ?? "" })}
          </h1>
          <p className={styles.meta}>
            <span>{t("header.manager", { name: save.managerName })}</span>
            <span>
              {isLeagueSeasonOver(save.league)
                ? t("header.seasonOver", { year, division })
                : t("header.progress", {
                    year,
                    round: leagueRound(save.league),
                    total,
                    division,
                  })}
            </span>
          </p>
        </div>
      </div>
      <nav aria-label={t("nav.menu")} className={styles.nav}>
        {availableScreens(save).map((screen) => (
          <Link
            key={screen.path}
            href={screenHref(screen.path, save.id)}
            aria-current={isActive(pathname, screen.path) ? "page" : undefined}
            className={isActive(pathname, screen.path) ? styles.active : undefined}
            onClick={(event) => {
              if (!confirmLeave()) event.preventDefault();
            }}
          >
            {t(screen.key)}
            {screen.path === "/jogo/mercado" && save.market.incoming.length > 0
              ? ` (${save.market.incoming.length})`
              : ""}
            {screen.path === "/jogo/carreira" &&
            save.board.offers.some((offer) => offer.status === "pending")
              ? ` (${save.board.offers.filter((offer) => offer.status === "pending").length})`
              : ""}
          </Link>
        ))}
      </nav>
      <div className={styles.tools}>
        <SaveIndicator />
        <Button onClick={onHelp}>{t("nav.help")}</Button>
      </div>
    </header>
  );
}
