import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, CheckCircle2, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CommentSection } from "./CommentSection";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { ReportButton } from "@/components/ui/ReportButton";

interface AnswerCardProps {
  answer: {
    id: string;
    content: string;
    is_accepted: boolean | null;
    upvotes: number | null;
    created_at: string;
    user_id: string;
    profiles?: { 
      full_name: string | null; 
      username?: string | null;
      avatar_url?: string | null;
    } | null;
  };
  isQuestionAuthor: boolean;
  currentUserId: string | undefined;
  hasUpvoted: boolean;
  isAdmin: boolean;
  onUpvote: () => void;
  onAccept: () => void;
  onDelete: () => void;
}

export function AnswerCard({
  answer,
  isQuestionAuthor,
  currentUserId,
  hasUpvoted,
  isAdmin,
  onUpvote,
  onAccept,
  onDelete,
}: AnswerCardProps) {
  const displayName = answer.profiles?.username 
    ? `@${answer.profiles.username}` 
    : answer.profiles?.full_name || 'User';

  const initials = answer.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`overflow-hidden ${answer.is_accepted ? "border-success/50 bg-success/5" : ""}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Upvote section */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onUpvote}
                className={`p-2 rounded-lg transition-colors ${
                  hasUpvoted 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? 'fill-current' : ''}`} />
              </motion.button>
              <span className={`text-sm font-semibold ${hasUpvoted ? 'text-primary' : 'text-muted-foreground'}`}>
                {answer.upvotes || 0}
              </span>
            </div>

            {/* Content section */}
            <div className="flex-1 min-w-0">
              {/* Best answer badge */}
              {answer.is_accepted && (
                <Badge variant="secondary" className="mb-3 bg-success/10 text-success gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Best Answer
                </Badge>
              )}

              {/* Answer content */}
              <RichTextDisplay content={answer.content} className="text-sm mb-4" />

              {/* Footer with author and actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Author info */}
                <div className="flex items-center gap-2.5">
                  <Link to={`/user/${answer.profiles?.username || answer.user_id}`} className="shrink-0">
                    <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                      {answer.profiles?.avatar_url && (
                        <AvatarImage src={answer.profiles.avatar_url} alt={displayName} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Link to={`/user/${answer.profiles?.username || answer.user_id}`} className="font-medium hover:underline hover:text-foreground transition-colors">
                      {displayName}
                    </Link>
                    <span className="opacity-40">•</span>
                    <Clock className="h-3 w-3 opacity-60" />
                    <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isQuestionAuthor && !answer.is_accepted && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onAccept}
                      className="h-8 gap-1.5 text-success hover:text-success hover:bg-success/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                  )}
                  {currentUserId !== answer.user_id && (
                    <ReportButton 
                      contentType="answer" 
                      contentId={answer.id} 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8"
                    />
                  )}
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onDelete}
                      className="h-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="mt-4">
                <CommentSection answerId={answer.id} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
