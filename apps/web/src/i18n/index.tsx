"use client";

import { formatLabel, formatUi } from "@brasfoot-like/i18n";

type Values = Record<string, string | number>;

/** Texto da interface por chave (pt-BR). */
export function t(key: string, values?: Values): string {
  return formatUi(key, values);
}

/** Hook para componentes: mesma função `t`, pronta para trocar de idioma no futuro. */
export function useT(): typeof t {
  return t;
}

export function T({ k, values }: { k: string; values?: Values }) {
  return <>{formatUi(k, values)}</>;
}

/** Rótulo de catálogo (posições, características, posturas...). */
export function label(key: string): string {
  return formatLabel(key, "pt-BR");
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const number = new Intl.NumberFormat("pt-BR");

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** Valor na moeda fictícia do jogo (inteiro), com o formato numérico do idioma. */
export function formatMoney(value: number): string {
  return t("money", { negative: value < 0 ? "yes" : "no", amount: number.format(Math.abs(value)) });
}
