import { describe, expect, it } from 'vitest';
import { challengeCommand, pickedTeamSizeLabel, showdownFormat, showdownTeamText } from './showdown';

describe('pickedTeamSizeLabel', () => {
  it('6 es jugar con todos; el resto, el número', () => {
    expect(pickedTeamSizeLabel(6)).toBe('Todos (6)');
    expect(pickedTeamSizeLabel(4)).toBe('4');
  });
});

describe('showdownFormat', () => {
  it('sin ajustes usa los de por defecto: dobles, elegir 4 y al mejor de 3', () => {
    expect(showdownFormat({})).toBe('gen9doublescustomgame@@@Picked Team Size = 4, Best Of = 3');
  });

  it('individual con los 6 y una partida no lleva reglas', () => {
    expect(showdownFormat({ battleGameType: 'SINGLES', pickedTeamSize: 6, bestOf: 1 })).toBe('gen9customgame');
  });

  it('individual eligiendo 3 a una partida', () => {
    expect(showdownFormat({ battleGameType: 'SINGLES', pickedTeamSize: 3, bestOf: 1 }))
      .toBe('gen9customgame@@@Picked Team Size = 3');
  });

  it('dobles con los 6 al mejor de 3', () => {
    expect(showdownFormat({ pickedTeamSize: 6, bestOf: 3 })).toBe('gen9doublescustomgame@@@Best Of = 3');
  });
});

describe('challengeCommand', () => {
  it('reta al nombre de Showdown del rival con el formato de la liga', () => {
    expect(challengeCommand('Ash Ketchum', {}))
      .toBe('/challenge Ash Ketchum, gen9doublescustomgame@@@Picked Team Size = 4, Best Of = 3');
  });
});

describe('showdownTeamText', () => {
  it('capitaliza cada parte del nombre y separa los Pokémon con una línea en blanco', () => {
    expect(showdownTeamText(['urshifu-rapid-strike', 'pikachu'])).toBe('Urshifu-Rapid-Strike\n\nPikachu');
  });
});
