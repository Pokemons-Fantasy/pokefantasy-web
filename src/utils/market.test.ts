import { describe, it, expect } from 'vitest';
import { windowStatus } from './market';
import type { JornadaDto, ScheduleResponse } from '../api/leagues';

const jornada = (roundNumber: number, done: boolean, extra: Partial<JornadaDto> = {}): JornadaDto => ({
  roundNumber,
  matches: [{ id: `m${roundNumber}`, player1: 'ash', player2: 'brock', status: done ? 'COMPLETED' : 'PENDING' }],
  ...extra,
});

const schedule = (jornadas: JornadaDto[], open: Partial<Pick<ScheduleResponse, 'stealWindowOpen' | 'swapWindowOpen'>> = {}): ScheduleResponse => ({
  leagueId: 'l1', jornadas, stealWindowOpen: false, swapWindowOpen: false, ...open,
});

// Jueves 2026-06-04: la jornada 2 tiene cierre de robos ese jueves a las 23:59
const J2 = jornada(2, false, {
  startDate: '2026-06-01', stealDeadline: '2026-06-04T23:59:00', swapDeadline: '2026-06-05T16:00:00',
});

describe('windowStatus', () => {
  it('abierta con más de un día por delante: muestra día y hora de cierre', () => {
    const s = schedule([jornada(1, true), J2], { stealWindowOpen: true });
    expect(windowStatus('steal', s, new Date('2026-06-02T10:00:00'))).toEqual({
      open: true, text: 'abiertos · cierran jue 23:59',
    });
  });

  it('abierta con menos de 24 h: cuenta atrás en horas', () => {
    const s = schedule([jornada(1, true), J2], { stealWindowOpen: true });
    expect(windowStatus('steal', s, new Date('2026-06-04T18:30:00')).text).toBe('abiertos · cierran en 5 h');
  });

  it('abierta con menos de una hora: cuenta atrás en minutos', () => {
    const s = schedule([jornada(1, true), J2], { swapWindowOpen: true });
    expect(windowStatus('swap', s, new Date('2026-06-05T15:35:00')).text).toBe('abiertos · cierran en 25 min');
  });

  it('abierta sin fecha de cierre', () => {
    const s = schedule([jornada(1, false)], { swapWindowOpen: true });
    expect(windowStatus('swap', s, new Date('2026-06-02T10:00:00')).text).toBe('abiertos');
  });

  it('cerrada: abre al completarse la jornada activa', () => {
    const s = schedule([jornada(1, true), J2]);
    expect(windowStatus('steal', s, new Date('2026-06-05T10:00:00'))).toEqual({
      open: false, text: 'cerrados · abren al completarse la jornada 2',
    });
  });

  it('cerrada con la temporada terminada', () => {
    const s = schedule([jornada(1, true), jornada(2, true)]);
    expect(windowStatus('swap', s, new Date('2026-06-05T10:00:00')).text).toBe('cerrados · temporada terminada');
  });

  it('cerrada sin fechas en el calendario', () => {
    const s = schedule([jornada(1, false)]);
    expect(windowStatus('steal', s, new Date('2026-06-05T10:00:00')).text).toBe('cerrados · falta la fecha de la jornada 1');
  });
});
