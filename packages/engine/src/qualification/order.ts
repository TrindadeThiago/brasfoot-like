import type { Competition } from "../model/types";

/**
 * Ordem de resolução das competições com vagas (021 R2, R9). As fontes leem temporadas encerradas e
 * não criam dependência; só `require`/`forbid` leem a composição da temporada seguinte de outra
 * competição, que precisa ser resolvida antes. Sem dependências, vale a ordem do banco.
 */

type Graph = Map<string, string[]>;

/** Competições que têm ao menos uma vaga, na ordem do banco. */
export function feedableCompetitions(competitions: readonly Competition[]): Competition[] {
  return competitions.filter((competition) =>
    competition.divisions.some((division) => (division.berths?.length ?? 0) > 0),
  );
}

/** Competição → competições com vagas de que ela depende (sem ela mesma). */
export function dependencies(competitions: readonly Competition[]): Graph {
  const feedable = new Set(feedableCompetitions(competitions).map((entry) => entry.id));
  const graph: Graph = new Map();
  for (const competition of feedableCompetitions(competitions)) {
    const needed = new Set<string>();
    for (const division of competition.divisions) {
      for (const berth of division.berths ?? []) {
        for (const ref of [...(berth.require ?? []), ...(berth.forbid ?? [])]) {
          if (ref.competitionId !== competition.id && feedable.has(ref.competitionId)) {
            needed.add(ref.competitionId);
          }
        }
      }
    }
    graph.set(competition.id, [...needed].sort());
  }
  return graph;
}

/** Um ciclo de dependências (A → B → A), ou undefined. */
export function findCycle(competitions: readonly Competition[]): string[] | undefined {
  const graph = dependencies(competitions);
  const state = new Map<string, "open" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === "done") return undefined;
    if (state.get(id) === "open") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "open");
    stack.push(id);
    for (const next of graph.get(id) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return undefined;
  };
  for (const id of graph.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

/** Competições com vagas em ordem de resolução; lança se houver ciclo (a validação o recusa antes). */
export function resolutionOrder(competitions: readonly Competition[]): Competition[] {
  const cycle = findCycle(competitions);
  if (cycle) throw new Error(`ciclo de vagas: ${cycle.join(" → ")}`);
  const graph = dependencies(competitions);
  const feedable = feedableCompetitions(competitions);
  const done = new Set<string>();
  const ordered: Competition[] = [];
  const place = (competition: Competition) => {
    if (done.has(competition.id)) return;
    done.add(competition.id);
    for (const id of graph.get(competition.id) ?? []) {
      const dependency = feedable.find((entry) => entry.id === id);
      if (dependency) place(dependency);
    }
    ordered.push(competition);
  };
  feedable.forEach(place);
  return ordered;
}
