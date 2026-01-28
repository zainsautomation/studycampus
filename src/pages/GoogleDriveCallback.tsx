import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Cloud, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleDriveCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('[GoogleDriveCallback] OAuth error:', error);
        setStatus('error');
        setErrorMessage('Authorization was denied or cancelled.');
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received.');
        return;
      }

      try {
        console.log('[GoogleDriveCallback] Exchanging code for tokens...');
        
        const { data, error: invokeError } = await supabase.functions.invoke('google-drive-auth', {
          body: {
            code,
            redirect_uri: `${window.location.origin}/auth/google-drive/callback`,
          },
        });

        if (invokeError) {
          console.error('[GoogleDriveCallback] Edge function error:', invokeError);
          throw new Error(invokeError.message || 'Failed to connect to Google Drive');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        console.log('[GoogleDriveCallback] Connection successful:', data);
        setStatus('success');
        
        toast({
          title: 'Google Drive Connected!',
          description: `Permanently connected to ${data.email || 'your Google account'}`,
        });

        // Redirect after a short delay to show success message
        setTimeout(() => {
          navigate('/admin/notes', { replace: true });
        }, 2000);

      } catch (err: any) {
        console.error('[GoogleDriveCallback] Error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to connect Google Drive');
        
        toast({
          title: 'Connection Failed',
          description: err.message || 'Failed to connect Google Drive',
          variant: 'destructive',
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === 'processing' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connecting Google Drive...</h2>
              <p className="text-muted-foreground">
                Please wait while we establish a permanent connection.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connected Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                Your Google Drive is now permanently connected. Redirecting...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Cloud className="w-4 h-4" />
                <span>Connection will persist until you disconnect</span>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/admin/notes')}>
                  Go Back
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
