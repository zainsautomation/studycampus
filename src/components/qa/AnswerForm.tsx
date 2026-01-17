import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send } from "lucide-react";

interface AnswerFormProps {
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
  userAvatar?: string | null;
  userInitials?: string;
}

export function AnswerForm({ onSubmit, isSubmitting, userAvatar, userInitials = '?' }: AnswerFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return;
    onSubmit(content);
    setContent("");
  };

  const plainText = content.replace(/<[^>]*>/g, '').trim();

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0 mt-1">
              {userAvatar && <AvatarImage src={userAvatar} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Share your knowledge and help answer this question..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !plainText} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Answer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
