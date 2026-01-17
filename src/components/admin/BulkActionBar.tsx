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
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3 rounded-xl',
            'bg-background/95 backdrop-blur-lg border shadow-lg',
            'max-w-[calc(100vw-2rem)]',
            className
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedCount} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onChangeSubject && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeSubject}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Change Subject</span>
              </Button>
            )}

            {onToggleDownloadable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleDownloadable}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Toggle Download</span>
              </Button>
            )}

            {customActions}

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8 ml-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
