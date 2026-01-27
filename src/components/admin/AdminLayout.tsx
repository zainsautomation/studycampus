import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AdminSidebar, AdminMobileNav } from './AdminSidebar';
import { Toaster } from '@/components/ui/sonner';
import { useGoogleDriveContext } from '@/contexts/GoogleDriveContext';
import { AlertTriangle, Cloud, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const { isConfigured, isSignedIn, isTokenExpiringSoon, lastRefreshFailed, signIn } = useGoogleDriveContext();

  const showDriveWarning = isConfigured && (!isSignedIn || isTokenExpiringSoon || lastRefreshFailed);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <AdminMobileNav />
        
        {/* Google Drive Status Banner */}
        {showDriveWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/10 border-b border-warning/20 px-4 py-2.5"
          >
            <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
              <div className="flex items-center gap-2 text-sm">
                {!isSignedIn ? (
                  <>
                    <Cloud className="w-4 h-4 text-warning" />
                    <span className="text-warning font-medium">Google Drive disconnected</span>
                    <span className="text-muted-foreground hidden sm:inline">— Reconnect to upload files</span>
                  </>
                ) : isTokenExpiringSoon || lastRefreshFailed ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-warning font-medium">Drive session expiring</span>
                    <span className="text-muted-foreground hidden sm:inline">— Click to refresh</span>
                  </>
                ) : null}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={signIn}
                className="gap-1.5 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect
              </Button>
            </div>
          </motion.div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-24 lg:pb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-4 md:p-6 lg:p-8 max-w-full"
          >
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
            {children}
          </motion.div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
