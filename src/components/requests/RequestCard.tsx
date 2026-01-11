import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ThumbsUp, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface RequestCardProps {
  request: {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    admin_response: string | null;
    is_public: boolean;
    upvotes: number;
    created_at: string;
    user_id: string;
    profiles?: { full_name: string | null } | null;
  };
  hasUpvoted: boolean;
  currentUserId: string | undefined;
  onUpvote: () => void;
  index?: number;
}

const statusBorderColors: Record<string, string> = {
  pending: "border-l-warning",
  in_progress: "border-l-primary",
  completed: "border-l-success",
  rejected: "border-l-destructive",
};

const typeLabels: Record<string, string> = {
  note: "Note Request",
  feature: "Feature Request",
};

export function RequestCard({ request, hasUpvoted, currentUserId, onUpvote, index = 0 }: RequestCardProps) {
  const isOwn = currentUserId === request.user_id;
  const borderColor = statusBorderColors[request.status] || "border-l-muted";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.01,
        transition: { duration: 0.2 }
      }}
    >
      <Card className={`transition-all duration-300 hover:shadow-lg border-l-4 ${borderColor} overflow-hidden`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {typeLabels[request.type] || request.type}
                </span>
                <StatusBadge status={request.status} />
                {isOwn && (
                  <Badge variant="secondary" className="text-xs">Your Request</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{request.title}</CardTitle>
            </div>
            
            {/* Upvote Button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="sm"
                onClick={onUpvote}
                className={`gap-2 transition-all duration-200 ${
                  hasUpvoted 
                    ? 'bg-primary hover:bg-primary/90 shadow-md' 
                    : 'hover:border-primary hover:text-primary'
                }`}
              >
                <motion.div
                  animate={hasUpvoted ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? 'fill-current' : ''}`} />
                </motion.div>
                <motion.span
                  key={request.upvotes}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-semibold tabular-nums"
                >
                  {request.upvotes}
                </motion.span>
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{request.description}</p>
          
          <AnimatePresence>
            {request.admin_response && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-primary"
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">Admin Response</p>
                <p className="text-sm">{request.admin_response}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="font-medium">{request.profiles?.full_name || 'Anonymous'}</span>
            <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
