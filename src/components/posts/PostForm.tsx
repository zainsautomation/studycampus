import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Send, EyeOff } from "lucide-react";

interface PostFormProps {
  onSubmit: (content: string, isAnonymous: boolean) => void;
  isSubmitting: boolean;
  anonymousEnabled?: boolean;
}

export function PostForm({ onSubmit, isSubmitting, anonymousEnabled = false }: PostFormProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content, isAnonymous);
    setContent("");
    setIsAnonymous(false);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            {anonymousEnabled && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <Label htmlFor="anonymous" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
                  <EyeOff className="h-3.5 w-3.5" />
                  Post anonymously
                </Label>
              </div>
            )}
            {!anonymousEnabled && <div />}
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Post
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
