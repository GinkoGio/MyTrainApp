import { describe, it, expect } from 'vitest';
import { buildSuggestions, EXERCISE_LIBRARY } from './exerciseLibrary';

describe('buildSuggestions', () => {
  it('mette i nomi già usati prima della libreria', () => {
    const result = buildSuggestions(['Mio esercizio']);
    expect(result[0]).toBe('Mio esercizio');
    expect(result).toContain('Squat');
  });

  it('deduplica ignorando maiuscole/minuscole e spazi', () => {
    const result = buildSuggestions(['squat', '  SQUAT  ', 'Panca piana']);
    const squats = result.filter((s) => s.trim().toLowerCase() === 'squat');
    expect(squats).toHaveLength(1);
  });

  it('scarta nomi vuoti', () => {
    const result = buildSuggestions(['', '   ']);
    expect(result).toEqual(EXERCISE_LIBRARY);
  });

  it('senza nomi usati restituisce la sola libreria', () => {
    expect(buildSuggestions([])).toEqual(EXERCISE_LIBRARY);
  });
});
