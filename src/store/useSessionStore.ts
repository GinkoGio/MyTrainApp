import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionLog, PerformedSet } from '../types';

export interface ActiveSession {
  log: SessionLog;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restingUntil: number | null; // epoch ms when rest ends
}

interface SessionStore {
  logs: SessionLog[];
  active: ActiveSession | null;

  startSession: (log: SessionLog) => void;
  completeSet: (exerciseIdx: number, setIdx: number, reps: number, weight: number) => void;
  updateSet: (exerciseIdx: number, setIdx: number, data: Partial<PerformedSet>) => void;
  startRest: (restSeconds: number) => void;
  skipRest: () => void;
  goToSet: (exerciseIdx: number, setIdx: number) => void;
  finishSession: () => void;
  abandonSession: () => void;
  deleteLog: (logId: string) => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      logs: [],
      active: null,

      startSession: (log) =>
        set({
          active: {
            log,
            currentExerciseIndex: 0,
            currentSetIndex: 0,
            restingUntil: null,
          },
        }),

      completeSet: (exerciseIdx, setIdx, reps, weight) => {
        const { active } = get();
        if (!active) return;

        const exercises = active.log.exercises.map((ex, ei) => {
          if (ei !== exerciseIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIdx ? { reps, weight, completed: true } : s
            ),
          };
        });

        const updatedLog = { ...active.log, exercises };
        const currentEx = exercises[exerciseIdx];
        const isLastSet = setIdx >= currentEx.sets.length - 1;
        const isLastExercise = exerciseIdx >= exercises.length - 1;

        const restSeconds = active.log.exercises[exerciseIdx].restSeconds;
        const restingUntil = restSeconds > 0 ? Date.now() + restSeconds * 1000 : null;

        if (isLastSet && isLastExercise) {
          set({ active: { ...active, log: updatedLog, restingUntil: null } });
        } else if (isLastSet) {
          set({
            active: {
              ...active,
              log: updatedLog,
              currentExerciseIndex: exerciseIdx + 1,
              currentSetIndex: 0,
              restingUntil,
            },
          });
        } else {
          set({
            active: {
              ...active,
              log: updatedLog,
              currentExerciseIndex: exerciseIdx,
              currentSetIndex: setIdx + 1,
              restingUntil,
            },
          });
        }
      },

      updateSet: (exerciseIdx, setIdx, data) => {
        const { active } = get();
        if (!active) return;
        const exercises = active.log.exercises.map((ex, ei) => {
          if (ei !== exerciseIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIdx ? { ...s, ...data } : s
            ),
          };
        });
        set({ active: { ...active, log: { ...active.log, exercises } } });
      },

      startRest: (restSeconds) => {
        const { active } = get();
        if (!active) return;
        set({ active: { ...active, restingUntil: Date.now() + restSeconds * 1000 } });
      },

      skipRest: () => {
        const { active } = get();
        if (!active) return;
        set({ active: { ...active, restingUntil: null } });
      },

      goToSet: (exerciseIdx, setIdx) => {
        const { active } = get();
        if (!active) return;
        set({ active: { ...active, currentExerciseIndex: exerciseIdx, currentSetIndex: setIdx, restingUntil: null } });
      },

      finishSession: () => {
        const { active } = get();
        if (!active) return;
        const completedLog: SessionLog = { ...active.log, completed: true };
        set((s) => ({ logs: [completedLog, ...s.logs], active: null }));
      },

      abandonSession: () => set({ active: null }),

      deleteLog: (logId) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== logId) })),
    }),
    {
      name: 'train-sessions',
      version: 1,
      // Punto di aggancio per future migrazioni dello schema dei dati persistiti.
      // Se la forma di SessionLog/ActiveSession cambia, incrementa `version` e
      // trasforma qui lo stato salvato invece di rompere l'app.
      migrate: (persisted, fromVersion) => {
        void fromVersion;
        return persisted as { logs: SessionLog[]; active: ActiveSession | null };
      },
    }
  )
);
