import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const { active, completeSet, updateSet, skipRest, goToSet, finishSession, abandonSession } = useSessionStore();

  const [now, setNow] = useState(Date.now());
  const [editReps, setEditReps] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [showAbandon, setShowAbandon] = useState(false);

  // Tick every second for the timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Beep when rest ends
  const prevRestingRef = useCallback((node: unknown) => { void node; }, []);
  void prevRestingRef;

  useEffect(() => {
    if (!active?.restingUntil) return;
    if (now >= active.restingUntil) {
      // Play a simple beep using Web Audio API
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }
  }, [active?.restingUntil, now]);

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <p className="text-slate-400">Nessuna sessione attiva.</p>
        <button onClick={() => navigate('/')} className="text-indigo-400 hover:text-indigo-300">← Home</button>
      </div>
    );
  }

  const { log, currentExerciseIndex, currentSetIndex, restingUntil } = active;
  const exercises = log.exercises;
  const currentEx = exercises[currentExerciseIndex];
  const currentSet = currentEx?.sets[currentSetIndex];

  const isResting = restingUntil !== null && now < restingUntil;
  const restRemaining = restingUntil ? Math.max(0, Math.ceil((restingUntil - now) / 1000)) : 0;

  const isLastSet = currentSetIndex >= (currentEx?.sets.length ?? 1) - 1;
  const isLastExercise = currentExerciseIndex >= exercises.length - 1;
  const isWorkoutDone = exercises.every((ex) => ex.sets.every((s) => s.completed));

  const completedSetsTotal = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const progress = totalSets > 0 ? completedSetsTotal / totalSets : 0;

  const handleCompleteSet = () => {
    const reps = editReps ?? currentSet.reps;
    const weight = editWeight ?? currentSet.weight;
    completeSet(currentExerciseIndex, currentSetIndex, reps, weight);
    setEditReps(null);
    setEditWeight(null);
  };

  const handleUpdateField = (field: 'reps' | 'weight', value: number) => {
    if (field === 'reps') setEditReps(value);
    else setEditWeight(value);
    updateSet(currentExerciseIndex, currentSetIndex, { [field]: value });
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-500 text-xs">{log.planName}</p>
          <p className="text-white font-semibold">Sett. {log.week} — Giorno {log.day}</p>
        </div>
        <button onClick={() => setShowAbandon(true)} className="text-slate-500 hover:text-slate-300 text-sm">
          Abbandona
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {isWorkoutDone ? (
        <WorkoutDone onFinish={() => { finishSession(); navigate('/'); }} />
      ) : (
        <>
          {/* Rest timer overlay */}
          {isResting && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <p className="text-slate-400 text-sm uppercase tracking-widest">Pausa</p>
              <div className="text-8xl font-mono font-bold text-white tabular-nums">
                {String(Math.floor(restRemaining / 60)).padStart(2, '0')}:
                {String(restRemaining % 60).padStart(2, '0')}
              </div>
              <p className="text-slate-400 text-sm">
                Prossimo: {isLastSet && !isLastExercise
                  ? exercises[currentExerciseIndex + 1]?.name
                  : `${currentEx?.name} — Serie ${currentSetIndex + 1}`}
              </p>
              <button
                onClick={skipRest}
                className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Salta pausa
              </button>
            </div>
          )}

          {/* Active set */}
          {!isResting && currentEx && currentSet && (
            <div className="flex-1 flex flex-col gap-6">
              {/* Exercise name + set counter */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-1">{currentEx.name}</h2>
                <p className="text-slate-400">
                  Serie {currentSetIndex + 1} / {currentEx.sets.length}
                  <span className="mx-2 text-slate-600">·</span>
                  Pausa {currentEx.restSeconds}s
                </p>
              </div>

              {/* Reps & Weight inputs */}
              <div className="flex gap-4 justify-center">
                <SetInput
                  label="Reps"
                  value={editReps ?? currentSet.reps}
                  onChange={(v) => handleUpdateField('reps', v)}
                />
                <SetInput
                  label="Kg"
                  value={editWeight ?? currentSet.weight}
                  onChange={(v) => handleUpdateField('weight', v)}
                  step={0.5}
                />
              </div>

              {/* Complete button */}
              <button
                onClick={handleCompleteSet}
                className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold py-5 rounded-2xl text-xl transition-all"
              >
                ✓ Serie completata
              </button>

              {/* All sets overview */}
              <div className="flex flex-col gap-2">
                {exercises.map((ex, ei) => (
                  <div key={ex.exerciseId}>
                    <p className="text-slate-500 text-xs mb-1">{ex.name}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {ex.sets.map((s, si) => {
                        const isCurrent = ei === currentExerciseIndex && si === currentSetIndex;
                        return (
                          <button
                            key={si}
                            onClick={() => !s.completed && goToSet(ei, si)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                              s.completed
                                ? 'bg-emerald-600 text-emerald-100'
                                : isCurrent
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {si + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Abandon confirm */}
      {showAbandon && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex flex-col gap-4 w-full max-w-sm">
            <p className="text-white font-bold text-lg">Abbandonare la sessione?</p>
            <p className="text-slate-400 text-sm">I progressi non verranno salvati.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbandon(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl"
              >
                Continua
              </button>
              <button
                onClick={() => { abandonSession(); navigate('/'); }}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold"
              >
                Abbandona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetInput({
  label, value, onChange, step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 bg-slate-800 rounded-2xl p-4 w-36">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg flex items-center justify-center"
        >
          −
        </button>
        <span className="text-white font-bold text-2xl w-12 text-center tabular-nums">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}

function WorkoutDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="text-6xl">💪</div>
      <h2 className="text-3xl font-bold text-white">Allenamento completato!</h2>
      <p className="text-slate-400">Ottimo lavoro. Continua così.</p>
      <button
        onClick={onFinish}
        className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
      >
        Salva e torna a home
      </button>
    </div>
  );
}
