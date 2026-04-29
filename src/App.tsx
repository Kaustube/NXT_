import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from "@/components/RequireAuth";
import { EmailVerificationBanner } from "@/components/EmailVerification";
import { queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/AdminLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Servers from "./pages/Servers";
import Messages from "./pages/Messages";
import Network from "./pages/Network";
import Marketplace from "./pages/Marketplace";
import Events from "./pages/Events";
import Games from "./pages/Games";
import Wordle from "./pages/games/Wordle";
import TicTacToe from "./pages/games/TicTacToe";
import Quiz from "./pages/games/Quiz";
import Memory from "./pages/games/Memory";
import Chess from "./pages/games/Chess";
import Learn from "./pages/Learn";
import LMS from "./pages/LMS";
import Sports from "./pages/Sports";
import Profile from "./pages/Profile";
import Opportunities from "./pages/Opportunities";
import PlacementDashboard from "./pages/PlacementDashboard";
import Languages from "./pages/Languages";
import Help from "./pages/Help";
import { EmailVerificationPage } from "@/components/EmailVerification";
import NotFound from "./pages/NotFound";
import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminServers from "./pages/admin/AdminServers";
import AdminChallenges from "./pages/admin/AdminChallenges";
import AdminSports from "./pages/admin/AdminSports";
import AdminLMS from "./pages/admin/AdminLMS";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminNotifications from "./pages/admin/AdminNotifications";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <EmailVerificationBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
              <Route path="/auth" element={<RedirectIfAuthed><Auth /></RedirectIfAuthed>} />
              <Route path="/verify-email" element={<RequireAuth />}>
                <Route index element={<EmailVerificationPage />} />
              </Route>

              {/* Main app */}
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/servers" element={<Servers />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/games" element={<Games />} />
                  <Route path="/games/wordle" element={<Wordle />} />
                  <Route path="/games/tictactoe" element={<TicTacToe />} />
                  <Route path="/games/quiz" element={<Quiz />} />
                  <Route path="/games/memory" element={<Memory />} />
                  <Route path="/games/chess" element={<Chess />} />
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/lms" element={<LMS />} />
                  <Route path="/sports" element={<Sports />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/placement" element={<PlacementDashboard />} />
                  <Route path="/languages" element={<Languages />} />
                  <Route path="/help" element={<Help />} />
                </Route>
              </Route>

              {/* Admin panel — requires admin role */}
              <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/servers" element={<AdminServers />} />
                  <Route path="/admin/challenges" element={<AdminChallenges />} />
                  <Route path="/admin/sports" element={<AdminSports />} />
                  <Route path="/admin/lms" element={<AdminLMS />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/notifications" element={<AdminNotifications />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
