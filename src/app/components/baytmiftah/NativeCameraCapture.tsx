import React, { useRef, useState } from 'react';
import { Camera, Upload, RefreshCw, X, Smartphone } from 'lucide-react';
import { nativePluginsService } from '../../../lib/native-plugins.service';
import { toast } from 'sonner';

interface NativeCameraCaptureProps {
  /** Label shown on the capture button */
  label?: string;
  /** Called with a base64 data URL string after capture */
  onCapture: (base64DataUrl: string) => void;
  /** Optional existing photo preview URL */
  previewUrl?: string;
  /** Clear/reset the current photo */
  onClear?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Allow choosing from gallery as well as live camera */
  allowGallery?: boolean;
  /** Disable the component */
  disabled?: boolean;
}

export function NativeCameraCapture({
  label = 'Take Photo',
  onCapture,
  previewUrl,
  onClear,
  size = 'md',
  allowGallery = true,
  disabled = false,
}: NativeCameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const isNative = nativePluginsService.isNativePlatform();

  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-28 w-28',
    lg: 'h-40 w-40',
  };

  const handleCapture = async (source: 'camera' | 'gallery') => {
    if (disabled || isCapturing) return;
    setShowSourcePicker(false);
    setIsCapturing(true);

    try {
      await nativePluginsService.hapticLight();
      const photo = await nativePluginsService.capturePhoto(source, 85);
      onCapture(photo.base64Data);
      await nativePluginsService.hapticSuccess();
    } catch (err: any) {
      if (err?.message !== 'User cancelled photos app') {
        toast.error('Photo capture failed. Please try again.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    // On native with gallery option, show picker. Otherwise trigger directly.
    if (isNative && allowGallery) {
      setShowSourcePicker(true);
    } else {
      void handleCapture('camera');
    }
  };

  // Preview state (photo already captured)
  if (previewUrl) {
    return (
      <div className={`relative group ${sizeClasses[size]} rounded-xl overflow-hidden border-2 border-surface-border`}>
        <img
          src={previewUrl}
          alt="Captured inspection photo"
          className="w-full h-full object-cover"
        />
        {/* Overlay controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleClick}
            className="bg-white/90 text-gray-900 rounded-full p-1.5 hover:bg-white transition"
            title="Retake photo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onClear && (
            <button
              onClick={() => {
                void nativePluginsService.hapticLight();
                onClear();
              }}
              className="bg-red-500/90 text-white rounded-full p-1.5 hover:bg-red-500 transition"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main capture button */}
      <button
        onClick={handleClick}
        disabled={disabled || isCapturing}
        className={`
          ${sizeClasses[size]} flex flex-col items-center justify-center gap-2
          rounded-xl border-2 border-dashed border-surface-border
          bg-surface-subtle hover:bg-surface-hover hover:border-primary/40
          text-ink-secondary hover:text-primary transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-primary/50
        `}
      >
        {isCapturing ? (
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        ) : (
          <>
            {isNative ? (
              <Smartphone className="w-6 h-6" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
            <span className="text-[10px] font-semibold text-center leading-tight px-1">
              {label}
            </span>
          </>
        )}
      </button>

      {/* Source picker modal (native only, when gallery is allowed) */}
      {showSourcePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowSourcePicker(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-2xl mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-surface-border">
              <p className="text-sm font-semibold text-ink text-center">Add Photo Evidence</p>
            </div>

            <button
              onClick={() => void handleCapture('camera')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition text-left"
            >
              <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Take Photo</p>
                <p className="text-xs text-ink-secondary">Open device camera</p>
              </div>
            </button>

            <button
              onClick={() => void handleCapture('gallery')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition text-left border-t border-surface-border"
            >
              <span className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-purple-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Choose from Gallery</p>
                <p className="text-xs text-ink-secondary">Select an existing photo</p>
              </div>
            </button>

            <button
              onClick={() => setShowSourcePicker(false)}
              className="w-full py-4 text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-hover transition border-t border-surface-border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
