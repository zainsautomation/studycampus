import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
}

export function ShimmerSkeleton({ className, variant = 'default' }: ShimmerSkeletonProps) {
  const baseClasses = "relative overflow-hidden bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";
  
  const variantClasses = {
    default: "rounded-md",
    card: "rounded-lg h-32",
    text: "rounded h-4",
    avatar: "rounded-full w-10 h-10",
    button: "rounded-md h-10 w-24",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
}

export function QuestionCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 relative overflow-hidden">
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted rounded-l-lg" />
      
      {/* Header badges */}
      <div className="flex items-center gap-2 pl-1">
        <ShimmerSkeleton className="h-5 w-16 rounded-full" />
        <ShimmerSkeleton className="h-5 w-20 rounded-full" />
      </div>
      
      {/* Title */}
      <ShimmerSkeleton className="h-5 w-3/4 pl-1" variant="text" />
      
      {/* Content preview */}
      <div className="space-y-1.5 pl-1">
        <ShimmerSkeleton className="h-4 w-full" variant="text" />
        <ShimmerSkeleton className="h-4 w-2/3" variant="text" />
      </div>
      
      {/* Footer with avatar */}
      <div className="flex items-center justify-between pt-2 pl-1">
        <div className="flex items-center gap-2.5">
          <ShimmerSkeleton className="h-7 w-7 rounded-full" />
          <ShimmerSkeleton className="h-4 w-32" variant="text" />
        </div>
        <ShimmerSkeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShimmerSkeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <ShimmerSkeleton className="h-4 w-28" variant="text" />
          <ShimmerSkeleton className="h-3 w-40" variant="text" />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <ShimmerSkeleton className="h-4 w-full" variant="text" />
        <ShimmerSkeleton className="h-4 w-4/5" variant="text" />
        <ShimmerSkeleton className="h-4 w-1/2" variant="text" />
      </div>
      
      {/* Actions */}
      <div className="pt-1">
        <ShimmerSkeleton className="h-9 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-5 w-16 rounded-full" />
          <ShimmerSkeleton className="h-5 w-20 rounded-full" />
        </div>
        <ShimmerSkeleton className="h-8 w-8 rounded-md" />
      </div>
      <ShimmerSkeleton className="h-5 w-2/3" variant="text" />
      <ShimmerSkeleton className="h-4 w-full" variant="text" />
      <ShimmerSkeleton className="h-4 w-1/2" variant="text" />
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <ShimmerSkeleton className="h-12 w-12 rounded-xl" />
        <ShimmerSkeleton className="h-6 w-12 rounded-full" />
      </div>
      <ShimmerSkeleton className="h-5 w-3/4" variant="text" />
      <ShimmerSkeleton className="h-4 w-full" variant="text" />
      <div className="flex items-center justify-between pt-2 border-t">
        <ShimmerSkeleton className="h-4 w-20" variant="text" />
        <ShimmerSkeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// Card skeleton for notes, posts, etc.
export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShimmerSkeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-3/4" variant="text" />
          <ShimmerSkeleton className="h-3 w-1/2" variant="text" />
        </div>
      </div>
      <ShimmerSkeleton className="h-16 w-full" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-8 w-20" variant="button" />
        <ShimmerSkeleton className="h-8 w-20" variant="button" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerSkeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-8" : i === 1 ? "flex-1" : "w-24"
          )} 
          variant="text"
        />
      ))}
    </div>
  );
}

// List skeleton for multiple items
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Leaderboard skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <ShimmerSkeleton className="h-6 w-6 rounded-full" />
          <ShimmerSkeleton className="h-8 w-8 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-1">
            <ShimmerSkeleton className="h-4 w-24" variant="text" />
            <ShimmerSkeleton className="h-3 w-16" variant="text" />
          </div>
          <ShimmerSkeleton className="h-5 w-12" variant="text" />
        </div>
      ))}
    </div>
  );
}

// Achievement skeleton
export function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border bg-card space-y-3 text-center">
          <ShimmerSkeleton className="h-12 w-12 rounded-full mx-auto" />
          <ShimmerSkeleton className="h-4 w-20 mx-auto" variant="text" />
          <ShimmerSkeleton className="h-3 w-full" variant="text" />
        </div>
      ))}
    </div>
  );
}

// Profile header skeleton
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-xl bg-card border">
      <ShimmerSkeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1 text-center sm:text-left space-y-2">
        <ShimmerSkeleton className="h-6 w-40 mx-auto sm:mx-0" variant="text" />
        <ShimmerSkeleton className="h-4 w-32 mx-auto sm:mx-0" variant="text" />
        <ShimmerSkeleton className="h-4 w-48 mx-auto sm:mx-0" variant="text" />
      </div>
      <div className="flex gap-4">
        <div className="text-center space-y-1">
          <ShimmerSkeleton className="h-8 w-12 mx-auto" variant="text" />
          <ShimmerSkeleton className="h-3 w-16" variant="text" />
        </div>
        <div className="text-center space-y-1">
          <ShimmerSkeleton className="h-8 w-12 mx-auto" variant="text" />
          <ShimmerSkeleton className="h-3 w-16" variant="text" />
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-2">
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-4 w-24" variant="text" />
        <ShimmerSkeleton className="h-8 w-8 rounded-lg" />
      </div>
      <ShimmerSkeleton className="h-8 w-16" variant="text" />
      <ShimmerSkeleton className="h-3 w-32" variant="text" />
    </div>
  );
}

// Grid of stats cards
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Question/Answer skeleton
export function QASkeleton() {
  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <div className="flex items-start gap-3">
          <ShimmerSkeleton className="h-10 w-10 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton className="h-5 w-3/4" variant="text" />
            <ShimmerSkeleton className="h-3 w-24" variant="text" />
          </div>
        </div>
        <ShimmerSkeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      
      {/* Answers */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="ml-8 p-4 rounded-xl border bg-card/50 space-y-3">
          <div className="flex items-start gap-3">
            <ShimmerSkeleton className="h-8 w-8 rounded-full" variant="avatar" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="h-4 w-24" variant="text" />
              <ShimmerSkeleton className="h-3 w-16" variant="text" />
            </div>
          </div>
          <ShimmerSkeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

// Notes grid skeleton
export function NotesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <NoteCardSkeleton key={i} />
      ))}
    </div>
  );
}
