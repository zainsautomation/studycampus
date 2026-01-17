import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// Tap/Press Animation Wrapper
interface TapScaleProps extends HTMLMotionProps<'div'> {
  scale?: number;
  children: React.ReactNode;
}

export const TapScale = React.forwardRef<HTMLDivElement, TapScaleProps>(
  ({ scale = 0.97, children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileTap={{ scale }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn('tap-highlight-transparent', className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
TapScale.displayName = 'TapScale';

// Hover Scale Animation
interface HoverScaleProps extends HTMLMotionProps<'div'> {
  scale?: number;
  children: React.ReactNode;
}

export const HoverScale = React.forwardRef<HTMLDivElement, HoverScaleProps>(
  ({ scale = 1.02, children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverScale.displayName = 'HoverScale';

// Staggered List Container
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
}

export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.05, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = 'StaggerContainer';

// Staggered List Item
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: {
              type: 'spring',
              stiffness: 300,
              damping: 24,
            }
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = 'StaggerItem';

// Fade In Animation
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, direction = 'up', distance = 10, className, ...props }, ref) => {
    const directionMap = {
      up: { y: distance },
      down: { y: -distance },
      left: { x: distance },
      right: { x: -distance },
      none: {},
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...directionMap[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 24,
          delay,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = 'FadeIn';

// Pop Animation (for likes, bookmarks, etc.)
interface PopProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  trigger?: boolean;
}

export const Pop = React.forwardRef<HTMLDivElement, PopProps>(
  ({ children, trigger, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        animate={trigger ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Pop.displayName = 'Pop';

// Ripple Effect Component
interface RippleProps {
  className?: string;
}

export function Ripple({ className }: RippleProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'absolute inset-0 m-auto w-full h-full rounded-full bg-primary/20 pointer-events-none',
        className
      )}
    />
  );
}

// Page Transition Wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating Action Button
interface FABProps extends HTMLMotionProps<'button'> {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
}

export const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ icon, label, onClick, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        onClick={onClick}
        className={cn(
          'fixed bottom-20 right-4 z-40 md:hidden flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25',
          className
        )}
        {...props}
      >
        {icon}
        {label && <span className="text-sm font-medium">{label}</span>}
      </motion.button>
    );
  }
);
FAB.displayName = 'FAB';
