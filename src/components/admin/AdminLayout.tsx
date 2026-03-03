import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdminSidebar, AdminMobileNav } from './AdminSidebar';
import { Toaster } from '@/components/ui/sonner';
import { useGoogleDriveContext } from '@/contexts/GoogleDriveContext';
import { Cloud, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function AdminLayout() {
  const { isConfigured, isSignedIn, signIn } = useGoogleDriveContext();
  const showDriveWarning = isConfigured && !isSignedIn;

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <AdminMobileNav />
        
        {showDriveWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 border-b border-border px-4 py-2.5"
          >
            <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
              <div className="flex items-center gap-2 text-sm">
                <Cloud className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Google Drive not connected</span>
                <span className="text-muted-foreground hidden sm:inline">— Connect once for permanent access</span>
              </div>
              <Button 
                size="sm" 
                variant="default" 
                onClick={signIn}
                className="gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Connect
              </Button>
            </div>
          </motion.div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-24 lg:pb-6">
          <div className="p-4 md:p-6 lg:p-8 max-w-full">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

// Reusable page header for admin pages
export function AdminPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <motion.h1 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl sm:text-2xl md:text-3xl font-display font-bold"
      >
        {title}
      </motion.h1>
      {description && (
        <motion.p 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground mt-1 text-sm md:text-base"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
