import { useT } from "../i18n";
import styles from "./FitnessMeter.module.css";

/** Abaixo disto o titular rende menos de forma perceptível e a escalação avisa. */
export const TIRED_BELOW = 75;
const EXHAUSTED_BELOW = 50;

/** Condição física de um jogador (0–100): barra e percentual, acessível como medidor. */
export function FitnessMeter({ value }: { value: number }) {
  const t = useT();
  const text = t("fitness.value", { value });
  const tone = value < EXHAUSTED_BELOW ? styles.exhausted : value < TIRED_BELOW ? styles.tired : "";
  return (
    // biome-ignore lint/a11y/useSemanticElements: barra própria com os tokens do tema; o <meter> nativo não aceita esse estilo nos dois temas
    <span
      role="meter"
      aria-label={t("fitness.label")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={text}
      className={`${styles.meter} ${tone}`}
    >
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${value}%` }} />
      </span>
      {text}
    </span>
  );
}
