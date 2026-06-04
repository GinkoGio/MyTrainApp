import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './useSessionStore';
import type { SessionLog } from '../types';

const sessionLog = (): SessionLog => ({
  id: 's1',
  planId: 'p1',
  planName: 'Scheda A',
  dayId: 'd1',
  week: 1,
  day: 1,
  date: '2026-01-01T00:00:00.000Z',
  completed: false,
  exercises: [
    {
      exerciseId: 'e1',
      name: 'Squat',
      restSeconds: 60,
      sets: [
        { reps: 10, weight: 50, completed: false },
        { reps: 10, weight: 50, completed: false },
      ],
    },
    {
      exerciseId: 'e2',
      name: 'Panca',
      restSeconds: 0,
      sets: [{ reps: 8, weight: 40, completed: false }],
    },
  ],
});

beforeEach(() => {
  useSessionStore.setState({ logs: [], active: null });
});

describe('useSessionStore — avanzamento sessione', () => {
  it('startSession inizializza gli indici a zero', () => {
    useSessionStore.getState().startSession(sessionLog());
    const a = useSessionStore.getState().active!;
    expect(a.currentExerciseIndex).toBe(0);
    expect(a.currentSetIndex).toBe(0);
    expect(a.restingUntil).toBeNull();
  });

  it('completando una serie non finale avanza il set e avvia la pausa', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().completeSet(0, 0, 10, 52.5);
    const a = useSessionStore.getState().active!;
    expect(a.currentExerciseIndex).toBe(0);
    expect(a.currentSetIndex).toBe(1);
    expect(a.restingUntil).not.toBeNull();
    expect(a.restingUntil!).toBeGreaterThan(Date.now());
    // i valori inseriti vengono salvati
    expect(a.log.exercises[0].sets[0]).toEqual({ reps: 10, weight: 52.5, completed: true });
  });

  it("all'ultima serie di un esercizio passa all'esercizio successivo, set 0", () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().completeSet(0, 0, 10, 50);
    useSessionStore.getState().completeSet(0, 1, 10, 50);
    const a = useSessionStore.getState().active!;
    expect(a.currentExerciseIndex).toBe(1);
    expect(a.currentSetIndex).toBe(0);
  });

  it('con restSeconds 0 non imposta una pausa', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().completeSet(0, 0, 10, 50);
    useSessionStore.getState().completeSet(0, 1, 10, 50); // ora su e2 (rest 0)
    useSessionStore.getState().completeSet(1, 0, 8, 40); // ultima serie ultimo esercizio
    expect(useSessionStore.getState().active!.restingUntil).toBeNull();
  });

  it('skipRest azzera la pausa', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().completeSet(0, 0, 10, 50);
    expect(useSessionStore.getState().active!.restingUntil).not.toBeNull();
    useSessionStore.getState().skipRest();
    expect(useSessionStore.getState().active!.restingUntil).toBeNull();
  });

  it('goToSet sposta gli indici e annulla la pausa', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().completeSet(0, 0, 10, 50);
    useSessionStore.getState().goToSet(1, 0);
    const a = useSessionStore.getState().active!;
    expect(a.currentExerciseIndex).toBe(1);
    expect(a.currentSetIndex).toBe(0);
    expect(a.restingUntil).toBeNull();
  });
});

describe('useSessionStore — chiusura sessione', () => {
  it('finishSession archivia il log come completato e svuota active', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().finishSession();
    const s = useSessionStore.getState();
    expect(s.active).toBeNull();
    expect(s.logs).toHaveLength(1);
    expect(s.logs[0].completed).toBe(true);
  });

  it('abandonSession svuota active senza archiviare', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().abandonSession();
    const s = useSessionStore.getState();
    expect(s.active).toBeNull();
    expect(s.logs).toHaveLength(0);
  });

  it('deleteLog rimuove la sessione indicata', () => {
    useSessionStore.getState().startSession(sessionLog());
    useSessionStore.getState().finishSession();
    const id = useSessionStore.getState().logs[0].id;
    useSessionStore.getState().deleteLog(id);
    expect(useSessionStore.getState().logs).toHaveLength(0);
  });
});
