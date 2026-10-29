"use client";

import type { ValidationIssue } from "@brasfoot-like/engine";
import { formatIssue, formatLabel, formatUi, isLocale, type Locale } from "@brasfoot-like/i18n";
import { readPreferences, subscribePreferences } from "../storage/preferences";

type Values = Record<string, string | number>;

// Idioma escolhido nas Configurações (016); desconhecido → pt-BR. Lido uma vez e atualizado
// quando as preferências mudam, para não reler o armazenamento a cada texto.
let locale: Locale = "pt-BR";
function refreshLocale() {
  const stored = readPreferences().locale;
  locale = isLocale(stored) ? stored : "pt-BR";
}
refreshLocale();
subscribePreferences(refreshLocale);

export function currentLocale(): Locale {
  return locale;
}

/** Texto da interface por chave, no idioma escolhido. */
export function t(key: string, values?: Values): string {
  return formatUi(key, values, locale);
}

/** Hook para componentes: mesma função `t`, pronta para trocar de idioma no futuro. */
export function useT(): typeof t {
  return t;
}

export function T({ k, values }: { k: string; values?: Values }) {
  return <>{formatUi(k, values, locale)}</>;
}

/** Rótulo de catálogo (posições, características, posturas...). */
export function label(key: string): string {
  return formatLabel(key, locale);
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const number = new Intl.NumberFormat("pt-BR");

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Data de calendário `AAAA-MM-DD` por extenso ("20 de outubro de 2026"), sem fuso. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** Dia da semana de uma data `AAAA-MM-DD` ("domingo"), sem fuso. */
export function formatWeekday(isoDate: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** Título de um mês `AAAA-MM` ("outubro de 2026"), sem fuso (027). */
export function formatMonthTitle(monthKey: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}

/** Dia da semana abreviado de uma data `AAAA-MM-DD` ("dom"), sem fuso (027). */
export function formatWeekdayShort(isoDate: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(".", "");
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** Valor na moeda fictícia do jogo (inteiro), com o formato numérico do idioma. */
export function formatMoney(value: number): string {
  return t("money", { negative: value < 0 ? "yes" : "no", amount: number.format(Math.abs(value)) });
}

const compact = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Valor por extenso para conferir de relance ("250 mil", "1,5 milhão"); vazio abaixo de mil. */
export function formatMoneyWords(value: number): string {
  const amount = Math.abs(value);
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return t(millions >= 2 ? "money.words.millions" : "money.words.million", {
      amount: compact.format(millions),
    });
  }
  if (amount >= 1_000) return t("money.words.thousand", { amount: compact.format(amount / 1_000) });
  return "";
}

/** Mensagem de um problema de validação do banco, do pacote ou de CSV (015). */
export function issueText(issue: ValidationIssue): string {
  return formatIssue(issue, locale);
}
