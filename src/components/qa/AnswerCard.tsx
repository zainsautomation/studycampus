import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, CheckCircle2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { CommentSection } from "./CommentSection";
import { RichTextDisplay } from "@/components/ui/rich-text-display";

interface AnswerCardProps {
  answer: {
    id: string;
    content: string;
    is_accepted: boolean;
    upvotes: number;
    created_at: string;
    user_id: string;
    profiles?: { full_name: string | null; username?: string | null } | null;
  };
  isQuestionAuthor: boolean;
  currentUserId: string | undefined;
  hasUpvoted: boolean;
  isAdmin: boolean;
  onUpvote: () => void;
  onAccept: () => void;
  onDelete: () => void;
  isAnonymousQuestion?: boolean;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={answer.is_accepted ? "border-green-500 bg-green-50/50 dark:bg-green-900/10" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1">
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={onUpvote}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{answer.upvotes}</span>
            </div>
            <div className="flex-1">
              {answer.is_accepted && (
                <Badge className="mb-2 bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Best Answer
                </Badge>
              )}
              <RichTextDisplay content={answer.content} className="text-sm" />
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium">{displayName}</span> • {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-2">
                  {isQuestionAuthor && !answer.is_accepted && (
                    <Button variant="ghost" size="sm" onClick={onAccept}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CommentSection answerId={answer.id} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
