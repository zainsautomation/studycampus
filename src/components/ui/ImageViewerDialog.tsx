import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  alt?: string;
}

export function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
  alt = 'Image',
}: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setScale(1);
      setRotation(0);
    }, 200);
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none">
        <AnimatePresence>
          {open && (
            <>
              {/* Controls */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="h-9 w-9 rounded-full"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  className="h-9 w-9 rounded-full"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  className="h-9 w-9 rounded-full"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </motion.div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center w-full h-full p-8 overflow-auto"
                onClick={handleClose}
              >
                <motion.img
                  src={imageUrl}
                  alt={alt}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
