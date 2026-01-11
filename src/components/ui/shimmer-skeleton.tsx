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
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShimmerSkeleton className="h-5 w-16 rounded-full" />
        <ShimmerSkeleton className="h-5 w-20 rounded-full" />
      </div>
      <ShimmerSkeleton className="h-6 w-3/4" variant="text" />
      <ShimmerSkeleton className="h-4 w-full" variant="text" />
      <ShimmerSkeleton className="h-4 w-2/3" variant="text" />
      <div className="flex items-center justify-between pt-2">
        <ShimmerSkeleton className="h-4 w-24" variant="text" />
        <ShimmerSkeleton className="h-4 w-32" variant="text" />
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