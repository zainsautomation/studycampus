import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PostsDisabledBanner() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Posts Disabled</AlertTitle>
      <AlertDescription>
        The posts feature is currently disabled by the administrator. Check back later!
      </AlertDescription>
    </Alert>
  );
}
