import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  X,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Check,
  Zap,
  ZapOff,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { scanQrFromVideo, scanQrFromFile } from '../utils/qrDecoder';
import { parseJudicialQRCode } from '../utils/ocrService';

interface JudicialQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedPayload: string) => void;
}

export const JudicialQrScannerModal: React.FC<JudicialQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const isScanningRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    isScanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorchSupport(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (facing: 'environment' | 'user') => {
      stopCamera();
      setCameraError(null);
      setDetectedText(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported on this browser. Please use the Upload or Manual tab.');
        return;
      }

      try {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (_) {
          // Fallback to basic constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (_) {}
        }
        setIsCameraActive(true);

        // Check torch support
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities && 'torch' in capabilities) {
            setHasTorchSupport(true);
          }
        }
      } catch (err: any) {
        console.error('Camera access failed:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera permissions in browser settings or use Upload Photo.'
            : 'Could not access camera. Please use the Upload Photo or Manual CNR option.'
        );
        setIsCameraActive(false);
      }
    },
    [stopCamera]
  );

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip camera between front & back
  const flipCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Trigger success completion
  const handleSuccess = useCallback(
    (text: string) => {
      setDetectedText(text);
      stopCamera();

      // Trigger subtle device vibration if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 50, 80]);
        } catch (_) {}
      }

      // Small delay to show visual confirmation feedback
      setTimeout(() => {
        onScanSuccess(text);
        onClose();
      }, 500);
    },
    [stopCamera, onScanSuccess, onClose]
  );

  // Background camera frame scanner loop
  useEffect(() => {
    if (!isCameraActive || activeTab !== 'camera') {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    const runFrameScan = async () => {
      if (isScanningRef.current || !videoRef.current) return;
      isScanningRef.current = true;
      try {
        const found = await scanQrFromVideo(videoRef.current);
        if (found && found.trim().length > 0) {
          handleSuccess(found.trim());
          return;
        }
      } catch (err) {
        console.warn('QR frame scan error:', err);
      } finally {
        isScanningRef.current = false;
      }
    };

    scanIntervalRef.current = setInterval(runFrameScan, 180);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, activeTab, handleSuccess]);

  // Modal open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setActiveTab('camera');
      setDetectedText(null);
      setCameraError(null);
      startCamera('environment');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle uploaded QR image
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);
    try {
      const decoded = await scanQrFromFile(file);
      if (decoded && decoded.trim().length > 0) {
        handleSuccess(decoded.trim());
      } else {
        setCameraError('No readable QR code found in this image. Ensure the barcode is well-lit and not blurry.');
      }
    } catch (err: any) {
      setCameraError('Error processing image. Please try another file.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sample Judicial QR presets for immediate 1-click test
  const samplePresets = [
    {
      title: 'Delhi Tis Hazari Courts (CNR + FIR)',
      payload:
        'CNR: DLCT010045232024; FIR: 412/2023; Court: Court of Chief Metropolitan Magistrate Tis Hazari; Accused: Ramesh Chandra Verma; Father: Mohan Lal Verma; Address: H.No 45 Gali 3 Gandhi Nagar Delhi; Date: 2024-11-28; Charges: IPC 420/468/471',
    },
    {
      title: 'e-Courts Portal URL (High Court)',
      payload:
        'https://services.ecourts.gov.in/ecourtindia_v6/?cnr=MHAU010087452024&court=BombayHighCourt&case=CRLA-892-2024&date=2024-12-15',
    },
    {
      title: 'Raw 16-Character e-Court CNR',
      payload: 'UPHC010091242024',
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-900/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="qr-scanner-title" className="text-sm sm:text-base font-bold text-white">
                Judicial QR Barcode Scanner
              </h2>
              <p className="text-[11px] text-neutral-400">
                Scan e-Courts notice, warrant QR, or enter CNR code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR scanner"
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-neutral-950/60 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera(cameraFacing);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Manual / CNR</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: LIVE CAMERA VIEW */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] sm:aspect-square w-full max-w-[340px] mx-auto bg-black rounded-2xl overflow-hidden border border-white/15 flex items-center justify-center shadow-inner">
                {/* Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Target QR Viewfinder Reticle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                  <div
                    className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl transition-all duration-300 ${
                      detectedText
                        ? 'border-4 border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(52,211,153,0.6)]'
                        : 'border-2 border-amber-400/80 bg-black/20'
                    }`}
                  >
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                    {/* Animated Scanning Laser */}
                    {!detectedText && (
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#f59e0b] absolute top-0 animate-[bounce_2s_infinite]" />
                    )}

                    {detectedText && (
                      <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 rounded-xl p-3 text-center animate-scaleIn">
                        <div className="flex flex-col items-center gap-1.5">
                          <Check className="w-8 h-8 text-emerald-400" />
                          <span className="text-xs font-bold text-white">QR Code Detected!</span>
                          <span className="text-[10px] text-emerald-300/80 font-mono truncate max-w-[180px]">
                            {detectedText}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-medium text-white/90 border border-white/10 text-center">
                    Align court paper QR inside the frame
                  </div>
                </div>

                {/* Floating Camera Controls inside viewfinder */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                  {hasTorchSupport && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      aria-label="Toggle flashlight"
                      className={`p-2.5 rounded-full backdrop-blur-md text-white border transition-all cursor-pointer ${
                        isTorchOn ? 'bg-amber-500 border-amber-400' : 'bg-black/60 border-white/20 hover:bg-black/80'
                      }`}
                    >
                      {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={flipCamera}
                    aria-label="Switch camera facing"
                    className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span>{cameraError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD QR PHOTO */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                id="qr-modal-file-upload"
              />

              <label
                htmlFor="qr-modal-file-upload"
                className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer group"
              >
                <div className="p-4 rounded-2xl bg-amber-500/15 text-amber-400 group-hover:scale-110 transition-transform mb-3">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {isProcessingFile ? 'Scanning photo for QR...' : 'Select or drop QR image'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs">
                  Upload screenshot, photo of e-Courts warrant, or saved QR code image
                </p>
                <div className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-colors">
                  Choose Photo File
                </div>
              </label>

              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL CNR / TEXT DECODER */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-200">
                  Enter 16-Character CNR, e-Courts URL, or QR Text:
                </label>
                <textarea
                  rows={3}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. DLCT010012342023, or paste raw e-Courts QR text payload..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-white placeholder:text-neutral-500 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!manualInput.trim()) return;
                  handleSuccess(manualInput.trim());
                }}
                disabled={!manualInput.trim()}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Decode & Populate Summon Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Sample 1-Click Test Presets */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Quick 1-Click Test Samples:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuccess(preset.payload)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <span className="text-xs font-semibold text-white group-hover:text-amber-300 block">
                          {preset.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono truncate block">
                          {preset.payload}
                        </span>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Automatic field parsing for Indian e-Courts
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
