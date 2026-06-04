import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanStore } from './usePlanStore';
import type { TrainingPlan, TrainingDay, PlannedExercise } from '../types';

const plan = (over: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'p1',
  name: 'Scheda A',
  days: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const day = (over: Partial<TrainingDay> = {}): TrainingDay => ({
  id: 'd1',
  week: 1,
  day: 1,
  exercises: [],
  ...over,
});

const ex = (over: Partial<PlannedExercise> = {}): PlannedExercise => ({
  id: 'e1',
  name: 'Squat',
  restSeconds: 90,
  sets: [{ reps: 10, weight: 50 }],
  ...over,
});

beforeEach(() => {
  usePlanStore.setState({ plans: [], activePlanId: null });
});

describe('usePlanStore — CRUD base', () => {
  it('aggiunge una scheda', () => {
    usePlanStore.getState().addPlan(plan());
    expect(usePlanStore.getState().plans).toHaveLength(1);
  });

  it('eliminando la scheda attiva azzera activePlanId', () => {
    usePlanStore.getState().addPlan(plan());
    usePlanStore.getState().setActivePlan('p1');
    usePlanStore.getState().deletePlan('p1');
    expect(usePlanStore.getState().activePlanId).toBeNull();
    expect(usePlanStore.getState().plans).toHaveLength(0);
  });

  it('eliminando una scheda non attiva conserva activePlanId', () => {
    usePlanStore.getState().addPlan(plan({ id: 'p1' }));
    usePlanStore.getState().addPlan(plan({ id: 'p2', name: 'B' }));
    usePlanStore.getState().setActivePlan('p1');
    usePlanStore.getState().deletePlan('p2');
    expect(usePlanStore.getState().activePlanId).toBe('p1');
  });

  it('riordina gli esercizi di un giorno', () => {
    const d = day({ exercises: [ex({ id: 'a' }), ex({ id: 'b' })] });
    usePlanStore.getState().addPlan(plan({ days: [d] }));
    const reversed = [...d.exercises].reverse();
    usePlanStore.getState().reorderExercises('p1', 'd1', reversed);
    const ids = usePlanStore.getState().plans[0].days[0].exercises.map((e) => e.id);
    expect(ids).toEqual(['b', 'a']);
  });
});

describe('usePlanStore — duplicazioni', () => {
  it('duplica un giorno con nuovi id e numero giorno incrementato', () => {
    const d = day({ exercises: [ex()] });
    usePlanStore.getState().addPlan(plan({ days: [d] }));
    usePlanStore.getState().duplicateDay('p1', 'd1');

    const days = usePlanStore.getState().plans[0].days;
    expect(days).toHaveLength(2);
    const copy = days[1];
    expect(copy.id).not.toBe('d1');
    expect(copy.week).toBe(1);
    expect(copy.day).toBe(2);
    expect(copy.exercises[0].id).not.toBe('e1');
    // deep copy: modificare l'originale non tocca la copia
    expect(copy.exercises[0].sets).not.toBe(d.exercises[0].sets);
    expect(copy.exercises[0].sets[0]).toEqual({ reps: 10, weight: 50 });
  });

  it('duplica una settimana copiando tutti i giorni alla settimana successiva', () => {
    const d1 = day({ id: 'd1', week: 1, day: 1, exercises: [ex()] });
    const d2 = day({ id: 'd2', week: 1, day: 2, exercises: [ex({ id: 'e2' })] });
    usePlanStore.getState().addPlan(plan({ days: [d1, d2] }));
    usePlanStore.getState().duplicateWeek('p1', 1);

    const days = usePlanStore.getState().plans[0].days;
    expect(days).toHaveLength(4);
    const week2 = days.filter((d) => d.week === 2);
    expect(week2).toHaveLength(2);
    expect(week2.map((d) => d.day).sort()).toEqual([1, 2]);
    expect(week2.every((d) => d.id !== 'd1' && d.id !== 'd2')).toBe(true);
  });
});
