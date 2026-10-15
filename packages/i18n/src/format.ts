import type { ValidationIssue } from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import ptBrCatalog from "../locales/pt-BR/catalog.json" with { type: "json" };
import ptBrErrors from "../locales/pt-BR/errors.json" with { type: "json" };
import ptBrMessages from "../locales/pt-BR/messages.json" with { type: "json" };

export type Locale = "pt-BR";

type MessageValues = Record<string, string | number>;

interface LocaleBundle {
  errors: Record<string, string>;
  catalog: Record<string, string>;
  messages: Record<string, string>;
}

const BUNDLES: Record<Locale, LocaleBundle> = {
  "pt-BR": { errors: ptBrErrors, catalog: ptBrCatalog, messages: ptBrMessages },
};

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
