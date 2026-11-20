import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNames } from '../app/privacy';
import { repo } from '../data/repo';
import { BrandMark, Chevron, Eye } from './icons';

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'quiet' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent',
  quiet: 'bg-accent-soft text-accent',
  danger: 'bg-transparent text-danger',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`min-h-12 rounded-2xl px-5 font-semibold transition-transform active:scale-[0.97] disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

/* ---------- Page chrome ---------- */

/** Eye button that hides or shows activity names on every screen. */
export function HideNamesButton() {
  const { hidden } = useNames();
  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={hidden ? 'Show activity names' : 'Hide activity names'}
      title={hidden ? 'Show names' : 'Hide names'}
      onClick={() => void repo.saveSettings({ hideNames: !hidden })}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${hidden ? 'bg-accent text-on-accent' : 'bg-surface text-ink shadow-[var(--shadow)] ring-1 ring-line'}`}
    >
      <Eye off={hidden} />
    </button>
  );
}

/**
 * Top of every screen: either the brand (main tabs) or a Back button, then the title.
 * The hide-names button is always in the top-right corner.
 */
export function PageHeader({ title, sub, back, action, brand }: { title?: string; sub?: string; back?: boolean; action?: ReactNode; brand?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex min-h-12 items-center justify-between gap-2">
        {back ? (
          <button type="button" onClick={() => navigate(-1)} className="-ml-2 flex min-h-11 items-center gap-0.5 rounded-full px-2 font-semibold text-accent">
            <Chevron /> Back
          </button>
        ) : brand ? (
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <BrandMark size={26} /> streak
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1">
          {action}
          <HideNamesButton />
        </span>
      </div>
      {title && <h1 className="mt-2 truncate text-title font-bold">{title}</h1>}
      {sub && <p className="mt-0.5 text-muted">{sub}</p>}
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 pb-4">
      <h2 className="mb-2 font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-surface shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-sunk p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-full px-3 text-sm font-semibold ${value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Confirm dialog ---------- */

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,24rem)] rounded-3xl bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </dialog>
  );
}

/* ---------- Toast with Undo ---------- */

interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        {toast && (
          <div key={toast.id} className="rise pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-ink py-2 pl-5 pr-2 text-bg shadow-lg">
            <span className="py-2 font-medium">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="min-h-11 rounded-full px-4 font-bold underline underline-offset-4"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
