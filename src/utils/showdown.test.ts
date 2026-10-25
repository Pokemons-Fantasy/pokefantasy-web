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
    expect(showdownFormat({})).toBe('doublescustomgame@@@Picked Team Size = 4, Best Of = 3');
  });

  it('individual con los 6 y una partida no lleva reglas', () => {
    expect(showdownFormat({ battleGameType: 'SINGLES', pickedTeamSize: 6, bestOf: 1 })).toBe('customgame');
  });

  it('individual eligiendo 3 a una partida', () => {
    expect(showdownFormat({ battleGameType: 'SINGLES', pickedTeamSize: 3, bestOf: 1 }))
      .toBe('customgame@@@Picked Team Size = 3');
  });

  it('dobles con los 6 al mejor de 3', () => {
    expect(showdownFormat({ pickedTeamSize: 6, bestOf: 3 })).toBe('doublescustomgame@@@Best Of = 3');
  });
});

describe('challengeCommand', () => {
  it('no lleva usuario: en el privado Showdown reta a quien tienes delante', () => {
    expect(challengeCommand({})).toBe('/challenge doublescustomgame@@@Picked Team Size = 4, Best Of = 3');
    expect(challengeCommand({ battleGameType: 'SINGLES', pickedTeamSize: 6, bestOf: 1 })).toBe('/challenge customgame');
  });
});

describe('showdownTeamText', () => {
  it('capitaliza cada parte del nombre y separa los Pokémon con una línea en blanco', () => {
    expect(showdownTeamText(['urshifu-rapid-strike', 'pikachu'])).toBe('Urshifu-Rapid-Strike\n\nPikachu');
  });
});
