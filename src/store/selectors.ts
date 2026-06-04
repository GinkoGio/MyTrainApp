import type { TrainingPlan, TrainingDay, SessionLog } from '../types';

/**
 * Restituisce il prossimo giorno da allenare per un piano: il primo giorno se
 * non ci sono log per quel piano, altrimenti quello successivo all'ultima
 * sessione registrata (ciclando in coda). I `logs` sono attesi dal più recente.
 */
export function nextDayFor(plan: TrainingPlan | null, logs: SessionLog[]): TrainingDay | null {
  if (!plan) return null;
  if (plan.days.length === 0) return null;
  const lastLog = logs.find((l) => l.planId === plan.id);
  if (!lastLog) return plan.days[0] ?? null;

  const sorted = [...plan.days].sort((a, b) =>
    a.week !== b.week ? a.week - b.week : a.day - b.day
  );
  const lastIdx = sorted.findIndex((d) => d.id === lastLog.dayId);
  if (lastIdx === -1) return sorted[0];
  return sorted[(lastIdx + 1) % sorted.length] ?? sorted[0];
}

/** Inizio della settimana corrente (lunedì 00:00) rispetto a `now`. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = new Date(now);
  const weekday = d.getDay() || 7; // domenica (0) → 7
  d.setDate(d.getDate() - (weekday - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface WeeklyStats {
  sessions: number;
  sets: number;
  volume: number; // kg complessivi (reps × peso) delle serie completate
}

/** Statistiche delle sessioni registrate nella settimana corrente. */
export function weeklyStats(logs: SessionLog[], now: Date = new Date()): WeeklyStats {
  const since = startOfWeek(now).getTime();
  const weekLogs = logs.filter((l) => new Date(l.date).getTime() >= since);

  let sets = 0;
  let volume = 0;
  for (const log of weekLogs) {
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          sets += 1;
          volume += s.reps * s.weight;
        }
      }
    }
  }
  return { sessions: weekLogs.length, sets, volume };
}

/** Numero di giorni consecutivi (fino a oggi) con almeno una sessione. */
export function currentStreak(logs: SessionLog[], now: Date = new Date()): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  let count = 0;
  for (;;) {
    const start = day.getTime();
    const end = start + 86_400_000;
    const has = logs.some((l) => {
      const t = new Date(l.date).getTime();
      return t >= start && t < end;
    });
    if (!has) break;
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}
