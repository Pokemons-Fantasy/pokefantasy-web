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
  const d = parseLocalDate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "jue 23:59". */
export function formatWeekdayTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]} ${hh}:${mm}`;
}
