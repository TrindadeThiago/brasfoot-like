"use client";

import type { FinanceSeasonSummary, GateRecord } from "@brasfoot-like/engine";
import { LEDGER_CATEGORIES } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { attendanceSeries } from "../game/finance-series";
import { formatDate, formatMoney, formatNumber, useT } from "../i18n";
import { type Column, DataTable } from "./DataTable";
import styles from "./FinancePanel.module.css";
import { gateInfoOf } from "./finance/gate-info";

/** Jogos em casa da temporada atual: público, ocupação, preço e renda (FR-010, FR-024). */
export function HomeGames({ save }: { save: SaveFile }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const games = attendanceSeries(save);
  const info = gateInfoOf(save);
  const money = (value: number) => formatMoney(value);
  const columns: Column<GateRecord>[] = [
    {
      key: "date",
      header: t("finance.games.date"),
      render: (gate) => (gate.date ? formatDate(gate.date) : "—"),
    },
    {
      key: "competition",
      header: t("finance.games.competition"),
      render: (gate) => info(gate).competition,
    },
    {
      key: "phase",
      header: t("finance.games.phase"),
      render: (gate) => info(gate).phase || "—",
    },
    {
      key: "opponent",
      header: t("finance.games.opponent"),
      render: (gate) => clubs.get(gate.opponentId)?.shortName ?? gate.opponentId,
    },
    {
      key: "attendance",
      header: t("finance.games.attendance"),
      render: (gate) => formatNumber(gate.attendance),
      align: "right",
    },
    {
      key: "occupancy",
      header: t("finance.games.occupancy"),
      render: (gate) =>
        t("finance.games.occupancyValue", {
          value: Math.round((100 * gate.attendance) / Math.max(1, gate.capacity)),
        }),
      align: "right",
    },
    {
      key: "price",
      header: t("finance.games.price"),
      render: (gate) => money(gate.price),
      align: "right",
    },
    {
      key: "revenue",
      header: t("finance.games.revenue"),
      render: (gate) => money(gate.revenue),
      align: "right",
    },
  ];
  return (
    <section aria-label={t("finance.games.title")} className={styles.card}>
      {games.length === 0 ? (
        <>
          <h2>{t("finance.games.title")}</h2>
          <p className={styles.muted}>{t("finance.games.empty")}</p>
        </>
      ) : (
        <DataTable
          rows={games}
          columns={columns}
          rowKey={(gate) =>
            `${gate.season}-${gate.round}-${gate.date ?? ""}-${gate.competitionId ?? ""}`
          }
          caption={t("finance.games.title")}
        />
      )}
    </section>
  );
}

/** Histórico financeiro por temporada encerrada (FR-024, FR-025). */
export function FinanceHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const seasons = save.finances.seasons
    .filter((summary) => summary.clubId === save.clubId)
    .sort((a, b) => b.season - a.season);
  const sum = (summary: FinanceSeasonSummary, sign: 1 | -1) =>
    LEDGER_CATEGORIES.reduce((total, category) => {
      const value = summary.totals[category];
      return sign * value > 0 ? total + value : total;
    }, 0);
  const columns: Column<FinanceSeasonSummary>[] = [
    { key: "season", header: t("finance.history.season"), render: (summary) => summary.year },
    {
      key: "start",
      header: t("finance.history.start"),
      render: (summary) => formatMoney(summary.startCash),
      align: "right",
    },
    {
      key: "revenues",
      header: t("finance.history.revenues"),
      render: (summary) => formatMoney(sum(summary, 1)),
      align: "right",
    },
    {
      key: "expenses",
      header: t("finance.history.expenses"),
      render: (summary) => formatMoney(sum(summary, -1)),
      align: "right",
    },
    {
      key: "end",
      header: t("finance.history.end"),
      render: (summary) => formatMoney(summary.endCash),
      align: "right",
    },
  ];
  const yearOf = (season: number) =>
    save.finances.seasons.find((summary) => summary.season === season)?.year ??
    save.league.year - (save.league.number - season);
  const crises = save.finances.crises.filter((crisis) => crisis.clubId === save.clubId);
  return (
    <section aria-label={t("finance.history.title")} className={styles.card}>
      {seasons.length === 0 ? <h2>{t("finance.history.title")}</h2> : null}
      {crises.length > 0 ? (
        <div>
          <h3>{t("finance.history.crises")}</h3>
          <ul>
            {crises.map((crisis) => (
              <li key={`${crisis.startSeason}-${crisis.startRound}`}>
                {t("finance.history.crisis", {
                  startYear: yearOf(crisis.startSeason),
                  startRound: crisis.startRound,
                  end: crisis.endSeason === undefined ? "open" : "closed",
                  endYear: crisis.endSeason === undefined ? 0 : yearOf(crisis.endSeason),
                  endRound: crisis.endRound ?? 0,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {seasons.length === 0 ? (
        <p className={styles.muted}>{t("finance.history.empty")}</p>
      ) : (
        <DataTable
          rows={seasons}
          columns={columns}
          rowKey={(summary) => String(summary.season)}
          caption={t("finance.history.title")}
        />
      )}
    </section>
  );
}
