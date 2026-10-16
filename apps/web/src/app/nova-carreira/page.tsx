"use client";

import { validateBank } from "@brasfoot-like/engine";
import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { defaultBankInput } from "../../game/default-bank";
import { useGame } from "../../game/GameProvider";
import { type LeagueClub, leagueClubs } from "../../game/selectors";
import { formatNumber, useT } from "../../i18n";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { type Column, DataTable } from "../../ui/DataTable";
import styles from "./page.module.css";

function useLeagueClubs(): LeagueClub[] {
  return useMemo(() => {
    const result = validateBank(defaultBankInput());
    return result.ok ? leagueClubs(result.bank) : [];
  }, []);
}

export default function NewCareerPage() {
  const t = useT();
  const router = useRouter();
  const { createCareer } = useGame();
  const clubs = useLeagueClubs();
  const [managerName, setManagerName] = useState("");
  const [seed, setSeed] = useState("");
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
  ];

  const selected = clubs.find((club) => club.id === clubId);

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
    const result = await createCareer({ managerName: trimmed, clubId, seed });
    setCreating(false);
    if (!result.ok) {
      setError(t(result.error.code, result.error.params));
      return;
    }
    router.push(`/jogo/?c=${result.id}`);
  }

  return (
    <main className={styles.page}>
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
        <details className={styles.advanced}>
          <summary>{t("newCareer.advanced")}</summary>
          <label className={styles.field}>
            <span>{t("newCareer.seed")}</span>
            <input value={seed} onChange={(event) => setSeed(event.target.value)} />
            <small>{t("newCareer.seedHelp")}</small>
          </label>
        </details>
        <h2>{t("newCareer.chooseClub")}</h2>
        <DataTable
          rows={clubs}
          columns={columns}
          rowKey={(club) => club.id}
          caption={t("newCareer.clubsCaption")}
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
  );
}
