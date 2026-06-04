import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'home',    path: '/',        label: 'Home' },
  { id: 'plans',   path: '/plans',   label: 'Schede' },
  { id: 'train',   path: '/workout', label: 'Allena' },
  { id: 'history', path: '/history', label: 'Storico' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function PlansIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="12" y2="16"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function NavIcon({ id }: { id: NavId }) {
  if (id === 'home')    return <HomeIcon />;
  if (id === 'plans')   return <PlansIcon />;
  if (id === 'train')   return <PlayIcon />;
  if (id === 'history') return <HistoryIcon />;
  return null;
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeId: NavId =
    location.pathname === '/'        ? 'home'
    : location.pathname === '/plans'   ? 'plans'
    : location.pathname === '/workout' ? 'train'
    : location.pathname === '/history' ? 'history'
    : 'home';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9] flex justify-around px-1 pt-[9px] pb-[30px] border-t border-border"
      style={{
        background: 'linear-gradient(180deg, rgba(26,22,20,0.82), rgba(26,22,20,0.97))',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`relative flex flex-col items-center gap-1 px-2.5 py-1 transition-colors cursor-pointer border-none bg-transparent ${
              isActive ? 'text-accent' : 'text-text-3'
            }`}
          >
            {isActive && (
              <span
                className="absolute -top-[9px] w-[22px] h-[2.5px] rounded-full bg-accent"
                style={{ boxShadow: '0 0 10px #e8700a' }}
              />
            )}
            <NavIcon id={item.id} />
            <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase font-bold">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
