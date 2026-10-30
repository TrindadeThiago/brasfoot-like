"use client";

import { LOCALES } from "@brasfoot-like/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_VERSION, appName } from "../../app-info";
import { useT } from "../../i18n";
import {
  type RoundSpeed,
  settingsOf,
  type Theme,
  writePreferences,
} from "../../storage/preferences";
import { usePreferences } from "../../storage/usePreferences";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { EntryShell } from "../../ui/entry/EntryShell";
import { Field } from "../../ui/Field";
import styles from "./page.module.css";

const SPEEDS: readonly RoundSpeed[] = ["slow", "normal", "fast"];
const THEMES: readonly Theme[] = ["system", "light", "dark"];

/** Configurações do jogador (016 US2): valem na hora, ficam no navegador, fora das carreiras. */
export default function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const settings = settingsOf(usePreferences());
  const [tipsReset, setTipsReset] = useState(false);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <EntryShell title={t("settings.title")} onBack={back}>
      <Card aria-labelledby="settings-round" className={styles.card}>
        <h2 id="settings-round">{t("settings.round")}</h2>
        <div className={styles.narrow}>
          <Field label={t("settings.speed")}>
            {(props) => (
              <select
                {...props}
                value={settings.roundSpeed}
                onChange={(event) =>
                  writePreferences({ roundSpeed: event.target.value as RoundSpeed })
                }
              >
                {SPEEDS.map((speed) => (
                  <option key={speed} value={speed}>
                    {t(`round.speed.${speed}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.autoPause}
            onChange={(event) => writePreferences({ autoPause: event.target.checked })}
          />
          <span>{t("round.autoPause")}</span>
        </label>
      </Card>

      <Card aria-labelledby="settings-look" className={styles.card}>
        <h2 id="settings-look">{t("settings.appearance")}</h2>
        <div className={styles.narrow}>
          <Field label={t("settings.theme")}>
            {(props) => (
              <select
                {...props}
                value={settings.theme}
                onChange={(event) => writePreferences({ theme: event.target.value as Theme })}
              >
                {THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {t(`settings.theme.${theme}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className={styles.narrow}>
          <Field label={t("settings.language")}>
            {(props) => (
              <select
                {...props}
                value={settings.locale}
                onChange={(event) => writePreferences({ locale: event.target.value })}
              >
                {LOCALES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Card>

      <Card aria-labelledby="settings-tips" className={styles.card}>
        <h2 id="settings-tips">{t("settings.tips")}</h2>
        <p className={styles.muted}>{t("settings.tipsHelp")}</p>
        <div>
          <Button
            onClick={() => {
              writePreferences({ tips: { dismissed: [], skipAll: false } });
              setTipsReset(true);
            }}
          >
            {t("settings.tipsReset")}
          </Button>
        </div>
        {tipsReset ? <p role="status">{t("settings.tipsResetDone")}</p> : null}
      </Card>

      <Card aria-labelledby="settings-about" className={styles.card}>
        <h2 id="settings-about">{t("settings.about")}</h2>
        <p>{t("app.version", { name: appName(), version: APP_VERSION })}</p>
        <div className={styles.links}>
          <Link href="/notas-de-versao/">{t("nav.releaseNotes")}</Link>
          <Link href="/sobre/">{t("nav.about")}</Link>
        </div>
      </Card>
    </EntryShell>
  );
}
