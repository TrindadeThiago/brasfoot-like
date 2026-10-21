import type {
  FinanceError,
  MarketError,
  MatchError,
  SeasonError,
  ValidationIssue,
} from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import ptBrCatalog from "../locales/pt-BR/catalog.json" with { type: "json" };
import ptBrErrors from "../locales/pt-BR/errors.json" with { type: "json" };
import ptBrEvents from "../locales/pt-BR/events.json" with { type: "json" };
import ptBrFinanceErrors from "../locales/pt-BR/finance-errors.json" with { type: "json" };
import ptBrMarketErrors from "../locales/pt-BR/market-errors.json" with { type: "json" };
import ptBrMatchErrors from "../locales/pt-BR/match-errors.json" with { type: "json" };
import ptBrMessages from "../locales/pt-BR/messages.json" with { type: "json" };
import ptBrSeasonErrors from "../locales/pt-BR/season-errors.json" with { type: "json" };
import ptBrUi from "../locales/pt-BR/ui.json" with { type: "json" };

export type Locale = "pt-BR";

type MessageValues = Record<string, string | number>;

interface LocaleBundle {
  errors: Record<string, string>;
  matchErrors: Record<string, string>;
  seasonErrors: Record<string, string>;
  financeErrors: Record<string, string>;
  marketErrors: Record<string, string>;
  ui: Record<string, string>;
  catalog: Record<string, string>;
  messages: Record<string, string>;
  events: Record<string, string>;
}

const BUNDLES: Record<Locale, LocaleBundle> = {
  "pt-BR": {
    errors: ptBrErrors,
    matchErrors: ptBrMatchErrors,
    seasonErrors: ptBrSeasonErrors,
    financeErrors: ptBrFinanceErrors,
    marketErrors: ptBrMarketErrors,
    ui: ptBrUi,
    catalog: ptBrCatalog,
    messages: ptBrMessages,
    events: ptBrEvents,
  },
};

/** Idiomas disponíveis (016): os pacotes de tradução existentes, com o nome de cada um. */
export const LOCALES: readonly { id: Locale; name: string }[] = (
  Object.keys(BUNDLES) as Locale[]
).map((id) => ({ id, name: BUNDLES[id].ui["locale.name"] ?? id }));

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(BUNDLES, value);
}

/** Parâmetros cujo valor é um id de catálogo e deve ser exibido pelo rótulo traduzido. */
const CATALOG_PARAMS: Record<string, string> = {
  trait: "trait",
  tiebreaker: "tiebreaker",
};

const compiled = new Map<string, IntlMessageFormat>();

function compile(locale: Locale, template: string): IntlMessageFormat {
  const key = `${locale}\u0000${template}`;
  let format = compiled.get(key);
  if (!format) {
    format = new IntlMessageFormat(template, locale);
    compiled.set(key, format);
  }
  return format;
}

function render(locale: Locale, template: string, values: MessageValues): string {
  return String(compile(locale, template).format(values));
}

/** Rótulo traduzido de um item de catálogo, ex.: `position.GK` → "GOL". */
export function formatLabel(key: string, locale: Locale): string {
  const label = BUNDLES[locale].catalog[key];
  if (label === undefined) {
    throw new Error(`rótulo sem tradução (${locale}): ${key}`);
  }
  return label;
}

/** Mensagem geral da interface (ex.: resumos), em ICU MessageFormat. */
export function formatMessage(key: string, values: MessageValues, locale: Locale): string {
  const template = BUNDLES[locale].messages[key];
  if (template === undefined) {
    throw new Error(`mensagem sem tradução (${locale}): ${key}`);
  }
  return render(locale, template, values);
}

/** Quando a entidade não tem id legível, identifica pela posição na seção (1, 2, 3…). */
function describeEntity(issue: ValidationIssue): string {
  if (issue.entityId !== undefined) return issue.entityId;
  const first = issue.path[0];
  return typeof first === "number" ? `#${first + 1}` : issue.section;
}

