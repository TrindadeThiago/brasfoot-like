"use client";

import type { ValidationIssue } from "@brasfoot-like/engine";
import { readModPackage } from "@brasfoot-like/modkit";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "../../game/GameProvider";
import { useT } from "../../i18n";
import { readFileBytes } from "../../storage/files";
import { type StoredMod, storedModOf } from "../../storage/mods";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Dialog } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { EntryShell } from "../../ui/entry/EntryShell";
import { ModCard } from "../../ui/entry/ModCard";
import { Field } from "../../ui/Field";
import { CsvPanel } from "../../ui/mods/CsvPanel";
import styles from "../../ui/mods/mods.module.css";
import { ValidationReport } from "../../ui/mods/ValidationReport";
import { Notice } from "../../ui/Notice";

export default function ModsPage() {
  const t = useT();
  const { mods } = useGame();
  const [list, setList] = useState<StoredMod[]>([]);
  const [report, setReport] = useState<{
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  }>();
  const [message, setMessage] = useState<string>();
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<StoredMod>();
  const [removing, setRemoving] = useState<StoredMod>();

  const refresh = useCallback(() => {
    void mods.list().then(setList);
  }, [mods]);
  useEffect(refresh, [refresh]);

  const store = useCallback(
    async (mod: StoredMod) => {
      await mods.put(mod);
      setRejected(false);
      setMessage(t("mods.loaded", { name: mod.summary.name }));
      refresh();
    },
    [mods, refresh, t],
  );

  /** Valida um pacote e guarda (ou pergunta se substitui um mod com o mesmo id). */
  const load = useCallback(
    async (bytes: Uint8Array) => {
      setBusy(true);
      setMessage(undefined);
      setRejected(false);
      const result = readModPackage(bytes);
      setBusy(false);
      setReport({ errors: result.ok ? [] : result.errors, warnings: result.warnings });
      if (!result.ok) {
        setRejected(true);
        return;
      }
      const mod = storedModOf(result, new Date().toISOString());
      if (await mods.get(mod.id)) {
        setReplacing(mod);
        return;
      }
      await store(mod);
    },
    [mods, store],
  );

  return (
    <EntryShell title={t("mods.title")}>
      <Card aria-labelledby="mods-intro" className={styles.card}>
        <h2 id="mods-intro">{t("mods.sectionIntro")}</h2>
        <p>{t("mods.intro")}</p>
        <div className={styles.links}>
          <a href="/docs/mod-format.md" target="_blank" rel="noreferrer">
            {t("mods.docs")}
          </a>
          <a href="/mods/exemplo.zip" download="exemplo.zip">
            {t("mods.example")}
          </a>
        </div>
      </Card>
      <Card aria-labelledby="mods-world" className={styles.card}>
        <h2 id="mods-world">{t("mods.world")}</h2>
        <p>{t("mods.world.description")}</p>
        <div className={styles.links}>
          <a href="/mods/mundo-padrao.zip" download="mundo-padrao.zip">
            {t("mods.world.download")}
          </a>
        </div>
      </Card>
      <Card aria-labelledby="mods-load" className={styles.card}>
        <h2 id="mods-load">{t("mods.sectionLoad")}</h2>
        <Field label={t("mods.load")} error={rejected ? t("mods.rejected") : undefined}>
          {(props) => (
            <input
              {...props}
              type="file"
              accept=".zip,application/zip"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) await load(await readFileBytes(file));
              }}
            />
          )}
        </Field>
        {busy ? <p role="status">{t("mods.loading")}</p> : null}
        {message ? (
          <Notice role="status" title={t("mods.loadedTitle")}>
            {message}
          </Notice>
        ) : null}
        {report && (report.errors.length > 0 || report.warnings.length > 0) ? (
          <ValidationReport errors={report.errors} warnings={report.warnings} />
        ) : null}
      </Card>
      <Card aria-labelledby="mods-list" className={styles.card}>
        <h2 id="mods-list">{t("mods.list")}</h2>
        {list.length === 0 ? <EmptyState title={t("mods.empty")} /> : null}
        {list.length > 0 ? (
          <ul className={styles.list}>
            {list.map((mod) => (
              <ModCard key={mod.id} mod={mod} onRemove={() => setRemoving(mod)} />
            ))}
          </ul>
        ) : null}
      </Card>
      <CsvPanel mods={list} onLoad={load} />
      <Dialog
        open={replacing !== undefined}
        title={t("mods.replaceTitle")}
        onClose={() => setReplacing(undefined)}
        actions={
          <>
            <Button onClick={() => setReplacing(undefined)}>{t("mods.cancel")}</Button>
            <Button
              variant="primary"
              onClick={async () => {
                const mod = replacing;
                setReplacing(undefined);
                if (mod) await store(mod);
              }}
            >
              {t("mods.replace")}
            </Button>
          </>
        }
      >
        {replacing
          ? t("mods.replaceBody", { id: replacing.id, version: replacing.summary.version })
          : null}
      </Dialog>
      <Dialog
        open={removing !== undefined}
        title={t("mods.removeConfirmTitle")}
        onClose={() => setRemoving(undefined)}
        actions={
          <>
            <Button onClick={() => setRemoving(undefined)}>{t("mods.cancel")}</Button>
            <Button
              variant="danger"
              onClick={async () => {
                const mod = removing;
                setRemoving(undefined);
                if (mod) await mods.remove(mod.id);
                refresh();
              }}
            >
              {t("mods.remove")}
            </Button>
          </>
        }
      >
        {removing ? t("mods.removeConfirmBody", { name: removing.summary.name }) : null}
      </Dialog>
    </EntryShell>
  );
}
