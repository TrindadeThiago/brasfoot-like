/**
 * Estrutura de uma tela para leitor de tela (032 US2): um único `h1`, níveis de título sem salto,
 * regiões com nome único e tabelas com nome (legenda ou `aria-label`) e cabeçalhos de coluna. A função é autossuficiente (só
 * usa `document`) para rodar tanto no happy-dom dos testes de unidade quanto dentro da página, pelo
 * `page.evaluate` do Playwright.
 */
export function structureProblems(): string[] {
  const problems: string[] = [];
  const hiddenByAncestor = (element: Element): boolean => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return true;
      const details: Element | null | undefined =
        node.parentElement?.closest("details:not([open])");
      if (details && node !== details && !node.closest("summary")) return true;
    }
    return false;
  };
  const visible = (elements: Element[]) => elements.filter((element) => !hiddenByAncestor(element));

  const headings = visible([
    ...document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"),
  ]);
  const levelOf = (heading: Element) =>
    heading.getAttribute("aria-level")
      ? Number(heading.getAttribute("aria-level"))
      : Number(heading.tagName.slice(1)) || 2;
  const h1 = headings.filter((heading) => levelOf(heading) === 1);
  if (h1.length !== 1) problems.push(`h1: ${h1.length} (deve haver um)`);
  let previous = 0;
  for (const heading of headings) {
    const level = levelOf(heading);
    if (previous > 0 && level > previous + 1) {
      problems.push(
        `título saltou de h${previous} para h${level}: ${(heading.textContent ?? "").trim().slice(0, 40)}`,
      );
    }
    previous = level;
  }

  const nameOf = (region: Element): string => {
    const label = region.getAttribute("aria-label");
    if (label) return label.trim();
    const ids = (region.getAttribute("aria-labelledby") ?? "").split(" ").filter(Boolean);
    return ids
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  };
  const regions = visible([
    ...document.querySelectorAll("section[aria-label], section[aria-labelledby], [role='region']"),
  ]);
  const seen = new Map<string, number>();
  for (const region of regions) {
    const name = nameOf(region);
    if (!name) problems.push("região sem nome");
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (name && count > 1) problems.push(`região com nome repetido (${count}×): ${name}`);
  }

  for (const table of visible([...document.querySelectorAll("table")])) {
    // A legenda (`caption`) ou, nas tabelas que não a mostram (grade do calendário, comparação), o
    // nome acessível por `aria-label` ou `aria-labelledby`.
    const named =
      (table.querySelector("caption")?.textContent ?? "").trim() ||
      table.getAttribute("aria-label") ||
      table.getAttribute("aria-labelledby");
    if (!named) problems.push("tabela sem legenda nem nome acessível");
    for (const th of table.querySelectorAll("thead th")) {
      if (!th.getAttribute("scope"))
        problems.push(`cabeçalho sem scope: ${(th.textContent ?? "").trim()}`);
    }
  }
  return problems;
}
