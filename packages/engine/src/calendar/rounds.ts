/** Rodadas de uma divisão de `clubCount` clubes em `turns` turnos (como `generateCalendar`). */
export function theoreticalRounds(clubCount: number, turns: number): number {
  return turns * (clubCount % 2 === 0 ? clubCount - 1 : clubCount);
}
