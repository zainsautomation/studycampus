import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  option_label: string;
  option_text: string;
}

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  options: Option[];
  selectedOptionId?: string | null;
  onSelectOption: (optionId: string) => void;
  showResult?: boolean;
  correctOptionId?: string;
  disabled?: boolean;
}

export function QuestionDisplay({
  questionNumber,
  totalQuestions,
  questionText,
  options,
  selectedOptionId,
  onSelectOption,
  showResult = false,
  correctOptionId,
  disabled = false,
}: QuestionDisplayProps) {
  const getOptionState = (optionId: string) => {
    if (!showResult) {
      return selectedOptionId === optionId ? 'selected' : 'default';
    }
    
    if (optionId === correctOptionId) return 'correct';
    if (optionId === selectedOptionId && optionId !== correctOptionId) return 'incorrect';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
            Question {questionNumber}/{totalQuestions}
          </span>
        </div>
        <h2 className="text-lg font-medium text-foreground leading-relaxed">
          {questionText}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const state = getOptionState(option.id);
          
          return (
            <motion.button
              key={option.id}
              onClick={() => !disabled && onSelectOption(option.id)}
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200",
                "border-2",
                disabled && "cursor-default",
                !disabled && "cursor-pointer",
                state === 'default' && "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-primary/5",
                state === 'selected' && "border-primary bg-primary/10",
                state === 'correct' && "border-green-500 bg-green-500/10",
                state === 'incorrect' && "border-red-500 bg-red-500/10"
              )}
            >
              {/* Option Label */}
              <span className={cn(
                "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-semibold text-sm",
                state === 'default' && "bg-muted text-muted-foreground",
                state === 'selected' && "bg-primary text-primary-foreground",
                state === 'correct' && "bg-green-500 text-white",
                state === 'incorrect' && "bg-red-500 text-white"
              )}>
                {option.option_label}
              </span>
              
              {/* Option Text */}
              <span className={cn(
                "flex-1 pt-1",
                state === 'correct' && "text-green-700 dark:text-green-400",
                state === 'incorrect' && "text-red-700 dark:text-red-400"
              )}>
                {option.option_text}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
