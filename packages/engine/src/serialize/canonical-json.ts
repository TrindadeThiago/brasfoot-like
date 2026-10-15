function canonicalize(value: unknown, path: string): unknown {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`número não finito em ${path}`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalize(item, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) {
        sorted[key] = canonicalize(item, `${path}.${key}`);
      }
    }
    return sorted;
  }
  return value;
}

/** JSON com chaves ordenadas, indentação de 2 espaços e quebra de linha final (research.md R10). */
export function toCanonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value, "$"), null, 2)}\n`;
}
