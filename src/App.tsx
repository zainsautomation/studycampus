// App entry point
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { GoogleDriveProvider } from "@/contexts/GoogleDriveContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import SavedNotes from "./pages/SavedNotes";
import Announcements from "./pages/Announcements";
import Updates from "./pages/Updates";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageNotes from "./pages/admin/ManageNotes";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import ManageUpdates from "./pages/admin/ManageUpdates";
import ManageSubjects from "./pages/admin/ManageSubjects";
import ManageUsers from "./pages/admin/ManageUsers";
import Analytics from "./pages/admin/Analytics";
import QandA from "./pages/QandA";
import QuestionDetail from "./pages/QuestionDetail";
import Posts from "./pages/Posts";
import Requests from "./pages/Requests";
import ManageQandA from "./pages/admin/ManageQandA";
import ManagePosts from "./pages/admin/ManagePosts";
import ManageRequests from "./pages/admin/ManageRequests";
import Moderation from "./pages/admin/Moderation";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <GoogleDriveProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
                <Route path="/saved-notes" element={<ProtectedRoute><SavedNotes /></ProtectedRoute>} />
                <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
                <Route path="/updates" element={<ProtectedRoute><Updates /></ProtectedRoute>} />
                <Route path="/qa" element={<ProtectedRoute><QandA /></ProtectedRoute>} />
                <Route path="/qa/:questionId" element={<ProtectedRoute><QuestionDetail /></ProtectedRoute>} />
                <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
                <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/notes" element={<ProtectedRoute requireAdmin><ManageNotes /></ProtectedRoute>} />
                <Route path="/admin/announcements" element={<ProtectedRoute requireAdmin><ManageAnnouncements /></ProtectedRoute>} />
                <Route path="/admin/updates" element={<ProtectedRoute requireAdmin><ManageUpdates /></ProtectedRoute>} />
                <Route path="/admin/subjects" element={<ProtectedRoute requireAdmin><ManageSubjects /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin><ManageUsers /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
                <Route path="/admin/qa" element={<ProtectedRoute requireAdmin><ManageQandA /></ProtectedRoute>} />
                <Route path="/admin/posts" element={<ProtectedRoute requireAdmin><ManagePosts /></ProtectedRoute>} />
                <Route path="/admin/requests" element={<ProtectedRoute requireAdmin><ManageRequests /></ProtectedRoute>} />
                <Route path="/admin/moderation" element={<ProtectedRoute requireAdmin><Moderation /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </GoogleDriveProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
