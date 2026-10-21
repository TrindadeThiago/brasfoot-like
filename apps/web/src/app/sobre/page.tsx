"use client";

import Link from "next/link";
import { APP_VERSION, appName } from "../../app-info";
import { useT } from "../../i18n";
import styles from "./page.module.css";

/** Capturas geradas por `pnpm screenshots` (banco fictício, seed fixa). */
const SCREENSHOTS = ["home", "round", "table", "market", "career"] as const;

/** Página de apresentação do jogo (016 US6). */
export default function AboutPage() {
  const t = useT();
  const name = appName();
  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/">{t("common.back")}</Link>
      </div>
      <header className={styles.hero}>
        <h1>{name}</h1>
        <p className={styles.lead}>{t("about.lead", { name })}</p>
        <Link className={styles.play} href="/">
          {t("about.play")}
        </Link>
      </header>

      <section aria-labelledby="about-features" className={styles.card}>
        <h2 id="about-features">{t("about.features.title")}</h2>
        <ul className={styles.features}>
          {["career", "matches", "market", "drama", "mods", "offline"].map((feature) => (
            <li key={feature}>{t(`about.features.${feature}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="about-shots">
        <h2 id="about-shots">{t("about.screenshots")}</h2>
        <div className={styles.shots}>
          {SCREENSHOTS.map((shot) => (
            <figure key={shot} className={styles.shot}>
              {/* biome-ignore lint/performance/noImgElement: export estático, imagens já otimizadas */}
              <img
                src={`/screenshots/${shot}.png`}
                alt={t(`about.shot.${shot}`)}
                width={640}
                height={400}
                loading="lazy"
              />
              <figcaption>{t(`about.shot.${shot}`)}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-notice" className={styles.card}>
        <h2 id="about-notice">{t("about.notice.title")}</h2>
        <p>{t("about.notice.body")}</p>
        <p>{t("about.free")}</p>
      </section>

      <section aria-labelledby="about-saves" className={styles.card}>
        <h2 id="about-saves">{t("about.saves.title")}</h2>
        <p>{t("about.saves.body")}</p>
      </section>

      <footer className={styles.footer}>
        <Link href="/notas-de-versao/">{t("app.version", { name, version: APP_VERSION })}</Link>
        <a href="/docs/mod-format.md" target="_blank" rel="noreferrer">
          {t("mods.docs")}
        </a>
      </footer>
    </main>
  );
}
