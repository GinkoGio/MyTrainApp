import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrainingPlan } from '../types';
import { parsePlansCsv, CSV_TEMPLATE } from '../utils/csvImport';
import { buildShareLink, planSummary } from '../utils/planTransfer';
import ShareModal from '../components/ShareModal';

export default function Tools() {
  const navigate = useNavigate();
  const [csv, setCsv] = useState('');
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<TrainingPlan | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleGenerate = () => {
    try {
      setPlans(parsePlansCsv(csv));
      setError(null);
    } catch (err) {
      setPlans([]);
      setError(err instanceof Error ? err.message : 'CSV non valido.');
    }
  };

  const copyLink = async (plan: TrainingPlan) => {
    try {
      await navigator.clipboard.writeText(buildShareLink(plan));
      setCopiedId(plan.id);
      setTimeout(() => setCopiedId((id) => (id === plan.id ? null : id)), 1800);
    } catch { /* clipboard non disponibile */ }
  };

  const copyAll = async () => {
    const text = plans.map((p) => `${p.name}: ${buildShareLink(p)}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch { /* clipboard non disponibile */ }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-schede.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col pb-16">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-border px-4 pt-14 pb-[14px] flex items-center gap-3"
        style={{
          background: 'linear-gradient(180deg, rgba(22,18,16,0.96), rgba(22,18,16,0.78))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => navigate('/plans')}
          aria-label="Torna alle schede"
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors active:scale-90 border-none bg-transparent cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="tt-display text-[22px]">Genera link in blocco</h1>
      </header>

      <div className="p-4 flex flex-col gap-4">
        <p className="font-body text-[13.5px] text-text-2 leading-relaxed">
          Incolla un CSV dal tuo foglio di calcolo: una riga per esercizio, con la
          colonna <span className="text-accent font-semibold">cliente</span> a raggruppare le schede.
          Per ogni cliente ottieni un link/QR da inviare.
        </p>

        <div className="flex items-center justify-between">
          <span className="tt-eyebrow" style={{ color: 'var(--color-text-3)' }}>Colonne</span>
          <button
            onClick={downloadTemplate}
            className="text-xs text-accent hover:text-accent-hover font-display font-semibold bg-transparent border-none cursor-pointer"
          >
            ⤓ Scarica template CSV
          </button>
        </div>
        <p className="font-mono text-[11px] text-text-3 -mt-2">
          cliente, settimana, giorno, etichetta, esercizio, serie, reps, peso, pausa
        </p>
        <p className="font-body text-[12px] text-text-3 -mt-2 leading-relaxed">
          Suggerimenti: <span className="text-text-2">peso</span> e <span className="text-text-2">reps</span> accettano
          testo (es. <span className="font-mono">max</span>, <span className="font-mono">1/2 peso max</span>).
          Serie variabili: usa gruppi separati da <span className="font-mono">-</span>, es.
          serie <span className="font-mono">2-1-1</span>, reps <span className="font-mono">8-7-7</span>,
          peso <span className="font-mono">12-11-9</span>.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={'cliente,settimana,giorno,etichetta,esercizio,serie,reps,peso,pausa\nMario,1,1,Push,Panca piana,5,6,60,90'}
          rows={8}
          className="w-full bg-surface text-text-1 rounded-input px-3 py-2.5 text-[12.5px] font-mono outline-none border border-border focus:border-accent transition-colors resize-y placeholder:text-text-3"
          style={{ background: '#1f1814' }}
        />

        <button
          onClick={handleGenerate}
          disabled={!csv.trim()}
          className="tt-btn-primary py-[13px] text-[15px] disabled:opacity-40 w-full"
        >
          Genera link
        </button>

        {error && (
          <div className="tt-card p-4 border border-danger/40">
            <p className="font-display font-bold text-[14px] text-danger mb-1">CSV non valido</p>
            <p className="font-body text-[13px] text-text-2">{error}</p>
          </div>
        )}

        {plans.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-1">
              <span className="tt-eyebrow">{plans.length} schede</span>
              <button
                onClick={copyAll}
                className="text-xs text-accent hover:text-accent-hover font-display font-semibold bg-transparent border-none cursor-pointer"
              >
                {copiedAll ? 'Copiati!' : 'Copia tutti i link'}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {plans.map((plan) => (
                <div key={plan.id} className="tt-card p-[14px] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-[15px] text-text-1 truncate">{plan.name}</p>
                    <p className="font-mono text-[11px] text-text-3">{planSummary(plan)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => copyLink(plan)}
                      className="text-xs bg-surface-2 border border-border hover:border-accent-border text-text-2 px-3 py-2 rounded-btn font-display font-semibold cursor-pointer transition-colors"
                    >
                      {copiedId === plan.id ? 'Copiato!' : 'Copia link'}
                    </button>
                    <button
                      onClick={() => setShareTarget(plan)}
                      aria-label={`Mostra QR per ${plan.name}`}
                      className="text-xs bg-accent-soft border border-accent-border text-accent px-3 py-2 rounded-btn font-display font-semibold cursor-pointer"
                    >
                      QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {shareTarget && <ShareModal plan={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  );
}
