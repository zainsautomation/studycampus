import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AdminSidebar, AdminMobileNav } from './AdminSidebar';
import { Toaster } from '@/components/ui/sonner';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <AdminMobileNav />
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-4 md:p-6 lg:p-8"
          >
            <div className="mb-6">
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-display font-bold"
              >
                {title}
              </motion.h1>
              {description && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-muted-foreground mt-1"
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
