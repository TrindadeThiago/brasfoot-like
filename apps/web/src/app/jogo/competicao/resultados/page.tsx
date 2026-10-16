"use client";

import type { MatchRecord } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { GameLayout } from "../../../../game/GameLayout";
import { useT } from "../../../../i18n";
import { Button } from "../../../../ui/Button";
import { CompetitionTabs } from "../../../../ui/CompetitionTabs";
import { Crest } from "../../../../ui/Crest";
import { Dialog } from "../../../../ui/Dialog";
import { MatchSummary } from "../../../../ui/MatchSummary";
import styles from "./page.module.css";

function Results({ save, initial }: { save: SaveFile; initial: number }) {
  const t = useT();
  const total = save.season.calendar.length;
  const [round, setRound] = useState(Math.min(total, Math.max(1, initial)));
  const [open, setOpen] = useState<MatchRecord | undefined>();
  const close = useCallback(() => setOpen(undefined), []);
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const fixtures = save.season.calendar[round - 1]?.fixtures ?? [];
  const records = save.season.records.filter((record) => record.round === round);
  return (
    <div className={styles.layout}>
      <div className={styles.picker}>
        <Button onClick={() => setRound((value) => Math.max(1, value - 1))} disabled={round <= 1}>
          {t("results.previous")}
        </Button>
        <label>
          <span>{t("results.round")}</span>
          <select value={round} onChange={(event) => setRound(Number(event.target.value))}>
            {save.season.calendar.map((entry) => (
              <option key={entry.number} value={entry.number}>
                {entry.number}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => setRound((value) => Math.min(total, value + 1))}
          disabled={round >= total}
        >
          {t("results.next")}
        </Button>
      </div>
      <section aria-label={t("results.caption", { round })}>
        <h2>{t("results.caption", { round })}</h2>
        <ul className={styles.list}>
          {fixtures.map((fixture) => {
            const record = records.find((entry) => entry.home === fixture.home);
            const home = clubs.get(fixture.home);
            const away = clubs.get(fixture.away);
            const mine = fixture.home === save.clubId || fixture.away === save.clubId;
            return (
              <li key={fixture.home} aria-current={mine ? "true" : undefined}>
                <span className={styles.home}>
                  {home?.shortName}
                  {home ? <Crest crest={home.crest} label={home.name} size={20} /> : null}
                </span>
                <strong>
                  {record ? `${record.score.home} × ${record.score.away}` : t("results.notPlayed")}
                </strong>
                <span className={styles.away}>
                  {away ? <Crest crest={away.crest} label={away.name} size={20} /> : null}
                  {away?.shortName}
                </span>
                {record ? (
                  <Button
                    aria-label={t("summary.open", {
                      home: home?.shortName ?? "",
                      away: away?.shortName ?? "",
                    })}
                    onClick={() => setOpen(record)}
                  >
                    {t("summary.button")}
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {open ? (
        <Dialog
          open
          title={t("summary.open", {
            home: clubs.get(open.home)?.shortName ?? "",
            away: clubs.get(open.away)?.shortName ?? "",
          })}
          onClose={close}
          actions={<Button onClick={close}>{t("common.close")}</Button>}
        >
          <MatchSummary record={open} save={save} />
        </Dialog>
      ) : null}
    </div>
  );
}

function ResultsScreen({ save }: { save: SaveFile }) {
  const params = useSearchParams();
  const played = Math.max(1, save.season.nextRound - 1);
  const requested = Number(params?.get("r"));
  return (
    <>
      <CompetitionTabs careerId={save.id} />
      <Results
        save={save}
        initial={Number.isInteger(requested) && requested > 0 ? requested : played}
      />
    </>
  );
}

export default function ResultsPage() {
  return <GameLayout>{(save) => <ResultsScreen save={save} />}</GameLayout>;
}
