import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  QrCode, 
  Repeat, 
  Menu,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

interface MobileBottomNavProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onOpenQRScanner: () => void;
  onOpenMobileSidebar: () => void;
  onOpenApkModal: () => void;
  unreadNotifsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQRScanner,
  onOpenMobileSidebar,
  onOpenApkModal,
  unreadNotifsCount
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B1930]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 lg:hidden shadow-lg safe-bottom mobile-bottom-nav">
      <div className="flex items-center justify-around px-2 py-1.5 h-16 max-w-lg mx-auto relative">
        
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
            currentTab === 'dashboard'
              ? 'text-[#3977D5] dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Beranda</span>
        </button>

        {/* 2. Inventaris Aset */}
        <button
          type="button"
          onClick={() => onSelectTab('assets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
            currentTab === 'assets'
              ? 'text-[#3977D5] dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Aset</span>
        </button>

        {/* 3. Center Highlight: QR Scanner FAB */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenQRScanner}
            className="w-13 h-13 rounded-2xl bg-[#142B4A] dark:bg-[#3977D5] text-white flex flex-col items-center justify-center shadow-lg shadow-blue-900/30 active:scale-95 transition-all border-2 border-white dark:border-[#070F1E]"
            aria-label="Pindai QR"
            title="Scan QR / Barcode"
          >
            <QrCode className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* 4. Transaksi / Peminjaman */}
        <button
          type="button"
          onClick={() => onSelectTab('loans')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
            currentTab === 'loans'
              ? 'text-[#3977D5] dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Repeat className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Pinjam</span>
        </button>

        {/* 5. Menu Drawer / APK */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all relative"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500"></span>
          )}
        </button>

      </div>
    </nav>
  );
};
