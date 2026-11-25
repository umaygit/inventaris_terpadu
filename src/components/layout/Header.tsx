import React, { useState } from 'react';
import { 
  Menu, 
  QrCode, 
  Bell, 
  Search, 
  Wifi, 
  WifiOff, 
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RoleBadge } from '../common/Badge';
import { NotificationItem } from '../../types';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenQRScanner: () => void;
  onOpenApkModal: () => void;
  pageTitle: string;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onNavigateToNotifications: () => void;
  onGlobalSearch: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenQRScanner,
  onOpenApkModal,
  pageTitle,
  notifications,
  onMarkNotificationRead,
  onNavigateToNotifications,
  onGlobalSearch
}) => {
  const { currentUser, userProfile, userRole, currentOrg, isOnline } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onGlobalSearch(searchTerm.trim());
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0B1930] border-b border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-6 py-3 flex items-center justify-between shadow-xs transition-colors">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#142B4A] dark:text-white tracking-tight flex items-center gap-2">
            {pageTitle}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {currentOrg?.name} &bull; <span className="font-medium text-slate-700 dark:text-slate-300">{currentOrg?.code}</span>
          </p>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari cepat aset, kode, nomor seri, atau penanggung jawab..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5] focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
          />
        </div>
      </form>

      {/* Right: APK Button, Theme Toggle, QR Button, Online Badge, Notif, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        
        {/* Unduh APK Button */}
        <button
          type="button"
          onClick={onOpenApkModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-500/30"
          title="Unduh & Pasang APK Android"
        >
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden xs:inline sm:inline">Unduh APK</span>
        </button>

        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700"
          aria-label={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Quick QR Scanner Button */}
        <button
          type="button"
          onClick={onOpenQRScanner}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
          title="Scan Barcode / QR Barang"
        >
          <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Pindai QR</span>
        </button>

        {/* Network Status indicator */}
        <div className="hidden md:flex items-center">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
              <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Offline
            </span>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-76 sm:w-96 bg-white dark:bg-[#0B1930] rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-3 z-40">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Pemberitahuan Sistem</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigateToNotifications();
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Tidak ada notifikasi saat ini.</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        n.read 
                          ? 'bg-white dark:bg-[#070F1E] border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400' 
                          : 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900 text-slate-800 dark:text-slate-100 font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'critical' || n.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{n.title}</p>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-[#142B4A] dark:bg-[#3977D5] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {userProfile?.displayName ? userProfile.displayName.substring(0, 2) : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[120px]">
              {userProfile?.displayName || currentUser?.email?.split('@')[0]}
            </p>
            <RoleBadge role={userRole} />
          </div>
        </div>
      </div>
    </header>
  );
};
