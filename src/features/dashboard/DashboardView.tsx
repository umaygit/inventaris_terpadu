import React, { useState } from 'react';
import { 
  Boxes, 
  PackageCheck, 
  AlertTriangle, 
  XCircle, 
  Repeat, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Coins, 
  Calendar, 
  Sparkles, 
  Plus, 
  Clock, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { ConditionBadge, StatusBadge } from '../../components/common/Badge';
import { Asset, StockTransaction, Loan, Category, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  assets: Asset[];
  transactions: StockTransaction[];
  loans: Loan[];
  categories: Category[];
  auditLogs: AuditLog[];
  onNavigateTab: (tab: any) => void;
  onOpenAddAsset: () => void;
  onSelectAsset: (asset: Asset) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  transactions,
  loans,
  categories,
  auditLogs,
  onNavigateTab,
  onOpenAddAsset,
  onSelectAsset
}) => {
  const { currentOrg, seedDemoData } = useAuth();
  const [period, setPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [isSeeding, setIsSeeding] = useState(false);

  // Calculate Metrics from Live Firestore State
  const totalItemTypes = assets.length;
  const totalUnits = assets.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalValue = assets.reduce((acc, curr) => acc + (Number(curr.totalValue) || (Number(curr.quantity) * Number(curr.purchasePrice)) || 0), 0);

  const goodCondition = assets.filter(a => a.condition === 'good').length;
  const lightlyDamaged = assets.filter(a => a.condition === 'lightly_damaged').length;
  const heavilyDamaged = assets.filter(a => a.condition === 'heavily_damaged').length;

  const currentlyBorrowed = loans.filter(l => l.status === 'active' || l.status === 'overdue').length;
  
  // Overdue or near-due loans (due within 3 days or past)
  const today = new Date();
  const criticalLoans = loans.filter(l => {
    if (l.status === 'returned') return false;
    const dueDate = new Date(l.dueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 3; // overdue or within 3 days
  });

  // Monthly transactions
  const currentMonth = today.toISOString().substring(0, 7); // "YYYY-MM"
  const incomingThisMonth = transactions
    .filter(t => t.type === 'in' && t.date?.startsWith(currentMonth))
    .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const outgoingThisMonth = transactions
    .filter(t => t.type === 'out' && t.date?.startsWith(currentMonth))
    .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  // Group assets by Category
  const categoryDistribution = categories.map(cat => {
    const matchingAssets = assets.filter(a => a.categoryId === cat.id);
    const count = matchingAssets.reduce((sum, a) => sum + a.quantity, 0);
    const value = matchingAssets.reduce((sum, a) => sum + (Number(a.totalValue) || 0), 0);
    return {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      count,
      value
    };
  }).filter(c => c.count > 0 || c.value > 0);

  // If no category matched or uncategorized assets exist
  const uncategorizedAssets = assets.filter(a => !categories.some(c => c.id === a.categoryId));
  if (uncategorizedAssets.length > 0) {
    categoryDistribution.push({
      id: 'other',
      name: 'Lainnya / Umum',
      code: 'OTH',
      count: uncategorizedAssets.reduce((sum, a) => sum + a.quantity, 0),
      value: uncategorizedAssets.reduce((sum, a) => sum + (Number(a.totalValue) || 0), 0)
    });
  }

  // Format currency in IDR
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  // Empty state if database has no assets yet
  if (assets.length === 0 && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#0B1930] rounded-3xl p-6 sm:p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-2xl mx-auto my-4 sm:my-8 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#3977D5] dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Selamat Datang di Inventaris Terpadu!
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto leading-relaxed">
            Database organisasi <span className="font-semibold text-slate-900 dark:text-white">{currentOrg?.name}</span> masih kosong. Mulai dengan mendaftarkan aset pertama Anda atau muat data simulasi lengkap untuk menguji coba seluruh alur aplikasi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAddAsset}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-blue-300" />
              Tambah Barang Pertama
            </button>
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {isSeeding ? 'Memuat Data Demo...' : 'Muat Contoh Data Demo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Filter and Organization Snapshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Ikhtisar Eksekutif Inventaris & Aset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantauan aset fisik, mutasi barang, peminjaman, dan status kondisi terkini
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddAsset}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] text-white text-xs font-semibold rounded-xl hover:bg-[#0B1930] dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-blue-300" />
            Tambah Aset
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Laporan
          </button>
        </div>
      </div>

      {/* 10 Master Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Jenis Aset"
          value={totalItemTypes}
          subtitle="SKU terdaftar"
          icon={Boxes}
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconColor="text-blue-600 dark:text-blue-400"
          onClick={() => onNavigateTab('assets')}
        />

        <StatCard
          title="Total Kuantitas"
          value={totalUnits.toLocaleString('id-ID')}
          subtitle="Unit fisik"
          icon={PackageCheck}
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconColor="text-indigo-600 dark:text-indigo-400"
          onClick={() => onNavigateTab('assets')}
        />

        <StatCard
          title="Nilai Perolehan"
          value={formatIDR(totalValue)}
          subtitle="Estimasi buku"
          icon={Coins}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Kondisi Baik"
          value={goodCondition}
          subtitle={`${totalItemTypes > 0 ? Math.round((goodCondition / totalItemTypes) * 100) : 0}% dari total`}
          icon={PackageCheck}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Perlu Perbaikan"
          value={lightlyDamaged + heavilyDamaged}
          subtitle={`${lightlyDamaged} ringan, ${heavilyDamaged} berat`}
          icon={AlertTriangle}
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconColor="text-amber-600 dark:text-amber-400"
          onClick={() => onNavigateTab('maintenance')}
        />

        <StatCard
          title="Sedang Dipinjam"
          value={currentlyBorrowed}
          subtitle="Peminjaman aktif"
          icon={Repeat}
          iconBgColor="bg-sky-50 dark:bg-sky-950/60"
          iconColor="text-sky-600 dark:text-sky-400"
          onClick={() => onNavigateTab('loans')}
        />

        <StatCard
          title="Jatuh Tempo"
          value={criticalLoans.length}
          subtitle="Harus dikembalikan"
          icon={Clock}
          iconBgColor="bg-rose-50 dark:bg-rose-950/60"
          iconColor="text-rose-600 dark:text-rose-400"
          onClick={() => onNavigateTab('loans')}
        />

        <StatCard
          title="Masuk Bulan Ini"
          value={incomingThisMonth}
          subtitle="Unit diterima"
          icon={ArrowDownToLine}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => onNavigateTab('stock-in')}
        />

        <StatCard
          title="Keluar Bulan Ini"
          value={outgoingThisMonth}
          subtitle="Unit terdistribusi"
          icon={ArrowUpFromLine}
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconColor="text-purple-600 dark:text-purple-400"
          onClick={() => onNavigateTab('stock-out')}
        />

        <StatCard
          title="Aktivitas Sistem"
          value={auditLogs.length}
          subtitle="Audit log tercatat"
          icon={TrendingUp}
          iconBgColor="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-700 dark:text-slate-300"
          onClick={() => onNavigateTab('audit')}
        />
      </div>

      {/* Visual Analytics Grid: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Chart 1: Distribusi Aset per Kategori */}
        <div className="bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Distribusi Aset per Kategori</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Volume kuantitas unit fisik per kelompok barang</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                {categoryDistribution.length} Kategori
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {categoryDistribution.map((cat, idx) => {
                const percentage = totalUnits > 0 ? Math.round((cat.count / totalUnits) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {cat.name} ({cat.code})
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {cat.count} Unit <span className="text-slate-400 dark:text-slate-500">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#3977D5] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Kuantitas Terdistribusi</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalUnits} Unit</span>
          </div>
        </div>

        {/* Chart 2: Komposisi Kondisi Aset & Nilai */}
        <div className="bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Kondisi Fisik & Kesiapan Aset</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Rasio status kelayakan pakai inventaris operasional</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                Kondisi Real-Time
              </span>
            </div>

            {/* Visual Donut / Segment Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 my-2">
              <div className="flex h-5 rounded-xl overflow-hidden shadow-inner bg-slate-200 dark:bg-slate-800">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${totalItemTypes > 0 ? (goodCondition / totalItemTypes) * 100 : 0}%` }}
                  title={`Baik: ${goodCondition}`}
                />
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${totalItemTypes > 0 ? (lightlyDamaged / totalItemTypes) * 100 : 0}%` }}
                  title={`Rusak Ringan: ${lightlyDamaged}`}
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  style={{ width: `${totalItemTypes > 0 ? (heavilyDamaged / totalItemTypes) * 100 : 0}%` }}
                  title={`Rusak Berat: ${heavilyDamaged}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-1"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kondisi Baik</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{goodCondition}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto mb-1"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rusak Ringan</p>
                  <p className="text-base font-bold text-amber-700 dark:text-amber-400">{lightlyDamaged}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-rose-200/60 dark:border-rose-800/60">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mx-auto mb-1"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rusak Berat</p>
                  <p className="text-base font-bold text-rose-700 dark:text-rose-400">{heavilyDamaged}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Nilai Buku Perolehan</span>
            <span className="font-bold text-[#142B4A] dark:text-blue-300 font-mono">{formatIDR(totalValue)}</span>
          </div>
        </div>

      </div>

      {/* Two Column Action Area: Critical Loans & Recent Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Urgent Action: Peminjaman Mendekati / Lewat Jatuh Tempo */}
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Perhatian: Peminjaman Jatuh Tempo</h4>
            </div>
            <button
              onClick={() => onNavigateTab('loans')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              Semua Peminjaman <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {criticalLoans.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
              <PackageCheck className="w-8 h-8 mx-auto mb-1.5 text-emerald-500" />
              Tidak ada peminjaman yang terlambat atau mendekati jatuh tempo saat ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {criticalLoans.map((loan) => {
                const isOverdue = new Date(loan.dueDate) < today;
                return (
                  <div 
                    key={loan.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      isOverdue 
                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900' 
                        : 'bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{loan.assetName}</p>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        Peminjam: <span className="font-semibold">{loan.borrowerName}</span> ({loan.department || '-'})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        isOverdue ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {isOverdue ? 'TERLAMBAT' : 'JATUH TEMPO'}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        Batas: {loan.dueDate}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Assets Registered */}
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#3977D5] dark:text-blue-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Aset Terbaru Terdaftar</h4>
            </div>
            <button
              onClick={() => onNavigateTab('assets')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              Daftar Lengkap <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {assets.slice(0, 4).map((asset) => (
              <div 
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-[11px]">
                      {asset.itemCode}
                    </span>
                    <ConditionBadge condition={asset.condition} />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {asset.name}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {asset.locationName || 'Lokasi belum ditentukan'} &bull; {asset.quantity} {asset.unit}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatIDR(asset.purchasePrice)}
                  </p>
                  <StatusBadge status={asset.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
