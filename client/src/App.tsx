import { Suspense, lazy, useEffect, useRef, useState } from 'react';
// Eager imports: the persistent shells + the two entry-point pages. Loading
// these lazily would add a network round-trip to first paint, which is the
// opposite of the win this PR is going for.
import { Layout } from './components/Layout';
import { CoachLayout } from './components/CoachLayout';
import { LandingPage } from './pages/LandingPage';
import { Auth } from './pages/Auth';

// Every other route is split into its own chunk so a first-time visitor on
// /, /auth, or /coach/login does not download Feed + Profile + VideoStudio +
// admin + every coach page before the landing page paints. Each chunk loads
// the first time its route is hit, then caches.
//
// Named-export interop: the page files use `export const Foo = ...`, not a
// default export. React.lazy expects a module with `default`, so this helper
// maps the named export onto the default slot.
const lazyNamed = <T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  key: keyof T,
) => lazy(async () => {
  const m = await loader();
  return { default: m[key] as unknown as React.ComponentType<unknown> };
});

const Feed = lazyNamed(() => import('./pages/Feed'), 'Feed');
const Rankings = lazyNamed(() => import('./pages/Rankings'), 'Rankings');
const Profile = lazyNamed(() => import('./pages/Profile'), 'Profile');
const PlayerProfile = lazyNamed(() => import('./pages/PlayerProfile'), 'PlayerProfile');
const Training = lazyNamed(() => import('./pages/Training'), 'Training');
const Recruiting = lazyNamed(() => import('./pages/Recruiting'), 'Recruiting');
const Teams = lazyNamed(() => import('./pages/Teams'), 'Teams');
const AuthCallback = lazyNamed(() => import('./pages/AuthCallback'), 'AuthCallback');
const ForgotPassword = lazyNamed(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('./pages/ResetPassword'), 'ResetPassword');
const VerifyEmail = lazyNamed(() => import('./pages/VerifyEmail'), 'VerifyEmail');
const Subscription = lazyNamed(() => import('./pages/Subscription'), 'Subscription');
const Audit = lazyNamed(() => import('./pages/Audit'), 'Audit');
const Privacy = lazyNamed(() => import('./pages/Privacy'), 'Privacy');
const About = lazyNamed(() => import('./pages/About'), 'About');
const Accessibility = lazyNamed(() => import('./pages/Accessibility'), 'Accessibility');
const Contact = lazyNamed(() => import('./pages/Contact'), 'Contact');
const CookiePolicy = lazyNamed(() => import('./pages/CookiePolicy'), 'CookiePolicy');
const Terms = lazyNamed(() => import('./pages/Terms'), 'Terms');
const FAQ = lazyNamed(() => import('./pages/FAQ'), 'FAQ');
const Help = lazyNamed(() => import('./pages/Help'), 'Help');
const ThankYou = lazyNamed(() => import('./pages/ThankYou'), 'ThankYou');
const Explore = lazyNamed(() => import('./pages/Explore'), 'Explore');
const Events = lazyNamed(() => import('./pages/Events'), 'Events');
const Drills = lazyNamed(() => import('./pages/Drills'), 'Drills');
const NIL = lazyNamed(() => import('./pages/NIL'), 'NIL');
const Reels = lazyNamed(() => import('./pages/Reels'), 'Reels');
const VideoStudio = lazyNamed(() => import('./pages/VideoStudio'), 'VideoStudio');
const Settings = lazyNamed(() => import('./pages/Settings'), 'Settings');
const Messages = lazyNamed(() => import('./pages/Messages'), 'Messages');
const MaxPrepsLookup = lazyNamed(() => import('./pages/MaxPrepsLookup'), 'MaxPrepsLookup');
const CollegeFitCalculator = lazyNamed(() => import('./pages/CollegeFitCalculator'), 'CollegeFitCalculator');
const CollegeFlagFootball = lazyNamed(() => import('./pages/CollegeFlagFootball'), 'CollegeFlagFootball');
const LeagueFinder = lazyNamed(() => import('./pages/LeagueFinder'), 'LeagueFinder');
const SquadFinder = lazyNamed(() => import('./pages/SquadFinder'), 'SquadFinder');
const TeamFinder = lazyNamed(() => import('./pages/TeamFinder'), 'TeamFinder');
const ScholarshipTracker = lazyNamed(() => import('./pages/ScholarshipTracker'), 'ScholarshipTracker');
const ParentDashboard = lazyNamed(() => import('./pages/ParentDashboard'), 'ParentDashboard');
const AdminDashboard = lazyNamed(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const AdminLogin = lazyNamed(() => import('./pages/AdminLogin'), 'AdminLogin');
const StaffDashboard = lazyNamed(() => import('./pages/StaffDashboard'), 'StaffDashboard');
const StaticPageLayout = lazyNamed(() => import('./pages/StaticPageLayout'), 'StaticPageLayout');
const NotFound = lazyNamed(() => import('./pages/NotFound'), 'NotFound');
const Onboarding = lazyNamed(() => import('./pages/Onboarding'), 'Onboarding');

const CoachLogin = lazyNamed(() => import('./pages/coach/CoachLogin'), 'CoachLogin');
const CoachDashboard = lazyNamed(() => import('./pages/coach/CoachDashboard'), 'CoachDashboard');
const CoachPlayerSearch = lazyNamed(() => import('./pages/coach/CoachPlayerSearch'), 'CoachPlayerSearch');
const CoachScoutingBoard = lazyNamed(() => import('./pages/coach/CoachScoutingBoard'), 'CoachScoutingBoard');
const CoachMessages = lazyNamed(() => import('./pages/coach/CoachMessages'), 'CoachMessages');
const CoachRoster = lazyNamed(() => import('./pages/coach/CoachRoster'), 'CoachRoster');
const CoachPlayerProfile = lazyNamed(() => import('./pages/coach/CoachPlayerProfile'), 'CoachPlayerProfile');
const CoachAnalytics = lazyNamed(() => import('./pages/coach/CoachAnalytics'), 'CoachAnalytics');
const CoachApplicationsInbox = lazyNamed(() => import('./pages/coach/CoachApplicationsInbox'), 'CoachApplicationsInbox');
const CoachSignup = lazyNamed(() => import('./pages/coach/CoachSignup'), 'CoachSignup');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
const queryClient = new QueryClient();

// Scroll to top on route change, or to the hash target when one is present.
// A cold load of e.g. /#how used to land at the top because the section had
// not rendered yet when the browser tried to jump; retry briefly so deep
// links into the landing page (The Grid, Features) scroll into view.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      let tries = 0;
      const jump = () => {
        const el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
        if (tries++ < 10) requestAnimationFrame(jump);
      };
      requestAnimationFrame(jump);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

// Thin flame scroll-progress bar — visible on any scrollable standalone page
function ScrollProgressBar() {
  const [width, setWidth] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const el  = document.documentElement;
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setWidth(Number.isFinite(pct) ? Math.min(pct * 100, 100) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  if (width <= 0) return null;
  return (
    <div
      className="scroll-progress"
      style={{ width: `${width}%`, opacity: width > 2 ? 1 : 0 }}
    />
  );
}

function AthleteRouteGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) navigate('/auth');
  }, [navigate, token]);

  if (!token) return null;
  return <>{children}</>;
}

