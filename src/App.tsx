// App entry point
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { GoogleDriveProvider } from "@/contexts/GoogleDriveContext";
import { KeyboardProvider } from "@/contexts/KeyboardContext";
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
import ActivityLog from "./pages/admin/ActivityLog";
import QandA from "./pages/QandA";
import QuestionDetail from "./pages/QuestionDetail";
import Posts from "./pages/Posts";
import Requests from "./pages/Requests";
import ManageQandA from "./pages/admin/ManageQandA";
import ManagePosts from "./pages/admin/ManagePosts";
import ManageRequests from "./pages/admin/ManageRequests";
import ManageMCQ from "./pages/admin/ManageMCQ";
import Moderation from "./pages/admin/Moderation";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Leaderboard from "./pages/Leaderboard";
import More from "./pages/More";
import GoogleDriveCallback from "./pages/GoogleDriveCallback";
import MCQ from "./pages/MCQ";
import MCQSubject from "./pages/MCQSubject";
import MCQTest from "./pages/MCQTest";
import MCQAttempt from "./pages/MCQAttempt";
import MCQResult from "./pages/MCQResult";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <GoogleDriveProvider>
          <KeyboardProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/google-drive/callback" element={<ProtectedRoute requireAdmin><GoogleDriveCallback /></ProtectedRoute>} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/saved-notes" element={<ProtectedRoute><SavedNotes /></ProtectedRoute>} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/qa" element={<QandA />} />
                <Route path="/qa/:questionId" element={<QuestionDetail />} />
                <Route path="/posts" element={<Posts />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/more" element={<More />} />
                <Route path="/mcq" element={<MCQ />} />
                <Route path="/mcq/subject/:subjectId" element={<MCQSubject />} />
                <Route path="/mcq/test/:testId" element={<MCQTest />} />
                <Route path="/mcq/attempt/:attemptId" element={<ProtectedRoute><MCQAttempt /></ProtectedRoute>} />
                <Route path="/mcq/result/:attemptId" element={<ProtectedRoute><MCQResult /></ProtectedRoute>} />
                <Route path="/user/:userId" element={<PublicProfile />} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/notes" element={<ProtectedRoute requireAdmin><ManageNotes /></ProtectedRoute>} />
                <Route path="/admin/mcq" element={<ProtectedRoute requireAdmin><ManageMCQ /></ProtectedRoute>} />
                <Route path="/admin/announcements" element={<ProtectedRoute requireAdmin><ManageAnnouncements /></ProtectedRoute>} />
                <Route path="/admin/updates" element={<ProtectedRoute requireAdmin><ManageUpdates /></ProtectedRoute>} />
                <Route path="/admin/subjects" element={<ProtectedRoute requireAdmin><ManageSubjects /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin><ManageUsers /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
                <Route path="/admin/activity" element={<ProtectedRoute requireAdmin><ActivityLog /></ProtectedRoute>} />
                <Route path="/admin/qa" element={<ProtectedRoute requireAdmin><ManageQandA /></ProtectedRoute>} />
                <Route path="/admin/posts" element={<ProtectedRoute requireAdmin><ManagePosts /></ProtectedRoute>} />
                <Route path="/admin/requests" element={<ProtectedRoute requireAdmin><ManageRequests /></ProtectedRoute>} />
                <Route path="/admin/moderation" element={<ProtectedRoute requireAdmin><Moderation /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </KeyboardProvider>
        </GoogleDriveProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
