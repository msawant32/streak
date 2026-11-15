import { useState } from 'react';
import { useData } from '../app/data';
import { Button } from '../components/ui';
import { repo } from '../data/repo';
import { formatTime } from '../domain/dates';
import { COLORS } from '../domain/types';
import { requestReminderPermission } from '../platform/reminders';

function ChainArt({ filled }: { filled: number }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className={`h-0.5 w-5 ${i < filled ? 'bg-accent' : 'bg-transparent'}`} />}
          <span className={`grid h-12 w-12 place-items-center rounded-full border-2 font-bold ${i < filled ? 'border-accent bg-accent text-on-accent' : 'border-line'}`}>
            {i < filled ? '✓' : ''}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Onboarding() {
  const { settings, today } = useData();
  const [step, setStep] = useState(0);
  const time = formatTime(settings.defaultReminderTime);

  const steps = [
    { art: 2, title: 'Do it, then mark it done', body: 'Add something you want to do regularly, like reading 10 pages a day. Tap its circle when you have done it.' },
    { art: 4, title: 'Every day adds to your streak', body: 'Completed days build a streak. Miss a scheduled day and it starts over.' },
    { art: 5, title: 'A reminder only when you need it', body: `Streak reminds you at ${time} if something is still not done. You can change the time.` },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  async function finish(withStarter: boolean) {
    if (withStarter) {
      await requestReminderPermission().catch(() => {});
      await repo.createActivity({
        name: 'Read 10 pages',
        frequency: { type: 'daily' },
        reminder: { enabled: true, time: settings.defaultReminderTime },
        startDate: today,
        color: COLORS[0],
        icon: '📖',
      });
    }
    await repo.saveSettings({ onboardingComplete: true });
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <div>
        <p className="font-bold text-accent">Streak</p>
        <div className="mt-14"><ChainArt filled={s.art} /></div>
        <h1 className="mt-10 text-title font-bold">{s.title}</h1>
        <p className="mt-3 text-muted">{s.body}</p>
      </div>
      <div className="mt-10 flex flex-col gap-2">
        <p className="mb-2 text-sm text-muted" aria-live="polite">Step {step + 1} of {steps.length}</p>
        {last ? (
          <>
            <Button onClick={() => void finish(true)}>Start with “Read 10 pages a day”</Button>
            <Button variant="quiet" onClick={() => void finish(false)}>Start with an empty list</Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(step + 1)}>Next</Button>
            <Button variant="quiet" onClick={() => void finish(false)}>Skip</Button>
          </>
        )}
      </div>
    </main>
  );
}
