"use client";

import { joinBankFiles, validateBank } from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { defaultBankInput } from "../../game/default-bank";
import { useGame } from "../../game/GameProvider";
import { competitionClubs, type LeagueClub } from "../../game/selectors";
import { formatNumber, useT } from "../../i18n";
import type { StoredMod } from "../../storage/mods";
import { AssetsProvider } from "../../ui/AssetsProvider";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { type Column, DataTable } from "../../ui/DataTable";
import styles from "./page.module.css";

/** Clubes da competição do banco escolhido (padrão ou mod, 015). */
function useCompetitionClubs(input: unknown): LeagueClub[] {
  return useMemo(() => {
    const result = validateBank(input);
    return result.ok ? competitionClubs(result.bank) : [];
  }, [input]);
}

/** Divisões da competição (nível e nome do mod), na ordem de nível. */
function divisionsOf(clubs: readonly LeagueClub[]): { level: number; name: string }[] {
  const levels = new Map(clubs.map((club) => [club.divisionLevel, club.divisionName]));
  return [...levels].sort(([a], [b]) => a - b).map(([level, name]) => ({ level, name }));
}

export default function NewCareerPage() {
  const t = useT();
  const router = useRouter();
  const { createCareer, mods } = useGame();
  const [installed, setInstalled] = useState<StoredMod[]>([]);
  // "" = banco padrão; senão o id do mod (015).
  const [bankId, setBankId] = useState("");
  useEffect(() => {
    void mods.list().then(setInstalled);
  }, [mods]);
  const mod = installed.find((entry) => entry.id === bankId);
  const bankInput = useMemo(() => (mod ? joinBankFiles(mod.files) : defaultBankInput()), [mod]);
  const allClubs = useCompetitionClubs(bankInput);
  const divisions = useMemo(() => divisionsOf(allClubs), [allClubs]);
  // 0 = todas as divisões; padrão: a principal (US4).
  const [division, setDivision] = useState(divisions[0]?.level ?? 0);
  useEffect(() => {
    setDivision(divisions[0]?.level ?? 0);
    setClubId(undefined);
  }, [divisions]);
  const clubs = useMemo(
    () => allClubs.filter((club) => division === 0 || club.divisionLevel === division),
    [allClubs, division],
  );
  const [managerName, setManagerName] = useState("");
  const [seed, setSeed] = useState("");
  const [noFiring, setNoFiring] = useState(false);
  const [clubId, setClubId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const columns: Column<LeagueClub>[] = [
    {
      key: "club",
      header: t("col.club"),
      render: (club) => (
        <span className={styles.club}>
          <Crest crest={club.crest} label={club.name} size={28} />
          {club.name}
        </span>
      ),
      sortValue: (club) => club.name,
    },
    {
      key: "city",
      header: t("col.city"),
      render: (club) => club.city,
      sortValue: (club) => club.city,
    },
    {
      key: "reputation",
      header: t("col.reputation"),
      render: (club) => club.reputation,
      sortValue: (club) => club.reputation,
      align: "right",
    },
    {
      key: "strength",
      header: t("col.strength"),
      render: (club) => club.strength.toFixed(1).replace(".", ","),
      sortValue: (club) => club.strength,
      align: "right",
    },
    {
      key: "stadium",
      header: t("col.stadium"),
      render: (club) => formatNumber(club.stadiumCapacity),
      sortValue: (club) => club.stadiumCapacity,
      align: "right",
    },
    {
      key: "division",
      header: t("newCareer.clubDivision"),
      render: (club) => club.divisionName,
      sortValue: (club) => club.divisionLevel,
    },
  ];

  const selected = allClubs.find((club) => club.id === clubId);
  const divisionName = divisions.find((entry) => entry.level === division)?.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = managerName.trim();
    if (trimmed.length === 0 || trimmed.length > MANAGER_NAME_MAX) {
      setError(t("save.invalid_name", { max: MANAGER_NAME_MAX, length: trimmed.length }));
      return;
    }
    if (!clubId) {
      setError(t("newCareer.noClub"));
      return;
    }
    setCreating(true);
    const result = await createCareer({
      managerName: trimmed,
      clubId,
      seed,
      noFiring,
      ...(mod ? { bank: bankInput, assets: mod.images } : {}),
    });
    setCreating(false);
    if (!result.ok) {
      setError(t(result.error.code, result.error.params));
      return;
    }
    router.push(`/jogo/?c=${result.id}`);
  }

  return (
    <AssetsProvider assets={mod?.images}>
      <main className={styles.page}>
        <Link href="/">{t("common.back")}</Link>
        <h1>{t("newCareer.title")}</h1>
        <form onSubmit={submit} className={styles.form} noValidate>
          <label className={styles.field}>
            <span>{t("newCareer.managerName")}</span>
            <input
              value={managerName}
              maxLength={MANAGER_NAME_MAX}
              placeholder={t("newCareer.managerPlaceholder")}
              onChange={(event) => setManagerName(event.target.value)}
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={noFiring}
              onChange={(event) => setNoFiring(event.target.checked)}
            />
            <span>{t("newCareer.noFiring")}</span>
          </label>
          <small className={styles.help}>{t("newCareer.noFiringHelp")}</small>
          <details className={styles.advanced}>
            <summary>{t("newCareer.advanced")}</summary>
            <label className={styles.field}>
              <span>{t("newCareer.seed")}</span>
              <input value={seed} onChange={(event) => setSeed(event.target.value)} />
              <small>{t("newCareer.seedHelp")}</small>
            </label>
          </details>
          <label className={styles.field}>
            <span>{t("newCareer.bank")}</span>
            <select value={bankId} onChange={(event) => setBankId(event.target.value)}>
              <option value="">{t("newCareer.defaultBank")}</option>
              {installed.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.summary.name}
                </option>
              ))}
            </select>
          </label>
          <Link href="/mods/">{t("nav.mods")}</Link>
          <h2>{t("newCareer.chooseClub")}</h2>
          <label className={styles.field}>
            <span>{t("newCareer.division.filter")}</span>
            <select value={division} onChange={(event) => setDivision(Number(event.target.value))}>
              {divisions.map((entry) => (
                <option key={entry.level} value={entry.level}>
                  {entry.name}
                </option>
              ))}
              <option value={0}>{t("newCareer.division.all")}</option>
            </select>
          </label>
          <DataTable
            key={division}
            rows={clubs}
            columns={columns}
            rowKey={(club) => club.id}
            caption={
              divisionName
                ? t("newCareer.clubsCaption", { division: divisionName })
                : t("newCareer.clubsCaptionAll")
            }
            initialSort={{ column: "reputation", direction: "descending" }}
            onRowClick={(club) => setClubId(club.id)}
            selected={(club) => club.id === clubId}
          />
          <div className={styles.footer}>
            <span>
              {selected ? t("newCareer.selected", { club: selected.name }) : t("newCareer.noClub")}
            </span>
            {error ? (
              <span role="alert" className={styles.error}>
                {error}
              </span>
            ) : null}
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? t("newCareer.creating") : t("newCareer.confirm")}
            </Button>
          </div>
        </form>
      </main>
    </AssetsProvider>
  );
}
