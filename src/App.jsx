import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isTabPath } from '@/lib/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { loadVoiceMode } from '@/lib/voiceMode';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import BottomTabs from '@/components/BottomTabs';
import PageSpinner from '@/components/PageSpinner';
import VoiceAssistant from './pages/VoiceAssistant';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// the heavier screens arrive on demand, so the voice screen opens straight away
const LiveRoom = lazy(() => import('./pages/LiveRoom'));
const Reels = lazy(() => import('./pages/Reels'));
const Markets = lazy(() => import('./pages/Markets'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const Chat = lazy(() => import('./pages/Chat'));
const Rap = lazy(() => import('./pages/Rap'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  // a phone that asks for less motion gets the screen change without the slide
  const calm = useReducedMotion();

  // the admin's own setting decides who answers, and it is read once for the whole app, so
  // every screen that follows the mode agrees with the one the admin last set
  useEffect(() => {
    loadVoiceMode();
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  // the four tabs share one bar, and every screen arrives from the right
  const tabbed = isTabPath(location.pathname);

  return (
    <>
      <div className={tabbed ? "tab-shell" : "plain-shell"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="h-full w-full"
            initial={calm ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={calm ? { x: 0 } : { x: "100%" }}
            transition={{ duration: calm ? 0 : 0.24, ease: "easeOut" }}
          >
            <Suspense fallback={<PageSpinner />}>
              <Routes location={location}>
                {/* Add your page Route elements here */}
                <Route path="/" element={<VoiceAssistant />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
                  <Route path="/rap" element={<Rap />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/live/:id" element={<LiveRoom />} />
                  <Route path="/u/:email" element={<Profile />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:threadId" element={<Chat />} />
                </Route>
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
      {tabbed ? <BottomTabs /> : null}
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App