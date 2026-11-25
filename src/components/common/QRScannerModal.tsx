import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Search,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Flashlight,
  FlipHorizontal,
  Upload,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw,
  Tag,
  MapPin,
  Package,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import jsQR from 'jsqr';
import { Modal } from './Modal';
import { Asset } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
  assets?: Asset[];
}

interface DecodedInfo {
  raw: string;
  code: string;
  name?: string;
  sn?: string;
  org?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  assets = []
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<DecodedInfo | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Stop camera stream & scan loop
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Beep & vibration feedback
  const triggerFeedback = useCallback(() => {
    if (soundEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.16);
        }
      } catch (e) {
        console.warn('Audio feedback error:', e);
      }
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 50, 80]);
      }
    } catch {}
  }, [soundEnabled]);

  // Parse QR / Barcode string (can be JSON or plain text)
  const parseCodeString = useCallback((rawText: string): DecodedInfo => {
    const trimmed = rawText.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const code = parsed.code || parsed.itemCode || parsed.id || trimmed;
        return {
          raw: trimmed,
          code: String(code).trim(),
          name: parsed.name ? String(parsed.name).trim() : undefined,
          sn: parsed.sn ? String(parsed.sn).trim() : undefined,
          org: parsed.org ? String(parsed.org).trim() : undefined
        };
      }
    } catch {
      // not JSON
    }
    return {
      raw: trimmed,
      code: trimmed
    };
  }, []);

  // Find asset match in database
  const findMatchingAsset = useCallback((info: DecodedInfo): Asset | null => {
    if (!assets || assets.length === 0) return null;
    const target = info.code.toLowerCase();
    const targetRaw = info.raw.toLowerCase();
    const targetSn = info.sn?.toLowerCase();

    return assets.find(a => {
      const itemCode = a.itemCode?.toLowerCase();
      const serialNumber = a.serialNumber?.toLowerCase();
      const barcode = a.barcode?.toLowerCase();

      return (
        itemCode === target ||
        itemCode === targetRaw ||
        (serialNumber && (serialNumber === target || serialNumber === targetRaw || (targetSn && serialNumber === targetSn))) ||
        (barcode && (barcode === target || barcode === targetRaw))
      );
    }) || null;
  }, [assets]);

  // When a code is detected (by camera, image upload, or manual entry)
  const handleCodeDetected = useCallback((raw: string) => {
    const info = parseCodeString(raw);
    const matched = findMatchingAsset(info);

    setScannedResult(info);
    setMatchedAsset(matched);
    setIsScanning(false);
    triggerFeedback();
  }, [parseCodeString, findMatchingAsset, triggerFeedback]);

  // Start Camera with facingMode and check capabilities
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak didukung oleh browser Anda. Gunakan opsi unggah foto atau masukkan kode secara manual.');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (fallbackErr) {
        console.warn('Initial camera constraints failed, attempting fallback:', fallbackErr);
        // Fallback for simpler camera constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as unknown as { torch?: boolean })) || {};
          setHasTorch(Boolean(capabilities.torch));
        } catch {
          setHasTorch(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(e => console.warn('Video play warning:', e));
      }

      setCameraActive(true);
      setIsScanning(true);
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('Permission') || errorMsg.includes('denied') || errorMsg.includes('NotAllowedError')) {
        setCameraError('Izin akses kamera ditolak. Silakan izinkan kamera di pengaturan browser Anda atau gunakan unggah gambar.');
      } else if (errorMsg.includes('NotFound') || errorMsg.includes('DevicesNotFoundError')) {
        setCameraError('Tidak ada perangkat kamera yang terdeteksi.');
      } else {
        setCameraError('Gagal mengakses kamera. Silakan periksa izin kamera atau coba lagi.');
      }
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Flip camera between environment (back) and user (front)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
  };

  // Continuous frame analysis scan loop using BarcodeDetector and jsQR
  useEffect(() => {
    if (!cameraActive || !isScanning) {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      return;
    }

    let isScanningFrame = false;

    // Check if BarcodeDetector is available
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let barcodeDetector: unknown = null;
    if (hasBarcodeDetector) {
      try {
        const DetectorClass = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: HTMLVideoElement | HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        barcodeDetector = new DetectorClass({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
        });
      } catch {
        barcodeDetector = null;
      }
    }

    const scanFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const now = Date.now();
      // Throttle scanning to ~60ms intervals (approx 16 scans/sec) for optimal battery and responsive detection
      if (now - lastScanTimeRef.current >= 60 && !isScanningFrame && video && video.readyState >= 2 && video.videoWidth > 0) {
        isScanningFrame = true;
        lastScanTimeRef.current = now;

        try {
          let detectedText: string | null = null;

          // 1. Try Hardware BarcodeDetector if available
          if (barcodeDetector && typeof (barcodeDetector as { detect?: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }).detect === 'function') {
            try {
              const barcodes = await (barcodeDetector as { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }).detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedText = barcodes[0].rawValue;
              }
            } catch {
              // Ignore and fallback to canvas jsQR
            }
          }

          // 2. Try Canvas + jsQR
          if (!detectedText && canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              // Downscale slightly if video is large (e.g. 1080p+) for fast processing
              const targetWidth = Math.min(video.videoWidth, 800);
              const targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);

              if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
              }

              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });

              if (qrCode && qrCode.data && qrCode.data.trim()) {
                detectedText = qrCode.data.trim();
              }
            }
          }

          if (detectedText) {
            handleCodeDetected(detectedText);
            return; // Exit loop since code detected
          }
        } catch (err) {
          console.warn('Frame scan error:', err);
        } finally {
          isScanningFrame = false;
        }
      }

      if (isScanning) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [cameraActive, isScanning, handleCodeDetected]);

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setMatchedAsset(null);
      setManualCode('');
      setIsScanning(true);
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setMatchedAsset(null);
      setManualCode('');
      setCameraError(null);
    }
  }, [isOpen, startCamera, stopCamera]);

  // Handle image upload from file or gallery
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setImageProcessing(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let detectedText: string | null = null;

        // Try BarcodeDetector on image
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const DetectorClass = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
            const detector = new DetectorClass({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
            });
            const codes = await detector.detect(canvas);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              detectedText = codes[0].rawValue;
            }
          } catch {}
        }

        // Try jsQR
        if (!detectedText) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (qrCode && qrCode.data) {
            detectedText = qrCode.data;
          }
        }

        setImageProcessing(false);

        if (detectedText) {
          handleCodeDetected(detectedText);
        } else {
          alert('Tidak dapat mendeteksi kode QR atau barcode pada gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
  };

  // Resume scanning for another code
  const handleScanAgain = () => {
    setScannedResult(null);
    setMatchedAsset(null);
    setIsScanning(true);
    if (!cameraActive) {
      startCamera();
    }
  };

  // Open asset detail / apply scan result
  const handleConfirmResult = () => {
    if (!scannedResult) return;
    onScanResult(scannedResult.code);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pemindai Barcode & QR Code"
      subtitle="Arahkan kamera ke kode QR barang untuk membaca data inventaris otomatis"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Hidden Canvas for video frame processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Viewport Box */}
        <div className="relative aspect-video sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center">
          {/* Video Feed */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
            playsInline
            muted
            autoPlay
          />

          {/* Top Overlays Controls */}
          {cameraActive && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[11px] font-medium border border-white/10">
                <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span>{isScanning ? 'Sensor Aktif' : 'Hasil Terdeteksi'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                    className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
                      torchOn
                        ? 'bg-amber-400 text-slate-900 border-amber-300'
                        : 'bg-black/60 text-white border-white/15 hover:bg-black/80'
                    }`}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Ganti Kamera (Depan / Belakang)"
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 hover:bg-black/80 transition-colors"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 hover:bg-black/80 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
          )}

          {/* Target Scanner Viewfinder Guides */}
          {cameraActive && isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-lg" />

                {/* Laser scan line animation */}
                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-medium text-emerald-300/90 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
                    Posisikan QR di dalam kotak
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Inactive / Error Display */}
          {!cameraActive && (
            <div className="p-6 text-center text-slate-400 max-w-sm z-10">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-xs text-slate-300 font-medium mb-1">
                {cameraError ? 'Kamera Belum Terhubung' : 'Menginisialisasi Kamera...'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                {cameraError || 'Mohon izinkan akses kamera pada peramban Anda untuk melakukan pemindaian barcode langsung.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Hubungkan Kamera Lagi
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Foto QR
                </button>
              </div>
            </div>
          )}

          {/* Image processing loader */}
          {imageProcessing && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-white">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-2" />
              <p className="text-xs font-medium">Menganalisis gambar QR code...</p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RESULT DISPLAY PANEL: Menampilkan Hasil Scan Secara Lengkap & Interaktif */}
        {/* ========================================================================= */}
        {scannedResult ? (
          <div className="bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-slate-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3.5 transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      QR / Barcode Berhasil Dipindai!
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      Terbaca
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sensor kamera berhasil membaca format kode barang
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanAgain}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center gap-1.5 border border-slate-300/60 dark:border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Scan Ulang
              </button>
            </div>

            {/* Matched Asset Info or Unmatched Info */}
            {matchedAsset ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md mb-1 font-mono">
                      <Tag className="w-3 h-3" />
                      {matchedAsset.itemCode}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {matchedAsset.name}
                    </h4>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    matchedAsset.status === 'available'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : matchedAsset.status === 'borrowed'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : matchedAsset.status === 'under_maintenance'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  }`}>
                    {matchedAsset.status === 'available' ? 'Tersedia' :
                     matchedAsset.status === 'borrowed' ? 'Dipinjam' :
                     matchedAsset.status === 'in_use' ? 'Digunakan' :
                     matchedAsset.status === 'under_maintenance' ? 'Dalam Perbaikan' : 'Diputihkan'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Kategori
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {matchedAsset.categoryName || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Ruangan / Lokasi
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {matchedAsset.locationName || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Jumlah Fisik
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {matchedAsset.quantity} {matchedAsset.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Kondisi
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {matchedAsset.condition === 'good' ? 'Baik' : matchedAsset.condition === 'lightly_damaged' ? 'Rusak Ringan' : 'Rusak Berat'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmResult}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Detail Lengkap Aset
                  </button>
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Pindai Kode Lain
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-semibold">
                    Kode terbaca namun belum terdaftar di database organisasi
                  </p>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kode Hasil Pindai:</span>
                  <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 select-all break-all">
                    {scannedResult.code}
                  </p>
                  {scannedResult.name && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Label: <span className="font-medium">{scannedResult.name}</span>
                    </p>
                  )}
                  {scannedResult.sn && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      S/N: <span className="font-mono">{scannedResult.sn}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmResult}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Cari di Pencarian Master Aset
                  </button>
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Pindai Ulang
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Bottom Actions: Image Upload & Manual Code Form */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ketik Manual atau Unggah Gambar QR:
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Foto QR dari Galeri
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Masukkan Kode Inventaris, misal: INV-ELK-2024-001"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] text-white text-xs font-bold rounded-xl hover:bg-[#0B1930] dark:hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0"
            >
              Cek Kode
            </button>
          </form>

          {/* Quick test chips if assets exist */}
          {assets && assets.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1.5 flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                Pintasan Kode Aset Terdaftar:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {assets.slice(0, 4).map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleCodeDetected(asset.itemCode)}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                  >
                    {asset.itemCode}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
