import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { CoachLayout } from './components/CoachLayout';
import { Feed } from './pages/Feed';
import { Rankings } from './pages/Rankings';
import { Profile } from './pages/Profile';
import { Training } from './pages/Training';
import { Recruiting } from './pages/Recruiting';
import { Teams } from './pages/Teams';
import { Auth } from './pages/Auth';
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
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
const queryClient = new QueryClient();

// Simple role-based guard for coach routes
function CoachRouteGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('coachToken');
  const userStr = localStorage.getItem('coachUser');

  useEffect(() => {
    if (!token || !userStr) {
      navigate('/coach/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'coach' && user.role !== 'admin') {
        navigate('/coach/login');
      }
    } catch {
      navigate('/coach/login');
    }
  }, [navigate, token, userStr]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Feed />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/training" element={<Training />} />
              <Route path="/recruiting" element={<Recruiting />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/auth" element={<Auth />} />
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
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/events" element={<Events />} />
              <Route path="/drills" element={<Drills />} />
              <Route path="/nil" element={<NIL />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/video-studio" element={<VideoStudio />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/messages" element={<Messages />} />
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
              <Route path="*" element={<div className="flex h-full items-center justify-center text-dark-600">Page under construction</div>} />
            </Route>

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
    </QueryClientProvider>
  );
}

export default App;
