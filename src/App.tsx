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
 
 // Lazy load all pages for code splitting
 const Auth = lazy(() => import("./pages/Auth"));
 const Dashboard = lazy(() => import("./pages/Dashboard"));
 const Notes = lazy(() => import("./pages/Notes"));
 const SavedNotes = lazy(() => import("./pages/SavedNotes"));
 const Announcements = lazy(() => import("./pages/Announcements"));
 const Updates = lazy(() => import("./pages/Updates"));
 const NotFound = lazy(() => import("./pages/NotFound"));
 const QandA = lazy(() => import("./pages/QandA"));
 const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
 const Posts = lazy(() => import("./pages/Posts"));
 const Requests = lazy(() => import("./pages/Requests"));
 const Profile = lazy(() => import("./pages/Profile"));
 const PublicProfile = lazy(() => import("./pages/PublicProfile"));
 const Leaderboard = lazy(() => import("./pages/Leaderboard"));
 const More = lazy(() => import("./pages/More"));
 const GoogleDriveCallback = lazy(() => import("./pages/GoogleDriveCallback"));
 const MCQ = lazy(() => import("./pages/MCQ"));
 const MCQSubject = lazy(() => import("./pages/MCQSubject"));
 const MCQTest = lazy(() => import("./pages/MCQTest"));
 const MCQAttempt = lazy(() => import("./pages/MCQAttempt"));
 const MCQResult = lazy(() => import("./pages/MCQResult"));
 
 // Admin pages - lazy loaded
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
