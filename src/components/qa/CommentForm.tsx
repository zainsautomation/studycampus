import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  placeholder?: string;
}

export function CommentForm({ onSubmit, onCancel, isSubmitting, placeholder = "Write a comment..." }: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content);
    setContent("");
  };

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="text-sm min-h-[60px] resize-none rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            size="sm" 
            variant="ghost" 
            onClick={onCancel}
            className="h-8 px-3 text-xs"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            size="sm" 
            disabled={isSubmitting || !content.trim()}
            className="h-8 px-4 text-xs rounded-full gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {placeholder.includes('reply') ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </form>
  );
}
