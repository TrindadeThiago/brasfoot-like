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

/** Divisões dos clubes (nível e nome do mod), na ordem de nível. */
function divisionsOf(clubs: readonly LeagueClub[]): { level: number; name: string }[] {
  const levels = new Map(clubs.map((club) => [club.divisionLevel, club.divisionName]));
  return [...levels].sort(([a], [b]) => a - b).map(([level, name]) => ({ level, name }));
}

/** Países dos clubes, na ordem em que aparecem no banco (020). */
function countriesOf(clubs: readonly LeagueClub[]): { id: string; name: string }[] {
  const countries = new Map(clubs.map((club) => [club.countryId, club.countryName]));
  return [...countries].map(([id, name]) => ({ id, name }));
}

/** Texto sem acento e em minúsculas, para a busca por nome. */
function plain(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
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
  const countries = useMemo(() => countriesOf(allClubs), [allClubs]);
  const manyCountries = countries.length > 1;
  // "" = todos os países; padrão: o primeiro do banco (020).
  const [country, setCountry] = useState(countries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const ofCountry = useMemo(
    () => allClubs.filter((club) => country === "" || club.countryId === country),
    [allClubs, country],
  );
  const divisions = useMemo(() => divisionsOf(ofCountry), [ofCountry]);
  // 0 = todas as divisões; padrão: a principal (US4).
  const [division, setDivision] = useState(divisions[0]?.level ?? 0);
  useEffect(() => {
    setCountry(countries[0]?.id ?? "");
  }, [countries]);
  useEffect(() => {
    setDivision(divisions[0]?.level ?? 0);
  }, [divisions]);
  const clubs = useMemo(() => {
    const needle = plain(query.trim());
    return ofCountry.filter(
      (club) =>
        (division === 0 || club.divisionLevel === division) &&
        (needle === "" || plain(club.name).includes(needle) || plain(club.city).includes(needle)),
    );
  }, [ofCountry, division, query]);
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
    ...(manyCountries
      ? [
          {
            key: "country",
            header: t("col.country"),
            render: (club: LeagueClub) => club.countryName,
            sortValue: (club: LeagueClub) => club.countryName,
          },
        ]
      : []),
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
          {manyCountries ? (
            <label className={styles.field}>
              <span>{t("newCareer.country.filter")}</span>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setClubId(undefined);
                }}
              >
                {countries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
                <option value="">{t("newCareer.country.all")}</option>
              </select>
            </label>
          ) : null}
          <label className={styles.field}>
            <span>{t("newCareer.division.filter")}</span>
            <select value={division} onChange={(event) => setDivision(Number(event.target.value))}>
              {divisions.map((entry) => (
                <option key={entry.level} value={entry.level}>
                  {country === "" && manyCountries
                    ? t("newCareer.division.level", { level: entry.level })
                    : entry.name}
                </option>
              ))}
              <option value={0}>{t("newCareer.division.all")}</option>
            </select>
          </label>
          {manyCountries ? (
            <label className={styles.field}>
              <span>{t("newCareer.search")}</span>
              <input
                type="search"
                value={query}
                placeholder={t("newCareer.searchPlaceholder")}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          {manyCountries ? (
            <p role="status" aria-live="polite">
              {t("newCareer.results", { count: clubs.length })}
            </p>
          ) : null}
          <DataTable
            key={`${country}:${division}`}
            rows={clubs}
            columns={columns}
            rowKey={(club) => club.id}
            caption={
              divisionName && !(country === "" && manyCountries)
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
