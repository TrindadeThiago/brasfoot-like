"use client";

import { type MarketRow, searchPlayers } from "@brasfoot-like/engine";
import { marketContextOf, type SaveFile } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { ComparePanel } from "../../../ui/market/ComparePanel";
import { ContractsTab } from "../../../ui/market/ContractsTab";
import { IncomingOffers } from "../../../ui/market/IncomingOffers";
import {
  EMPTY_FILTERS,
  type FilterForm,
  MarketFilters,
  toFilters,
} from "../../../ui/market/MarketFilters";
import { MarketTable, type RowAction } from "../../../ui/market/MarketTable";
import styles from "../../../ui/market/market.module.css";
import { NegotiationDialog, type NegotiationTarget } from "../../../ui/market/NegotiationDialog";
import { NegotiationsTab } from "../../../ui/market/NegotiationsTab";
import { WindowReport } from "../../../ui/market/WindowReport";
import { WindowStatus } from "../../../ui/market/WindowStatus";

type Game = ReturnType<typeof useGame>;
/** Linhas da tabela por vez: a lista inteira tem ~1.000 jogadores. */
const PAGE_SIZE = 100;
type Tab = "search" | "negotiations" | "incoming" | "contracts" | "report";
const TABS: readonly Tab[] = ["search", "negotiations", "incoming", "contracts", "report"];

function Market({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  // `?aba=report` abre o resumo da janela (link do aviso da Início).
  const requested = useSearchParams().get("aba");
  const [tab, setTab] = useState<Tab>(TABS.find((name) => name === requested) ?? "search");
  const [form, setForm] = useState<FilterForm>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [target, setTarget] = useState<NegotiationTarget | undefined>();
  const context = useMemo(() => marketContextOf(save), [save]);
  const everyone = useMemo(() => searchPlayers(context), [context]);
  const found = useMemo(
    () => searchPlayers(context, toFilters(form, save.clubId), { key: "strength", dir: "desc" }),
    [context, form, save.clubId],
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rows = found.slice(0, limit);
  const locked = game.state.live !== undefined;
  const toggle = (playerId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 4) next.add(playerId);
      return next;
    });
  const compared = everyone.filter((row) => selected.has(row.playerId));
  const open = (row: MarketRow, action: RowAction) => setTarget({ kind: action, row });
  return (
    <div className={styles.layout}>
      <h1>{t("market.title")}</h1>
      <WindowStatus save={save} />
      {locked ? <p role="status">{t("market.liveLocked")}</p> : null}
      <div className={styles.tabs} role="tablist" aria-label={t("market.tablist")}>
        {TABS.map((name) => (
          <Button
            key={name}
            role="tab"
            aria-selected={tab === name}
            variant={tab === name ? "primary" : "secondary"}
            onClick={() => setTab(name)}
          >
            {name === "incoming" && save.market.incoming.length > 0
              ? `${t(`market.tab.${name}`)} (${save.market.incoming.length})`
              : t(`market.tab.${name}`)}
          </Button>
        ))}
      </div>
      {tab === "search" ? (
        <>
          <MarketFilters
            form={form}
            onChange={(next) => {
              setForm(next);
              setLimit(PAGE_SIZE);
            }}
          />
          <p role="status">{t("market.results", { count: found.length })}</p>
          <div className={styles.actions}>
            <Button disabled={compared.length < 2} onClick={() => setComparing(true)}>
              {t("market.compare.open", { count: compared.length })}
            </Button>
            {compared.length < 2 ? (
              <span className={styles.muted}>{t("market.compare.hint")}</span>
            ) : null}
          </div>
          {comparing && compared.length >= 2 ? (
            <ComparePanel save={save} rows={compared} onClose={() => setComparing(false)} />
          ) : null}
          <MarketTable
            save={save}
            rows={rows}
            selected={selected}
            disabled={locked}
            onToggle={toggle}
            onAction={open}
          />
          {found.length > rows.length ? (
            <div className={styles.actions}>
              <span className={styles.muted}>
                {t("market.showing", { shown: rows.length, total: found.length })}
              </span>
              <Button onClick={() => setLimit(limit + PAGE_SIZE)}>{t("market.showMore")}</Button>
            </div>
          ) : null}
        </>
      ) : null}
      {tab === "negotiations" ? <NegotiationsTab save={save} game={game} rows={everyone} /> : null}
      {tab === "incoming" ? <IncomingOffers save={save} game={game} /> : null}
      {tab === "contracts" ? (
        <ContractsTab
          save={save}
          rows={everyone}
          disabled={locked}
          onRenew={(row) => setTarget({ kind: "renew", row })}
        />
      ) : null}
      {tab === "report" ? <WindowReport save={save} /> : null}
      <NegotiationDialog
        save={save}
        game={game}
        target={target}
        onClose={() => setTarget(undefined)}
      />
    </div>
  );
}

export default function MarketPage() {
  return <GameLayout>{(save, game) => <Market save={save} game={game} />}</GameLayout>;
}
