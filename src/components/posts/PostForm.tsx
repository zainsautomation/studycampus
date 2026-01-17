import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send, EyeOff } from "lucide-react";

interface PostFormProps {
  onSubmit: (content: string, isAnonymous: boolean, category?: string) => void;
  isSubmitting: boolean;
  anonymousEnabled?: boolean;
}

export function PostForm({ onSubmit, isSubmitting, anonymousEnabled = false }: PostFormProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("discussion");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return;
    onSubmit(content, isAnonymous, category);
    setContent("");
    setIsAnonymous(false);
  };

  const plainText = content.replace(/<[^>]*>/g, '').trim();

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="What's on your mind?"
          />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="study_group">Study Group</SelectItem>
                  <SelectItem value="help">Help</SelectItem>
                  <SelectItem value="meme">Meme</SelectItem>
                </SelectContent>
              </Select>
              {anonymousEnabled && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                  />
                  <Label htmlFor="anonymous" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
                    <EyeOff className="h-3.5 w-3.5" />
                    Anonymous
                  </Label>
                </div>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting || !plainText}>
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
