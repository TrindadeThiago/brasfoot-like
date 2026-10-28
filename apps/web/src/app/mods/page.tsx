"use client";

import type { ValidationIssue } from "@brasfoot-like/engine";
import { readModPackage } from "@brasfoot-like/modkit";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "../../game/GameProvider";
import { useT } from "../../i18n";
import { readFileBytes } from "../../storage/files";
import { type StoredMod, storedModOf } from "../../storage/mods";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { CsvPanel } from "../../ui/mods/CsvPanel";
import styles from "../../ui/mods/mods.module.css";
import { ValidationReport } from "../../ui/mods/ValidationReport";

export default function ModsPage() {
  const t = useT();
  const { mods } = useGame();
  const [list, setList] = useState<StoredMod[]>([]);
  const [report, setReport] = useState<{
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  }>();
  const [message, setMessage] = useState<string>();
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
      const result = readModPackage(bytes);
      setBusy(false);
      setReport({ errors: result.ok ? [] : result.errors, warnings: result.warnings });
      if (!result.ok) {
        setMessage(t("mods.rejected"));
        return;
      }
      const mod = storedModOf(result, new Date().toISOString());
      if (await mods.get(mod.id)) {
        setReplacing(mod);
        return;
      }
      await store(mod);
    },
    [mods, store, t],
  );

  return (
    <main className={styles.page}>
      <Link href="/">{t("common.back")}</Link>
      <h1>{t("mods.title")}</h1>
      <p>{t("mods.intro")}</p>
      <div className={styles.actions}>
        <a href="/docs/mod-format.md" target="_blank" rel="noreferrer">
          {t("mods.docs")}
        </a>
        <a href="/mods/exemplo.zip" download="exemplo.zip">
          {t("mods.example")}
        </a>
      </div>
      <section aria-label={t("mods.world")} className={styles.card}>
        <h2>{t("mods.world")}</h2>
        <p>{t("mods.world.description")}</p>
        <a href="/mods/mundo-padrao.zip" download="mundo-padrao.zip">
          {t("mods.world.download")}
        </a>
      </section>
      <label className={styles.field}>
        <span>{t("mods.load")}</span>
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) await load(await readFileBytes(file));
          }}
        />
      </label>
      {busy ? <p role="status">{t("mods.loading")}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {report && (report.errors.length > 0 || report.warnings.length > 0) ? (
        <ValidationReport errors={report.errors} warnings={report.warnings} />
      ) : null}
      <section aria-label={t("mods.list")} className={styles.card}>
        <h2>{t("mods.list")}</h2>
        {list.length === 0 ? <p className={styles.muted}>{t("mods.empty")}</p> : null}
        <ul className={styles.list}>
          {list.map((mod) => (
            <li key={mod.id} className={styles.item}>
              <div>
                <strong>{mod.summary.name}</strong>
                <p className={styles.muted}>
                  {t("mods.summary", {
                    author: mod.summary.author,
                    version: mod.summary.version,
                    clubs: mod.summary.clubs,
                    players: mod.summary.players,
                  })}
                </p>
                {mod.summary.countries.length > 1 ? (
                  <p className={styles.muted}>
                    {t("mods.countries", {
                      count: mod.summary.countries.length,
                      countries: mod.summary.countries.join(", "),
                    })}
                  </p>
                ) : null}
                <p className={styles.muted}>
                  {t("mods.divisions", {
                    divisions: mod.summary.divisions.map((division) => division.name).join(", "),
                  })}{" "}
                  · {t("mods.images", { count: mod.summary.images })}
                </p>
              </div>
              <Button variant="danger" onClick={() => setRemoving(mod)}>
                {t("mods.remove")}
              </Button>
            </li>
          ))}
        </ul>
      </section>
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
    </main>
  );
}
