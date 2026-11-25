import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Repeat, 
  ArrowLeftRight, 
  Wrench, 
  ClipboardCheck, 
  FolderTree, 
  FileText, 
  Bell, 
  Users, 
  Building2, 
  ShieldCheck, 
  ChevronDown, 
  Plus, 
  Download,
  Wifi,
  WifiOff,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RoleBadge } from '../common/Badge';

export type NavItemKey = 
  | 'dashboard'
  | 'assets'
  | 'stock-in'
  | 'stock-out'
  | 'loans'
  | 'transfers'
  | 'maintenance'
  | 'stocktake'
  | 'master'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'org-profile'
  | 'audit';

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: any;
  badge?: number;
  roles?: string[];
}

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  unreadNotifsCount: number;
  onOpenApkModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  unreadNotifsCount,
  onOpenApkModal
}) => {
  const { 
    currentUser, 
    currentOrg, 
    userRole, 
    userOrganizations, 
    switchOrganization, 
    logout,
    isOnline,
    seedDemoData
  } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);

  React.useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!pwaInstallPrompt) {
      alert('Aplikasi ini dapat diinstal melalui menu "Install App" pada peramban Anda (Chrome/Edge/Safari).');
      return;
    }
    pwaInstallPrompt.prompt();
    const { outcome } = await pwaInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setPwaInstallPrompt(null);
    }
  };

  const handleSeed = async () => {
    if (confirm('Muat data simulasi contoh untuk organisasi ini? Data ini berisi kategori, lokasi, aset, dan transaksi untuk uji coba fitur.')) {
      setIsSeeding(true);
      try {
        await seedDemoData();
        alert('Data demo berhasil dimuat ke Cloud Firestore!');
      } catch (e: any) {
        alert('Gagal memuat data demo: ' + (e.message || e));
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'UTAMA',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'assets', label: 'Inventaris Barang', icon: Boxes },
      ]
    },
    {
      title: 'OPERASIONAL & TRANSAKSI',
      items: [
        { key: 'stock-in', label: 'Barang Masuk', icon: ArrowDownToLine },
        { key: 'stock-out', label: 'Barang Keluar', icon: ArrowUpFromLine },
        { key: 'loans', label: 'Peminjaman', icon: Repeat },
        { key: 'transfers', label: 'Mutasi Aset', icon: ArrowLeftRight },
      ]
    },
    {
      title: 'PENGAWASAN & KUALITAS',
      items: [
        { key: 'maintenance', label: 'Pemeliharaan', icon: Wrench },
        { key: 'stocktake', label: 'Stock Opname', icon: ClipboardCheck },
      ]
    },
    {
      title: 'DATA MASTER & LAPORAN',
      items: [
        { key: 'master', label: 'Master Klasifikasi', icon: FolderTree },
        { key: 'reports', label: 'Laporan & Ekspor', icon: FileText },
        { 
          key: 'notifications', 
          label: 'Notifikasi', 
          icon: Bell, 
          badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined 
        },
      ]
    },
    {
      title: 'PENGATURAN SISTEM',
      items: [
        { key: 'users', label: 'Pengguna & Akses', icon: Users, roles: ['super_admin', 'admin'] },
        { key: 'org-profile', label: 'Profil Organisasi', icon: Building2 },
        { key: 'audit', label: 'Audit Log', icon: ShieldCheck, roles: ['super_admin', 'admin', 'auditor'] },
      ]
    }
  ];

  const handleNavClick = (key: NavItemKey) => {
    onSelectTab(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#142B4A] text-slate-100 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 bg-[#0B1930]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3977D5] flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              IT
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-base tracking-tight truncate">
                Inventaris Terpadu
              </h1>
              <p className="text-[11px] text-blue-200/80 truncate">
                Kelola Aset, Kendalikan Inventaris
              </p>
            </div>
          </div>

          {/* Organization Switcher Dropdown */}
          <div className="mt-4 relative">
            <button
              type="button"
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
            >
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Organisasi Aktif
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {currentOrg?.name || 'Pilih Organisasi'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0B1930] border border-white/10 rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
                {userOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      org.id === currentOrg?.id 
                        ? 'bg-[#3977D5] text-white' 
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <p className="font-bold truncate">{org.name}</p>
                    <span className="text-[10px] opacity-75">{org.type}</span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    handleNavClick('org-profile');
                    setOrgDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-blue-300 hover:bg-white/5 border-t border-white/10 mt-1 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah / Atur Organisasi
                </button>
              </div>
            )}
          </div>

          {/* User Role Badge in Header */}
          <div className="mt-2.5 flex items-center justify-between">
            <RoleBadge role={userRole} />
            <div className="flex items-center gap-1 text-[11px] text-slate-300">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, idx) => {
            // Filter out items that the current role is not authorized to see
            const visibleItems = group.items.filter(item => {
              if (!item.roles) return true;
              return item.roles.includes(userRole);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400/90 uppercase">
                  {group.title}
                </span>
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleNavClick(item.key as NavItemKey)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#3977D5] text-white shadow-md shadow-blue-900/30 font-semibold'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Seed Demo & APK Download & Theme & Logout */}
        <div className="p-4 border-t border-white/10 bg-[#0B1930]/60 space-y-2">
          {/* Quick Seed Demo Button */}
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            title="Muat data kategori, lokasi, aset, dan transaksi contoh"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {isSeeding ? 'Memuat Demo Data...' : 'Isi Data Demo Simulasi'}
          </button>

          {/* Unduh APK Android Button */}
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenApkModal();
            }}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            Unduh APK Android
          </button>

          {/* PWA Install Shortcut */}
          <button
            type="button"
            onClick={handleInstallPWA}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            Pasang Aplikasi (PWA)
          </button>

          {/* Dark / Light Mode Switcher in Sidebar */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="w-3.5 h-3.5 text-blue-300" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>Mode Tampilan</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {isDark ? 'Gelap (Dark)' : 'Terang (Light)'}
            </span>
          </button>

          {/* User Signout */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 rounded-xl text-rose-300 hover:bg-rose-500/10 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </aside>
    </>
  );
};
