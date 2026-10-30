"use client";

import { asCopy, exportSave, importSave, type SaveFile, saveFileName } from "@brasfoot-like/save";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../../game/GameProvider";
import { newCareerId } from "../../game/ids";
import { savesView } from "../../game/saves-view";
import { useT } from "../../i18n";
import { downloadBytes, readFileBytes } from "../../storage/files";
import type { SummaryEntry } from "../../storage/indexeddb";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { EntryShell } from "../../ui/entry/EntryShell";
import { SaveCard } from "../../ui/entry/SaveCard";
import { Field } from "../../ui/Field";
import { Notice } from "../../ui/Notice";
import styles from "./page.module.css";

export default function SavesPage() {
  const t = useT();
  const { store, deleteCareer } = useGame();
  const [summaries, setSummaries] = useState<SummaryEntry[] | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<SummaryEntry | undefined>();
  /** Save lido de um arquivo cuja identificação já existe (pergunta substituir ou copiar). */
  const [conflict, setConflict] = useState<SaveFile | undefined>();
  const [message, setMessage] = useState<{
    key: string;
    values?: Record<string, string>;
    error: boolean;
  }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const refresh = useCallback(() => {
    store
      .listSummaries()
      .then(setSummaries)
      .catch(() => setUnavailable(true));
  }, [store]);

  useEffect(refresh, [refresh]);

  const view = savesView(summaries ?? []);

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
        error: true,
      });
      return;
    }
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId)?.name ?? save.clubId;
    setMessage({
      key: "saves.importDone",
      values: { manager: save.managerName, club },
      error: false,
    });
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
      setMessage({ key: keys[result.status], error: true });
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
    // O cartão apagado leva o foco embora: ele passa para a contagem da lista.
    requestAnimationFrame(() => countRef.current?.focus());
  }

  return (
    <EntryShell title={t("saves.title")}>
      {unavailable ? (
        <Notice role="alert" tone="warning" title={t("opening.storageUnavailable.title")}>
          <p className={styles.text}>{t("opening.storageUnavailable")}</p>
        </Notice>
      ) : null}
      <div className={styles.import}>
        <Field
          label={t("saves.import")}
          hint={t("saves.importHint")}
          error={message?.error ? t(message.key, message.values) : undefined}
        >
          {(props) => (
            <input
              {...props}
              ref={fileRef}
              type="file"
              accept=".blsave,.json,.gz,application/gzip,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                setMessage(undefined);
                if (file) void importFile(file);
              }}
            />
          )}
        </Field>
        {message && !message.error ? (
          <Notice role="status" title={t("saves.import.doneTitle")}>
            <p className={styles.text}>{t(message.key, message.values)}</p>
          </Notice>
        ) : null}
      </div>
      {summaries && summaries.length === 0 ? (
        <EmptyState title={t("saves.empty")}>
          <p className={styles.text}>{t("saves.empty.hint")}</p>
          <div className={styles.emptyActions}>
            <Link className={styles.link} href="/nova-carreira/">
              {t("opening.newCareer")}
            </Link>
            <Button onClick={() => fileRef.current?.click()}>{t("saves.import")}</Button>
          </div>
        </EmptyState>
      ) : null}
      {summaries && summaries.length > 0 ? (
        <>
          <p ref={countRef} tabIndex={-1} className={styles.count}>
            {t("saves.count", { count: view.count })}
          </p>
          <ul className={styles.list}>
            {view.rows.map((row) => (
              <SaveCard
                key={row.id}
                row={row}
                onExport={() => void exportCareer(row.summary)}
                onDelete={() => setPending(row.summary)}
              />
            ))}
          </ul>
        </>
      ) : null}
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
    </EntryShell>
  );
}
