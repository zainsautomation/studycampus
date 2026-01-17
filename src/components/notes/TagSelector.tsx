import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tag, X } from "lucide-react";

interface TagType {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TagType[];
    },
  });

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags
        </Label>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-16 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!tags?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Tag className="w-4 h-4" />
        Tags
      </Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="transition-all"
            >
              <Badge
                variant={isSelected ? "default" : "outline"}
                style={isSelected ? { backgroundColor: tag.color, color: "#fff" } : { borderColor: tag.color, color: tag.color }}
                className="cursor-pointer hover:opacity-80 flex items-center gap-1"
              >
                {tag.name}
                {isSelected && <X className="w-3 h-3" />}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
