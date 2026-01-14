import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Database, FolderOpen, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type StorageType = 'supabase' | 'google_drive';

interface StorageSelectorProps {
  value: StorageType;
  onChange: (value: StorageType) => void;
  googleDriveConfigured?: boolean;
  googleDriveSignedIn?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  compact?: boolean;
}

const storageOptions = [
  {
    value: 'supabase' as StorageType,
    label: 'Supabase Storage',
    description: 'Store files on Supabase servers',
    icon: Database,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'google_drive' as StorageType,
    label: 'Google Drive',
    description: 'Store files in your Google Drive',
    icon: Cloud,
    color: 'from-blue-500 to-indigo-500',
  },
];

export function StorageSelector({
  value,
  onChange,
  googleDriveConfigured = false,
  googleDriveSignedIn = false,
  disabled = false,
  showLabel = true,
  compact = false,
}: StorageSelectorProps) {
  const selectedOption = storageOptions.find((opt) => opt.value === value) || storageOptions[0];
  const isGoogleDriveDisabled = !googleDriveConfigured || !googleDriveSignedIn;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
          >
            <selectedOption.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{selectedOption.label}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {storageOptions.map((option) => {
            const isDisabled = option.value === 'google_drive' && isGoogleDriveDisabled;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => !isDisabled && onChange(option.value)}
                disabled={isDisabled}
                className="gap-2"
              >
                <option.icon className="w-4 h-4" />
                {option.label}
                {value === option.value && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && <Label>Storage Location</Label>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {storageOptions.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = disabled || (option.value === 'google_drive' && isGoogleDriveDisabled);

          return (
            <motion.button
              key={option.value}
              type="button"
              whileHover={!isDisabled ? { scale: 1.02 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/50',
                isDisabled && 'opacity-50 cursor-not-allowed hover:border-border'
              )}
            >
              {/* Selection indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-2 right-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Icon */}
              <div className={cn(
                'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                option.color
              )}>
                <option.icon className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {option.value === 'google_drive' && !googleDriveConfigured
                    ? 'Not configured - add API keys'
                    : option.value === 'google_drive' && !googleDriveSignedIn
                    ? 'Sign in to Google Drive first'
                    : option.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
