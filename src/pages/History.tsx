import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';

export default function History() {
  const navigate = useNavigate();
  const { logs, deleteLog } = useSessionStore();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">←</button>
        <h1 className="text-2xl font-bold text-white">Storico</h1>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">Nessuna sessione registrata.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">
            Inizia il primo allenamento →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {logs.map((log) => {
            const completedSets = log.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.completed).length, 0);
            const totalSets = log.exercises.reduce((a, ex) => a + ex.sets.length, 0);
            return (
              <div key={log.id} className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">
                      Sett. {log.week} — Giorno {log.day}
                    </p>
                    <p className="text-slate-400 text-sm">{log.planName}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatDate(log.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{completedSets}/{totalSets} serie</span>
                    {log.completed && (
                      <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full">
                        Completato
                      </span>
                    )}
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-red-600 hover:text-red-400 text-sm ml-1"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {log.exercises.map((ex) => (
                    <div key={ex.exerciseId}>
                      <p className="text-slate-300 text-sm font-medium">{ex.name}</p>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {ex.sets.map((s, si) => (
                          <div
                            key={si}
                            className={`text-xs px-2 py-1 rounded-lg ${
                              s.completed
                                ? 'bg-emerald-900/40 text-emerald-300'
                                : 'bg-slate-700 text-slate-500'
                            }`}
                          >
                            {s.reps}×{s.weight}kg
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
