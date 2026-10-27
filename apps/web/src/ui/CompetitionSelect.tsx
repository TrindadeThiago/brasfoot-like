"use client";

import { mainCompetitionOf, regionalCompetitionOf } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { competitionHref } from "../game/useDivision";
import { useT } from "../i18n";
import styles from "./CompetitionTabs.module.css";

/**
 * Abas das competições do banco (017 FR-037): só aparecem quando há mais de uma. Escolher uma
 * leva à mesma tela daquela competição, com a divisão do clube (ou a primeira). Num banco com
 * vários países (020), um seletor de país vem antes e as abas são as competições dele.
 */
export function CompetitionSelect({
  save,
  competitionId,
}: {
  save: SaveFile;
  competitionId: string;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = (usePathname() ?? "/jogo/competicao").replace(/\/+$/, "");
  // Estaduais (023): só o da região do clube do técnico (e o que está aberto) ao lado das nacionais.
  const ownRegional = regionalCompetitionOf(save.bank, save.clubId)?.id;
  const competitions = save.bank.competitions.filter(
    (competition) =>
      competition.regional === undefined ||
      competition.id === ownRegional ||
      competition.id === competitionId,
  );
  // Competições entre países (022) não têm país: aparecem como abas ao lado das de cada país.
  const international = competitions.filter((competition) => competition.countryId === undefined);
  const countries = [
    ...new Set(
      competitions.flatMap((competition) =>
        competition.countryId === undefined ? [] : [competition.countryId],
      ),
    ),
  ];
  const current =
    competitions.find((competition) => competition.id === competitionId)?.countryId ??
    competitions.find((competition) => competition.id === save.league.competitionId)?.countryId;
  const shown =
    countries.length > 1
      ? [
          ...competitions.filter((competition) => competition.countryId === current),
          ...international,
        ]
      : competitions;
  const country = (
    <label className={styles.country}>
      <span>{t("competition.country")}</span>
      <select
        value={current ?? ""}
        onChange={(event) => {
          const main = mainCompetitionOf(save.bank, event.target.value);
          if (main) router.push(competitionHref(pathname, save.id, main.id));
        }}
      >
        {countries.map((id) => (
          <option key={id} value={id}>
            {save.bank.countries.find((entry) => entry.id === id)?.name ?? id}
          </option>
        ))}
      </select>
    </label>
  );
  if (competitions.length < 2) return null;
  return (
    <>
      {countries.length > 1 ? country : null}
      {shown.length > 1 ? (
        <nav aria-label={t("competition.select")} className={styles.tabs}>
          {shown.map((competition) => (
            <Link
              key={competition.id}
              href={competitionHref(pathname, save.id, competition.id)}
              aria-current={competition.id === competitionId ? "page" : undefined}
              className={competition.id === competitionId ? styles.active : undefined}
            >
              {competition.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
