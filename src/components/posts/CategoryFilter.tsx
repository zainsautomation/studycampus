import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, HelpCircle, Smile } from "lucide-react";

export type PostCategory = 'all' | 'discussion' | 'study_group' | 'help' | 'meme';

interface CategoryFilterProps {
  selectedCategory: PostCategory;
  onSelectCategory: (category: PostCategory) => void;
}

const categories: { value: PostCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All', icon: null, color: '' },
  { value: 'discussion', label: 'Discussion', icon: <MessageSquare className="w-3 h-3" />, color: '#3b82f6' },
  { value: 'study_group', label: 'Study Group', icon: <Users className="w-3 h-3" />, color: '#22c55e' },
  { value: 'help', label: 'Help', icon: <HelpCircle className="w-3 h-3" />, color: '#f97316' },
  { value: 'meme', label: 'Meme', icon: <Smile className="w-3 h-3" />, color: '#d946ef' },
];

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onSelectCategory(cat.value)}
            className="transition-all"
          >
            <Badge
              variant={isSelected ? "default" : "outline"}
              style={isSelected && cat.color ? { backgroundColor: cat.color, color: "#fff" } : cat.color ? { borderColor: cat.color, color: cat.color } : {}}
              className="cursor-pointer hover:opacity-80 flex items-center gap-1"
            >
              {cat.icon}
              {cat.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
