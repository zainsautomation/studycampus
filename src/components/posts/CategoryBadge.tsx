import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, HelpCircle, Smile } from "lucide-react";

export type PostCategoryType = 'discussion' | 'study_group' | 'help' | 'meme';

interface CategoryBadgeProps {
  category: PostCategoryType | string | null | undefined;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  discussion: { label: 'Discussion', icon: <MessageSquare className="w-3 h-3" />, color: '#3b82f6' },
  study_group: { label: 'Study Group', icon: <Users className="w-3 h-3" />, color: '#22c55e' },
  help: { label: 'Help', icon: <HelpCircle className="w-3 h-3" />, color: '#f97316' },
  meme: { label: 'Meme', icon: <Smile className="w-3 h-3" />, color: '#d946ef' },
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const cat = category || 'discussion';
  const config = categoryConfig[cat] || categoryConfig.discussion;

  return (
    <Badge
      variant="outline"
      style={{ borderColor: config.color, color: config.color }}
      className="flex items-center gap-1 text-xs"
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
