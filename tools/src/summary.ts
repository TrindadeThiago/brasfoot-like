import { type ModPackage, tierOf } from "@brasfoot-like/engine";

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(part: number, total: number): string {
  return `${((part / total) * 100).toFixed(1)}%`;
}

/** Resumo do banco para conferência rápida na linha de comando (ferramenta de desenvolvimento). */
export function summarize(
  bank: ModPackage,
  ageOn: (birthDate: string, referenceDate: string) => number,
): string[] {
  const players = bank.players;
  const strengths = players.map((player) => player.strength);
  const ages = players.map((player) => ageOn(player.birthDate, bank.manifest.referenceDate));
  const divisions = bank.competitions.flatMap((competition) => competition.divisions);
  const lines = [
    `${bank.countries.length} país(es), ${bank.competitions.length} competição(ões), ${divisions.length} divisão(ões), ${bank.clubs.length} clubes, ${players.length} jogadores`,
    `força média ${mean(strengths).toFixed(1)}; força ≥ 85: ${percent(strengths.filter((value) => value >= 85).length, players.length)}; entre 45 e 70: ${percent(strengths.filter((value) => value >= 45 && value <= 70).length, players.length)}`,
    `idade média ${mean(ages).toFixed(1)} (mín. ${Math.min(...ages)}, máx. ${Math.max(...ages)})`,
    `com característica: ${percent(players.filter((player) => player.traits.length > 0).length, players.length)}; com 2: ${percent(players.filter((player) => player.traits.length === 2).length, players.length)}`,
  ];
  for (const division of divisions) {
    const top16 = division.clubIds.map((clubId) => {
      const squad = players
        .filter((player) => player.clubId === clubId)
        .map((player) => player.strength)
        .sort((a, b) => b - a)
        .slice(0, 16);
      return mean(squad);
    });
    const tiers = division.clubIds.map((clubId) =>
      tierOf(bank.clubs.find((club) => club.id === clubId)?.reputation ?? 0),
    );
    const count = (tier: string) => tiers.filter((value) => value === tier).length;
    lines.push(
      `${division.name}: média dos 16 melhores por clube ${mean(top16).toFixed(1)}; grandes ${count("big")}, médios ${count("medium")}, pequenos ${count("small")}`,
    );
  }
  return lines;
}
