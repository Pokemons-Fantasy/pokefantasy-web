import { describe, it, expect } from 'vitest';
import type { DraftStatus } from '../api/pokemons';
import { documentTitle, isMyDraftTurn } from './documentTitle';

describe('documentTitle', () => {
  it('sección, liga y la marca de la app', () => {
    expect(documentTitle({ section: 'Clasificación', league: 'Liga Kanto' })).toBe('Clasificación · Liga Kanto · PokeFantasy');
    expect(documentTitle({ section: 'Mis ligas' })).toBe('Mis ligas · PokeFantasy');
  });

  it('sin sección o con la liga aún cargando: solo lo que hay', () => {
    expect(documentTitle({})).toBe('PokeFantasy');
    expect(documentTitle({ section: 'Draft', league: null })).toBe('Draft · PokeFantasy');
  });

  it('si es tu turno en el draft, lo dice primero', () => {
    expect(documentTitle({ section: 'Equipos', league: 'Liga Kanto', myTurn: true }))
      .toBe('⏰ Te toca · Equipos · Liga Kanto · PokeFantasy');
  });
});

describe('isMyDraftTurn', () => {
  const draft = (status: DraftStatus['status'], currentTurn: string) => ({ status, currentTurn }) as DraftStatus;

  it('solo con el draft en curso y el turno tuyo', () => {
    expect(isMyDraftTurn(draft('IN_PROGRESS', 'ash'), 'ash')).toBe(true);
    expect(isMyDraftTurn(draft('IN_PROGRESS', 'brock'), 'ash')).toBe(false);
    expect(isMyDraftTurn(draft('PENDING', 'ash'), 'ash')).toBe(false);
    expect(isMyDraftTurn(undefined, 'ash')).toBe(false);
    expect(isMyDraftTurn(draft('IN_PROGRESS', 'ash'), null)).toBe(false);
  });
});
