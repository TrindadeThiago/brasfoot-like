"use client";

import type { SaveFile } from "@brasfoot-like/save";
import type { NewsFilter, NewsGroup } from "../../game/news-view";
import { useT } from "../../i18n";
import { Button } from "../Button";
import { Card } from "../Card";
import styles from "./news.module.css";

/**
 * Painel das Notícias (029): resumo da rodada, Todas e Do meu clube, e a lista de competições com a
 * contagem de cada uma, para filtrar com um clique.
 */
export function NewsFilters({
  save,
  groups,
  total,
  mine,
  filter,
  onChange,
}: {
  save: SaveFile;
  /** Grupos da rodada inteira (sem filtro): dão as contagens do painel. */
  groups: readonly NewsGroup[];
  total: number;
  mine: number;
  filter: NewsFilter;
  onChange: (filter: NewsFilter) => void;
}) {
  const t = useT();
  const all = filter.scope === "all" && filter.competition === undefined;
  const places = groups.filter((group) => group.kind !== "mine");
  const nameOf = (group: NewsGroup) =>
    group.kind === "general"
      ? t("news.group.general")
      : (save.bank.competitions.find((entry) => entry.id === group.id)?.name ?? group.id);
  return (
    <Card className={styles.panel}>
      <h2 className={styles.sectionTitle}>{t("news.panel.title")}</h2>
      <p role="status">{t("news.panel.summary", { count: total, mine })}</p>
      <div className={styles.filters}>
        <Button
          aria-pressed={all}
          variant={all ? "primary" : "secondary"}
          onClick={() => onChange({ scope: "all" })}
        >
          {t("news.filter.all")}
        </Button>
        <Button
          aria-pressed={filter.scope === "mine"}
          variant={filter.scope === "mine" ? "primary" : "secondary"}
          onClick={() => onChange({ ...filter, scope: "mine" })}
        >
          {t("news.filter.mine")}
        </Button>
      </div>
      <h3 className={styles.sectionTitle}>{t("news.filter.competitions")}</h3>
      <ul className={styles.competitions}>
        {places.map((group) => (
          <li key={group.id}>
            <Button
              aria-pressed={filter.competition === group.id}
              variant={filter.competition === group.id ? "primary" : "secondary"}
              onClick={() =>
                onChange({
                  ...filter,
                  competition: filter.competition === group.id ? undefined : group.id,
                })
              }
            >
              {t("news.filter.competition", { name: nameOf(group), count: group.headlines.length })}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
