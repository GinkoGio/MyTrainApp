import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Cattura le eccezioni di render dell'albero figlio ed evita lo schermo bianco.
 * Offre un reset dei dati locali, utile se lo stato in localStorage si corrompe.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary ha catturato un errore:', error, info);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('train-plans');
      localStorage.removeItem('train-sessions');
    } catch { /* localStorage non disponibile — ignora */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-danger/12 border border-danger/30 text-danger flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="tt-display text-[24px]">Qualcosa è andato storto</div>
        <p className="font-body text-[14px] text-text-2 max-w-xs">
          Si è verificato un errore imprevisto. Puoi ricaricare l'app oppure, se il
          problema persiste, azzerare i dati salvati su questo dispositivo.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button onClick={this.handleReload} className="tt-btn-primary py-[14px] px-[22px] text-[15px] w-full">
            Ricarica l'app
          </button>
          <button
            onClick={this.handleReset}
            className="bg-surface-2 border border-border text-text-2 py-[13px] rounded-btn font-display font-semibold text-[14px] w-full cursor-pointer hover:border-danger/40 hover:text-danger transition-colors"
          >
            Azzera i dati locali
          </button>
        </div>
      </div>
    );
  }
}
