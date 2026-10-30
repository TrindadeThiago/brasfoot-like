"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { useT } from "../../../i18n";
import { CreditTab } from "../../../ui/finance/CreditTab";
import { FinanceHeader } from "../../../ui/finance/FinanceHeader";
import { FlowTab } from "../../../ui/finance/FlowTab";
import { GateTab } from "../../../ui/finance/GateTab";
import { HistoryTab } from "../../../ui/finance/HistoryTab";
import { OverviewTab } from "../../../ui/finance/OverviewTab";
import { StadiumTab } from "../../../ui/finance/StadiumTab";
import { Tabs } from "../../../ui/Tabs";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

function Finances({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  if (!save.finances.clubs[save.clubId]) return null;
  const locked = game.state.live !== undefined;
  return (
    <div className={styles.layout}>
      <h2 className="screen-title">{t("finance.title")}</h2>
      <FinanceHeader save={save} locked={locked} />
      <Tabs
        label={t("finance.tablist")}
        tabs={[
          {
            id: "overview",
            label: t("finance.tab.overview"),
            content: <OverviewTab save={save} />,
          },
          { id: "flow", label: t("finance.tab.flow"), content: <FlowTab save={save} /> },
          {
            id: "gate",
            label: t("finance.tab.gate"),
            content: <GateTab save={save} game={game} locked={locked} />,
          },
          {
            id: "stadium",
            label: t("finance.tab.stadium"),
            content: <StadiumTab save={save} game={game} locked={locked} />,
          },
          {
            id: "credit",
            label: t("finance.tab.credit"),
            content: <CreditTab save={save} game={game} locked={locked} />,
          },
          { id: "history", label: t("finance.tab.history"), content: <HistoryTab save={save} /> },
        ]}
      />
    </div>
  );
}

export default function FinancesPage() {
  return <GameLayout>{(save, game) => <Finances save={save} game={game} />}</GameLayout>;
}
