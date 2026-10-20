"use client";

import { joinBankFiles, type ModPackage, type ValidationIssue } from "@brasfoot-like/engine";
import { applyCsv, clubsToCsv, playersToCsv, writeModPackage } from "@brasfoot-like/modkit";
import { strToU8 } from "fflate";
import { useState } from "react";
import { defaultBankInput } from "../../game/default-bank";
import { useT } from "../../i18n";
import { downloadBytes } from "../../storage/files";
import type { StoredMod } from "../../storage/mods";
import { Button } from "../Button";
import styles from "./mods.module.css";
import { ValidationReport } from "./ValidationReport";

const CSV_TYPE = "text/csv;charset=utf-8";

/**
 * Planilhas (CSV) de clubes e jogadores (015 US4): exporta do banco escolhido, importa CSVs
 * editados por cima dele e gera um pacote validado para baixar ou carregar como mod.
 */
export function CsvPanel({
  mods,
  onLoad,
}: {
  mods: readonly StoredMod[];
  onLoad: (bytes: Uint8Array) => Promise<void>;
}) {
  const t = useT();
  // "" = banco padrão; senão o id do mod.
  const [bankId, setBankId] = useState("");
  const [clubs, setClubs] = useState<string>();
  const [players, setPlayers] = useState<string>();
  const [report, setReport] = useState<{
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  }>();
  const [generated, setGenerated] = useState<Uint8Array>();
  const mod = mods.find((entry) => entry.id === bankId);
  const bank = () => (mod ? joinBankFiles(mod.files) : defaultBankInput()) as ModPackage;
  const name = mod?.id ?? "padrao";

  function apply() {
    const result = applyCsv(bank(), {
      ...(clubs !== undefined ? { clubs } : {}),
      ...(players !== undefined ? { players } : {}),
    });
    setReport({ errors: result.ok ? [] : result.errors, warnings: result.warnings });
    setGenerated(result.ok ? writeModPackage(result.bank as ModPackage, mod?.images) : undefined);
  }

  return (
    <section aria-label={t("mods.csv.title")} className={styles.card}>
      <h2>{t("mods.csv.title")}</h2>
      <label className={styles.field}>
        <span>{t("mods.csv.bank")}</span>
        <select
          value={bankId}
          onChange={(event) => {
            setBankId(event.target.value);
            setGenerated(undefined);
            setReport(undefined);
          }}
        >
          <option value="">{t("newCareer.defaultBank")}</option>
          {mods.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.summary.name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.actions}>
        <Button
          onClick={() => downloadBytes(strToU8(clubsToCsv(bank())), `${name}-clubs.csv`, CSV_TYPE)}
        >
          {t("mods.csv.exportClubs")}
        </Button>
        <Button
          onClick={() =>
            downloadBytes(strToU8(playersToCsv(bank())), `${name}-players.csv`, CSV_TYPE)
          }
        >
          {t("mods.csv.exportPlayers")}
        </Button>
      </div>
      <label className={styles.field}>
        <span>{t("mods.csv.importClubs")}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (event) => setClubs(await event.target.files?.[0]?.text())}
        />
      </label>
      <label className={styles.field}>
        <span>{t("mods.csv.importPlayers")}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (event) => setPlayers(await event.target.files?.[0]?.text())}
        />
      </label>
      <div className={styles.actions}>
        <Button
          variant="primary"
          disabled={clubs === undefined && players === undefined}
          onClick={apply}
        >
          {t("mods.csv.apply")}
        </Button>
      </div>
      {report && (report.errors.length > 0 || report.warnings.length > 0) ? (
        <ValidationReport errors={report.errors} warnings={report.warnings} />
      ) : null}
      {generated ? (
        <>
          <p role="status">{t("mods.csv.ok")}</p>
          <div className={styles.actions}>
            <Button onClick={() => downloadBytes(generated, `${name}-csv.zip`, "application/zip")}>
              {t("mods.csv.download")}
            </Button>
            <Button variant="primary" onClick={() => void onLoad(generated)}>
              {t("mods.csv.loadGenerated")}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
