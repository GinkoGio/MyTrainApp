import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import BottomNav from '../components/BottomNav';

export default function History() {
  const navigate = useNavigate();
  const { logs, deleteLog } = useSessionStore();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col pb-32">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 border-b border-border px-4 pt-14 pb-[14px] flex items-center gap-3"
        style={{
          background: 'linear-gradient(180deg, rgba(22,18,16,0.96), rgba(22,18,16,0.78))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors active:scale-90 border-none bg-transparent cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="tt-display text-[26px]">Storico</h1>
      </header>

      <div className="px-4 pt-4 flex flex-col gap-[14px]">
        {logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-3 font-body">Nessuna sessione registrata.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-accent hover:text-accent-hover font-display font-semibold text-sm bg-transparent border-none cursor-pointer"
            >
              Inizia il primo allenamento →
            </button>
          </div>
        ) : (
          logs.map((log) => {
            const completedSets = log.exercises.reduce(
              (a, ex) => a + ex.sets.filter((s) => s.completed).length,
              0
            );
            const totalSets = log.exercises.reduce((a, ex) => a + ex.sets.length, 0);

            return (
              <div key={log.id} className="tt-card p-4 flex flex-col gap-[13px]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold text-[15.5px] text-text-1">
                      Giorno {log.day}
                    </p>
                    <p className="font-body text-[12.5px] text-text-2 mt-[2px]">
                      {log.planName} · Sett. {log.week}
                    </p>
                    <p className="font-mono text-[11px] text-text-3 mt-[3px] capitalize">
                      {formatDate(log.date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {log.completed ? (
                      <span className="inline-flex items-center gap-[5px] font-display font-semibold text-[11.5px] text-verde bg-verde/10 px-[10px] py-[5px] rounded-full">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Completato
                      </span>
                    ) : (
                      <span className="font-mono text-[11.5px] text-text-3">
                        {completedSets}/{totalSets}
                      </span>
                    )}
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-text-3 hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-[9px]">
                  {log.exercises.map((ex) => (
                    <div key={ex.exerciseId}>
                      <p className="font-body font-medium text-[13px] text-text-2 mb-[5px]">
                        {ex.name}
                      </p>
                      <div className="flex gap-[5px] flex-wrap">
                        {ex.sets.map((s, si) => (
                          <span
                            key={si}
                            className={`font-mono text-[11px] font-bold px-2 py-1 rounded-chip border ${
                              s.completed
                                ? 'bg-accent-soft border-accent-border text-accent'
                                : 'bg-surface-2 border-border text-text-3'
                            }`}
                          >
                            {s.reps}×{s.weight}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
