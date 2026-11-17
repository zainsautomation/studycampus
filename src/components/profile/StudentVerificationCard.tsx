import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock3, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VerificationRequest = {
  id: string;
  submitted_name: string;
  roll_number: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};

const statusText = {
  pending: "Under review",
  approved: "Verified student",
  rejected: "Not approved",
};

export function StudentVerificationCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["student-verification", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_verification_requests")
        .select("id, submitted_name, roll_number, status, review_note, created_at")
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VerificationRequest[];
    },
  });

  const latestRequest = requests[0];
  const hasPending = latestRequest?.status === "pending";
  const isApproved = requests.some((request) => request.status === "approved");

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedName = name.trim();
    const submittedRollNumber = rollNumber.trim();
    if (!submittedName || !submittedRollNumber || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("student_verification_requests").insert({
        user_id: user.id,
        submitted_name: submittedName,
        roll_number: submittedRollNumber,
        status: "pending",
      });
      if (error) throw error;

      setName("");
      setRollNumber("");
      await queryClient.invalidateQueries({ queryKey: ["student-verification", user.id] });
      toast({ title: "Verification request submitted", description: "Contact on WhatsApp for verification." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({ title: "Could not submit request", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Student verification
            </CardTitle>
            <CardDescription>Your roll number is private and only visible to you and admins.</CardDescription>
          </div>
          {latestRequest && (
            <Badge variant={latestRequest.status === "approved" ? "default" : "secondary"} className="shrink-0 gap-1.5">
              {latestRequest.status === "approved" ? <BadgeCheck className="h-3.5 w-3.5" /> :
                latestRequest.status === "pending" ? <Clock3 className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />}
              {statusText[latestRequest.status]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        ) : isApproved ? (
          <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-4">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Your student status is verified</p>
              <p className="mt-1 text-sm text-muted-foreground">You can now publish and interact in Posts.</p>
            </div>
          </div>
        ) : hasPending ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            <p className="font-medium">Your request is waiting for review</p>
            <p className="text-sm text-muted-foreground">Contact on WhatsApp for verification. Your request will be reviewed by an admin.</p>
          </div>
        ) : (
          <>
            {latestRequest?.status === "rejected" && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                <p className="font-medium text-destructive">Your previous request was not approved</p>
                {latestRequest.review_note && <p className="mt-1 text-sm text-muted-foreground">{latestRequest.review_note}</p>}
                <p className="mt-2 text-sm text-muted-foreground">You can correct your details and submit again.</p>
              </div>
            )}
            <form onSubmit={submitRequest} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="verification-name">Full name</Label>
                  <Input id="verification-name" autoComplete="name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name as registered" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verification-roll">Roll number</Label>
                  <Input id="verification-roll" autoComplete="off" maxLength={60} required value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="Your student roll number" />
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Contact on WhatsApp for verification.</p>
                <Button type="submit" disabled={isSubmitting || !name.trim() || !rollNumber.trim()}>
                  {isSubmitting ? "Submitting…" : "Submit for verification"}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}