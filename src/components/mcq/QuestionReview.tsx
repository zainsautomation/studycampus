import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
}

interface QuestionReviewProps {
  questionNumber: number;
  questionText: string;
  options: Option[];
  selectedOptionId?: string | null;
  explanation?: string | null;
}

export function QuestionReview({
  questionNumber,
  questionText,
  options,
  selectedOptionId,
  explanation,
}: QuestionReviewProps) {
  const correctOption = options.find(o => o.is_correct);
  const isCorrect = selectedOptionId === correctOption?.id;
  const wasAnswered = !!selectedOptionId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: questionNumber * 0.05 }}
    >
      <Card className={cn(
        "border-l-4 overflow-hidden",
        isCorrect ? "border-l-green-500" : wasAnswered ? "border-l-red-500" : "border-l-muted"
      )}>
        <CardContent className="p-4 space-y-4">
          {/* Question Header */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              isCorrect ? "bg-green-500/20" : wasAnswered ? "bg-red-500/20" : "bg-muted"
            )}>
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : wasAnswered ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{questionNumber}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Question {questionNumber}</p>
              <p className="font-medium">{questionText}</p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 pl-11">
            {options.map((option) => {
              const isSelected = option.id === selectedOptionId;
              const isOptionCorrect = option.is_correct;

              return (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    isOptionCorrect && "bg-green-500/10 text-green-700 dark:text-green-400",
                    isSelected && !isOptionCorrect && "bg-red-500/10 text-red-700 dark:text-red-400",
                    !isSelected && !isOptionCorrect && "text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded text-xs font-medium",
                    isOptionCorrect && "bg-green-500 text-white",
                    isSelected && !isOptionCorrect && "bg-red-500 text-white",
                    !isSelected && !isOptionCorrect && "bg-muted"
                  )}>
                    {option.option_label}
                  </span>
                  <span className="flex-1">{option.option_text}</span>
                  {isSelected && (
                    <span className="text-xs">
                      {isOptionCorrect ? '✓ Your answer' : '✗ Your answer'}
                    </span>
                  )}
                  {!isSelected && isOptionCorrect && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="pl-11">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Explanation</p>
                  <p className="text-sm text-muted-foreground">{explanation}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
