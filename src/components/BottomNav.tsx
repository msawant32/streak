import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Today', d: 'M5 12.5l4.5 4.5L19 7.5' },
  { to: '/progress', label: 'Progress', d: 'M6 19v-6M12 19V5M18 19v-9' },
  { to: '/settings', label: 'Settings', d: 'M4 8h9m4 0h3M4 16h3m4 0h9M15 5.5v5M9 13.5v5' },
];

/** Material-style navigation bar: the active tab's icon sits in a soft pill. */
export function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink to={it.to} end={it.to === '/'} className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm">
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-16 place-items-center rounded-full transition-colors ${isActive ? 'bg-accent-soft text-accent' : 'text-muted'}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={it.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className={isActive ? 'font-bold text-ink' : 'text-muted'}>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
