import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send } from "lucide-react";

interface AnswerFormProps {
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
}

export function AnswerForm({ onSubmit, isSubmitting }: AnswerFormProps) {
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
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your answer..."
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !plainText}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Post Answer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
