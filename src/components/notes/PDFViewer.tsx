import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  className?: string;
}

export function PDFViewer({ fileUrl, className = '' }: PDFViewerProps) {
  const [scale, setScale] = useState(100);

  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));

  const openInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

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
          src={`${fileUrl}#toolbar=0&view=FitH`}
          className="w-full h-full border-0"
          style={{ 
            transform: `scale(${scale / 100})`,
            transformOrigin: 'top left',
            width: `${10000 / scale}%`,
            height: `${10000 / scale}%`
          }}
          title="PDF Document"
        />
      </div>
    </div>
  );
}
