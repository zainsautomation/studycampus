import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ZoomIn, ZoomOut, ExternalLink, AlertCircle, RotateCcw } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  className?: string;
}

const isGoogleDriveUrl = (url: string): boolean => {
  return url.includes('drive.google.com') || 
         url.includes('docs.google.com') ||
         url.includes('googleapis.com');
};

const getGoogleDriveEmbedUrl = (url: string): string => {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  
  if (url.includes('/preview')) return url;
  if (url.includes('/view')) return url.replace('/view', '/preview');
  return url;
};

export function PDFViewer({ fileUrl, className = '' }: PDFViewerProps) {
  const [scale, setScale] = useState(100);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setScale(100);

  const isGoogleDrive = isGoogleDriveUrl(fileUrl);
  const embedUrl = isGoogleDrive ? getGoogleDriveEmbedUrl(fileUrl) : fileUrl;

  const openInNewTab = () => {
    if (isGoogleDrive) {
      const viewUrl = embedUrl.replace('/preview', '/view');
      window.open(viewUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  if (loadError && isGoogleDrive) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Access Restricted</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            This file requires permission to view. Sign in to your Google account or request access.
          </p>
          <Button onClick={openInNewTab} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open in Google Drive
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Modern toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-background border border-border rounded-full p-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomOut} 
              disabled={scale <= 50}
              className="h-7 w-7 rounded-full"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button 
              onClick={resetZoom}
              className="text-xs font-medium min-w-[3.5rem] text-center hover:text-primary transition-colors"
              title="Reset zoom"
            >
              {scale}%
            </button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomIn} 
              disabled={scale >= 200}
              className="h-7 w-7 rounded-full"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          {scale !== 100 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              className="h-7 w-7 rounded-full"
              title="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={openInNewTab}
          className="gap-1.5 h-7 text-xs rounded-full"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open</span>
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-muted/10 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
            <div className="space-y-3 text-center">
              <Skeleton className="w-64 h-80 rounded-xl mx-auto" />
              <p className="text-xs text-muted-foreground animate-pulse">Loading document…</p>
            </div>
          </div>
        )}
        <iframe
          src={isGoogleDrive ? embedUrl : `${fileUrl}#toolbar=0&view=FitH`}
          className="w-full h-full border-0"
          style={!isGoogleDrive ? { 
            transform: `scale(${scale / 100})`,
            transformOrigin: 'top left',
            width: `${10000 / scale}%`,
            height: `${10000 / scale}%`
          } : undefined}
          title="PDF Document"
          allow="autoplay"
          onLoad={() => setIsLoading(false)}
          onError={() => { setLoadError(true); setIsLoading(false); }}
        />
      </div>
    </div>
  );
}