/** Texto de um problema de validação, a partir do código e dos parâmetros (Princípio VII). */
export function formatIssue(issue: ValidationIssue, locale: Locale): string {
  const template = BUNDLES[locale].errors[issue.code];
  if (template === undefined) {
    throw new Error(`problema sem tradução (${locale}): ${issue.code}`);
  }
  const values: MessageValues = {
    section: issue.section,
    entityId: describeEntity(issue),
  };
  for (const [name, value] of Object.entries(issue.params)) {
    const catalog = CATALOG_PARAMS[name];
    const label = catalog ? BUNDLES[locale].catalog[`${catalog}.${value}`] : undefined;
    values[name] = label ?? value;
  }
  return render(locale, template, values);
}

/** Códigos de problema com mensagem no idioma. */
export function messageKeys(locale: Locale): string[] {
  return Object.keys(BUNDLES[locale].errors);
}

/** Texto de um erro do motor de partida (entrada, mudança ou escalação automática). */
export function formatMatchError(error: MatchError, locale: Locale): string {
  const template = BUNDLES[locale].matchErrors[error.code];
  if (template === undefined) {
    throw new Error(`erro de partida sem tradução (${locale}): ${error.code}`);
  }
  return render(locale, template, { side: error.side ?? "none", ...error.params });
}

/** Texto de um erro da temporada. */
export function formatSeasonError(error: SeasonError, locale: Locale): string {
  const template = BUNDLES[locale].seasonErrors[error.code];
  if (template === undefined) {
    throw new Error(`erro de temporada sem tradução (${locale}): ${error.code}`);
  }
  return render(locale, template, error.params);
}

/** Texto de um erro das ações financeiras (preço, crédito, obras). */
export function formatFinanceError(error: FinanceError, locale: Locale): string {
  const template = BUNDLES[locale].financeErrors[error.code];
  if (template === undefined) {
    throw new Error(`erro financeiro sem tradução (${locale}): ${error.code}`);
  }
  return render(locale, template, error.params);
}

/** Texto de um erro das ações do mercado de transferências. */
export function formatMarketError(error: MarketError, locale: Locale): string {
  const template = BUNDLES[locale].marketErrors[error.code];
  if (template === undefined) {
    throw new Error(`erro de mercado sem tradução (${locale}): ${error.code}`);
  }
  return render(locale, template, error.params);
}

/** Texto da interface (`ui.json`), em ICU MessageFormat. */
export function formatUi(
  key: string,
  values: MessageValues = {},
  locale: Locale = "pt-BR",
): string {
  const template = BUNDLES[locale].ui[key];
  if (template === undefined) {
    throw new Error(`texto da interface sem tradução (${locale}): ${key}`);
  }
  return render(locale, template, values);
}

/** Chaves de texto da interface disponíveis no idioma. */
export function uiKeys(locale: Locale = "pt-BR"): string[] {
  return Object.keys(BUNDLES[locale].ui);
}

/** Tipos de evento narrados no feed da rodada (research.md R4). */
export const EVENT_TYPES = [
  "goal",
  "penalty_goal",
  "penalty_awarded",
  "penalty_missed",
  "yellow",
  "red_second_yellow",
  "red_direct",
  "injury",
  "substitution",
  "substitution_auto",
  "formation",
  "posture",
  "kickoff",
  "half_time",
  "second_half",
  "full_time",
  "abandoned",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Quantas variações de texto o tipo de evento tem no idioma. */
export function eventVariants(type: EventType, locale: Locale = "pt-BR"): number {
  let count = 0;
  while (BUNDLES[locale].events[`event.${type}.${count + 1}`] !== undefined) count++;
  return count;
}

/** Variação (1..count) escolhida de forma determinística para um evento (hash FNV-1a). */
export function eventVariant(seed: string, seq: number, count: number): number {
  const text = `${seed}#${seq}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % count) + 1;
}

/** Texto de um evento do feed, sempre com a mesma variação para o mesmo evento. */
export function formatEvent(
  type: EventType,
  values: MessageValues,
  seed: string,
  seq: number,
  locale: Locale = "pt-BR",
): string {
  const count = eventVariants(type, locale);
  if (count === 0) throw new Error(`evento sem texto (${locale}): ${type}`);
  const template = BUNDLES[locale].events[`event.${type}.${eventVariant(seed, seq, count)}`];
  return render(locale, template as string, values);
}
