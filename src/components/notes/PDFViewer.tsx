import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ExternalLink, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  className?: string;
}

// Helper to detect and convert Google Drive URLs
const isGoogleDriveUrl = (url: string): boolean => {
  return url.includes('drive.google.com') || 
         url.includes('docs.google.com') ||
         url.includes('googleapis.com');
};

const getGoogleDriveEmbedUrl = (url: string): string => {
  // Extract file ID from various Google Drive URL formats
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,           // /d/{fileId}/
    /id=([a-zA-Z0-9_-]+)/,              // id={fileId}
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // /file/d/{fileId}
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  
  // If already a preview URL, return as-is
  if (url.includes('/preview')) {
    return url;
  }
  
  // Convert /view to /preview
  if (url.includes('/view')) {
    return url.replace('/view', '/preview');
  }
  
  return url;
};

export function PDFViewer({ fileUrl, className = '' }: PDFViewerProps) {
  const [scale, setScale] = useState(100);
  const [loadError, setLoadError] = useState(false);

  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));

  const isGoogleDrive = isGoogleDriveUrl(fileUrl);
  const embedUrl = isGoogleDrive ? getGoogleDriveEmbedUrl(fileUrl) : fileUrl;

  const openInNewTab = () => {
    // For Google Drive, open the original URL (not preview)
    if (isGoogleDrive) {
      const viewUrl = embedUrl.replace('/preview', '/view');
      window.open(viewUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  // Handle iframe load error for Google Drive
  if (loadError && isGoogleDrive) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/30 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Access Restricted</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            This Google Drive file requires permission to view. You may need to request access or sign in to your Google account.
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
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 50}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[4rem] text-center">{scale}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openInNewTab}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/30">
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
          onError={() => setLoadError(true)}
        />
      </div>
    </div>
  );
}
