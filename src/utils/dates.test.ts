import { describe, it, expect } from 'vitest';
import { formatDay, formatWeekdayTime, parseLocalDate } from './dates';

describe('parseLocalDate', () => {
  it('lee "YYYY-MM-DD" como fecha local, sin desplazarse un día por la zona horaria', () => {
    const d = parseLocalDate('2026-05-22');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 4, 22, 0]);
  });
});

describe('formatDay', () => {
  it('día de la semana, día y mes abreviados', () => {
    expect(formatDay('2026-05-22')).toBe('vie 22 may');
    expect(formatDay('2026-09-06')).toBe('dom 6 sep');
  });

  it('acepta también una fecha con hora', () => {
    expect(formatDay('2026-06-04T23:59:00')).toBe('jue 4 jun');
  });
});

describe('formatWeekdayTime', () => {
  it('día de la semana y hora con dos dígitos', () => {
    expect(formatWeekdayTime(new Date('2026-06-04T23:59:00'))).toBe('jue 23:59');
    expect(formatWeekdayTime(new Date('2026-06-05T09:05:00'))).toBe('vie 09:05');
  });
});
