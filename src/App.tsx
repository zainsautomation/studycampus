// App entry point
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Announcements from "./pages/Announcements";
import Updates from "./pages/Updates";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageNotes from "./pages/admin/ManageNotes";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import ManageUpdates from "./pages/admin/ManageUpdates";
import ManageSubjects from "./pages/admin/ManageSubjects";
import ManageUsers from "./pages/admin/ManageUsers";

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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
              <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
              <Route path="/updates" element={<ProtectedRoute><Updates /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/notes" element={<ProtectedRoute requireAdmin><ManageNotes /></ProtectedRoute>} />
              <Route path="/admin/announcements" element={<ProtectedRoute requireAdmin><ManageAnnouncements /></ProtectedRoute>} />
              <Route path="/admin/updates" element={<ProtectedRoute requireAdmin><ManageUpdates /></ProtectedRoute>} />
              <Route path="/admin/subjects" element={<ProtectedRoute requireAdmin><ManageSubjects /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><ManageUsers /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
