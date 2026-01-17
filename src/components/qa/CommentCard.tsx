import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    user_id: string;
    is_edited: boolean;
    created_at: string;
  };
  currentUserId: string | undefined;
  isAdmin: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
}

export function CommentCard({
  comment,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const canModify = currentUserId === comment.user_id || isAdmin;

  const handleSave = () => {
    if (!editContent.trim()) return;
    onEdit(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="p-3 bg-muted/50 rounded-lg group">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              {comment.is_edited && " (edited)"}
            </span>
            {canModify && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {currentUserId === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
