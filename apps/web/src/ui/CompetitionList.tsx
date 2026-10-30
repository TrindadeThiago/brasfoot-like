"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { clubCompetitions } from "../game/competitions";
import { useT } from "../i18n";
import { CompetitionCard } from "./CompetitionCard";
import styles from "./CompetitionList.module.css";
import { EmptyState } from "./EmptyState";
import { Tabs } from "./Tabs";

/**
 * Competições em duas abas (027): Minhas competições (as que o clube disputa ou vai disputar, a
 * aba padrão) e Demais competições (as outras, com o seletor de país e a contagem). Cada
 * competição é um cartão-link; `competitionId` é a escolhida na URL.
 */
export function CompetitionList({
  save,
  competitionId,
}: {
  save: SaveFile;
  competitionId: string;
}) {
  const t = useT();
  const pathname = (usePathname() ?? "/jogo/competicao").replace(/\/+$/, "");
  const entries = useMemo(() => clubCompetitions(save), [save]);
  const mine = entries.filter((entry) => entry.mine);
  const others = entries.filter((entry) => !entry.mine);
  const currentEntry = entries.find((entry) => entry.competition.id === competitionId);
  const countries = [
    ...new Set(others.flatMap((entry) => entry.competition.countryId ?? [])),
  ].sort();
  const [country, setCountry] = useState<string | undefined>(
    currentEntry?.competition.countryId ?? countries[0],
  );
  const international = others.filter((entry) => entry.competition.countryId === undefined);
  const shown =
    countries.length > 1
      ? [...others.filter((entry) => entry.competition.countryId === country), ...international]
      : others;
  const card = (entry: (typeof entries)[number]) => (
    <li key={entry.competition.id}>
      <CompetitionCard
        save={save}
        competition={entry.competition}
        status={entry.status}
        path={pathname}
        current={entry.competition.id === competitionId}
      />
    </li>
  );
  // Um mundo de uma só competição não precisa de lista (nem de abas vazias).
  if (entries.length < 2) return null;
  return (
    <Tabs
      label={t("competition.listLabel")}
      initial={currentEntry && !currentEntry.mine ? "others" : "mine"}
      tabs={[
        {
          id: "mine",
          label: t("competition.mine"),
          content:
            mine.length === 0 ? (
              <EmptyState title={t("competition.empty.mine")} />
            ) : (
              <nav aria-label={t("competition.select")}>
                <ul className={styles.grid}>{mine.map(card)}</ul>
              </nav>
            ),
        },
        {
          id: "others",
          label: t("competition.others"),
          content: (
            <>
              <div className={styles.toolbar}>
                {countries.length > 1 ? (
                  <label className={styles.country}>
                    <span>{t("competition.country")}</span>
                    <select
                      value={country ?? ""}
                      onChange={(event) => setCountry(event.target.value)}
                    >
                      {countries.map((id) => (
                        <option key={id} value={id}>
                          {save.bank.countries.find((entry) => entry.id === id)?.name ?? id}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <span className={styles.count}>
                  {t("competition.count", { count: shown.length })}
                </span>
              </div>
              {shown.length === 0 ? (
                <EmptyState title={t("competition.empty.others")} />
              ) : (
                <nav aria-label={t("competition.select")}>
                  <ul className={styles.grid}>{shown.map(card)}</ul>
                </nav>
              )}
            </>
          ),
        },
      ]}
    />
  );
}
