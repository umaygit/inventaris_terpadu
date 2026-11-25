import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Boxes,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoginSuccessModal } from '../../components/common/LoginSuccessModal';

interface AuthViewProps {
  onOpenApkModal?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onOpenApkModal }) => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerOrganizationAndUser, 
    sendResetEmail,
    loginSuccessPayload,
    dismissLoginAnimation
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'activate'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Perusahaan');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Activate invited user state
  const [activateEmail, setActivateEmail] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [activateName, setActivateName] = useState('');

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk dengan Akun Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!activateEmail.trim()) {
      setErrorMsg('Alamat email wajib diisi.');
      return;
    }
    if (activatePassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use registerOrganizationAndUser which now automatically links to existing org if email was invited
      await registerOrganizationAndUser(
        'Organisasi Pengguna', 
        'Perusahaan', 
        activateEmail.trim().toLowerCase(), 
        activatePassword, 
        activateName.trim() || activateEmail.split('@')[0]
      );
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Email ini sudah memiliki akun. Silakan langsung masuk di menu Login dengan email dan kata sandi Anda.');
      } else {
        setErrorMsg(err.message || 'Gagal mengaktifkan akun.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMsg(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!orgName.trim()) {
      setErrorMsg('Nama organisasi wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerOrganizationAndUser(
        orgName.trim(), 
        orgType, 
        regEmail.trim(), 
        regPassword, 
        regFullName.trim()
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan organisasi baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await sendResetEmail(resetEmail.trim());
      setResetSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim email pemulihan kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#070F1E] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors relative">
      
      {/* Top Floating Controls: Theme Switcher & APK Download */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {onOpenApkModal && (
          <button
            type="button"
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30"
            title="Unduh & Pasang APK Android"
          >
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Unduh APK</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200/80 dark:border-slate-700 shadow-xs"
          aria-label={isDark ? 'Mode Terang' : 'Mode Gelap'}
          title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Header Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#142B4A] dark:bg-[#3977D5] border border-blue-900/50 flex items-center justify-center mx-auto shadow-xl shadow-blue-950/20 mb-3.5">
          <Boxes className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] dark:text-white tracking-tight">
          Inventaris Terpadu
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Kelola Aset, Kendalikan Inventaris &bull; Berbasis Cloud Multi-Tenant
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#0B1930] py-7 px-5 shadow-xl rounded-3xl sm:px-9 border border-slate-200/80 dark:border-slate-800 transition-colors">
          
          {/* Error Notice */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reset Success Notice */}
          {resetSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Instruksi pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk.</span>
            </div>
          )}

          {/* Google Sign-In (Official & Primary) */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs bg-white dark:bg-slate-900/90 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#0B1930] px-3 text-slate-400 dark:text-slate-500 font-medium tracking-wider">
                  atau dengan email
                </span>
              </div>
            </div>
          </div>

          {/* Mode 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@organisasi.id"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? 'Memproses...' : 'Masuk ke Sistem'}
                <ArrowRight className="w-4 h-4 text-blue-300" />
              </button>

              <div className="flex flex-col gap-1.5 text-center pt-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>Email Anda sudah diinput oleh Admin? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('activate');
                      setErrorMsg(null);
                      setActivateEmail(loginEmail);
                    }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Aktivasi / Buat Kata Sandi
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>Belum memiliki organisasi? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                    }}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Daftar Organisasi Baru
                  </button>
                </div>
              </div>

              </form>
          )}

          {/* Mode: AKTIVASI AKUN (Untuk email yang sudah diinput di Pengguna & Hak Akses) */}
          {mode === 'activate' && (
            <form onSubmit={handleActivateAccount} className="space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-blue-800 dark:text-blue-300 text-xs">
                <span className="font-bold block mb-0.5">Aktivasi Akun Pengguna</span>
                Masukkan email yang telah didaftarkan oleh Admin, kemudian buat kata sandi untuk akun Anda. Anda akan langsung masuk sesuai peran yang telah ditentukan.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email Terdaftar *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={activateEmail}
                    onChange={(e) => setActivateEmail(e.target.value)}
                    placeholder="nama@organisasi.id"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap (Opsional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={activateName}
                    onChange={(e) => setActivateName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buat Kata Sandi Baru * (Minimal 6 karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={activatePassword}
                    onChange={(e) => setActivatePassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? 'Mengaktifkan...' : 'Aktifkan Akun & Masuk'}
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Organisasi / Lembaga / Sekolah
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Contoh: SMA Negeri 1 / PT Sukses Bersama"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Organisasi
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                >
                  <option value="Sekolah / Madrasah">Sekolah / Madrasah</option>
                  <option value="Perusahaan">Perusahaan Swasta / BUMN</option>
                  <option value="Lembaga / Yayasan">Yayasan / Lembaga Sosial</option>
                  <option value="Pemerintahan">Instansi Pemerintah / Dinas</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Administrator
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Contoh: Budi Pratama, S.T."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Administrator
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@organisasi.id"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi (Minimal 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-3 cursor-pointer"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Buat Organisasi & Akun'}
                <ArrowRight className="w-4 h-4 text-blue-300" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sudah memiliki akun? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan Alamat Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="nama@organisasi.id"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Tautan Reset Sandi'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setResetSuccess(false);
                  }}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
            <span>Multi-Tenant & Dilindungi Aturan Keamanan Firestore</span>
          </div>

        </div>
      </div>

      {/* Login Success Animation Modal */}
      {loginSuccessPayload && (
        <LoginSuccessModal
          name={loginSuccessPayload.name}
          role={loginSuccessPayload.role}
          email={loginSuccessPayload.email}
          orgName={loginSuccessPayload.orgName}
          onFinish={dismissLoginAnimation}
        />
      )}
    </div>
  );
};
