"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { attendanceSeries } from "../../game/finance-series";
import type { useGame } from "../../game/GameProvider";
import { formatMoney, formatNumber, useT } from "../../i18n";
import { ChartFigure } from "../charts/ChartFigure";
import { ComboChart } from "../charts/ComboChart";
import { HomeGames } from "../FinanceTables";
import { TicketPrice } from "../TicketPrice";
import styles from "./finance.module.css";
import { gateInfoOf } from "./gate-info";

type Game = ReturnType<typeof useGame>;

/** `AAAA-MM-DD` → `DD/MM`, o rótulo curto do eixo. */
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Bilheteria (028): ingresso editável com a estimativa, o comparativo de público presente × renda
 * por jogo e a tabela dos jogos em casa, com competição e fase de cada um.
 */
export function GateTab({ save, game, locked }: { save: SaveFile; game: Game; locked: boolean }) {
  const t = useT();
  const gates = attendanceSeries(save);
  const info = gateInfoOf(save);
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const club = save.finances.clubs[save.clubId];
  const average = gates.length
    ? Math.round(gates.reduce((sum, gate) => sum + gate.attendance, 0) / gates.length)
    : 0;
  const capacity = club?.capacity ?? 0;
  const gameName = (gate: (typeof gates)[number]) => {
    const { competition, phase } = info(gate);
    return t("finance.chart.attendance.game", {
      competition,
      phase: phase || "—",
      opponent: clubs.get(gate.opponentId)?.shortName ?? gate.opponentId,
    });
  };
  return (
    <div className={styles.tab}>
      <TicketPrice save={save} disabled={locked} onApply={game.setTicketPrice} />
      {gates.length > 0 ? (
        <ChartFigure
          title={t("finance.chart.attendance.title")}
          summary={t("finance.chart.attendance.summary", {
            games: gates.length,
            average: formatNumber(average),
            occupancy: Math.round((100 * average) / Math.max(1, capacity)),
            capacity: formatNumber(capacity),
            revenue: formatMoney(gates.reduce((sum, gate) => sum + gate.revenue, 0)),
          })}
          legend={[
            { label: t("finance.chart.attendance.attendanceKey"), series: 0 },
            { label: t("finance.chart.attendance.revenueKey"), series: 1 },
          ]}
          details={gates.map((gate) => ({
            label: gameName(gate),
            value: t("finance.chart.attendance.values", {
              attendance: formatNumber(gate.attendance),
              revenue: formatMoney(gate.revenue),
            }),
          }))}
        >
          <ComboChart
            games={gates.map((gate) => ({
              key: `${gate.date ?? gate.round}-${gate.competitionId ?? ""}`,
              label: gate.date ? shortDate(gate.date) : String(gate.round),
              bars: gate.attendance,
              line: gate.revenue,
              tip: `${gate.date ? `${shortDate(gate.date)} · ` : ""}${gameName(gate)}\n${t(
                "finance.chart.attendance.values",
                { attendance: formatNumber(gate.attendance), revenue: formatMoney(gate.revenue) },
              )}`,
            }))}
          />
        </ChartFigure>
      ) : null}
      <HomeGames save={save} />
    </div>
  );
}
