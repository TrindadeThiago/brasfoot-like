"use client";

import { filterRows, foreignCount, marketRows } from "@brasfoot-like/engine";
import { marketContextOf, type SaveFile } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { EmptyState } from "../../../ui/EmptyState";
import { ComparePanel } from "../../../ui/market/ComparePanel";
import { COMPARE_LIMIT, CompareTray } from "../../../ui/market/CompareTray";
import { ContractsTab } from "../../../ui/market/ContractsTab";
import { IncomingOffers } from "../../../ui/market/IncomingOffers";
import {
  EMPTY_FILTERS,
  type FilterForm,
  MarketFilters,
  toFilters,
} from "../../../ui/market/MarketFilters";
import { MarketPlayerModal } from "../../../ui/market/MarketPlayerModal";
import { MarketTable } from "../../../ui/market/MarketTable";
import styles from "../../../ui/market/market.module.css";
import { NegotiationDialog, type NegotiationTarget } from "../../../ui/market/NegotiationDialog";
import { NegotiationsTab } from "../../../ui/market/NegotiationsTab";
import { WindowReport } from "../../../ui/market/WindowReport";
import { WindowStatus } from "../../../ui/market/WindowStatus";
import { SquadCounter } from "../../../ui/SquadCounter";
import { Tabs } from "../../../ui/Tabs";

type Game = ReturnType<typeof useGame>;
type Tab = "search" | "negotiations" | "incoming" | "contracts" | "report";
const TABS: readonly Tab[] = ["search", "negotiations", "incoming", "contracts", "report"];

function Market({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  // `?aba=report` abre o resumo da janela (link do aviso da Início).
  const requested = useSearchParams().get("aba");
  const [form, setForm] = useState<FilterForm>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [target, setTarget] = useState<NegotiationTarget | undefined>();
  const context = useMemo(() => marketContextOf(save), [save]);
  // Países do banco com competição (020): o filtro e o limite de estrangeiros só aparecem num mundo
  // de vários países ou com limite declarado.
  const countries = useMemo(() => {
    const ids = new Set(save.bank.competitions.map((entry) => entry.countryId));
    return save.bank.countries.filter((country) => ids.has(country.id));
  }, [save.bank]);
  const foreignLimit = save.bank.countries.find(
    (country) => country.id === save.bank.clubs.find((club) => club.id === save.clubId)?.countryId,
  )?.rules?.foreignLimit;
  // A lista inteira é montada uma vez por mudança do save; filtrar e ordenar parte dela (024: com
  // 39 000 jogadores, refazê-la a cada tecla era o que deixava a tela lenta).
  const everyone = useMemo(() => marketRows(context), [context]);
  const found = useMemo(
    () => filterRows(everyone, toFilters(form, save.clubId), { key: "strength", dir: "desc" }),
    [everyone, form, save.clubId],
  );
  const locked = game.state.live !== undefined;
  const [opened, setOpened] = useState<string | undefined>();
  const toggle = (playerId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < COMPARE_LIMIT) next.add(playerId);
      return next;
    });
  const compared = everyone.filter((row) => selected.has(row.playerId));
  const openRow = opened ? everyone.find((row) => row.playerId === opened) : undefined;
  // Pendências no nome da aba, em texto: negociações que pedem uma resposta do jogador e propostas.
  const answering = save.market.negotiations.filter(
    (entry) => entry.stage === "club_countered" || entry.stage === "player_demanded",
  ).length;
  const expiring = save.bank.players.filter(
    (player) =>
      player.clubId === save.clubId &&
      !player.contract?.loan &&
      (player.contract?.untilYear ?? Number.MAX_SAFE_INTEGER) <= save.league.year,
  ).length;
  const counted = (name: Tab, count: number) =>
    count > 0 ? `${t(`market.tab.${name}`)} (${count})` : t(`market.tab.${name}`);
  const search = (
    <>
      <MarketFilters countries={countries} form={form} onChange={setForm} />
      <p role="status">{t("market.results", { count: found.length })}</p>
      <CompareTray rows={compared} onRemove={toggle} onCompare={() => setComparing(true)} />
      {comparing && compared.length >= 2 ? (
        <ComparePanel save={save} rows={compared} onClose={() => setComparing(false)} />
      ) : null}
      {found.length === 0 ? (
        <EmptyState title={t("market.empty")}>
          <Button onClick={() => setForm(EMPTY_FILTERS)}>{t("market.filter.clear")}</Button>
        </EmptyState>
      ) : (
        <MarketTable
          save={save}
          rows={found}
          selected={selected}
          onToggle={toggle}
          onOpen={(row) => setOpened(row.playerId)}
        />
      )}
    </>
  );
  return (
    <div className={styles.layout}>
      <h2 className="screen-title">{t("market.title")}</h2>
      <WindowStatus save={save} />
      <SquadCounter save={save} />
      {foreignLimit !== undefined ? (
        <p role="status">
          {t("market.foreignLimit", {
            count: foreignCount(save.bank, save.clubId),
            limit: foreignLimit,
          })}
        </p>
      ) : null}
      {locked ? <p role="status">{t("market.liveLocked")}</p> : null}
      <Tabs
        label={t("market.tablist")}
        initial={requested !== null && TABS.includes(requested as Tab) ? requested : "search"}
        tabs={[
          { id: "search", label: t("market.tab.search"), content: search },
          {
            id: "negotiations",
            label: counted("negotiations", answering),
            content: <NegotiationsTab save={save} game={game} rows={everyone} />,
          },
          {
            id: "incoming",
            label: counted("incoming", save.market.incoming.length),
            content: (
              <IncomingOffers save={save} game={game} onOpen={(playerId) => setOpened(playerId)} />
            ),
          },
          {
            id: "contracts",
            label: counted("contracts", expiring),
            content: (
              <ContractsTab
                save={save}
                rows={everyone}
                disabled={locked}
                onRenew={(row) => setTarget({ kind: "renew", row })}
                onOpen={(row) => setOpened(row.playerId)}
              />
            ),
          },
          { id: "report", label: t("market.tab.report"), content: <WindowReport save={save} /> },
        ]}
      />
      <MarketPlayerModal
        save={save}
        row={openRow}
        locked={locked}
        compared={openRow ? selected.has(openRow.playerId) : false}
        compareFull={selected.size >= COMPARE_LIMIT}
        onAction={(row, action) => setTarget({ kind: action, row })}
        onToggleCompare={toggle}
        onClose={() => setOpened(undefined)}
      />
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
