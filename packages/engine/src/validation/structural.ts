import { z } from "zod";
import { FORMAT_TYPES, RESERVED_FORMAT_TYPES, SUPPORTED_FORMAT_VERSIONS } from "../model/catalogs";
import {
  manifestSchema,
  OPTIONAL_SECTIONS,
  SECTION_ITEM_SCHEMAS,
  SECTION_MIN_ITEMS,
} from "../model/schemas";
import type { IdLocation, ParsedItem, SemanticContext } from "./context";
import {
  type IssueCode,
  type IssueParams,
  makeIssue,
  type Section,
  type ValidationIssue,
} from "./issues";

type ItemSection = keyof typeof SECTION_ITEM_SCHEMAS;
type Path = (string | number)[];

const ITEM_SECTIONS = Object.keys(SECTION_ITEM_SCHEMAS) as ItemSection[];
const SECTION_MAX_ITEMS = 100000;

export interface StructuralResult {
  context: SemanticContext;
  issues: ValidationIssue[];
  /** Versão do formato não suportada: nenhuma outra verificação faz sentido. */
  aborted: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function describeValue(value: unknown): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  return JSON.stringify(value) ?? typeName(value);
}

/** `["crest", "colors", 1]` → `"crest.colors[1]"`. */
function fieldName(path: Path): string {
  return path.reduce<string>((name, segment) => {
    if (typeof segment === "number") return `${name}[${segment}]`;
    return name === "" ? segment : `${name}.${segment}`;
  }, "");
}

function startsWith(path: readonly PropertyKey[], prefix: readonly PropertyKey[]): boolean {
  return prefix.every((segment, index) => path[index] === segment);
}

interface Translated {
  code: IssueCode;
  params: IssueParams;
}

/** Converte um problema do Zod no código e parâmetros do projeto. */
function translateZodIssue(issue: z.core.$ZodIssue): Translated {
  const path = issue.path.filter((segment) => typeof segment !== "symbol") as Path;
  const field = fieldName(path);
  const hasInput = "input" in issue && issue.input !== undefined;
  const input: unknown = hasInput ? issue.input : undefined;

  if (issue.code === "custom" && typeof issue.params?.code === "string") {
    const { code, ...rest } = issue.params as { code: IssueCode } & IssueParams;
    const params: IssueParams = { field, ...rest };
    if (code === "schema.out_of_range") params.value = describeValue(input);
    if (code === "schema.invalid_length") {
      params.length = typeof input === "string" || Array.isArray(input) ? input.length : 0;
    }
    if (code === "schema.invalid_format") params.value = describeValue(input);
    return { code, params };
  }

  if (issue.code === "invalid_type") {
    if (!hasInput) return { code: "schema.required", params: { field } };
    if (issue.expected === "int" && typeof input === "number") {
      return { code: "schema.not_integer", params: { field, value: describeValue(input) } };
    }
    const expected = issue.expected === "int" ? "number" : issue.expected;
    return {
      code: "schema.invalid_type",
      params: { field, expected, received: typeName(input) },
    };
  }

  if (issue.code === "invalid_value") {
    return {
      code: "schema.invalid_value",
      params: { field, value: describeValue(input), allowed: issue.values.map(String).join(", ") },
    };
  }

  return {
    code: "schema.invalid_format",
    params: { field, format: issue.code, value: describeValue(input) },
  };
}

/** Caminhos de campos que não existem no schema (viram avisos e são descartados). */
function findUnknownKeys(schema: z.ZodType, value: unknown, path: Path, found: Path[]): void {
  let current: z.ZodType = schema;
  while (current instanceof z.ZodOptional || current instanceof z.ZodPipe) {
    current =
      current instanceof z.ZodOptional
        ? (current.unwrap() as z.ZodType)
        : (current.in as z.ZodType);
  }
  if (current instanceof z.ZodObject && isRecord(value)) {
    const shape = current.shape as Record<string, z.ZodType>;
    for (const key of Object.keys(value)) {
      const child = shape[key];
      if (child === undefined) {
        found.push([...path, key]);
      } else {
        findUnknownKeys(child, value[key], [...path, key], found);
      }
    }
  } else if (current instanceof z.ZodArray && Array.isArray(value)) {
    value.forEach((item, index) => {
      findUnknownKeys(current.element as z.ZodType, item, [...path, index], found);
    });
  }
}

interface ParseOutcome<T> {
  value: T | undefined;
  issues: ValidationIssue[];
}

