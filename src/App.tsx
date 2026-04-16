import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RequireAuth, RedirectIfAuthed } from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
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
import Learn from "./pages/Learn";
import LMS from "./pages/LMS";
import Sports from "./pages/Sports";
import Profile from "./pages/Profile";
import Opportunities from "./pages/Opportunities";
import PlacementDashboard from "./pages/PlacementDashboard";
import Languages from "./pages/Languages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<RedirectIfAuthed><Auth /></RedirectIfAuthed>} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
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
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/lms" element={<LMS />} />
                  <Route path="/sports" element={<Sports />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/placement" element={<PlacementDashboard />} />
                  <Route path="/languages" element={<Languages />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
