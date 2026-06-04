import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/usePlanStore';
import { useSessionStore } from '../store/useSessionStore';
import { uid } from '../utils/id';
import type { SessionLog, PerformedExercise } from '../types';
import BottomNav from '../components/BottomNav';
import { nextDayFor, weeklyStats, currentStreak } from '../store/selectors';

function CornerTicks() {
  return (
    <>
      <span className="absolute top-[9px] left-[9px] w-3 h-3 pointer-events-none opacity-70 border-t-[1.5px] border-l-[1.5px] border-accent" />
      <span className="absolute bottom-[9px] right-[9px] w-3 h-3 pointer-events-none opacity-70 border-b-[1.5px] border-r-[1.5px] border-accent" />
    </>
  );
}

function BrandRow({ streak }: { streak: number }) {
  return (
    <div className="flex items-center justify-between mt-1">
      <div className="flex items-center gap-[9px]">
        <div className="w-[30px] h-[30px] rounded-[8px] bg-accent flex items-center justify-center shadow-cta shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span className="font-display font-bold text-[16px] tracking-[-0.01em] text-text-1">MyTrainApp</span>
      </div>
      <div className="flex items-center gap-[6px] px-[11px] py-[6px] rounded-full bg-accent-soft border border-accent-border text-accent">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 0 1-7 7 7 7 0 0 1-7-7c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
        <span className="font-mono font-bold text-[12.5px]">{streak}</span>
      </div>
    </div>
  );
}

function MiniMeta({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-[17px] text-text-1 leading-none">{value}</span>
      <span className="font-body text-[10.5px] text-text-3 uppercase tracking-[0.08em] mt-[3px]">{label}</span>
    </div>
  );
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="tt-card p-[14px_12px] flex flex-col gap-[5px]" style={{ boxShadow: 'none' }}>
      <span className="tt-data text-[26px]">{value}</span>
      <span className="font-body text-[10.5px] text-text-3 uppercase tracking-[0.06em]">{label}</span>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { plans, activePlanId } = usePlanStore();
  const { active, logs, startSession } = useSessionStore();

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  const nextDay = nextDayFor(activePlan, logs);

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

  // Statistiche derivate (vedi store/selectors.ts)
  const week = weeklyStats(logs);
  const weekVolumeStr =
    week.volume >= 1000 ? `${(week.volume / 1000).toFixed(1)}t` : `${week.volume}`;
  const streak = currentStreak(logs);

  if (active) {
    return (
      <div className="max-w-lg mx-auto min-h-screen flex flex-col px-5 pt-14 pb-32">
        <BrandRow streak={streak} />
        <div className="flex-1 flex flex-col gap-5 mt-8">
          <div className="tt-card p-5 relative flex flex-col gap-4">
            <CornerTicks />
            <span className="tt-eyebrow">Sessione in corso</span>
            <p className="tt-display text-[22px]">
              {active.log.planName} — Sett.&nbsp;{active.log.week} Giorno&nbsp;{active.log.day}
            </p>
            <button
              onClick={() => navigate('/workout')}
              className="tt-btn-primary py-[14px] px-[22px] text-[15.5px] w-full"
            >
              Continua sessione →
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col px-5 pt-14 pb-32">
      <BrandRow streak={streak} />

      <div className="flex flex-col gap-[22px] mt-8">
        {/* Hero eyebrow + title */}
        <div>
          <span className="tt-eyebrow">Prossima sessione</span>
          <div className="tt-display text-[33px] mt-[9px]">
            {nextDay ? (
              <>
                Giorno {nextDay.day}
                {nextDay.label && (
                  <> · <span className="text-accent">{nextDay.label}</span></>
                )}
              </>
            ) : (
              'Pronto a iniziare'
            )}
          </div>
        </div>

        {nextDay && activePlan ? (
          <div className="tt-card p-[18px] flex flex-col gap-[15px] relative">
            <CornerTicks />
            <div className="flex justify-between items-baseline">
              <span className="font-body font-semibold text-[13.5px] text-text-2">{activePlan.name}</span>
              <span className="font-mono text-[11.5px] text-text-3 tracking-[0.04em]">
                SETT. {nextDay.week}
              </span>
            </div>

            <div className="flex flex-col gap-[9px]">
              {nextDay.exercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-[11px]">
                  <span className="font-mono text-[11px] text-text-3 w-[18px] shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 font-body text-[14.5px] font-medium text-text-1 truncate">
                    {ex.name}
                  </span>
                  <span className="font-mono text-[12px] text-text-2 shrink-0">
                    {ex.sets.length}×{ex.sets[0]?.reps ?? '?'} · {ex.sets[0]?.weight ?? '?'}kg
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-4">
                <MiniMeta value={nextDay.exercises.length} label="esercizi" />
                <MiniMeta
                  value={nextDay.exercises.reduce((a, e) => a + e.sets.length, 0)}
                  label="serie"
                />
              </div>
              <button onClick={handleStartWorkout} className="tt-btn-primary py-[14px] px-[22px] text-[15.5px]">
                Inizia →
              </button>
            </div>
          </div>
        ) : (
          <div className="tt-card p-6 flex flex-col gap-4 items-center text-center">
            <p className="font-body text-text-2 text-[14.5px]">Nessuna scheda configurata.</p>
            <button
              onClick={() => navigate('/plans')}
              className="tt-btn-primary py-[14px] px-[22px] text-[15.5px]"
            >
              Crea la prima scheda
            </button>
          </div>
        )}

        {/* Stats strip */}
        <div>
          <span
            className="tt-eyebrow"
            style={{ color: 'var(--color-text-3)' }}
          >
            Questa settimana
          </span>
          <div className="grid grid-cols-3 gap-[10px] mt-[10px]">
            <StatCell value={week.sessions} label="sessioni" />
            <StatCell value={week.sets} label="serie" />
            <StatCell value={weekVolumeStr} label="ton. volume" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
