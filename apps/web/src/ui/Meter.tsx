import styles from "./Meter.module.css";

/**
 * Barra de indicador (025): condição, força, confiança. `label` e `text` vêm do chamador (i18n);
 * o valor também aparece como texto, então a cor não é a única informação.
 */
export function Meter({
  value,
  label,
  text,
  tone = "accent",
}: {
  value: number;
  label: string;
  text: string;
  tone?: "accent" | "warning" | "danger";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    // biome-ignore lint/a11y/useSemanticElements: barra própria com os tokens do tema; o <meter> nativo não aceita esse estilo nos dois temas
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={text}
      className={`${styles.meter} ${styles[tone]}`}
    >
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${clamped}%` }} />
      </span>
      {text}
    </span>
  );
}
