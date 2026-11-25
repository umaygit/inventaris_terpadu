import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Printer, 
  QrCode, 
  Edit3, 
  Trash2, 
  Eye, 
  LayoutGrid, 
  List, 
  ChevronLeft, 
  ChevronRight,
  Boxes,
  ArrowUpDown
} from 'lucide-react';
import { Asset, Category, Location, PIC, Supplier } from '../../types';
import { ConditionBadge, StatusBadge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BulkAssetLabelModal } from '../../components/common/BulkAssetLabelModal';
import { useAuth } from '../../context/AuthContext';

interface AssetListViewProps {
  assets: Asset[];
  categories: Category[];
  locations: Location[];
  pics: PIC[];
  suppliers: Supplier[];
  onAddAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onViewAsset: (asset: Asset) => void;
  onPrintLabel: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => Promise<void>;
  onOpenImport: () => void;
  initialSearchQuery?: string;
}

export const AssetListView: React.FC<AssetListViewProps> = ({
  assets,
  categories,
  locations,
  onAddAsset,
  onEditAsset,
  onViewAsset,
  onPrintLabel,
  onDeleteAsset,
  onOpenImport,
  initialSearchQuery = ''
}) => {
  const { userRole, currentOrg } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'date' | 'price' | 'quantity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Deletion confirm state
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Label Print modal state
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);

  // Filtered and Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Search check
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        item.name.toLowerCase().includes(query) ||
        item.itemCode.toLowerCase().includes(query) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
        (item.locationName && item.locationName.toLowerCase().includes(query)) ||
        (item.picName && item.picName.toLowerCase().includes(query));

      // Category filter
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;

      // Location filter
      const matchesLocation = selectedLocation === 'all' || item.locationId === selectedLocation;

      // Condition filter
      const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition;

      // Status filter
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

      // Type filter
      const matchesType = selectedType === 'all' || item.type === selectedType;

      return matchesSearch && matchesCategory && matchesLocation && matchesCondition && matchesStatus && matchesType;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'code') comparison = a.itemCode.localeCompare(b.itemCode);
      else if (sortBy === 'date') comparison = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
      else if (sortBy === 'price') comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
      else if (sortBy === 'quantity') comparison = (a.quantity || 0) - (b.quantity || 0);

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    assets, 
    searchTerm, 
    selectedCategory, 
    selectedLocation, 
    selectedCondition, 
    selectedStatus, 
    selectedType, 
    sortBy, 
    sortOrder
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(start, start + itemsPerPage);
  }, [filteredAssets, currentPage]);

  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;
    const headers = [
      'Kode Inventaris',
      'Nama Barang',
      'Kategori',
      'Merek',
      'Model',
      'Nomor Seri',
      'Jenis Aset',
      'Satuan',
      'Kuantitas',
      'Tersedia',
      'Harga Satuan',
      'Nilai Total',
      'Kondisi',
      'Status',
      'Lokasi',
      'Penanggung Jawab',
      'Tgl Perolehan'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredAssets.map(a => [
        `"${a.itemCode}"`,
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.categoryName || ''}"`,
        `"${a.brand || ''}"`,
        `"${a.model || ''}"`,
        `"${a.serialNumber || ''}"`,
        `"${a.type}"`,
        `"${a.unit}"`,
        a.quantity,
        a.availableQuantity ?? a.quantity,
        a.purchasePrice,
        a.totalValue || (a.quantity * a.purchasePrice),
        `"${a.condition}"`,
        `"${a.status}"`,
        `"${a.locationName || ''}"`,
        `"${a.picName || ''}"`,
        `"${a.purchaseDate || ''}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Inventaris_${currentOrg?.code || 'INV'}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteAsset(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      alert('Gagal menghapus data: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const canEdit = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';
  const canDelete = userRole === 'super_admin' || userRole === 'admin';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Daftar Master Inventaris & Aset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total {filteredAssets.length} barang terdata dalam sistem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onAddAsset}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-blue-300" />
              <span>Tambah Aset</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={onOpenImport}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Impor CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsBulkPrintOpen(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            title="Generate & Cetak Seluruh Label QR dalam Lembaran Kertas F4 (Muat Banyak Label Sekaligus)"
          >
            <QrCode className="w-4 h-4 text-emerald-100" />
            <span>Cetak Semua Label QR (F4)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredAssets.length === 0}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Ekspor</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        {/* Search & Layout toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kode, nama barang, nomor seri, PIC..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-slate-900 text-[#142B4A] dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-900 text-[#142B4A] dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ruangan / Lokasi</label>
            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Lokasi</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.building} - {l.roomName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Kondisi</label>
            <select
              value={selectedCondition}
              onChange={(e) => { setSelectedCondition(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Kondisi</option>
              <option value="good">Baik</option>
              <option value="lightly_damaged">Rusak Ringan</option>
              <option value="heavily_damaged">Rusak Berat</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="available">Tersedia</option>
              <option value="in_use">Digunakan</option>
              <option value="borrowed">Dipinjam</option>
              <option value="under_maintenance">Perawatan</option>
              <option value="disposed">Diarsipkan/Afkir</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Urutan</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="name">Nama</option>
                <option value="code">Kode</option>
                <option value="date">Tgl Beli</option>
                <option value="price">Harga</option>
                <option value="quantity">Jumlah</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title={sortOrder === 'asc' ? 'Menaik (A-Z)' : 'Menurun (Z-A)'}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
          <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada barang yang cocok</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan pilihan filter kategori dan lokasi.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (with horizontal scroll on mobile) */
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Kode Aset</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Kategori & Lokasi</th>
                  <th className="py-3 px-4 text-center">Kuantitas</th>
                  <th className="py-3 px-4 text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-center">Kondisi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                      {asset.itemCode}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white leading-tight">{asset.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {asset.brand ? `${asset.brand} ` : ''}{asset.model || ''}
                        {asset.serialNumber ? ` &bull; S/N: ${asset.serialNumber}` : ''}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{asset.categoryName || '-'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{asset.locationName || '-'}</p>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white">{asset.quantity}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{asset.unit}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {formatIDR(asset.purchasePrice)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <ConditionBadge condition={asset.condition} />
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={asset.status} />
                    </td>

                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewAsset(asset)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                          title="Lihat Detail Kartu Aset"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintLabel(asset)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                          title="Cetak Label & Barcode QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditAsset(asset)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#142B4A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Data Barang"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(asset)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus / Arsipkan Aset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW (Ideal for Mobile HP / APK Screen) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {paginatedAssets.map((asset) => (
            <div 
              key={asset.id} 
              className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-xs text-[#142B4A] dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {asset.itemCode}
                  </span>
                  <StatusBadge status={asset.status} />
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {asset.name}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {asset.categoryName} &bull; {asset.locationName || 'Lokasi umum'}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Jumlah Unit</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{asset.quantity} {asset.unit}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Harga Satuan</span>
                    <p className="font-bold font-mono text-slate-900 dark:text-white">{formatIDR(asset.purchasePrice)}</p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <ConditionBadge condition={asset.condition} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between no-print">
                <button
                  type="button"
                  onClick={() => onPrintLabel(asset)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Label QR
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewAsset(asset)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs"
                    title="Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEditAsset(asset)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asset)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-[#0B1930] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs transition-colors">
          <p className="text-slate-500 dark:text-slate-400">
            Halaman <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-200 px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog on Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Penghapusan Aset"
        message={`Apakah Anda yakin ingin menghapus aset "${deleteTarget?.name}" (${deleteTarget?.itemCode})? Tindakan ini akan dicatat ke dalam audit log organisasi.`}
        confirmLabel="Hapus Aset"
        variant="danger"
        loading={isDeleting}
      />

      {/* Bulk QR Label Print Modal for F4 paper sheets */}
      <BulkAssetLabelModal
        isOpen={isBulkPrintOpen}
        onClose={() => setIsBulkPrintOpen(false)}
        assets={filteredAssets.length > 0 ? filteredAssets : assets}
        organization={currentOrg}
        categories={categories}
        locations={locations}
      />
    </div>
  );
};
