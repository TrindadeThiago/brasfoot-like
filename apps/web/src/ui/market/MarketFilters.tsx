"use client";

import { type PlayerFilters, POSITIONS, type Position } from "@brasfoot-like/engine";
import { label, useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./market.module.css";

export interface FilterForm {
  scope: "all" | "clubs" | "free";
  position: "" | Position;
  strengthMin: string;
  strengthMax: string;
  ageMin: string;
  ageMax: string;
  maxValue: string;
  maxWage: string;
  until: string;
  text: string;
  /** País do clube do jogador, em bancos de vários países (020); "" = todos. */
  country: string;
}

export const EMPTY_FILTERS: FilterForm = {
  scope: "all",
  position: "",
  strengthMin: "",
  strengthMax: "",
  ageMin: "",
  ageMax: "",
  maxValue: "",
  maxWage: "",
  until: "",
  text: "",
  country: "",
};

function range(min: string, max: string, low: number, high: number): [number, number] | undefined {
  if (min === "" && max === "") return undefined;
  return [min === "" ? low : Number(min), max === "" ? high : Number(max)];
}

/** Converte o formulário (texto) nos filtros do motor. */
export function toFilters(form: FilterForm, ownClubId: string): PlayerFilters {
  const strength = range(form.strengthMin, form.strengthMax, 1, 100);
  const age = range(form.ageMin, form.ageMax, 0, 99);
  return {
    scope: form.scope,
    excludeClubId: ownClubId,
    ...(form.position ? { positions: [form.position] } : {}),
    ...(strength ? { strength } : {}),
    ...(age ? { age } : {}),
    ...(form.maxValue !== "" ? { maxValue: Number(form.maxValue) } : {}),
    ...(form.maxWage !== "" ? { maxWage: Number(form.maxWage) } : {}),
    ...(form.until !== "" ? { contractUntilMax: Number(form.until) } : {}),
    ...(form.text.trim() !== "" ? { text: form.text } : {}),
    ...(form.country !== "" ? { countryId: form.country } : {}),
  };
}

const NUMBER_FIELDS = [
  ["strengthMin", "market.filter.strengthMin"],
  ["strengthMax", "market.filter.strengthMax"],
  ["ageMin", "market.filter.ageMin"],
  ["ageMax", "market.filter.ageMax"],
  ["maxValue", "market.filter.maxValue"],
  ["maxWage", "market.filter.maxWage"],
  ["until", "market.filter.contractUntil"],
] as const;

/** Filtros da busca de jogadores (US1). */
export function MarketFilters({
  form,
  onChange,
  countries = [],
}: {
  form: FilterForm;
  onChange: (form: FilterForm) => void;
  /** Países do banco; o filtro só aparece com mais de um (020). */
  countries?: readonly { id: string; name: string }[];
}) {
  const t = useT();
  return (
    <form
      className={styles.card}
      aria-label={t("market.filter.title")}
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <details open>
        <summary className={styles.filtersToggle}>{t("market.filter.title")}</summary>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>{t("market.filter.scope")}</span>
            <select
              value={form.scope}
              onChange={(event) =>
                onChange({ ...form, scope: event.target.value as FilterForm["scope"] })
              }
            >
              <option value="all">{t("market.filter.scope.all")}</option>
              <option value="clubs">{t("market.filter.scope.clubs")}</option>
              <option value="free">{t("market.filter.scope.free")}</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t("market.filter.position")}</span>
            <select
              value={form.position}
              onChange={(event) =>
                onChange({ ...form, position: event.target.value as FilterForm["position"] })
              }
            >
              <option value="">{t("market.filter.anyPosition")}</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {label(`position.${position}`)}
                </option>
              ))}
            </select>
          </label>
          {countries.length > 1 ? (
            <label className={styles.field}>
              <span>{t("market.filter.country")}</span>
              <select
                value={form.country}
                onChange={(event) => onChange({ ...form, country: event.target.value })}
              >
                <option value="">{t("market.filter.anyCountry")}</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {NUMBER_FIELDS.map(([key, text]) => (
            <label key={key} className={styles.field}>
              <span>{t(text)}</span>
              <input
                type="number"
                inputMode="numeric"
                value={form[key]}
                onChange={(event) => onChange({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}
          <label className={styles.field}>
            <span>{t("market.filter.text")}</span>
            <input
              type="text"
              value={form.text}
              onChange={(event) => onChange({ ...form, text: event.target.value })}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => onChange(EMPTY_FILTERS)}>{t("market.filter.clear")}</Button>
        </div>
      </details>
    </form>
  );
}
