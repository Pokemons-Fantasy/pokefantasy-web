import { describe, it, expect } from 'vitest';
import { formatDate, formatDay, formatDayLabel, formatTime, formatWeekdayTime, parseLocalDate } from './dates';

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

describe('formatDate / formatTime', () => {
  it('fecha con o sin año y hora con dos dígitos', () => {
    const d = new Date('2025-12-31T09:05:00');
    expect(formatDate(d)).toBe('mié 31 dic');
    expect(formatDate(d, true)).toBe('mié 31 dic 2025');
    expect(formatTime(d)).toBe('09:05');
  });
});

describe('formatDayLabel', () => {
  const now = new Date('2026-09-28T00:30:00');

  it('Hoy y Ayer por día natural, no por 24 h', () => {
    expect(formatDayLabel(new Date('2026-09-28T00:10:00'), now)).toBe('Hoy');
    expect(formatDayLabel(new Date('2026-09-27T23:50:00'), now)).toBe('Ayer');
  });

  it('la fecha a partir de anteayer, con el año si es otro', () => {
    expect(formatDayLabel(new Date('2026-09-26T12:00:00'), now)).toBe('sáb 26 sep');
    expect(formatDayLabel(new Date('2025-09-26T12:00:00'), now)).toBe('vie 26 sep 2025');
  });
});
