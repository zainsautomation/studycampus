import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    content: string;
    is_resolved: boolean;
    is_pinned: boolean;
    created_at: string;
    user_id: string;
    subject_id: string | null;
    profiles?: { full_name: string | null } | null;
    subjects?: { name: string; color: string } | null;
    answers?: { count: number }[];
  };
  onClick: () => void;
  index?: number;
}

export function QuestionCard({ question, onClick, index = 0 }: QuestionCardProps) {
  const answerCount = question.answers?.[0]?.count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.01, 
        y: -2,
        transition: { duration: 0.2 }
      }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary group overflow-hidden"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {question.is_pinned && (
                  <motion.div
                    initial={{ rotate: -20 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Pin className="h-4 w-4 text-primary" />
                  </motion.div>
                )}
                {question.is_resolved && (
                  <Badge variant="secondary" className="bg-success/10 text-success dark:bg-success/20 dark:text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
                {question.subjects && (
                  <Badge 
                    variant="outline"
                    className="transition-colors"
                    style={{ borderColor: question.subjects.color, color: question.subjects.color }}
                  >
                    {question.subjects.name}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {question.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {question.content}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <motion.span 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50"
                whileHover={{ scale: 1.05 }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium">{answerCount}</span>
                <span className="hidden sm:inline">{answerCount === 1 ? 'answer' : 'answers'}</span>
              </motion.span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{question.profiles?.full_name || 'Anonymous'}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}