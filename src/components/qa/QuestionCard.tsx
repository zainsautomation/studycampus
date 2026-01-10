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
}

export function QuestionCard({ question, onClick }: QuestionCardProps) {
  const answerCount = question.answers?.[0]?.count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {question.is_pinned && (
                  <Pin className="h-4 w-4 text-primary" />
                )}
                {question.is_resolved && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
                {question.subjects && (
                  <Badge 
                    variant="outline"
                    style={{ borderColor: question.subjects.color, color: question.subjects.color }}
                  >
                    {question.subjects.name}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg line-clamp-2">{question.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {question.content}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>{question.profiles?.full_name || 'Anonymous'}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
