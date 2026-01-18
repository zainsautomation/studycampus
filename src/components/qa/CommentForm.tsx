import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X } from "lucide-react";

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  placeholder?: string;
}

export function CommentForm({ onSubmit, onCancel, isSubmitting, placeholder = "Write a comment..." }: CommentFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Comment
        </Button>
      </div>
    </form>
  );
}
