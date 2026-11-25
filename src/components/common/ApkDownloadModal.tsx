import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  QrCode, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';
import { Modal } from './Modal';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaInstallPrompt: any;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
  pwaInstallPrompt
}) => {
  const [installStatus, setInstallStatus] = useState<'idle' | 'installed' | 'prompted'>('idle');

  const handleInstallClick = async () => {
    if (pwaInstallPrompt) {
      try {
        pwaInstallPrompt.prompt();
        const { outcome } = await pwaInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallStatus('installed');
        }
      } catch (e) {
        console.error('Install prompt error:', e);
      }
    } else {
      // Guide instructions
      setInstallStatus('prompted');
    }
  };

  const handleDownloadAppBundle = () => {
    // Generate an installable web app configuration package or shortcut file
    const content = `[InternetShortcut]\nURL=${window.location.origin}\nIconIndex=0\nIconFile=${window.location.origin}/icon-512.png`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Inventaris_Terpadu_Android.url');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unduh & Pasang APK Android"
      subtitle="Instal Inventaris Terpadu langsung ke ponsel Android Anda sebagai aplikasi resmi"
      maxWidth="lg"
    >
      <div className="space-y-5 text-slate-800 dark:text-slate-100">
        
        {/* Android Banner Card */}
        <div className="p-4.5 rounded-2xl bg-gradient-to-br from-[#142B4A] via-[#0B1930] to-[#1E3A8A] text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Android APK / PWA
                </span>
                <span className="text-[10px] text-blue-200">Versi 1.2.0</span>
              </div>
              <h4 className="text-base font-extrabold text-white mt-1">
                Inventaris Terpadu Mobile
              </h4>
              <p className="text-xs text-blue-200/90 line-clamp-1 mt-0.5">
                Aplikasi standalone responsif layar HP dengan sensor kamera QR
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px] text-blue-100">
            <div className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aman & Terenkripsi</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-blue-300" />
              <span>Kamera Barcode</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Mode Offline</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5 text-emerald-100" />
            <span>Pasang APK Sekarang ke HP Android</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAppBundle}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Unduh Paket Pintasan Android (.url / WebAPK Bundle)</span>
          </button>
        </div>

        {/* Step-by-Step Android Installation Guide */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-3">
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
            <Info className="w-4 h-4 text-[#3977D5]" />
            Panduan Instalasi APK di Android (Chrome / Samsung Internet):
          </p>

          <ol className="space-y-2 text-slate-600 dark:text-slate-300 pl-4 list-decimal text-[11px] leading-relaxed">
            <li>
              <strong className="text-slate-800 dark:text-slate-100">Langkah 1:</strong> Buka tautan aplikasi ini di peramban <span className="font-semibold text-blue-600 dark:text-blue-400">Google Chrome Android</span>.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-100">Langkah 2:</strong> Ketuk tombol <strong>"Pasang APK Sekarang"</strong> di atas, atau ketuk tombol menu titik tiga (<span className="font-bold">⋮</span>) di pojok kanan atas peramban.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-100">Langkah 3:</strong> Pilih menu <strong>"Install Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-100">Selesai:</strong> Sistem Android akan otomatis mengemas aplikasi menjadi <em>WebAPK</em> asli dengan ikon di layar depan HP Anda. Aplikasi berjalan mandiri tanpa tampilan address bar browser!
            </li>
          </ol>
        </div>

        {/* Screen layout optimization note */}
        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Tampilan Layar HP Otomatis:</strong> Saat dibuka di HP atau mode APK, antarmuka otomatis beralih ke navigasi bawah (bottom navigation), formulir sentuh yang dioptimalkan, serta tombol pemindai QR kamera instan.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>

      </div>
    </Modal>
  );
};
