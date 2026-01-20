import { useState } from 'react';
import { Flag, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface ReportButtonProps {
  contentType: 'post' | 'question' | 'answer' | 'comment';
  contentId: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'ghost' | 'outline';
  className?: string;
  showLabel?: boolean;
}

const reportReasons = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

export function ReportButton({
  contentType,
  contentId,
  size = 'icon',
  variant = 'ghost',
  className,
  showLabel = false,
}: ReportButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has already reported this content
  const { data: existingReport, isLoading: checkingReport } = useQuery({
    queryKey: ['user-report', contentType, contentId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('moderation_queue')
        .select('id')
        .eq('content_id', contentId)
        .eq('reported_by', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('moderation_queue').insert({
        content_type: contentType,
        content_id: contentId,
        reported_by: user.id,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe.',
      });
      setIsOpen(false);
      setReason('');
      setDetails('');
    } catch (error: any) {
      toast({
        title: 'Failed to submit report',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show button if user is not logged in
  if (!user) return null;

  // Show "Reported" state if already reported
  if (existingReport) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn('text-muted-foreground cursor-not-allowed', className)}
        title="Already reported"
      >
        <Check className="h-4 w-4" />
        {(size !== 'icon' || showLabel) && <span className="ml-2">Reported</span>}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={cn('text-muted-foreground hover:text-destructive', className)}
        title="Report content"
        disabled={checkingReport}
      >
        <Flag className="h-4 w-4" />
        {(size !== 'icon' || showLabel) && <span className="ml-2">Report</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Report Content
            </DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this {contentType}. Reports are reviewed by admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for reporting</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reportReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context about this report..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
