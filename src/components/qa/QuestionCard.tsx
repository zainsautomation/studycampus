import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, Pin, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    content: string;
    is_resolved: boolean;
    is_pinned: boolean;
    is_anonymous?: boolean;
    created_at: string;
    user_id: string;
    subject_id: string | null;
    profiles?: { full_name: string | null; username?: string | null } | null;
    subjects?: { name: string; color: string } | null;
    answers?: { count: number }[];
  };
  onClick: () => void;
  index?: number;
}

export function QuestionCard({ question, onClick, index = 0 }: QuestionCardProps) {
  const answerCount = question.answers?.[0]?.count ?? 0;
  const isAnonymous = question.is_anonymous;
  
  // Display name logic
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : question.profiles?.username 
      ? `@${question.profiles.username}` 
      : question.profiles?.full_name || 'User';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.25, 
        delay: index * 0.03,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileTap={{ scale: 0.98 }}
      className="tap-highlight-transparent"
    >
      <Card 
        variant="interactive"
        className="overflow-hidden"
        onClick={onClick}
      >
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {question.is_pinned && (
              <Pin className="h-3.5 w-3.5 text-primary" />
            )}
            {question.is_resolved && (
              <Badge variant="secondary" className="bg-success/10 text-success text-xs px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
            {question.subjects && (
              <Badge 
                variant="outline"
                className="text-xs px-2 py-0.5"
                style={{ borderColor: question.subjects.color, color: question.subjects.color }}
              >
                {question.subjects.name}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
            {question.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {question.content}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="font-medium">{answerCount}</span>
              <span className="hidden sm:inline">{answerCount === 1 ? 'answer' : 'answers'}</span>
            </span>
            <div className="flex items-center gap-2">
              {isAnonymous && <EyeOff className="h-3 w-3" />}
              <span className={`font-medium ${isAnonymous ? 'italic' : ''}`}>
                {displayName}
              </span>
              <span className="opacity-50">•</span>
              <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
