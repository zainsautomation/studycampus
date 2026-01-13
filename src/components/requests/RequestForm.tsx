import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface RequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description: string; type: string; is_public: boolean; is_anonymous: boolean }) => void;
  isSubmitting: boolean;
  anonymousEnabled?: boolean;
}

export function RequestForm({ open, onOpenChange, onSubmit, isSubmitting, anonymousEnabled = false }: RequestFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("note");
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      type,
      is_public: isPublic,
      is_anonymous: isAnonymous,
    });
    setTitle("");
    setDescription("");
    setType("note");
    setIsPublic(true);
    setIsAnonymous(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit a Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Request Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note Request</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief title for your request"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about your request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="public" className="text-sm font-normal">
              Make this request public (others can see and upvote)
            </Label>
          </div>
          {anonymousEnabled && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <Label htmlFor="anonymous" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
                <EyeOff className="h-3.5 w-3.5" />
                Submit anonymously
              </Label>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
