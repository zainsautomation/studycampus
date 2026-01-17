import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

export function RecentlyViewedNotes() {
  const { recentlyViewed, isLoading } = useRecentlyViewed(4);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recently Viewed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Recently Viewed
        </CardTitle>
        <Link 
          to="/notes" 
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentlyViewed.map((view) => (
            <Link
              key={view.id}
              to={`/notes${view.notes?.subject_id ? `?subject=${view.notes.subject_id}&note=${view.note_id}` : `?note=${view.note_id}`}`}
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group cursor-pointer block"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                {view.notes?.subjects && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: view.notes.subjects.color, color: view.notes.subjects.color }}
                  >
                    {view.notes.subjects.name}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm truncate">{view.notes?.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Viewed {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