function parseEntity<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  section: Section,
  basePath: Path,
  entityId: string | undefined,
): ParseOutcome<T> {
  const issues: ValidationIssue[] = [];
  const result = schema.safeParse(raw, { reportInput: true });
  let zodIssues = result.success ? [] : result.error.issues;

  // Formato de disputa desconhecido ou reservado para versões futuras: um único erro, sem erros
  // derivados. `groups` e `stages` funcionam desde a 019.
  if (section === "competitions" && isRecord(raw) && isRecord(raw.format)) {
    const type = raw.format.type;
    const known = (FORMAT_TYPES as readonly string[]).includes(type as string);
    if (
      typeof type === "string" &&
      (!known || (RESERVED_FORMAT_TYPES as readonly string[]).includes(type))
    ) {
      issues.push(
        makeIssue(
          "format.unsupported",
          section,
          [...basePath, "format", "type"],
          { type },
          entityId,
        ),
      );
      zodIssues = zodIssues.filter((issue) => !startsWith(issue.path, ["format"]));
    }
  }

  for (const zodIssue of zodIssues) {
    const { code, params } = translateZodIssue(zodIssue);
    const path = [
      ...basePath,
      ...(zodIssue.path.filter((segment) => typeof segment !== "symbol") as Path),
    ];
    issues.push(makeIssue(code, section, path, params, entityId));
  }

  const unknown: Path[] = [];
  findUnknownKeys(schema, raw, [], unknown);
  for (const path of unknown) {
    issues.push(
      makeIssue(
        "schema.unknown_field",
        section,
        [...basePath, ...path],
        { field: fieldName(path) },
        entityId,
      ),
    );
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  return { value: result.success && !hasErrors ? result.data : undefined, issues };
}

function emptyContext(): SemanticContext {
  return {
    manifest: undefined,
    countries: [],
    competitions: [],
    clubs: [],
    players: [],
    rivalries: [],
    ids: new Map(),
    playerRefs: [],
  };
}

function registerId(ids: Map<string, IdLocation[]>, id: string, location: IdLocation): void {
  const locations = ids.get(id);
  if (locations) {
    locations.push(location);
  } else {
    ids.set(id, [location]);
  }
}

/** Fase 1 da validação: estrutura de cada item, individualmente (research.md R8). */
export function validateStructure(input: unknown): StructuralResult {
  const context = emptyContext();
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    issues.push(
      makeIssue("schema.invalid_type", "manifest", [], {
        field: "manifest",
        expected: "object",
        received: typeName(input),
      }),
    );
    return { context, issues, aborted: true };
  }

  const rawManifest = input.manifest;
  if (rawManifest === undefined) {
    issues.push(makeIssue("schema.required", "manifest", [], { field: "manifest" }));
  } else {
    const version = isRecord(rawManifest) ? rawManifest.formatVersion : undefined;
    if (
      typeof version === "number" &&
      Number.isInteger(version) &&
      !(SUPPORTED_FORMAT_VERSIONS as readonly number[]).includes(version)
    ) {
      issues.push(
        makeIssue("manifest.unsupported_format_version", "manifest", ["formatVersion"], {
          found: version,
          supported: SUPPORTED_FORMAT_VERSIONS.join(", "),
        }),
      );
      return { context, issues, aborted: true };
    }
    const outcome = parseEntity(manifestSchema, rawManifest, "manifest", [], undefined);
    issues.push(...outcome.issues);
    context.manifest = outcome.value;
  }

  for (const section of ITEM_SECTIONS) {
    const raw = input[section];
    if (raw === undefined && OPTIONAL_SECTIONS.includes(section)) continue;
    if (raw === undefined) {
      issues.push(makeIssue("schema.required", section, [], { field: section }));
      continue;
    }
    if (!Array.isArray(raw)) {
      issues.push(
        makeIssue("schema.invalid_type", section, [], {
          field: section,
          expected: "array",
          received: typeName(raw),
        }),
      );
      continue;
    }
    const min = SECTION_MIN_ITEMS[section];
    if (raw.length < min || raw.length > SECTION_MAX_ITEMS) {
      issues.push(
        makeIssue("schema.invalid_length", section, [], {
          field: section,
          min,
          max: SECTION_MAX_ITEMS,
          length: raw.length,
        }),
      );
    }

    const schema = SECTION_ITEM_SCHEMAS[section] as z.ZodType;
    const parsed: ParsedItem<unknown>[] = [];
    raw.forEach((item: unknown, index: number) => {
      const entityId = isRecord(item) && typeof item.id === "string" ? item.id : undefined;
      if (entityId !== undefined) {
        registerId(context.ids, entityId, { section, index });
      }
      if (section === "players" && isRecord(item)) {
        context.playerRefs.push({
          index,
          clubId: typeof item.clubId === "string" ? item.clubId : undefined,
          position: typeof item.position === "string" ? item.position : undefined,
        });
      }
      const outcome = parseEntity(schema, item, section, [index], entityId);
      issues.push(...outcome.issues);
      if (outcome.value !== undefined) {
        parsed.push({ index, value: outcome.value });
      }
    });
    (context[section] as ParsedItem<unknown>[]) = parsed;
  }

  return { context, issues, aborted: false };
}
