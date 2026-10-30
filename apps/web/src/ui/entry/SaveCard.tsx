"use client";

import Link from "next/link";
import { useId } from "react";
import type { SaveRow } from "../../game/saves-view";
import { formatDateTime, useT } from "../../i18n";
import { AssetsProvider } from "../AssetsProvider";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Crest } from "../Crest";
import styles from "./SaveCard.module.css";

/**
 * Uma carreira salva (031 R8): escudo, técnico · clube, divisão, temporada, rodada e data, com
 * Continuar, Exportar e Apagar. Carreira danificada ou de versão futura leva marcação em texto e só
 * pode ser apagada. Os botões se chamam como sempre; a carreira a que pertencem vem por
 * `aria-describedby`.
 */
export function SaveCard({
  row,
  onExport,
  onDelete,
}: {
  row: SaveRow;
  onExport: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const infoId = useId();
  const { summary } = row;
  return (
    <li className={styles.card}>
      <AssetsProvider
        assets={
          summary.clubCrestImage && summary.clubCrest.image
            ? { [summary.clubCrest.image]: summary.clubCrestImage }
            : undefined
        }
      >
        <Crest crest={summary.clubCrest} label={summary.clubName || summary.id} size={44} />
      </AssetsProvider>
      <div className={styles.info} id={infoId}>
        {row.status === "corrupt" ? (
          <Badge tone="danger">{t("saves.corrupt")}</Badge>
        ) : (
          <>
            <strong className={styles.title}>
              {summary.managerName} · {summary.clubName}
            </strong>
            <span>{t(row.progress.key, row.progress.params)}</span>
            <small className={styles.muted}>
              {t("saves.savedAt", { date: formatDateTime(summary.savedAt) })}
            </small>
            {row.status === "future_version" ? (
              <Badge tone="warning">{t("saves.future")}</Badge>
            ) : null}
          </>
        )}
      </div>
      <div className={styles.actions}>
        {row.canOpen ? (
          <Link
            className={styles.continue}
            href={`/jogo/?c=${summary.id}`}
            aria-describedby={infoId}
          >
            {t("saves.continue")}
          </Link>
        ) : null}
        {row.canOpen ? (
          <Button
            onClick={onExport}
            aria-label={t("saves.exportLabel", { manager: summary.managerName })}
          >
            {t("saves.export")}
          </Button>
        ) : null}
        <Button variant="danger" onClick={onDelete} aria-describedby={infoId}>
          {t("saves.delete")}
        </Button>
      </div>
    </li>
  );
}
