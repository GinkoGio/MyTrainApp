import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/usePlanStore';
import { useSessionStore } from '../store/useSessionStore';
import { uid } from '../utils/id';
import type { SessionLog, PerformedExercise } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { plans, activePlanId } = usePlanStore();
  const { active, logs, startSession } = useSessionStore();

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  const nextDay = (() => {
    if (!activePlan) return null;
    if (logs.length === 0) return activePlan.days[0] ?? null;
    const lastLog = logs.find((l) => l.planId === activePlan.id);
    if (!lastLog) return activePlan.days[0] ?? null;
    const sorted = [...activePlan.days].sort((a, b) =>
      a.week !== b.week ? a.week - b.week : a.day - b.day
    );
    const lastIdx = sorted.findIndex((d) => d.id === lastLog.dayId);
    return sorted[(lastIdx + 1) % sorted.length] ?? sorted[0];
  })();

  const handleStartWorkout = () => {
    if (!nextDay || !activePlan) return;

    const sessionLog: SessionLog = {
      id: uid(),
      planId: activePlan.id,
      planName: activePlan.name,
      dayId: nextDay.id,
      week: nextDay.week,
      day: nextDay.day,
      date: new Date().toISOString(),
      completed: false,
      exercises: nextDay.exercises.map((ex): PerformedExercise => ({
        exerciseId: ex.id,
        name: ex.name,
        restSeconds: ex.restSeconds,
        sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: false })),
      })),
    };

    startSession(sessionLog);
    navigate('/workout');
  };

  if (active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-2">Sessione in corso</p>
          <h2 className="text-2xl font-bold text-white">
            {active.log.planName} — Sett. {active.log.week} Giorno {active.log.day}
          </h2>
        </div>
        <button
          onClick={() => navigate('/workout')}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors"
        >
          Continua sessione →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">MyTrainApp</h1>
        <p className="text-slate-400">Il tuo allenamento, organizzato.</p>
      </div>

      {nextDay && activePlan ? (
        <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-slate-400 text-sm">{activePlan.name}</p>
            <p className="text-white font-bold text-xl">
              Settimana {nextDay.week} — Giorno {nextDay.day}
              {nextDay.label ? `: ${nextDay.label}` : ''}
            </p>
          </div>
          <ul className="flex flex-col gap-1">
            {nextDay.exercises.map((ex) => (
              <li key={ex.id} className="text-slate-300 text-sm flex justify-between">
                <span>{ex.name}</span>
                <span className="text-slate-500">
                  {ex.sets.length}×{ex.sets[0]?.reps ?? '?'} @ {ex.sets[0]?.weight ?? '?'}kg
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleStartWorkout}
            className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Inizia allenamento
          </button>
        </div>
      ) : (
        <div className="text-center flex flex-col gap-4">
          <p className="text-slate-400">Nessuna scheda configurata.</p>
          <button
            onClick={() => navigate('/plans')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Crea la tua prima scheda →
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/plans')}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Schede
        </button>
        <span className="text-slate-600">·</span>
        <button
          onClick={() => navigate('/history')}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Storico
        </button>
      </div>
    </div>
  );
}
