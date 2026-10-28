import blocklist from "../fixtures/blocklist.json" with { type: "json" };

/** Compara nomes sem acento, sem diferenciar maiúsculas e só por palavras inteiras. */
export function normalize(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const exactSet = new Set(blocklist.clubsExact.map((term) => normalize(term)));
const distinct = blocklist.clubs
  .filter((term) => !exactSet.has(normalize(term)))
  .map((term) => ({ term, normalized: normalize(term) }));
const competitions = blocklist.competitions.map((term) => ({ term, normalized: normalize(term) }));
const players = new Set(blocklist.players.map((term) => normalize(term)));

/**
 * Problemas de um nome de clube (024 R13): um termo distintivo de clube real contido no nome, ou o
 * nome inteiro igual ao de um clube real que também é lugar ou palavra comum. Cidades, estados e
 * países reais são permitidos no nome.
 */
export function clubNameProblems(name: string): string[] {
  const normalized = normalize(name);
  const hits = distinct.filter((entry) => normalized.includes(entry.normalized)).map((e) => e.term);
  if (exactSet.has(normalized)) hits.push(name);
  return hits;
}

/** Termos de competições reais contidos no nome de uma competição. */
export function competitionNameProblems(name: string): string[] {
  const normalized = normalize(name);
  return competitions.filter((entry) => normalized.includes(entry.normalized)).map((e) => e.term);
}

/** O nome completo é o de um jogador real conhecido? */
export function isRealPlayer(displayName: string): boolean {
  return players.has(normalize(displayName));
}
