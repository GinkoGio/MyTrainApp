import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';

function CornerTicks() {
  return (
    <>
      <span className="absolute top-[9px] left-[9px] w-3 h-3 pointer-events-none opacity-50 border-t-[1.5px] border-l-[1.5px] border-accent" />
      <span className="absolute bottom-[9px] right-[9px] w-3 h-3 pointer-events-none opacity-50 border-b-[1.5px] border-r-[1.5px] border-accent" />
    </>
  );
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const { active, completeSet, updateSet, skipRest, goToSet, finishSession, abandonSession } = useSessionStore();

  const [now, setNow] = useState(() => Date.now());
  const [editReps, setEditReps] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [showAbandon, setShowAbandon] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Beep when rest ends
  useEffect(() => {
    if (!active?.restingUntil) return;
    if (now >= active.restingUntil) {
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
      } catch { /* AudioContext non disponibile — ignora */ }
    }
  }, [active?.restingUntil, now]);

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <p className="text-text-3 font-body">Nessuna sessione attiva.</p>
        <button
          onClick={() => navigate('/')}
          className="text-accent hover:text-accent-hover font-display font-semibold bg-transparent border-none cursor-pointer"
        >
          ← Home
        </button>
      </div>
    );
  }

  const { log, currentExerciseIndex, currentSetIndex, restingUntil } = active;
  const exercises = log.exercises;
  const currentEx = exercises[currentExerciseIndex];
  const currentSet = currentEx?.sets[currentSetIndex];

  const isResting = restingUntil !== null && now < restingUntil;
  const restRemaining = restingUntil ? Math.max(0, Math.ceil((restingUntil - now) / 1000)) : 0;
  // Total length of the current rest, used as the ring's full circumference.
  const totalRest = Math.max(restRemaining, currentEx?.restSeconds ?? 1);

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

  const nextLabel = isLastSet && !isLastExercise
    ? exercises[currentExerciseIndex + 1]?.name ?? 'Fine allenamento'
    : `${currentEx?.name ?? ''} · Serie ${currentSetIndex + 1}`;

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[11px] text-text-3 uppercase tracking-[0.06em]">{log.planName}</p>
          <p className="tt-display text-[15px]">Sett. {log.week} · Giorno {log.day}</p>
        </div>
        {!isWorkoutDone && (
          <button
            onClick={() => setShowAbandon(true)}
            className="text-text-3 hover:text-text-2 font-display font-semibold text-sm bg-transparent border-none cursor-pointer"
          >
            Abbandona
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-[10px] mb-6">
        <div className="flex-1 h-[5px] bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              boxShadow: '0 0 12px #e8700a',
            }}
          />
        </div>
        <span className="font-mono text-[11.5px] text-text-3">
          {completedSetsTotal}/{totalSets}
        </span>
      </div>

      {isWorkoutDone ? (
        <WorkoutDone onFinish={() => { finishSession(); navigate('/'); }} />
      ) : (
        <>
          {/* Rest timer */}
          {isResting && (
            <RestTimer
              restRemaining={restRemaining}
              totalRest={totalRest}
              nextLabel={nextLabel}
              onSkip={skipRest}
            />
          )}

          {/* Active set */}
          {!isResting && currentEx && currentSet && (
            <div className="flex-1 flex flex-col gap-6">
              <div className="text-center mt-[6px]">
                <span className="tt-eyebrow">
                  Serie {currentSetIndex + 1} di {currentEx.sets.length}
                </span>
                <div className="tt-display text-[32px] mt-2">{currentEx.name}</div>
              </div>

              {/* Reps & Weight */}
              <div className="flex gap-3 justify-center">
                <SetInput
                  label="REPS"
                  value={editReps ?? currentSet.reps}
                  onChange={(v) => handleUpdateField('reps', v)}
                />
                <SetInput
                  label="KG"
                  value={editWeight ?? currentSet.weight}
                  onChange={(v) => handleUpdateField('weight', v)}
                  step={0.5}
                />
              </div>

              {/* Complete button */}
              <button
                onClick={handleCompleteSet}
                className="tt-btn-primary py-[18px] w-full text-[17px] flex items-center justify-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Serie completata
              </button>

              {/* Set map */}
              <div className="flex flex-col gap-3">
                {exercises.map((ex, ei) => (
                  <div key={ex.exerciseId}>
                    <p
                      className={`font-body text-[11.5px] mb-[6px] ${
                        ei === currentExerciseIndex ? 'text-text-1 font-bold' : 'text-text-3 font-medium'
                      }`}
                    >
                      {ex.name}
                    </p>
                    <div className="flex gap-[6px] flex-wrap">
                      {ex.sets.map((s, si) => {
                        const isCurrent = ei === currentExerciseIndex && si === currentSetIndex;
                        return (
                          <button
                            key={si}
                            onClick={() => !s.completed && goToSet(ei, si)}
                            aria-label={`${ex.name}, serie ${si + 1}${s.completed ? ' completata' : ''}`}
                            className={`w-[34px] h-[34px] rounded-chip font-mono font-bold text-[12.5px] flex items-center justify-center transition-all border cursor-pointer ${
                              s.completed
                                ? 'bg-accent text-on-accent border-transparent'
                                : isCurrent
                                ? 'bg-accent-soft text-accent border-accent'
                                : 'bg-surface-2 text-text-3 border-border hover:border-accent-border'
                            }`}
                            style={isCurrent ? { boxShadow: '0 0 12px rgba(232,112,10,0.34)' } : undefined}
                          >
                            {s.completed ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              si + 1
                            )}
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
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: 'rgba(10,8,7,0.6)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowAbandon(false)}
        >
          <div
            className="tt-card p-[22px] flex flex-col gap-[8px] w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tt-display text-[20px]">Abbandonare la sessione?</div>
            <p className="font-body text-[13.5px] text-text-2">
              I progressi di questa sessione non verranno salvati.
            </p>
            <div className="flex gap-[10px] mt-[10px]">
              <button
                onClick={() => setShowAbandon(false)}
                className="flex-1 bg-surface-2 border border-border text-text-2 py-[13px] rounded-btn font-display font-semibold text-[14.5px] cursor-pointer"
              >
                Continua
              </button>
              <button
                onClick={() => { abandonSession(); navigate('/'); }}
                className="flex-1 bg-danger text-white py-[13px] rounded-btn font-display font-bold text-[14.5px] border-none cursor-pointer hover:opacity-90"
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

function RestTimer({
  restRemaining,
  totalRest,
  nextLabel,
  onSkip,
}: {
  restRemaining: number;
  totalRest: number;
  nextLabel: string;
  onSkip: () => void;
}) {
  const r = 92;
  const circ = 2 * Math.PI * r;
  const frac = totalRest > 0 ? restRemaining / totalRest : 0;
  const offset = circ * (1 - frac);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-[26px]">
      <CornerTicks />
      <span className="tt-eyebrow">Pausa</span>

      <div className="relative w-[220px] h-[220px] flex items-center justify-center">
        <svg
          width="220"
          height="220"
          className="absolute"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.075)" strokeWidth="8" />
          <circle
            cx="110" cy="110" r={r}
            fill="none"
            stroke="#e8700a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s linear',
              filter: 'drop-shadow(0 0 8px #e8700a)',
            }}
          />
        </svg>
        <span className="tt-data text-[66px]">
          {String(Math.floor(restRemaining / 60)).padStart(2, '0')}:{String(restRemaining % 60).padStart(2, '0')}
        </span>
      </div>

      <div className="font-body text-[13.5px] text-text-2 text-center">
        Prossimo:{' '}
        <span className="text-text-1 font-semibold">{nextLabel}</span>
      </div>

      <button
        onClick={onSkip}
        className="bg-surface-2 border border-border rounded-btn px-6 py-3 text-text-2 font-display font-semibold text-[14.5px] flex items-center gap-[7px] cursor-pointer hover:border-accent-border"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
        Salta pausa
      </button>
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
    <div className="tt-card flex-1 p-[16px_12px] flex flex-col items-center gap-3 relative" style={{ boxShadow: 'none' }}>
      <span
        className="tt-eyebrow"
        style={{ color: 'var(--color-text-3)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-[10px]">
        <button
          onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))}
          aria-label={`Diminuisci ${label}`}
          className="w-[46px] h-[46px] rounded-full border border-border bg-surface-inset text-text-1 flex items-center justify-center shrink-0 cursor-pointer hover:border-accent-border transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <span
          className="font-mono font-bold text-[30px] tabular-nums text-text-1 min-w-[46px] text-center"
          style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <button
          onClick={() => onChange(+(value + step).toFixed(1))}
          aria-label={`Aumenta ${label}`}
          className="w-[46px] h-[46px] rounded-full border border-border bg-surface-inset text-text-1 flex items-center justify-center shrink-0 cursor-pointer hover:border-accent-border transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function WorkoutDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-[20px] text-center">
      <div className="w-[84px] h-[84px] rounded-full bg-accent-soft border border-accent-border text-accent flex items-center justify-center shadow-cta">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      </div>
      <div className="tt-display text-[30px]">
        Allenamento<br />completato
      </div>
      <p className="font-body text-[14.5px] text-text-2">Ottimo lavoro. Continua così.</p>
      <button
        onClick={onFinish}
        className="tt-btn-primary py-[14px] px-[22px] text-[15.5px] mt-[6px]"
      >
        Salva e torna alla home
      </button>
    </div>
  );
}
