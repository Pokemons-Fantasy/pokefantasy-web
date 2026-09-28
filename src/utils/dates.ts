/**
 * Formato de fechas de la app. Las fechas del backend son de Madrid y sin zona; se leen como hora local.
 * Abreviaturas fijas en vez de toLocaleDateString para que el texto no dependa del ICU del navegador.
 */
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "YYYY-MM-DD" (o con hora) como fecha local. `new Date('YYYY-MM-DD')` sería UTC y podría caer el día anterior. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "vie 22 may". */
export function formatDay(iso: string): string {
  return formatDate(parseLocalDate(iso));
}

/** "vie 22 may" de una fecha ya construida; con `withYear`, "mié 31 dic 2025". */
export function formatDate(d: Date, withYear = false): string {
  const day = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${day} ${d.getFullYear()}` : day;
}

/** "14:32". */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "Hoy", "Ayer" o la fecha (con el año si no es el actual), según el día local de `now`. */
export function formatDayLabel(date: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return formatDate(date, date.getFullYear() !== now.getFullYear());
}

/** "jue 23:59". */
export function formatWeekdayTime(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${formatTime(date)}`;
}
