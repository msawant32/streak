import { NavLink } from 'react-router-dom';

// Three destinations only.
const items = [
  { to: '/', label: 'Today', d: 'M5 12.5l4.5 4.5L19 7.5' },
  { to: '/progress', label: 'Progress', d: 'M6 19v-6M12 19V5M18 19v-9' },
  { to: '/settings', label: 'Settings', d: 'M4 8h9m4 0h3M4 16h3m4 0h9M15 5.5v5M9 13.5v5' },
];

export function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm ${isActive ? 'font-bold text-accent' : 'text-muted'}`
              }
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d={it.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
