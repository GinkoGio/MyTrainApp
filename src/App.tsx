import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlanBuilder from './pages/PlanBuilder';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/MyTrainApp">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plans" element={<PlanBuilder />} />
          <Route path="/workout" element={<ActiveWorkout />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
