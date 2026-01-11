import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (value !== displayValue) {
      setDirection(value > displayValue ? 'up' : 'down');
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  return (
    <div className={`relative overflow-hidden inline-flex ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={displayValue}
          initial={{ 
            y: direction === 'up' ? 20 : -20, 
            opacity: 0 
          }}
          animate={{ 
            y: 0, 
            opacity: 1 
          }}
          exit={{ 
            y: direction === 'up' ? -20 : 20, 
            opacity: 0 
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25 
          }}
          className="tabular-nums"
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}