import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function QandADisabledBanner() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Q&A Disabled</AlertTitle>
      <AlertDescription>
        The Q&A feature is currently disabled by the administrator. Check back later!
      </AlertDescription>
    </Alert>
  );
}
