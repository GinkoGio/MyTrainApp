import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrainingPlan, TrainingDay, PlannedExercise } from '../types';
import { uid } from '../utils/id';

interface PlanStore {
  plans: TrainingPlan[];
  activePlanId: string | null;

  addPlan: (plan: TrainingPlan) => void;
  updatePlan: (plan: TrainingPlan) => void;
  deletePlan: (planId: string) => void;
  setActivePlan: (planId: string) => void;

  addDay: (planId: string, day: TrainingDay) => void;
  updateDay: (planId: string, day: TrainingDay) => void;
  deleteDay: (planId: string, dayId: string) => void;
  duplicateDay: (planId: string, dayId: string) => void;
  duplicateWeek: (planId: string, week: number) => void;

  addExercise: (planId: string, dayId: string, exercise: PlannedExercise) => void;
  updateExercise: (planId: string, dayId: string, exercise: PlannedExercise) => void;
  deleteExercise: (planId: string, dayId: string, exerciseId: string) => void;
  reorderExercises: (planId: string, dayId: string, exercises: PlannedExercise[]) => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      plans: [],
      activePlanId: null,

      addPlan: (plan) =>
        set((s) => ({ plans: [...s.plans, plan] })),

      updatePlan: (plan) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? plan : p)) })),

      deletePlan: (planId) =>
        set((s) => ({
          plans: s.plans.filter((p) => p.id !== planId),
          activePlanId: s.activePlanId === planId ? null : s.activePlanId,
        })),

      setActivePlan: (planId) => set({ activePlanId: planId }),

      addDay: (planId, day) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId ? { ...p, days: [...p.days, day] } : p
          ),
        })),

      updateDay: (planId, day) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? { ...p, days: p.days.map((d) => (d.id === day.id ? day : d)) }
              : p
          ),
        })),

      deleteDay: (planId, dayId) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? { ...p, days: p.days.filter((d) => d.id !== dayId) }
              : p
          ),
        })),

      duplicateDay: (planId, dayId) =>
        set((s) => ({
          plans: s.plans.map((p) => {
            if (p.id !== planId) return p;
            const source = p.days.find((d) => d.id === dayId);
            if (!source) return p;
            const nextDayNum =
              Math.max(0, ...p.days.filter((d) => d.week === source.week).map((d) => d.day)) + 1;
            const copy: TrainingDay = {
              id: uid(),
              week: source.week,
              day: nextDayNum,
              label: source.label,
              exercises: source.exercises.map((ex) => ({
                ...ex,
                id: uid(),
                sets: ex.sets.map((set) => ({ ...set })),
              })),
            };
            return { ...p, days: [...p.days, copy] };
          }),
        })),

      duplicateWeek: (planId, week) =>
        set((s) => ({
          plans: s.plans.map((p) => {
            if (p.id !== planId) return p;
            const sourceDays = p.days.filter((d) => d.week === week);
            if (sourceDays.length === 0) return p;
            const nextWeek = Math.max(0, ...p.days.map((d) => d.week)) + 1;
            const copies: TrainingDay[] = sourceDays.map((source) => ({
              id: uid(),
              week: nextWeek,
              day: source.day,
              label: source.label,
              exercises: source.exercises.map((ex) => ({
                ...ex,
                id: uid(),
                sets: ex.sets.map((set) => ({ ...set })),
              })),
            }));
            return { ...p, days: [...p.days, ...copies] };
          }),
        })),

      addExercise: (planId, dayId, exercise) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId
                      ? { ...d, exercises: [...d.exercises, exercise] }
                      : d
                  ),
                }
              : p
          ),
        })),

      updateExercise: (planId, dayId, exercise) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId
                      ? {
                          ...d,
                          exercises: d.exercises.map((e) =>
                            e.id === exercise.id ? exercise : e
                          ),
                        }
                      : d
                  ),
                }
              : p
          ),
        })),

      deleteExercise: (planId, dayId, exerciseId) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId
                      ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
                      : d
                  ),
                }
              : p
          ),
        })),

      reorderExercises: (planId, dayId, exercises) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId ? { ...d, exercises } : d
                  ),
                }
              : p
          ),
        })),
    }),
    {
      name: 'train-plans',
      version: 1,
      // Punto di aggancio per future migrazioni dello schema dei dati persistiti.
      // Se la forma di TrainingPlan cambia, incrementa `version` e trasforma qui
      // lo stato salvato dalle versioni precedenti invece di rompere l'app.
      migrate: (persisted, fromVersion) => {
        void fromVersion;
        return persisted as { plans: TrainingPlan[]; activePlanId: string | null };
      },
    }
  )
);
