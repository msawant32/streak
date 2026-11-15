import { createContext, useCallback, useContext, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface Burst {
  id: number;
  x: number;
  y: number;
  label?: string;
}

type Celebrate = (origin: { x: number; y: number }, label?: string) => void;
const Ctx = createContext<Celebrate>(() => {});
export const useCelebrate = () => useContext(Ctx);

// Soft tones from the app palette only. Twelve small pieces, animated with CSS transforms:
// no library, no canvas, and nothing left in the page once it ends.
const TONES = ['var(--accent)', 'color-mix(in srgb, var(--accent) 45%, var(--surface))', 'var(--muted)'];
const PIECES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const distance = 46 + (i % 3) * 16;
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    tone: TONES[i % TONES.length],
    round: i % 2 === 0,
  };
});

/** A brief burst where the user tapped, plus an optional short message that fades away by itself. */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const timer = useRef(0);
  const celebrate = useCallback<Celebrate>((origin, label) => {
    window.clearTimeout(timer.current);
    setBurst({ id: Date.now(), ...origin, label });
    timer.current = window.setTimeout(() => setBurst(null), label ? 1900 : 900);
  }, []);

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {burst && (
        <div key={burst.id} className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {PIECES.map((p, i) => (
            <span
              key={i}
              className="burst-piece"
              style={{ left: burst.x, top: burst.y, background: p.tone, borderRadius: p.round ? '50%' : 2, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as CSSProperties}
            />
          ))}
          {burst.label && (
            <div className="absolute inset-x-0 top-1/3 flex justify-center px-6">
              <p className="burst-label rounded-full bg-accent px-6 py-3 text-center font-bold text-on-accent shadow-md">{burst.label}</p>
            </div>
          )}
        </div>
      )}
      <p className="sr-only" role="status">{burst?.label ?? ''}</p>
    </Ctx.Provider>
  );
}
