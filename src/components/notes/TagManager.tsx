import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TagType {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#64748b"
];

export function TagManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

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

  const createTag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tags').insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: "Tag created" });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTag = useMutation({
    mutationFn: async () => {
      if (!editingTag) return;
      const { error } = await supabase
        .from('tags')
        .update({ name, color })
        .eq('id', editingTag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: "Tag updated" });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: "Tag deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
    setName("");
    setColor(PRESET_COLORS[0]);
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingTag) {
      updateTag.mutate();
    } else {
      createTag.mutate();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tags
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? "Edit Tag" : "Create Tag"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Name</Label>
                <Input
                  id="tag-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Important, Exam, Summary"
                  required
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label>Preview:</Label>
                <Badge style={{ backgroundColor: color, color: "#fff" }}>
                  {name || "Tag Name"}
                </Badge>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTag.isPending || updateTag.isPending}>
                  {editingTag ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-20 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        ) : tags?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags created yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-1 pr-1 rounded-full border"
                style={{ borderColor: tag.color }}
              >
                <Badge
                  style={{ backgroundColor: tag.color, color: "#fff" }}
                  className="pr-2"
                >
                  {tag.name}
                </Badge>
                <button
                  onClick={() => handleEdit(tag)}
                  className="p-1 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteTag.mutate(tag.id)}
                  className="p-1 rounded-full hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
