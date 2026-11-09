import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, Camera, Image as ImageIcon, CornerDownLeft } from 'lucide-react';

export interface SadaScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onCapture?: () => void;
  onFileSelect?: (file: File) => void;
  onTorchToggle?: (isOn: boolean) => void;
  onManualEntry?: () => void;
  isProcessing?: boolean;
  children?: React.ReactNode;
}

export const SadaScannerOverlay: React.FC<SadaScannerOverlayProps> = ({
  isOpen,
  onClose,
  title = 'Scan Document / QR',
  subtitle = 'Align within frame to auto-capture',
  onCapture,
  onFileSelect,
  onTorchToggle,
  onManualEntry,
  isProcessing = false,
  children,
}) => {
  const [torchActive, setTorchActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleTorch = () => {
    const nextState = !torchActive;
    setTorchActive(nextState);
    onTorchToggle?.(nextState);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden overscroll-none">
      {/* Background camera feed / 3D canvas or dark backdrop */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {children || <div className="w-full h-full bg-slate-950/90" />}
      </div>

      {/* Top HUD Controls (Notch Safe) */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 pt-safe backdrop-blur-md bg-black/40 border-b border-white/10">
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold tracking-wide text-white drop-shadow-md">
            {title}
          </span>
          <span className="text-[11px] text-white/70 tracking-tight">{subtitle}</span>
        </div>

        <button
          onClick={toggleTorch}
          aria-label="Toggle flash"
          className={`flex items-center justify-center w-11 h-11 rounded-full transition active:scale-95 ${
            torchActive ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {torchActive ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Center Viewfinder Reticle */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xs sm:max-w-sm aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          {/* Subtle dark mask outside */}
          <div className="absolute inset-0 bg-transparent" />

          {/* Glowing Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl shadow-sm" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl shadow-sm" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl shadow-sm" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl shadow-sm" />

          {/* Animated Laser Scanning Beam */}
          {!isProcessing && (
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-90 animate-[bounce_2.5s_infinite] shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
          )}

          {/* Processing Spinner Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-white/90">Analyzing capture...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom HUD Controls (Hardware Safe Area) */}
      <div className="relative z-20 flex flex-col items-center px-6 py-4 pb-safe backdrop-blur-md bg-black/50 border-t border-white/10 gap-3">
        <div className="flex items-center justify-around w-full max-w-sm">
          {/* Gallery Picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Pick from gallery"
            className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
          >
            <ImageIcon className="w-5 h-5 text-white/90" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </button>

          {/* Shutter Capture Button */}
          <button
            onClick={onCapture}
            disabled={isProcessing}
            aria-label="Capture frame"
            className="relative flex items-center justify-center w-18 h-18 rounded-full border-4 border-white/80 p-1 active:scale-95 transition group disabled:opacity-50"
          >
            <div className="w-14 h-14 rounded-full bg-white group-hover:scale-95 transition shadow-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-black" />
            </div>
          </button>

          {/* Manual Entry Fallback */}
          {onManualEntry ? (
            <button
              onClick={onManualEntry}
              aria-label="Manual entry"
              className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
            >
              <CornerDownLeft className="w-5 h-5 text-white/90" />
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}
        </div>

        {onManualEntry && (
          <button
            onClick={onManualEntry}
            className="text-xs text-white/70 hover:text-white transition underline underline-offset-4 py-1"
          >
            Enter details manually
          </button>
        )}
      </div>
    </div>
  );
};

