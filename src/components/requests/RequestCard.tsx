import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

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
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const typeLabels: Record<string, string> = {
  note: "Note Request",
  feature: "Feature Request",
};

export function RequestCard({ request, hasUpvoted, currentUserId, onUpvote }: RequestCardProps) {
  const isOwn = currentUserId === request.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline">{typeLabels[request.type] || request.type}</Badge>
                <Badge className={statusColors[request.status] || ""}>
                  {request.status.replace('_', ' ')}
                </Badge>
                {isOwn && (
                  <Badge variant="secondary">Your Request</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{request.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
          
          {request.admin_response && (
            <div className="bg-muted p-3 rounded-lg mb-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Admin Response</span>
              </div>
              <p className="text-sm">{request.admin_response}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="sm"
                onClick={onUpvote}
                className="gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                {request.upvotes}
              </Button>
            </div>
            <span>
              {request.profiles?.full_name || 'Anonymous'} • {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
