import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface PostFormProps {
  onSubmit: (content: string, isAnonymous: boolean, category?: string) => void;
  isSubmitting: boolean;
  anonymousEnabled?: boolean;
}

export function PostForm({ onSubmit, isSubmitting, anonymousEnabled = false }: PostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("discussion");
  const [isExpanded, setIsExpanded] = useState(false);

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
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return;
    onSubmit(content, isAnonymous, category);
    setContent("");
    setIsAnonymous(false);
    setIsExpanded(false);
  };

  const plainText = content.replace(/<[^>]*>/g, '').trim();
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          {/* Compact header - always visible */}
          <div 
            className={`flex items-center gap-3 p-4 ${!isExpanded ? 'cursor-text' : ''}`}
            onClick={() => !isExpanded && setIsExpanded(true)}
          >
            <Avatar className="h-10 w-10 ring-2 ring-background shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {!isExpanded ? (
              <div className="flex-1 px-4 py-2.5 rounded-full bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors">
                What's on your mind?
              </div>
            ) : (
              <div className="flex-1 text-sm font-medium">
                Create a post
              </div>
            )}
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Share something with your classmates..."
                  />
                  
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-[130px] h-9 text-xs">
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
                          <Label htmlFor="anonymous" className="text-xs font-normal flex items-center gap-1 cursor-pointer">
                            <EyeOff className="h-3 w-3" />
                            Anonymous
                          </Label>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setIsExpanded(false);
                          setContent("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={isSubmitting || !plainText}>
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1.5" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
    </Card>
  );
}
