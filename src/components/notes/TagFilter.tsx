import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

interface TagType {
  id: string;
  name: string;
  color: string;
}

interface TagFilterProps {
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

export function TagFilter({ selectedTagId, onSelectTag }: TagFilterProps) {
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

  if (isLoading || !tags?.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag className="w-4 h-4 text-muted-foreground" />
      <button
        onClick={() => onSelectTag(null)}
        className="transition-all"
      >
        <Badge
          variant={selectedTagId === null ? "default" : "outline"}
          className="cursor-pointer hover:opacity-80"
        >
          All
        </Badge>
      </button>
      {tags.map((tag) => {
        const isSelected = selectedTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => onSelectTag(isSelected ? null : tag.id)}
            className="transition-all"
          >
            <Badge
              variant={isSelected ? "default" : "outline"}
              style={isSelected ? { backgroundColor: tag.color, color: "#fff" } : { borderColor: tag.color, color: tag.color }}
              className="cursor-pointer hover:opacity-80"
            >
              {tag.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
