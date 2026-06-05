import { useState, useEffect } from 'react';
import type { TrainingPlan } from '../types';
import { buildShareLink, planSummary } from '../utils/planTransfer';

export default function ShareModal({ plan, onClose }: { plan: TrainingPlan; onClose: () => void }) {
  const link = buildShareLink(plan);
  const [qr, setQr] = useState<string | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // qrcode caricato on-demand per non appesantire il bundle iniziale.
      const { default: QRCode } = await import('qrcode');
      // Prova prima con correzione M (più robusta), poi L (più capiente).
      for (const errorCorrectionLevel of ['M', 'L'] as const) {
        try {
          const url = await QRCode.toDataURL(link, {
            errorCorrectionLevel,
            margin: 2,
            width: 260,
            color: { dark: '#161210', light: '#ffffff' },
          });
          if (!cancelled) { setQr(url); setTooBig(false); }
          return;
        } catch { /* scheda troppo grande per questo livello, riprova */ }
      }
      if (!cancelled) { setQr(null); setTooBig(true); }
    })();
    return () => { cancelled = true; };
  }, [link]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard non disponibile */ }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-6"
      style={{ background: 'rgba(10,8,7,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div className="tt-card p-[22px] flex flex-col items-center gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="tt-display text-[20px] self-start">Condividi scheda</div>
        <p className="font-body text-[13px] text-text-2 self-start -mt-1">
          Inquadra il QR con la fotocamera del telefono, oppure copia il link.
        </p>

        {qr ? (
          <img src={qr} alt="QR code della scheda" className="w-[240px] h-[240px] rounded-[8px]" />
        ) : tooBig ? (
          <div className="text-center font-body text-[13px] text-text-2 py-8 px-2">
            Scheda troppo grande per un QR. Usa <span className="text-accent font-semibold">Copia link</span> o l'export su file.
          </div>
        ) : (
          <div className="w-[240px] h-[240px] flex items-center justify-center text-text-3 font-mono text-xs">…</div>
        )}

        <p className="font-mono text-[11px] text-text-3">{planSummary(plan)}</p>

        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-surface-2 border border-border text-text-2 py-[13px] rounded-btn font-display font-semibold text-[14px] cursor-pointer"
          >
            Chiudi
          </button>
          <button onClick={copyLink} className="flex-1 tt-btn-primary py-[13px] text-[14px]">
            {copied ? 'Copiato!' : 'Copia link'}
          </button>
        </div>
      </div>
    </div>
  );
}
