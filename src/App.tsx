import { Component, useEffect, type ReactNode } from 'react';
import { HashRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DataProvider, useData } from './app/data';
import { BottomNav } from './components/BottomNav';
import { CelebrateProvider } from './components/Celebrate';
import { ToastProvider } from './components/ui';
import { db } from './data/db';
import { repo } from './data/repo';
import { planReminders } from './domain/streaks';
import { ActivityDetail } from './features/ActivityDetail';
import { ActivityForm } from './features/ActivityForm';
import { Onboarding } from './features/Onboarding';
import { Progress } from './features/Progress';
import { SettingsPage } from './features/Settings';
import { Today } from './features/Today';
import { initNativeNavigation } from './platform/native';
import { initReminders, syncReminders } from './platform/reminders';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto grid h-full max-w-sm place-items-center p-8 text-center">
        <div>
          <h1 className="text-title font-bold">Something went wrong</h1>
          <p className="mt-2 text-muted">Your activities are safe on this device. Reload to continue.</p>
          <button type="button" className="mt-5 min-h-12 rounded-full bg-accent px-6 font-semibold text-on-accent" onClick={() => window.location.reload()}>
            Reload Streak
          </button>
        </div>
      </main>
    );
  }
}

/** Applies the theme and keeps scheduled reminders in step with the data. */
function Effects() {
  const { activities, maps, settings, today } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c2222' : '#f5f6f4');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);

  useEffect(() => {
    initNativeNavigation(navigate);
    void initReminders({
      onOpen: (id) => navigate(`/activities/${id}`),
      onMarkDone: (id, date) => void db.activities.get(id).then((a) => a && repo.markDone(a, date)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sync = () => void syncReminders(planReminders(activities, maps, new Date(), today, 7, settings.weekStartsOn));
    sync();
    const onVisible = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activities, maps, settings.weekStartsOn, today]);

  return null;
}

function Shell() {
  const { pathname } = useLocation();
  // Forms take the whole screen, as is standard on phones; the tabs return when you leave.
  const focused = /\/(new|edit)$/.test(pathname);
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollTo, which must not become the cleanup.
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <main className={`mx-auto min-h-full max-w-lg ${focused ? 'pb-6' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'}`}>
        <Outlet />
      </main>
      {!focused && <BottomNav />}
    </>
  );
}

function Root() {
  const { settings } = useData();
  return (
    <>
      <Effects />
      {settings.onboardingComplete ? (
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="activities/new" element={<ActivityForm />} />
            <Route path="activities/:id" element={<ActivityDetail />} />
            <Route path="activities/:id/edit" element={<ActivityForm />} />
            <Route path="progress" element={<Progress />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      ) : (
        <Onboarding />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <DataProvider>
          <ToastProvider>
            <CelebrateProvider>
              <Root />
            </CelebrateProvider>
          </ToastProvider>
        </DataProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
