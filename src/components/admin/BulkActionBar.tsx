import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, FolderOpen, Download, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  onChangeSubject?: () => void;
  onToggleDownloadable?: () => void;
  isDeleting?: boolean;
  className?: string;
  customActions?: React.ReactNode;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onChangeSubject,
  onToggleDownloadable,
  isDeleting = false,
  className,
  customActions,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            // Mobile: full width with margins, positioned above bottom nav
            // Desktop: centered, narrower
            'fixed z-50',
            'bottom-20 left-4 right-4',
            'md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto',
            'flex flex-wrap items-center justify-center gap-2 sm:gap-3',
            'px-3 py-3 sm:px-4 rounded-xl',
            'bg-background/95 backdrop-blur-lg border shadow-lg',
            className
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-border">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
              <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
              {selectedCount} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            {onChangeSubject && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeSubject}
                className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
              >
                <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Subject</span>
              </Button>
            )}

            {onToggleDownloadable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleDownloadable}
                className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Download</span>
              </Button>
            )}

            {customActions}

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Delete</span>
              </Button>
            )}
          </div>

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-7 w-7 sm:h-8 sm:w-8 ml-1"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