// Simple role-based guard for coach routes.
// Auth is resolved synchronously before any children render so protected
// content (athlete PII, scouting data) never flashes for unauthenticated users.
function CoachRouteGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('coachToken');
  const userStr = localStorage.getItem('coachUser');

  let isAuthorized = false;
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      isAuthorized = user.role === 'coach' || user.role === 'admin';
    } catch {
      isAuthorized = false;
    }
  }

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/coach/login');
    }
  }, [navigate, isAuthorized]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

function App() {
  // Signal JS+React are running so the CSS scroll-reveal resilience rule
  // (html:not(.js-ready) [data-reveal]) releases its forced-visible override
  // and framer-motion reveals can play. With JS off the class never lands
  // and every revealed section stays visible by default.
  useEffect(() => {
    document.documentElement.classList.add('js-ready');
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');

      await StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'ios') {
        await StatusBar.setBackgroundColor({ color: '#0a0a0a' }).catch(() => {});
      }

      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });

      const backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) CapApp.minimizeApp();
        else window.history.back();
      });

      cleanup = () => { backListener.remove(); };
    })();

    return () => { cleanup?.(); };
  }, []);

  return (
    <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
          <ScrollToTop />
          <ScrollProgressBar />
          {/* Single Suspense around the route tree. ScrollToTop +
              ScrollProgressBar + the Layout / CoachLayout shells stay outside
              so the persistent nav and chrome never blank while a route chunk
              arrives. The fallback is a tiny branded spinner on a dark
              surface — no white flash. */}
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/feed" element={<AthleteRouteGuard><Feed /></AthleteRouteGuard>} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/profile" element={<AthleteRouteGuard><Profile /></AthleteRouteGuard>} />
              <Route path="/profile/:id" element={<PlayerProfile />} />
              <Route path="/training" element={<AthleteRouteGuard><Training /></AthleteRouteGuard>} />
              <Route path="/recruiting" element={<AthleteRouteGuard><Recruiting /></AthleteRouteGuard>} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/subscribe" element={<Subscription />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/help" element={<Help />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/events" element={<Events />} />
              <Route path="/drills" element={<Drills />} />
              <Route path="/nil" element={<NIL />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/video-studio" element={<AthleteRouteGuard><VideoStudio /></AthleteRouteGuard>} />
              <Route path="/settings" element={<AthleteRouteGuard><Settings /></AthleteRouteGuard>} />
              <Route path="/messages" element={<AthleteRouteGuard><Messages /></AthleteRouteGuard>} />
              <Route path="/maxpreps" element={<MaxPrepsLookup />} />
              <Route path="/college-fit" element={<CollegeFitCalculator />} />
              <Route path="/college-flag-football" element={<CollegeFlagFootball />} />
              <Route path="/leagues" element={<LeagueFinder />} />
              <Route path="/squads" element={<SquadFinder />} />
              <Route path="/teams/find" element={<TeamFinder />} />
              <Route path="/scholarships" element={<ScholarshipTracker />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/static/:slug" element={<StaticPageLayout />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Standalone full-page routes (no nav shell) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Athlete onboarding (full-screen, no nav chrome) */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Coach Portal Routes */}
            <Route path="/coach/login" element={<CoachLogin />} />
            <Route path="/coach/signup" element={<CoachSignup />} />
            <Route element={<CoachRouteGuard><CoachLayout /></CoachRouteGuard>}>
              <Route path="/coach" element={<CoachDashboard />} />
              <Route path="/coach/dashboard" element={<CoachDashboard />} />
              <Route path="/coach/search" element={<CoachPlayerSearch />} />
              <Route path="/coach/board" element={<CoachScoutingBoard />} />
              <Route path="/coach/analytics" element={<CoachAnalytics />} />
              <Route path="/coach/applications" element={<CoachApplicationsInbox />} />
              <Route path="/coach/messages" element={<CoachMessages />} />
              <Route path="/coach/roster" element={<CoachRoster />} />
              <Route path="/coach/player/:id" element={<CoachPlayerProfile />} />
            </Route>
          </Routes>
          </Suspense>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
    {/* Vercel telemetry — siblings of the router so they observe every page
        view + every vital across the whole app. Both ship as small scripts
        from Vercel's CDN and are silent in non-Vercel environments. */}
    <Analytics />
    <SpeedInsights />
    </GlobalErrorBoundary>
  );
}

// Minimal branded fallback while a lazy route chunk arrives. The page surface
// stays dark so there is no white flash between the shell and the route.
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.18)',
          borderTopColor: '#ff5a2d',
          animation: 'auth-spin 0.65s linear infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Loading…
      </span>
    </div>
  );
}

export default App;
