import { useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { CoachLayout } from './components/CoachLayout';
import { Feed } from './pages/Feed';
import { Rankings } from './pages/Rankings';
import { Profile } from './pages/Profile';
import { PlayerProfile } from './pages/PlayerProfile';
import { Training } from './pages/Training';
import { Recruiting } from './pages/Recruiting';
import { Teams } from './pages/Teams';
import { Auth } from './pages/Auth';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Subscription } from './pages/Subscription';
import { Audit } from './pages/Audit';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { Accessibility } from './pages/Accessibility';
import { Contact } from './pages/Contact';
import { CookiePolicy } from './pages/CookiePolicy';
import { Terms } from './pages/Terms';
import { FAQ } from './pages/FAQ';
import { Help } from './pages/Help';
import { ThankYou } from './pages/ThankYou';
import { LandingPage } from './pages/LandingPage';
import { Explore } from './pages/Explore';
import { Events } from './pages/Events';
import { Drills } from './pages/Drills';
import { NIL } from './pages/NIL';
import { Reels } from './pages/Reels';
import { VideoStudio } from './pages/VideoStudio';
import { Settings } from './pages/Settings';
import { Messages } from './pages/Messages';
import { MaxPrepsLookup } from './pages/MaxPrepsLookup';
import { CollegeFitCalculator } from './pages/CollegeFitCalculator';
import { CollegeFlagFootball } from './pages/CollegeFlagFootball';
import { LeagueFinder } from './pages/LeagueFinder';
import { SquadFinder } from './pages/SquadFinder';
import { TeamFinder } from './pages/TeamFinder';
import { ScholarshipTracker } from './pages/ScholarshipTracker';
import { ParentHub } from './pages/ParentHub';
import { ParentDashboard } from './pages/ParentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaticPageLayout } from './pages/StaticPageLayout';
import { NotFound } from './pages/NotFound';
import { Onboarding } from './pages/Onboarding';

import { CoachLogin } from './pages/coach/CoachLogin';
import { CoachDashboard } from './pages/coach/CoachDashboard';
import { CoachPlayerSearch } from './pages/coach/CoachPlayerSearch';
import { CoachScoutingBoard } from './pages/coach/CoachScoutingBoard';
import { CoachMessages } from './pages/coach/CoachMessages';
import { CoachRoster } from './pages/coach/CoachRoster';
import { CoachPlayerProfile } from './pages/coach/CoachPlayerProfile';
import { CoachAnalytics } from './pages/coach/CoachAnalytics';
import { CoachSignup } from './pages/coach/CoachSignup';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
const queryClient = new QueryClient();

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
          <ScrollToTop />
          <ScrollProgressBar />
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
              <Route path="/parent" element={<ParentHub />} />
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
            <Route path="/auth/verify" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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
              <Route path="/coach/messages" element={<CoachMessages />} />
              <Route path="/coach/roster" element={<CoachRoster />} />
              <Route path="/coach/player/:id" element={<CoachPlayerProfile />} />
            </Route>
          </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
