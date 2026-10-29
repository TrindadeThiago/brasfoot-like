/** Dia de um mês do calendário (027): a data, os jogos do clube e as marcas de "hoje" e "próximo". */
export interface CalendarDay<F> {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isNext: boolean;
  fixtures: F[];
}

export interface CalendarMonth<F> {
  /** `AAAA-MM`. */
  key: string;
  fixtureCount: number;
  /** Semanas de domingo a sábado, completas (com dias dos meses vizinhos). */
  weeks: CalendarDay<F>[][];
}

const DAY_MS = 86_400_000;

function utc(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Todos os meses entre o primeiro e o último jogo, inclusive os sem jogos no meio. */
function monthKeys(dates: readonly string[]): string[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const first = sorted[0] as string;
  const last = sorted.at(-1) as string;
  const keys: string[] = [];
  let year = Number(first.slice(0, 4));
  let month = Number(first.slice(5, 7));
  const endYear = Number(last.slice(0, 4));
  const endMonth = Number(last.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

/**
 * Os meses do calendário do clube, de domingo a sábado (convenção brasileira). Puro: `today` e
 * `next` vêm do estado do jogo, nunca do relógio. Um dia com mais de um jogo guarda todos.
 */
export function calendarMonths<F extends { date: string }>(
  fixtures: readonly F[],
  today: string,
  next?: string,
  /** Datas que só estendem a faixa de meses (por exemplo, os jogos que um filtro escondeu). */
  rangeDates: readonly string[] = [],
): CalendarMonth<F>[] {
  const byDate = new Map<string, F[]>();
  for (const fixture of fixtures) {
    byDate.set(fixture.date, [...(byDate.get(fixture.date) ?? []), fixture]);
  }
  return monthKeys([...fixtures.map((fixture) => fixture.date), ...rangeDates]).map((key) => {
    const first = utc(`${key}-01`);
    const gridStart = first - new Date(first).getUTCDay() * DAY_MS;
    const nextMonth = new Date(first);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const lastDay = nextMonth.getTime() - DAY_MS;
    const weeksCount = Math.ceil((lastDay - gridStart + DAY_MS) / (7 * DAY_MS));
    const weeks: CalendarDay<F>[][] = [];
    let count = 0;
    for (let week = 0; week < weeksCount; week++) {
      const days: CalendarDay<F>[] = [];
      for (let day = 0; day < 7; day++) {
        const date = iso(gridStart + (week * 7 + day) * DAY_MS);
        const inMonth = date.startsWith(key);
        const list = byDate.get(date) ?? [];
        if (inMonth) count += list.length;
        days.push({
          date,
          inMonth,
          isToday: date === today,
          isNext: next !== undefined && date === next,
          fixtures: list,
        });
      }
      weeks.push(days);
    }
    return { key, fixtureCount: count, weeks };
  });
}

/** Mês a abrir: o do próximo jogo; sem ele, o último mês com jogos (temporada encerrada). */
export function monthOfNext<F>(months: readonly CalendarMonth<F>[], next: string | undefined) {
  if (next) {
    const key = next.slice(0, 7);
    if (months.some((month) => month.key === key)) return key;
  }
  return [...months].reverse().find((month) => month.fixtureCount > 0)?.key ?? months[0]?.key;
}
