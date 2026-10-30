"use client";

import { ageOn, clubUnavailability, seasonStats } from "@brasfoot-like/engine";
import { currentDate, type SaveFile, userSeason } from "@brasfoot-like/save";
import { label, useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { evolutionText, lastEvolution } from "./evolution-text";
import { conditionText } from "./PlayerCondition";
import styles from "./PlayerDetails.module.css";

const STATS = [
  ["player.matches", "matches"],
  ["player.minutes", "minutes"],
  ["player.goals", "goals"],
  ["player.assists", "assists"],
  ["player.yellows", "yellows"],
  ["player.reds", "reds"],
  ["player.matchesSuspended", "matchesSuspended"],
  ["player.matchesInjured", "matchesInjured"],
] as const;

/** Estatísticas do jogador na temporada, com o aviso de quem ainda não jogou (compartilhada com o modal do Elenco). */
export function PlayerStats({ save, playerId }: { save: SaveFile; playerId: string }) {
  const t = useT();
  const stats = seasonStats(userSeason(save)).find((entry) => entry.playerId === playerId);
  return (
    <>
      <h3 className={styles.heading}>{t("player.season")}</h3>
      {!stats || stats.matches === 0 ? (
        <p className={styles.note}>{t("player.notPlayed")}</p>
      ) : null}
      <dl className={styles.stats}>
        {STATS.map(([key, field]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{String(stats?.[field] ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Atributos visíveis e histórico na temporada; nunca os ocultos (FR-019, FR-020). */
export function PlayerDetails({
  save,
  playerId,
  onClose,
}: {
  save: SaveFile;
  playerId: string | undefined;
  onClose: () => void;
}) {
  const t = useT();
  const player = playerId ? save.bank.players.find((entry) => entry.id === playerId) : undefined;
  if (!player) return null;
  const country = save.bank.countries.find((entry) => entry.id === player.nationalityId);
  const condition = clubUnavailability(userSeason(save), save.bank, save.clubId).find(
    (entry) => entry.playerId === player.id,
  );
  const visible: [string, string][] = [
    ["player.position", label(`position.${player.position}`)],
    ["player.strength", String(player.strength)],
    ["player.evolution", evolutionText(lastEvolution(save, player.id))],
    ["player.age", t("player.ageValue", { age: ageOn(player.birthDate, currentDate(save)) })],
    ["player.nationality", country?.name ?? ""],
    [
      "player.traits",
      player.traits.length > 0
        ? player.traits.map((trait) => label(`trait.${trait}`)).join(", ")
        : t("player.noTraits"),
    ],
    ["player.condition", conditionText(t, condition)],
  ];
  return (
    <Dialog
      open
      title={player.displayName}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      <dl className={styles.list}>
        {visible.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <PlayerStats save={save} playerId={player.id} />
    </Dialog>
  );
}
