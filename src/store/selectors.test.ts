import { describe, it, expect } from 'vitest';
import { nextDayFor, weeklyStats, currentStreak, startOfWeek } from './selectors';
import type { TrainingPlan, SessionLog } from '../types';

const plan = (days: TrainingPlan['days']): TrainingPlan => ({
  id: 'p1',
  name: 'A',
  days,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const log = (over: Partial<SessionLog> = {}): SessionLog => ({
  id: 's' + Math.random(),
  planId: 'p1',
  planName: 'A',
  dayId: 'd1',
  week: 1,
  day: 1,
  date: '2026-01-01T10:00:00.000Z',
  completed: true,
  exercises: [],
  ...over,
});

describe('nextDayFor', () => {
  const days = [
    { id: 'd1', week: 1, day: 1, exercises: [] },
    { id: 'd2', week: 1, day: 2, exercises: [] },
  ];

  it('senza piano restituisce null', () => {
    expect(nextDayFor(null, [])).toBeNull();
  });

  it('senza log propone il primo giorno', () => {
    expect(nextDayFor(plan(days), [])?.id).toBe('d1');
  });

  it("dopo una sessione propone il giorno successivo", () => {
    expect(nextDayFor(plan(days), [log({ dayId: 'd1' })])?.id).toBe('d2');
  });

  it("dall'ultimo giorno ricomincia dal primo", () => {
    expect(nextDayFor(plan(days), [log({ dayId: 'd2' })])?.id).toBe('d1');
  });

  it('ignora log di altri piani', () => {
    expect(nextDayFor(plan(days), [log({ planId: 'altro', dayId: 'd2' })])?.id).toBe('d1');
  });
});

describe('startOfWeek', () => {
  it('restituisce lunedì a mezzanotte', () => {
    // 2026-06-04 è un giovedì
    const monday = startOfWeek(new Date('2026-06-04T15:30:00'));
    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
  });

  it('per la domenica torna al lunedì precedente', () => {
    // 2026-06-07 è una domenica
    const monday = startOfWeek(new Date('2026-06-07T12:00:00'));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(1); // lunedì 1 giugno
  });
});

describe('weeklyStats', () => {
  it('conta solo le sessioni della settimana corrente e somma le serie completate', () => {
    const now = new Date('2026-06-04T12:00:00'); // giovedì
    const thisWeek = log({
      date: '2026-06-02T10:00:00', // martedì stessa settimana
      exercises: [
        {
          exerciseId: 'e1', name: 'Squat', restSeconds: 60,
          sets: [
            { reps: 10, weight: 50, completed: true },
            { reps: 10, weight: 50, completed: false },
          ],
        },
      ],
    });
    const lastWeek = log({ date: '2026-05-20T10:00:00' });
    const stats = weeklyStats([thisWeek, lastWeek], now);
    expect(stats.sessions).toBe(1);
    expect(stats.sets).toBe(1);
    expect(stats.volume).toBe(500);
  });
});

describe('currentStreak', () => {
  it('conta i giorni consecutivi fino a oggi', () => {
    const now = new Date('2026-06-04T20:00:00');
    const logs = [
      log({ date: '2026-06-04T08:00:00' }),
      log({ date: '2026-06-03T08:00:00' }),
      log({ date: '2026-06-02T08:00:00' }),
    ];
    expect(currentStreak(logs, now)).toBe(3);
  });

  it('si interrompe al primo giorno mancante', () => {
    const now = new Date('2026-06-04T20:00:00');
    const logs = [
      log({ date: '2026-06-04T08:00:00' }),
      // 2026-06-03 manca
      log({ date: '2026-06-02T08:00:00' }),
    ];
    expect(currentStreak(logs, now)).toBe(1);
  });

  it('senza sessione oggi lo streak è 0', () => {
    const now = new Date('2026-06-04T20:00:00');
    expect(currentStreak([log({ date: '2026-06-03T08:00:00' })], now)).toBe(0);
  });
});
