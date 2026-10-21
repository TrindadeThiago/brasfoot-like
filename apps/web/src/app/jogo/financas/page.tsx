"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { formatMoney, formatNumber, useT } from "../../../i18n";
import { CreditPanel } from "../../../ui/CreditPanel";
import { FinanceSummary } from "../../../ui/FinanceSummary";
import { FinanceHistory, HomeGames } from "../../../ui/FinanceTables";
import { StadiumPanel } from "../../../ui/StadiumPanel";
import { TicketPrice } from "../../../ui/TicketPrice";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

function Finances({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const finance = save.finances.clubs[save.clubId];
  if (!finance) return null;
  const locked = game.state.live !== undefined;
  return (
    <div className={styles.layout}>
      <h2 className="screen-title">{t("finance.title")}</h2>
      <div className={styles.top}>
        <span>
          {t("finance.balance")}:{" "}
          <span className={`${styles.balance} ${finance.cash < 0 ? styles.negative : ""}`}>
            {formatMoney(finance.cash)}
          </span>
        </span>
        <span>
          {t("finance.debt")}: {formatMoney(finance.debt)}
        </span>
        <span>
          {t("finance.capacity")}:{" "}
          {t("finance.capacityValue", { seats: formatNumber(finance.capacity) })}
        </span>
      </div>
      {finance.inCrisis ? (
        <p role="alert" className={styles.crisis}>
          {t("finance.crisis", { rounds: finance.negativeRounds })}
        </p>
      ) : null}
      {locked ? <p>{t("finance.liveLocked")}</p> : null}
      <div className={styles.grid}>
        <FinanceSummary save={save} />
        <TicketPrice save={save} disabled={locked} onApply={game.setTicketPrice} />
        <CreditPanel
          save={save}
          disabled={locked}
          onTake={game.takeLoan}
          onRepay={game.repayLoan}
        />
        <StadiumPanel save={save} disabled={locked} onStart={game.startStadiumWorks} />
      </div>
      <HomeGames save={save} />
      <FinanceHistory save={save} />
    </div>
  );
}

export default function FinancesPage() {
  return <GameLayout>{(save, game) => <Finances save={save} game={game} />}</GameLayout>;
}
