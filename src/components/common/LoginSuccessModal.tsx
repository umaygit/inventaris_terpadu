import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { UserRole } from '../../types';

interface LoginSuccessModalProps {
  name: string;
  role: UserRole;
  email: string;
  orgName: string;
  onFinish: () => void;
}

const roleConfig: Record<UserRole, { label: string; bg: string; text: string; border: string; desc: string }> = {
  super_admin: {
    label: 'Super Administrator',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600/40',
    desc: 'Akses Penuh Seluruh Sistem & Konfigurasi'
  },
  admin: {
    label: 'Administrator',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-600/40',
    desc: 'Pengelolaan Inventaris, Pengguna & Transaksi'
  },
  kepala: {
    label: 'Kepala Bagian / Gudang',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-600/40',
    desc: 'Persetujuan, Verifikasi & Monitoring Aset'
  },
  petugas: {
    label: 'Petugas Lapangan',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600/40',
    desc: 'Input Barang, Peminjaman & Stock Opname'
  },
  auditor: {
    label: 'Auditor / Peninjau',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-600/40',
    desc: 'Audit Fisik, Verifikasi & Rekonsiliasi'
  }
};

export const LoginSuccessModal: React.FC<LoginSuccessModalProps> = ({
  name,
  role,
  email,
  orgName,
  onFinish
}) => {
  const [progress, setProgress] = useState(0);
  const roleInfo = roleConfig[role] || roleConfig.petugas;

  useEffect(() => {
    // Fill progress bar over 1.3 seconds
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 60);

    const timer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B1930] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center transform transition-all duration-300 animate-in zoom-in-95 overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Success Icon with Animated Ring */}
        <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
          {/* Pulsing Outer Rings */}
          <div className="absolute inset-0 rounded-full bg-emerald-400/25 dark:bg-emerald-500/20 animate-ping opacity-60" />
          <div className="absolute inset-1 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 animate-pulse" />
          
          {/* Main Icon Container */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform transition-transform duration-500 hover:scale-105">
            <CheckCircle2 className="w-11 h-11 text-white animate-in zoom-in duration-300" strokeWidth={2.5} />
          </div>

          {/* Sparkle Badge */}
          <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md animate-bounce">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Greeting & Title */}
        <h3 className="text-2xl font-black text-[#142B4A] dark:text-white tracking-tight">
          Login Berhasil!
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Autentikasi terverifikasi. Selamat datang kembali,
        </p>
        
        {/* User Name */}
        <div className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
          <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate max-w-[280px]">{name}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
          {email}
        </p>

        {/* Role & Org Card */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              Peran Hak Akses:
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
              {roleInfo.label}
            </span>
          </div>
          
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            &bull; {roleInfo.desc}
          </p>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Organisasi:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[190px]">
              {orgName || 'SMK NW Anjani'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Membuka dashboard kerja inventaris...
          </p>
        </div>

        {/* Instant Skip Button */}
        <button
          type="button"
          onClick={onFinish}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <span>Masuk Langsung</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
};
