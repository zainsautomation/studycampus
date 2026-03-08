import { MessageSquare, Users, HelpCircle, Smile } from "lucide-react";

export type PostCategory = 'all' | 'discussion' | 'study_group' | 'help' | 'meme';

interface CategoryFilterProps {
  selectedCategory: PostCategory;
  onSelectCategory: (category: PostCategory) => void;
}

const categories: { value: PostCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All', icon: null, color: '' },
  { value: 'discussion', label: 'Discussion', icon: <MessageSquare className="w-3.5 h-3.5" />, color: '#3b82f6' },
  { value: 'study_group', label: 'Study', icon: <Users className="w-3.5 h-3.5" />, color: '#22c55e' },
  { value: 'help', label: 'Help', icon: <HelpCircle className="w-3.5 h-3.5" />, color: '#f97316' },
  { value: 'meme', label: 'Meme', icon: <Smile className="w-3.5 h-3.5" />, color: '#d946ef' },
];

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="relative -mx-4 px-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onSelectCategory(cat.value)}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap
                transition-all duration-200 shrink-0 min-h-[36px]
                ${isSelected
                  ? 'text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
              style={isSelected && cat.color ? { backgroundColor: cat.color } : isSelected ? { backgroundColor: 'hsl(var(--primary))' } : {}}
            >
              {cat.icon}
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
