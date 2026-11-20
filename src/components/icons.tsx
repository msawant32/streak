/** Small inline icons. Stroke icons inherit the text colour. */

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--accent)" />
      <path d="M17 34.5 27 44 47 20" fill="none" stroke="var(--on-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="20" r="4.5" fill="var(--ember)" />
    </svg>
  );
}

export function Flame({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8.2 1.2c.4 2.3-.9 3.4-2 4.6C5 7.1 4 8.3 4 10.1A4 4 0 0 0 8 14a4 4 0 0 0 4-3.9c0-1.6-.8-2.8-1.6-3.6-.1 1.1-.6 1.9-1.4 2.2.4-2.6-.1-5.6-.8-7.5Z" fill="currentColor" />
    </svg>
  );
}

export function Eye({ off }: { off?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function Chevron({ dir = 'left' }: { dir?: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d={dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path d="M5.5 13.5 11 19l10-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
