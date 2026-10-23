"use client";

import { formatMoneyWords, formatNumber } from "../i18n";
import styles from "./MoneyInput.module.css";

/**
 * Campo de valor em dinheiro: mostra o número com separador de milhar ("1.500.000") e, embaixo,
 * o valor por extenso ("1,5 milhão"). O estado de quem usa continua sendo só os dígitos.
 * A dica é um pseudo-elemento (`data-hint`): fora do texto do rótulo que envolve o campo.
 */
export function MoneyInput({
  value,
  onValueChange,
  ...rest
}: {
  value: string;
  onValueChange: (digits: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const digits = value.replace(/\D/g, "");
  const amount = digits === "" ? undefined : Number(digits);
  return (
    <span className={styles.wrap} data-hint={amount === undefined ? "" : formatMoneyWords(amount)}>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={amount === undefined ? "" : formatNumber(amount)}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ""))}
      />
    </span>
  );
}
