import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import PlanBuilder from './pages/PlanBuilder';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';
import Tools from './pages/Tools';
import ErrorBoundary from './components/ErrorBoundary';

export const PENDING_IMPORT_KEY = 'mytrainapp-pending-import';

// Intercetta i link di condivisione (.../#import=<dati>): salva il payload e
// porta l'utente alle Schede, dove viene proposto l'import.
function ImportLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const match = window.location.hash.match(/^#import=(.+)$/);
    if (!match) return;
    sessionStorage.setItem(PENDING_IMPORT_KEY, match[1]);
    // Pulisce l'hash così un refresh non re-importa.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    navigate('/plans');
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/MyTrainApp">
        <ImportLinkHandler />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plans" element={<PlanBuilder />} />
          <Route path="/workout" element={<ActiveWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/tools" element={<Tools />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
