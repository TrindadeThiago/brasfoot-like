"use client";

import { joinBankFiles, validateBank } from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_WORLD_SEED, defaultBankInput } from "../../game/default-bank";
import { useGame } from "../../game/GameProvider";
import { type FormError, filterClubs, validateNewCareerForm } from "../../game/new-career-form";
import { competitionClubs, type LeagueClub } from "../../game/selectors";
import { useT } from "../../i18n";
import type { StoredMod } from "../../storage/mods";
import { AssetsProvider } from "../../ui/AssetsProvider";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Crest } from "../../ui/Crest";
import { ClubPicker } from "../../ui/entry/ClubPicker";
import { EntryShell } from "../../ui/entry/EntryShell";
import { Field } from "../../ui/Field";
import { Notice } from "../../ui/Notice";
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

/**
 * Grupo de cada país (024 US1): o nome da competição continental principal que o reúne com os outros
 * países da confederação. Sem competições entre países, ninguém tem grupo e a lista fica plana.
 */
function groupsOf(bank: {
  competitions?: readonly {
    id: string;
    name: string;
    countryId?: string;
    divisions: readonly { clubIds: readonly string[] }[];
  }[];
  clubs?: readonly { id: string; countryId: string }[];
}): Map<string, string> {
  const countryOfClub = new Map((bank.clubs ?? []).map((club) => [club.id, club.countryId]));
  const groups = new Map<string, string>();
  for (const competition of bank.competitions ?? []) {
    if (competition.countryId !== undefined || !competition.id.endsWith("-maior")) continue;
    for (const clubId of competition.divisions[0]?.clubIds ?? []) {
      const country = countryOfClub.get(clubId);
      if (country !== undefined && !groups.has(country)) groups.set(country, competition.name);
    }
  }
  return groups;
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
  const [seed, setSeed] = useState("");
  // O mundo padrão é gerado aqui, no navegador (024): a seed digitada o muda, sem travar a digitação.
  const worldSeed = useDeferredValue(seed.trim() || DEFAULT_WORLD_SEED);
  const bankInput = useMemo(
    () => (mod ? joinBankFiles(mod.files) : defaultBankInput(worldSeed)),
    [mod, worldSeed],
  );
  const allClubs = useCompetitionClubs(bankInput);
  // Na ordem dos países do banco (no mundo padrão, o Brasil primeiro), não na dos clubes por id.
  const countries = useMemo(() => {
    const order = new Map(
      ((bankInput as { countries?: { id: string }[] }).countries ?? []).map((c, i) => [c.id, i]),
    );
    return countriesOf(allClubs).sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [allClubs, bankInput]);
  const manyCountries = countries.length > 1;
  const groups = useMemo(() => groupsOf(bankInput as Parameters<typeof groupsOf>[0]), [bankInput]);
  const groupNames = useMemo(
    () => [
      ...new Set(
        countries.map((c) => groups.get(c.id)).filter((g): g is string => g !== undefined),
      ),
    ],
    [countries, groups],
  );
  // "" = todos os países; padrão: o primeiro do banco (020).
  const [country, setCountry] = useState(countries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const ofCountry = useMemo(
    () => filterClubs(allClubs, { country, division: 0, query: "" }),
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
  const clubs = useMemo(
    () => filterClubs(allClubs, { country, division, query }),
    [allClubs, country, division, query],
  );
  const [managerName, setManagerName] = useState("");
  const [noFiring, setNoFiring] = useState(false);
  const [clubId, setClubId] = useState<string | undefined>();
  const [errors, setErrors] = useState<FormError[]>([]);
  const [createError, setCreateError] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  // Cada tentativa de começar com erro move o foco ao primeiro campo com erro (FR-007).
  const [attempt, setAttempt] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const clubRef = useRef<HTMLElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: só uma nova tentativa move o foco
  useEffect(() => {
    if (attempt === 0) return;
    const first = errors[0]?.field;
    if (first === "managerName") nameRef.current?.focus();
    else if (first === "club") clubRef.current?.focus();
  }, [attempt]);

  const selected = allClubs.find((club) => club.id === clubId);
  const divisionName = divisions.find((entry) => entry.level === division)?.name;
  const errorOf = (field: FormError["field"]) => {
    const found = errors.find((entry) => entry.field === field);
    return found ? t(found.code, found.params) : undefined;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateNewCareerForm({ managerName, clubId });
    setErrors(found);
    setCreateError(undefined);
    if (found.length > 0) {
      setAttempt((value) => value + 1);
      return;
    }
    setCreating(true);
    const result = await createCareer({
      managerName: managerName.trim(),
      clubId: clubId ?? "",
      seed,
      noFiring,
      bank: bankInput,
      ...(mod ? { assets: mod.images } : {}),
    });
    setCreating(false);
    if (!result.ok) {
      setCreateError(t(result.error.code, result.error.params));
      return;
    }
    router.push(`/jogo/?c=${result.id}`);
  }

  return (
    <AssetsProvider assets={mod?.images}>
      <EntryShell title={t("newCareer.title")} wide>
        <form onSubmit={submit} className={styles.form} noValidate>
          <Card aria-labelledby="new-career-manager" className={styles.card}>
            <h2 id="new-career-manager" className={styles.cardTitle}>
              {t("newCareer.sectionManager")}
            </h2>
            <div className={styles.narrow}>
              <Field
                label={t("newCareer.managerName")}
                hint={t("newCareer.managerHint", { max: MANAGER_NAME_MAX })}
                error={errorOf("managerName")}
              >
                {(props) => (
                  <input
                    {...props}
                    ref={nameRef}
                    value={managerName}
                    maxLength={MANAGER_NAME_MAX}
                    placeholder={t("newCareer.managerPlaceholder")}
                    onChange={(event) => {
                      setManagerName(event.target.value);
                      setErrors((list) => list.filter((entry) => entry.field !== "managerName"));
                    }}
                  />
                )}
              </Field>
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={noFiring}
                aria-describedby="new-career-no-firing"
                onChange={(event) => setNoFiring(event.target.checked)}
              />
              <span>{t("newCareer.noFiring")}</span>
            </label>
            <p id="new-career-no-firing" className={styles.help}>
              {t("newCareer.noFiringHelp")}
            </p>
            <details className={styles.advanced}>
              <summary>{t("newCareer.advanced")}</summary>
              <div className={styles.narrow}>
                <Field label={t("newCareer.seed")} hint={t("newCareer.seedHelp")}>
                  {(props) => (
                    <input
                      {...props}
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                    />
                  )}
                </Field>
              </div>
            </details>
          </Card>
          <Card aria-labelledby="new-career-world" className={styles.card}>
            <h2 id="new-career-world" className={styles.cardTitle}>
              {t("newCareer.sectionWorld")}
            </h2>
            <div className={styles.narrow}>
              <Field
                label={t("newCareer.bank")}
                hint={mod ? undefined : t("newCareer.defaultBank.help")}
              >
                {(props) => (
                  <select
                    {...props}
                    value={bankId}
                    onChange={(event) => setBankId(event.target.value)}
                  >
                    <option value="">{t("newCareer.defaultBank")}</option>
                    {installed.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.summary.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Link href="/mods/">{t("nav.mods")}</Link>
          </Card>
          <Card aria-labelledby="new-career-club" className={styles.card}>
            <h2 id="new-career-club" className={styles.cardTitle}>
              {t("newCareer.chooseClub")}
            </h2>
            <div className={styles.filters}>
              {manyCountries ? (
                <Field label={t("newCareer.country.filter")}>
                  {(props) => (
                    <select
                      {...props}
                      value={country}
                      onChange={(event) => {
                        setCountry(event.target.value);
                        setClubId(undefined);
                      }}
                    >
                      {groupNames.length > 1
                        ? [
                            ...countries
                              .filter((entry) => !groups.has(entry.id))
                              .map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name}
                                </option>
                              )),
                            ...groupNames.map((group) => (
                              <optgroup key={group} label={group}>
                                {countries
                                  .filter((entry) => groups.get(entry.id) === group)
                                  .map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.name}
                                    </option>
                                  ))}
                              </optgroup>
                            )),
                          ]
                        : countries.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                      <option value="">{t("newCareer.country.all")}</option>
                    </select>
                  )}
                </Field>
              ) : null}
              <Field label={t("newCareer.division.filter")}>
                {(props) => (
                  <select
                    {...props}
                    value={division}
                    onChange={(event) => setDivision(Number(event.target.value))}
                  >
                    {divisions.map((entry) => (
                      <option key={entry.level} value={entry.level}>
                        {country === "" && manyCountries
                          ? t("newCareer.division.level", { level: entry.level })
                          : entry.name}
                      </option>
                    ))}
                    <option value={0}>{t("newCareer.division.all")}</option>
                  </select>
                )}
              </Field>
            </div>
            <ClubPicker
              ref={clubRef}
              clubs={clubs}
              manyCountries={manyCountries}
              caption={
                divisionName && !(country === "" && manyCountries)
                  ? t("newCareer.clubsCaption", { division: divisionName })
                  : t("newCareer.clubsCaptionAll")
              }
              query={query}
              onQuery={setQuery}
              selectedId={clubId}
              onSelect={(id) => {
                setClubId(id);
                setErrors((list) => list.filter((entry) => entry.field !== "club"));
              }}
              onClearFilters={() => {
                setCountry("");
                setDivision(0);
                setQuery("");
              }}
              resetKey={`${country}:${division}`}
              error={errorOf("club")}
            />
          </Card>
          {createError ? (
            <Notice role="alert" tone="danger" title={t("newCareer.createError.title")}>
              <p className={styles.noticeText}>{createError}</p>
            </Notice>
          ) : null}
          <div className={styles.footer}>
            <span className={styles.chosen}>
              {selected ? (
                <>
                  <Crest crest={selected.crest} label={selected.name} size={28} />
                  {t("newCareer.selected", { club: selected.name })}
                </>
              ) : (
                t("newCareer.noClubSelected")
              )}
            </span>
            <Button type="submit" variant="primary" disabled={creating} aria-busy={creating}>
              {creating ? t("newCareer.creating") : t("newCareer.confirm")}
            </Button>
          </div>
        </form>
      </EntryShell>
    </AssetsProvider>
  );
}
