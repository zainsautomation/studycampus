 // App entry point with performance optimizations
 import { lazy, Suspense } from "react";
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
 import { Loader2 } from "lucide-react";
 
// Eagerly import main tab pages for instant navigation
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Posts from "./pages/Posts";
import MCQ from "./pages/MCQ";
import More from "./pages/More";

// Lazy load secondary pages
const Auth = lazy(() => import("./pages/Auth"));
const SavedNotes = lazy(() => import("./pages/SavedNotes"));
import Announcements from "./pages/Announcements";
const Updates = lazy(() => import("./pages/Updates"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QandA = lazy(() => import("./pages/QandA"));
const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const GoogleDriveCallback = lazy(() => import("./pages/GoogleDriveCallback"));
const MCQSubject = lazy(() => import("./pages/MCQSubject"));
const MCQTest = lazy(() => import("./pages/MCQTest"));
const MCQAttempt = lazy(() => import("./pages/MCQAttempt"));
const MCQResult = lazy(() => import("./pages/MCQResult"));
const Terms = lazy(() => import("./pages/Terms"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
import { OnboardingGate } from "@/components/OnboardingGate";
 
// Admin layout + pages - lazy loaded
import { AdminLayout } from "@/components/admin/AdminLayout";
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageNotes = lazy(() => import("./pages/admin/ManageNotes"));
const ManageAnnouncements = lazy(() => import("./pages/admin/ManageAnnouncements"));
const ManageUpdates = lazy(() => import("./pages/admin/ManageUpdates"));
const ManageSubjects = lazy(() => import("./pages/admin/ManageSubjects"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));
const ManageQandA = lazy(() => import("./pages/admin/ManageQandA"));
const ManagePosts = lazy(() => import("./pages/admin/ManagePosts"));
const ManageRequests = lazy(() => import("./pages/admin/ManageRequests"));
const ManageMCQ = lazy(() => import("./pages/admin/ManageMCQ"));
const Moderation = lazy(() => import("./pages/admin/Moderation"));
const MCQResults = lazy(() => import("./pages/admin/MCQResults"));
 
 // Loading fallback component
 const PageLoader = () => (
   <div className="min-h-screen flex items-center justify-center bg-background">
     <Loader2 className="h-8 w-8 animate-spin text-primary" />
   </div>
 );

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - reduces redundant refetches
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnReconnect: true, // Refetch on network reconnect
    },
  },
});

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
               <Suspense fallback={<PageLoader />}>
               <OnboardingGate>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
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
                <Route path="/terms" element={<Terms />} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="notes" element={<ManageNotes />} />
                  <Route path="mcq" element={<ManageMCQ />} />
                  <Route path="announcements" element={<ManageAnnouncements />} />
                  <Route path="updates" element={<ManageUpdates />} />
                  <Route path="subjects" element={<ManageSubjects />} />
                  <Route path="users" element={<ManageUsers />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="activity" element={<ActivityLog />} />
                  <Route path="qa" element={<ManageQandA />} />
                  <Route path="posts" element={<ManagePosts />} />
                  <Route path="requests" element={<ManageRequests />} />
                  <Route path="moderation" element={<Moderation />} />
                  <Route path="mcq-results" element={<MCQResults />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
               </OnboardingGate>
               </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </KeyboardProvider>
        </GoogleDriveProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
