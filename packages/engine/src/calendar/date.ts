/**
 * Datas do calendário do jogo, sem `Date` (Princípio II). Algoritmos days-from-civil de
 * Howard Hinnant, só com aritmética inteira.
 */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** Datas já lidas: o mercado e a idade leem as mesmas poucas datas milhares de vezes por dia. */
const PARSED = new Map<string, CivilDate | null>();
const PARSED_LIMIT = 100_000;

export function parseIsoDate(text: string): CivilDate | null {
  const hit = PARSED.get(text);
  if (hit !== undefined) return hit;
  const parsed = parseUncached(text);
  if (PARSED.size >= PARSED_LIMIT) PARSED.clear();
  PARSED.set(text, parsed);
  return parsed;
}

function parseUncached(text: string): CivilDate | null {
  const match = ISO_DATE.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return Object.freeze({ year, month, day });
}

function pad(value: number, width: number): string {
  return `${value}`.padStart(width, "0");
}

export function formatIsoDate(date: CivilDate): string {
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** Dias desde 1970-01-01. */
export function daysFromCivil({ year, month, day }: CivilDate): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function civilFromDays(days: number): CivilDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function parseOrThrow(text: string): CivilDate {
  const date = parseIsoDate(text);
  if (!date) {
    throw new Error(`data inválida: ${text}`);
  }
  return date;
}

/** Idade em anos completos de quem nasceu em `birthDate`, na data `referenceDate`. */
export function ageOn(birthDate: string, referenceDate: string): number {
  const birth = parseOrThrow(birthDate);
  const reference = parseOrThrow(referenceDate);
  let age = reference.year - birth.year;
  if (
    reference.month < birth.month ||
    (reference.month === birth.month && reference.day < birth.day)
  ) {
    age--;
  }
  return age;
}

/**
 * Data de referência no ano da temporada (research.md 007 R6): mesmo dia e mês, com 29/02
 * virando 28/02 em ano não bissexto.
 */
export function seasonDate(referenceDate: string, year: number): string {
  const { month, day } = parseOrThrow(referenceDate);
  return formatIsoDate({ year, month, day: Math.min(day, daysInMonth(year, month)) });
}

/** Dia da semana ISO da data: 1 = segunda-feira … 7 = domingo (1970-01-01 foi quinta-feira). */
export function weekdayOf(isoDate: string): number {
  const days = daysFromCivil(parseOrThrow(isoDate));
  return ((((days + 3) % 7) + 7) % 7) + 1;
}

/** Soma `days` dias (negativo volta no tempo) a uma data ISO. */
export function addDays(isoDate: string, days: number): string {
  return formatIsoDate(civilFromDays(daysFromCivil(parseOrThrow(isoDate)) + days));
}

/** Dias de `from` até `to` (negativo se `to` for anterior). */
export function diffDays(from: string, to: string): number {
  return daysFromCivil(parseOrThrow(to)) - daysFromCivil(parseOrThrow(from));
}
