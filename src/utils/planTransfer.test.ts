import { describe, it, expect } from 'vitest';
import { serializePlan, parsePlan, planFileName, planSummary, encodePlanParam, decodePlanParam } from './planTransfer';
import type { TrainingPlan } from '../types';

const samplePlan = (): TrainingPlan => ({
  id: 'p1',
  name: 'Push Pull Legs',
  createdAt: '2026-01-01T00:00:00.000Z',
  days: [
    {
      id: 'd1',
      week: 1,
      day: 1,
      label: 'Push',
      exercises: [
        {
          id: 'e1',
          name: 'Panca piana',
          restSeconds: 90,
          sets: [
            { reps: 8, weight: 60 },
            { reps: 8, weight: 60 },
          ],
        },
      ],
    },
    { id: 'd2', week: 2, day: 1, exercises: [] },
  ],
});

describe('serializePlan / parsePlan — round-trip', () => {
  it('preserva i dati significativi attraverso export e import', () => {
    const parsed = parsePlan(serializePlan(samplePlan()));
    expect(parsed.name).toBe('Push Pull Legs');
    expect(parsed.days).toHaveLength(2);
    expect(parsed.days[0].label).toBe('Push');
    expect(parsed.days[0].exercises[0].name).toBe('Panca piana');
    expect(parsed.days[0].exercises[0].sets).toEqual([
      { reps: 8, weight: 60 },
      { reps: 8, weight: 60 },
    ]);
  });

  it('rigenera tutti gli id per evitare conflitti', () => {
    const parsed = parsePlan(serializePlan(samplePlan()));
    expect(parsed.id).not.toBe('p1');
    expect(parsed.days[0].id).not.toBe('d1');
    expect(parsed.days[0].exercises[0].id).not.toBe('e1');
  });

  it('accetta anche un piano "nudo" senza wrapper', () => {
    const parsed = parsePlan(JSON.stringify(samplePlan()));
    expect(parsed.name).toBe('Push Pull Legs');
  });
});

describe('parsePlan — validazione', () => {
  it('rifiuta JSON malformato', () => {
    expect(() => parsePlan('{ non json')).toThrow(/JSON/i);
  });

  it('rifiuta una scheda senza nome', () => {
    expect(() => parsePlan(JSON.stringify({ days: [] }))).toThrow(/nome/i);
  });

  it('rifiuta giorni senza settimana/giorno', () => {
    const bad = { name: 'X', days: [{ exercises: [] }] };
    expect(() => parsePlan(JSON.stringify(bad))).toThrow(/settimana o giorno/i);
  });

  it('rifiuta serie con peso non numerico', () => {
    const bad = {
      name: 'X',
      days: [
        {
          week: 1, day: 1,
          exercises: [{ name: 'Squat', restSeconds: 60, sets: [{ reps: 10, weight: 'tanto' }] }],
        },
      ],
    };
    expect(() => parsePlan(JSON.stringify(bad))).toThrow(/peso/i);
  });
});

describe('encodePlanParam / decodePlanParam — QR/link', () => {
  it('round-trip compresso preserva i dati e rigenera gli id', () => {
    const param = encodePlanParam(samplePlan());
    expect(typeof param).toBe('string');
    expect(param.length).toBeGreaterThan(0);

    const parsed = decodePlanParam(param);
    expect(parsed.name).toBe('Push Pull Legs');
    expect(parsed.days[0].label).toBe('Push');
    expect(parsed.days[0].exercises[0].name).toBe('Panca piana');
    expect(parsed.id).not.toBe('p1');
  });

  it('il payload compresso è più corto del JSON pieno', () => {
    const plan = samplePlan();
    expect(encodePlanParam(plan).length).toBeLessThan(serializePlan(plan).length);
  });

  it('rifiuta un parametro danneggiato', () => {
    expect(() => decodePlanParam('§§§non-valido§§§')).toThrow();
  });

  it('preserva la nota peso (weightNote) nel round-trip', () => {
    const plan = samplePlan();
    plan.days[0].exercises[0].sets[0] = { reps: 6, weight: 0, weightNote: '1/2 peso max' };
    const parsed = decodePlanParam(encodePlanParam(plan));
    expect(parsed.days[0].exercises[0].sets[0].weightNote).toBe('1/2 peso max');
  });

  it('preserva la nota reps (repsNote) nel round-trip', () => {
    const plan = samplePlan();
    plan.days[0].exercises[0].sets[0] = { reps: 0, weight: 60, repsNote: 'max' };
    const parsed = decodePlanParam(encodePlanParam(plan));
    expect(parsed.days[0].exercises[0].sets[0].repsNote).toBe('max');
  });
});

describe('planFileName / planSummary', () => {
  it('genera uno slug sicuro per il nome file', () => {
    expect(planFileName(samplePlan())).toBe('push-pull-legs.json');
  });

  it('usa un fallback se il nome non produce slug', () => {
    expect(planFileName({ ...samplePlan(), name: '!!!' })).toBe('scheda.json');
  });

  it('riassume settimane, giorni ed esercizi', () => {
    expect(planSummary(samplePlan())).toBe('2 sett · 2 giorni · 1 esercizi');
  });
});
