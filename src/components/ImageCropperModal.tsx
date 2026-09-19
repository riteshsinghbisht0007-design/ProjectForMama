import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crop as CropIcon, RefreshCcw, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number; // e.g., 1 for square (profile), undefined for free (summons)
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  const handleApplyCrop = async () => {
    if (imgRef.current && completedCrop?.width && completedCrop?.height) {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      const pixelRatio = window.devicePixelRatio;

      
      // Add max dimension scaling for performance
      const MAX_DIMENSION = 1600;
      let finalWidth = completedCrop.width * scaleX;
      let finalHeight = completedCrop.height * scaleY;
      
      if (finalWidth > MAX_DIMENSION || finalHeight > MAX_DIMENSION) {
        if (finalWidth > finalHeight) {
          finalHeight = Math.round(finalHeight * (MAX_DIMENSION / finalWidth));
          finalWidth = MAX_DIMENSION;
        } else {
          finalWidth = Math.round(finalWidth * (MAX_DIMENSION / finalHeight));
          finalHeight = MAX_DIMENSION;
        }
      }

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        imgRef.current,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        finalWidth,
        finalHeight
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
        },
        'image/jpeg',
        0.75 // Optimized quality for fast OCR
      );

    } else {
      // If no crop selection, just return original image blob
      fetch(imageSrc).then(r => r.blob()).then(blob => onCropComplete(blob));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-4 sm:p-6"
      >
        <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-primary-text" />
              Crop Image
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cropper"
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-muted/30">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-h-[60vh] object-contain shadow-md rounded-lg overflow-hidden"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{ transform: `scale(${scale})`, transition: 'transform 0.1s' }}
                onLoad={onImageLoad}
                className="max-w-full max-h-[60vh]"
              />
            </ReactCrop>
          </div>

          {/* Footer controls */}
          <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                className="p-2 bg-muted rounded-lg text-foreground hover:bg-border"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
              <button 
                onClick={() => setScale(s => Math.min(3, s + 0.25))}
                className="p-2 bg-muted rounded-lg text-foreground hover:bg-border"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={() => {
                  setScale(1);
                  setCrop(undefined);
                  if (imgRef.current && aspectRatio) {
                    setCrop(centerAspectCrop(imgRef.current.width, imgRef.current.height, aspectRatio));
                  }
                }}
                className="p-2 bg-muted rounded-lg text-foreground hover:bg-border ml-2 flex items-center gap-1 text-xs font-medium cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" /> Reset
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-foreground bg-muted hover:bg-border transition-colors w-full sm:w-auto cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-primary-btn hover:bg-primary-hover flex items-center justify-center gap-2 transition-colors shadow-lg w-full sm:w-auto cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
