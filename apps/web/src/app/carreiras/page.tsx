"use client";

import { asCopy, exportSave, importSave, type SaveFile, saveFileName } from "@brasfoot-like/save";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "../../game/GameProvider";
import { newCareerId } from "../../game/ids";
import { formatDateTime, useT } from "../../i18n";
import { downloadBytes, readFileBytes } from "../../storage/files";
import type { SummaryEntry } from "../../storage/indexeddb";
import { AssetsProvider } from "../../ui/AssetsProvider";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { Dialog } from "../../ui/Dialog";
import styles from "./page.module.css";

export default function SavesPage() {
  const t = useT();
  const { store, deleteCareer } = useGame();
  const [summaries, setSummaries] = useState<SummaryEntry[] | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<SummaryEntry | undefined>();
  /** Save lido de um arquivo cuja identificação já existe (pergunta substituir ou copiar). */
  const [conflict, setConflict] = useState<SaveFile | undefined>();
  const [message, setMessage] = useState<{ key: string; values?: Record<string, string> }>();

  const refresh = useCallback(() => {
    store
      .listSummaries()
      .then(setSummaries)
      .catch(() => setUnavailable(true));
  }, [store]);

  useEffect(refresh, [refresh]);

  async function exportCareer(summary: SummaryEntry) {
    const result = await store.load(summary.id);
    if (result.status !== "ok") return;
    downloadBytes(
      exportSave(result.save, new Date().toISOString()),
      saveFileName(result.save),
      "application/gzip",
    );
  }

  async function storeImported(save: SaveFile) {
    const now = new Date().toISOString();
    const written = await store.save({ ...save, savedAt: now });
    if (!written.ok) {
      setMessage({
        key: written.reason === "quota" ? "saves.import.quota" : "saves.import.failed",
      });
      return;
    }
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId)?.name ?? save.clubId;
    setMessage({ key: "saves.importDone", values: { manager: save.managerName, club } });
    refresh();
  }

  async function importFile(file: File) {
    const result = importSave(await readFileBytes(file));
    if (result.status !== "ok") {
      const keys = {
        not_a_save: "saves.import.notASave",
        corrupt: "saves.import.corrupt",
        future_version: "saves.import.future",
      } as const;
      setMessage({ key: keys[result.status] });
      return;
    }
    if (await store.exists(result.save.id)) {
      setConflict(result.save);
      return;
    }
    await storeImported(result.save);
  }

  async function resolveConflict(choice: "replace" | "copy") {
    const save = conflict;
    setConflict(undefined);
    if (!save) return;
    await storeImported(
      choice === "copy" ? asCopy(save, newCareerId(), new Date().toISOString()) : save,
    );
  }

  async function confirmDelete() {
    if (!pending) return;
    await deleteCareer(pending.id);
    setPending(undefined);
    refresh();
  }

  return (
    <main className={styles.page}>
      <Link href="/">{t("common.back")}</Link>
      <h1>{t("saves.title")}</h1>
      {unavailable ? <p role="alert">{t("opening.storageUnavailable")}</p> : null}
      <label className={styles.import}>
        <span>{t("saves.import")}</span>
        <input
          type="file"
          accept=".blsave,.json,.gz,application/gzip,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
      </label>
      {message ? <p role="status">{t(message.key, message.values)}</p> : null}
      {summaries && summaries.length === 0 ? <p>{t("saves.empty")}</p> : null}
      <ul className={styles.list}>
        {(summaries ?? []).map((summary) => (
          <li key={summary.id} className={styles.item}>
            <AssetsProvider
              assets={
                summary.clubCrestImage && summary.clubCrest.image
                  ? { [summary.clubCrest.image]: summary.clubCrestImage }
                  : undefined
              }
            >
              <Crest crest={summary.clubCrest} label={summary.clubName || summary.id} size={44} />
            </AssetsProvider>
            <div className={styles.info}>
              {summary.status === "corrupt" ? (
                <strong>{t("saves.corrupt")}</strong>
              ) : (
                <>
                  <strong>
                    {summary.managerName} · {summary.clubName}
                  </strong>
                  <span>
                    {summary.seasonOver
                      ? t("saves.seasonOver", {
                          year: summary.seasonYear,
                          division: summary.divisionName,
                        })
                      : t("saves.progress", {
                          year: summary.seasonYear,
                          round: summary.round,
                          division: summary.divisionName,
                        })}
                  </span>
                  <small>{t("saves.savedAt", { date: formatDateTime(summary.savedAt) })}</small>
                  {summary.status === "future_version" ? <em>{t("saves.future")}</em> : null}
                </>
              )}
            </div>
            <div className={styles.actions}>
              {summary.status === "ok" ? (
                <Link className={styles.continue} href={`/jogo/?c=${summary.id}`}>
                  {t("saves.continue")}
                </Link>
              ) : null}
              {summary.status === "ok" ? (
                <Button
                  onClick={() => void exportCareer(summary)}
                  aria-label={t("saves.exportLabel", { manager: summary.managerName })}
                >
                  {t("saves.export")}
                </Button>
              ) : null}
              <Button variant="danger" onClick={() => setPending(summary)}>
                {t("saves.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={pending !== undefined}
        title={t("saves.confirmDeleteTitle")}
        onClose={() => setPending(undefined)}
        actions={
          <>
            <Button onClick={() => setPending(undefined)}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              {t("saves.delete")}
            </Button>
          </>
        }
      >
        {pending
          ? t("saves.confirmDeleteBody", { manager: pending.managerName, club: pending.clubName })
          : null}
      </Dialog>
      <Dialog
        open={conflict !== undefined}
        title={t("saves.conflict.title")}
        onClose={() => setConflict(undefined)}
        actions={
          <>
            <Button onClick={() => setConflict(undefined)}>{t("saves.conflict.cancel")}</Button>
            <Button onClick={() => void resolveConflict("copy")}>{t("saves.conflict.copy")}</Button>
            <Button variant="primary" onClick={() => void resolveConflict("replace")}>
              {t("saves.conflict.replace")}
            </Button>
          </>
        }
      >
        {conflict ? t("saves.conflict.body", { manager: conflict.managerName }) : null}
      </Dialog>
    </main>
  );
}
