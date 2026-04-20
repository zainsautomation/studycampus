import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, CheckCircle2, Pin, EyeOff, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ReportButton } from "@/components/ui/ReportButton";

// Strip HTML tags for preview text
const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

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
    subjects?: { name: string; color: string } | null;
    profiles?: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
    answers?: { count: number }[];
  };
  onClick: () => void;
  index?: number;
}

export function QuestionCard({ question, onClick, index = 0 }: QuestionCardProps) {
  const answerCount = question.answers?.[0]?.count ?? 0;
  const isAnonymous = question.is_anonymous;
  
  // Display actual username/name from profiles
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : question.profiles?.username 
      ? `@${question.profiles.username}` 
      : question.profiles?.full_name || 'User';

  const initials = isAnonymous 
    ? '?' 
    : question.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

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
        className={`overflow-hidden relative group ${question.is_pinned ? 'ring-1 ring-primary/30' : ''}`}
        onClick={onClick}
      >
        {/* Subject color accent bar */}
        {question.subjects && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: question.subjects.color }}
          />
        )}
        
        <CardContent className="p-4 pl-5">
          {/* Header with badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {question.is_pinned && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2 py-0.5 gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </Badge>
            )}
            {question.is_resolved && (
              <Badge variant="secondary" className="bg-success/10 text-success text-xs px-2 py-0.5 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
            {question.subjects && (
              <Badge 
                variant="outline"
                className="text-xs px-2 py-0.5 border-opacity-50"
                style={{ borderColor: question.subjects.color, color: question.subjects.color }}
              >
                {question.subjects.name}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {question.title}
          </h3>

          {/* Content preview */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {stripHtml(question.content)}
          </p>

          {/* Footer with avatar and meta */}
          <div className="flex items-center justify-between">
            {/* User info with avatar */}
            <div className="flex items-center gap-2.5">
              {isAnonymous ? (
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-muted">
                    <EyeOff className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Link
                  to={`/user/${question.profiles?.username || question.user_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                >
                  <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    {question.profiles?.avatar_url && (
                      <AvatarImage src={question.profiles.avatar_url} alt={displayName} />
                    )}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isAnonymous ? (
                  <span className="font-medium italic">{displayName}</span>
                ) : (
                  <Link
                    to={`/user/${question.profiles?.username || question.user_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:underline hover:text-foreground transition-colors"
                  >
                    {displayName}
                  </Link>
                )}
                <span className="opacity-40">•</span>
                <Clock className="h-3 w-3 opacity-60" />
                <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Answer count badge and Report button */}
            <div className="flex items-center gap-2">
              <div 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <ReportButton 
                  contentType="question" 
                  contentId={question.id} 
                  size="icon" 
                  variant="ghost"
                  className="h-7 w-7"
                />
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                answerCount > 0 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{answerCount}</span>
                <span className="hidden sm:inline">{answerCount === 1 ? 'answer' : 'answers'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
