import type { FormResult } from "@brasfoot-like/engine";
import { useT } from "../i18n";
import styles from "./FormChips.module.css";

const NAMES: Record<FormResult, string> = { W: "result.win", D: "result.draw", L: "result.loss" };

/** Sequência de resultados (V/E/D) com cores e rótulos acessíveis. */
export function FormChips({ form }: { form: readonly FormResult[] }) {
  const t = useT();
  return (
    <span className={styles.chips}>
      {form.map((result, index) => (
        <abbr
          // biome-ignore lint/suspicious/noArrayIndexKey: a sequência de resultados é fixa e ordenada
          key={index}
          title={t(NAMES[result])}
          className={`${styles.chip} ${styles[result]}`}
        >
          {t(`result.${result}`)}
        </abbr>
      ))}
    </span>
  );
}
