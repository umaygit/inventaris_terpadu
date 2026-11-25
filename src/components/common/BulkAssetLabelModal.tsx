import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  CheckSquare, 
  Square, 
  Download,
  FileImage,
  FileArchive,
  QrCode,
  X,
  Search,
  RefreshCw
} from 'lucide-react';
import { Asset, Organization, Category, Location } from '../../types';
import { downloadAssetLabelImage, downloadBulkAssetLabelsZip } from '../../utils/labelImageGenerator';

interface BulkAssetLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  organization: Organization | null;
  categories?: Category[];
  locations?: Location[];
}

export const BulkAssetLabelModal: React.FC<BulkAssetLabelModalProps> = ({
  isOpen,
  onClose,
  assets,
  organization,
  categories = [],
  locations = []
}) => {
  // Selection and filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Layout Options
  const [columns, setColumns] = useState<2 | 3 | 4>(3);
  const [paperSize, setPaperSize] = useState<'F4' | 'A4'>('F4');
  const [showOrgHeader, setShowOrgHeader] = useState<boolean>(true);
  const [showBorder, setShowBorder] = useState<boolean>(true);

  // Generated QR codes map (assetId -> dataUrl)
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});

  // Zip downloading progress state
  const [isDownloadingZip, setIsDownloadingZip] = useState<'png' | 'jpeg' | null>(null);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);

  // Single item downloading state
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  // Initialize selected IDs with all assets when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(assets.map(a => a.id)));
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedLocation('all');
      setIsDownloadingZip(null);
      setZipProgress(null);
    }
  }, [isOpen, assets]);

  // Filtered Assets based on category, location, and search
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.name.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.fundingSource && item.fundingSource.toLowerCase().includes(q)) ||
        (item.locationName && item.locationName.toLowerCase().includes(q));

      const matchCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchLoc = selectedLocation === 'all' || item.locationId === selectedLocation;

      return matchSearch && matchCat && matchLoc;
    });
  }, [assets, searchQuery, selectedCategory, selectedLocation]);

  // Assets that are actually selected for printing or bulk download
  const assetsToPrint = useMemo(() => {
    return filteredAssets.filter(item => selectedIds.has(item.id));
  }, [filteredAssets, selectedIds]);

  // Pre-generate QR codes for selected assets
  useEffect(() => {
    if (!isOpen || assetsToPrint.length === 0) return;

    let isMounted = true;
    const generateAllQRs = async () => {
      const newMap: Record<string, string> = { ...qrCodeMap };
      const missingAssets = assetsToPrint.filter(a => !newMap[a.id]);

      for (const asset of missingAssets) {
        if (!isMounted) break;
        try {
          const qrPayload = JSON.stringify({
            org: organization?.code || 'INV',
            code: asset.itemCode,
            name: asset.name,
            dana: asset.fundingSource || '-'
          });

          const url = await QRCode.toDataURL(qrPayload, {
            width: 280,
            margin: 1,
            color: {
              dark: '#0B1930',
              light: '#FFFFFF'
            }
          });

          newMap[asset.id] = url;
        } catch (err) {
          console.error('QR generation error for asset', asset.itemCode, err);
        }
      }

      if (isMounted) {
        setQrCodeMap(newMap);
      }
    };

    generateAllQRs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, assetsToPrint, organization]);

  // Toggle single item selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all visible
  const toggleSelectAll = () => {
    const visibleIds = filteredAssets.map(a => a.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Download all selected labels as separate files inside a ZIP archive
  const handleDownloadBulkZip = async (format: 'png' | 'jpeg') => {
    if (assetsToPrint.length === 0) return;
    setIsDownloadingZip(format);
    setZipProgress({ current: 0, total: assetsToPrint.length });

    try {
      await downloadBulkAssetLabelsZip(
        assetsToPrint,
        organization?.name || 'SMK NW ANJANI',
        organization?.code || 'INV',
        format,
        (current, total) => {
          setZipProgress({ current, total });
        }
      );
    } catch (err) {
      console.error('Failed to create ZIP of labels:', err);
      alert('Gagal membuat paket ZIP label. Silakan coba lagi.');
    } finally {
      setIsDownloadingZip(null);
      setZipProgress(null);
    }
  };

  // Download individual label image directly from the grid
  const handleDownloadSingle = async (asset: Asset, format: 'png' | 'jpeg', e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingSingleId(`${asset.id}-${format}`);
    try {
      await downloadAssetLabelImage(
        asset,
        organization?.name || 'SMK NW ANJANI',
        organization?.code || 'INV',
        format
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingSingleId(null);
    }
  };

  if (!isOpen) return null;

  const allVisibleSelected = filteredAssets.length > 0 && filteredAssets.every(a => selectedIds.has(a.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto print:static print:inset-auto print:overflow-visible">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 print:p-0">
        <div 
          className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-[#0B1930] text-left shadow-2xl transition-all sm:my-6 w-full max-w-6xl border border-slate-200/80 dark:border-slate-800 print:border-none print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (Hidden on print) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/60 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#142B4A] dark:text-[#3977D5] flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Cetak & Unduh Label QR Seluruhnya</span>
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300/40">
                    Model Kompak (5 × 3 cm)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desain pas tanpa ruang kosong, proporsi stiker 5 × 3 cm dengan teks besar dan jelas
                </p>
              </div>
            </div>

            {/* Quick Bulk Action Buttons in Top Header */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadBulkZip('png')}
                disabled={assetsToPrint.length === 0 || Boolean(isDownloadingZip)}
                className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Unduh seluruh label sebagai gambar PNG ukuran 5x3 cm dalam file ZIP"
              >
                <FileArchive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Unduh ZIP PNG (5×3 cm)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBulkZip('jpeg')}
                disabled={assetsToPrint.length === 0 || Boolean(isDownloadingZip)}
                className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Unduh seluruh label sebagai gambar JPG ukuran 5x3 cm dalam file ZIP"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Unduh ZIP JPG (5×3 cm)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={assetsToPrint.length === 0}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                <span>Cetak Lembaran F4</span>
              </button>

              <button 
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Banner during ZIP Generation */}
          {isDownloadingZip && zipProgress && (
            <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-3 px-6 flex items-center justify-between shadow-md print:hidden animate-in fade-in">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <div>
                  <p className="text-xs font-bold">
                    Mengemas label {isDownloadingZip.toUpperCase()} (Ukuran 5×3 cm) ke file ZIP...
                  </p>
                  <p className="text-[11px] text-white/80">
                    Memproses barang {zipProgress.current} dari {zipProgress.total} ({Math.round((zipProgress.current / zipProgress.total) * 100)}%)
                  </p>
                </div>
              </div>
              <div className="w-32 bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-white h-full transition-all duration-200"
                  style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Controls & Filter Toolbar (Hidden on print) */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 space-y-3.5 print:hidden">
            {/* Top row: Paper settings & Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Paper Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ukuran Kertas Cetak:
                </label>
                <div className="flex rounded-lg p-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPaperSize('F4')}
                    className={`flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-colors ${
                      paperSize === 'F4'
                        ? 'bg-[#142B4A] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    F4 / Folio (215×330mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-colors ${
                      paperSize === 'A4'
                        ? 'bg-[#142B4A] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    A4 (210×297mm)
                  </button>
                </div>
              </div>

              {/* Grid Column Layout */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Format Kolom Stiker (5 × 3 cm):
                </label>
                <div className="flex rounded-lg p-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setColumns(2)}
                    className={`flex-1 py-1.5 px-1.5 rounded-md font-bold text-xs transition-colors ${
                      columns === 2
                        ? 'bg-[#142B4A] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    2 Kolom
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumns(3)}
                    className={`flex-1 py-1.5 px-1.5 rounded-md font-bold text-xs transition-colors ${
                      columns === 3
                        ? 'bg-[#142B4A] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    3 Kolom (Ideal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumns(4)}
                    className={`flex-1 py-1.5 px-1.5 rounded-md font-bold text-xs transition-colors ${
                      columns === 4
                        ? 'bg-[#142B4A] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    4 Kolom (Padat)
                  </button>
                </div>
              </div>

              {/* Visual Toggles */}
              <div className="flex items-center gap-4 pt-4 sm:pt-5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOrgHeader}
                    onChange={(e) => setShowOrgHeader(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Header Instansi</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Garis Potong</span>
                </label>
              </div>

              {/* Summary Counter */}
              <div className="flex items-center justify-end gap-2 pt-3 sm:pt-4">
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {assetsToPrint.length} dari {assets.length}
                  </span>
                  <p className="text-[10px] text-slate-400">Label dipilih (Ukuran 5×3 cm)</p>
                </div>
              </div>
            </div>

            {/* Filter Row: Search, Category, Location */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode barang, nama, sumber dana, dll..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-44 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full sm:w-44 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="all">Semua Ruangan</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.roomName}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                {allVisibleSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-blue-500" />
                    Batal Pilih Semua
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    Pilih Semua ({filteredAssets.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRINTABLE & DOWNLOADABLE LABELS CONTAINER (COMPACT, NO DEAD SPACE) */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-6 max-h-[64vh] overflow-y-auto bg-slate-100 dark:bg-slate-950/80 print:max-h-none print:overflow-visible print:bg-white print:p-0">
            {assetsToPrint.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <QrCode className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold">Tidak ada label yang dipilih</p>
                <p className="text-xs text-slate-500 mt-1">Centang atau pilih aset dari daftar di atas untuk mencetak atau mengunduh label gambar.</p>
              </div>
            ) : (
              <div 
                id="printable-bulk-labels"
                className={`grid gap-3.5 print:gap-1.5 ${
                  columns === 2 
                    ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2' 
                    : columns === 3 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4'
                }`}
              >
                {assetsToPrint.map((asset) => {
                  const qrUrl = qrCodeMap[asset.id];
                  const isDownloadingThis = downloadingSingleId?.startsWith(asset.id);

                  return (
                    <div key={asset.id} className="flex flex-col break-inside-avoid print:break-inside-avoid">
                      {/* Top Action Bar for UI: Placed ABOVE the card so it NEVER overlaps [ASET TETAP] */}
                      <div className="flex items-center justify-between text-xs px-1 mb-1 print:hidden select-none">
                        <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                          {asset.itemCode}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(asset, 'png', e)}
                            disabled={Boolean(isDownloadingThis)}
                            className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 shadow-2xs"
                            title="Unduh gambar label barang ini sebagai PNG (5×3 cm)"
                          >
                            <FileImage className="w-3 h-3 text-blue-500" />
                            <span>PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(asset, 'jpeg', e)}
                            disabled={Boolean(isDownloadingThis)}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 shadow-2xs"
                            title="Unduh gambar label barang ini sebagai JPG (5×3 cm)"
                          >
                            <Download className="w-3 h-3 text-emerald-500" />
                            <span>JPG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleSelect(asset.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5"
                            title="Hapus dari daftar cetak"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Clean Sticker Card without any overlapping buttons - Exactly matching model */}
                      <div
                        className={`bg-white text-slate-900 rounded-2xl p-3 sm:p-3.5 transition-all print:rounded-none label-sticker-5x3 flex flex-col justify-between ${
                          showBorder ? 'border-2 border-slate-900 shadow-xs' : 'border border-dashed border-slate-300'
                        }`}
                        style={{ pageBreakInside: 'avoid' }}
                      >
                        {/* Header: Org & Type */}
                        <div>
                          {showOrgHeader && (
                            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
                              <div>
                                <p className="text-[9px] font-bold tracking-wider uppercase text-slate-500 leading-none">
                                  PROPERTI / ASET
                                </p>
                                <h5 className="text-xs sm:text-[13px] font-black text-[#142B4A] uppercase tracking-tight truncate leading-tight mt-0.5">
                                  {organization?.name || 'SMK NW ANJANI'}
                                </h5>
                              </div>
                              <span className="text-[9px] font-bold bg-slate-50 text-slate-800 px-2 py-0.5 rounded-md border border-slate-300 shrink-0">
                                {asset.type === 'fixed_asset' ? 'ASET TETAP' : 'HABIS PAKAI'}
                              </span>
                            </div>
                          )}

                          {/* Main Label Body: QR Code (Spans full height) + Asset Details */}
                          <div className="flex items-center gap-3">
                            {/* QR Code Container - Fills vertical body height to eliminate dead space */}
                            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-white border border-slate-200 rounded-xl p-0.5 flex items-center justify-center shadow-2xs">
                              {qrUrl ? (
                                <img src={qrUrl} alt={asset.itemCode} className="w-full h-full object-contain" />
                              ) : (
                                <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                              )}
                            </div>

                            {/* Text Data - Compact, clean, zero whitespace */}
                            <div className="flex-1 min-w-0 space-y-0.5 leading-tight">
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">KODE ASET:</span>
                                <p className="font-mono font-black text-xs sm:text-sm text-[#142B4A] truncate">
                                  {asset.itemCode}
                                </p>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">NAMA BARANG:</span>
                                <p className="font-bold text-slate-900 truncate text-xs sm:text-[13px]">
                                  {asset.name}
                                </p>
                              </div>

                              <div className="pt-0.5 space-y-0.5 text-[10px] text-slate-800 font-semibold">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate">
                                    <span className="text-slate-500 font-normal">Merek:</span> {asset.brand || '-'}
                                  </span>
                                  <span className="truncate">
                                    <span className="text-slate-500 font-normal">Sumber Dana:</span> {asset.fundingSource || 'Operasional'}
                                  </span>
                                </div>
                                <p className="truncate">
                                  <span className="text-slate-500 font-normal">Lokasi:</span> {asset.locationName || '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Notice */}
                        <div className="mt-2 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[8px] text-slate-500 font-bold">
                          <span>DILARANG MELEPAS / MERUSAK LABEL INI</span>
                          <span>TGL: {asset.purchaseDate || new Date().toISOString().substring(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Action Footer (Hidden on print) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/60 print:hidden text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Total <strong>{assetsToPrint.length}</strong> label stiker ukuran <strong>5 × 3 cm</strong> siap dicetak di lembaran {paperSize} atau diunduh ke file ZIP.
            </span>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleDownloadBulkZip('png')}
                disabled={assetsToPrint.length === 0 || Boolean(isDownloadingZip)}
                className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileArchive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Unduh ZIP PNG (5×3 cm)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBulkZip('jpeg')}
                disabled={assetsToPrint.length === 0 || Boolean(isDownloadingZip)}
                className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Unduh ZIP JPG (5×3 cm)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={assetsToPrint.length === 0}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                <span>Cetak Lembaran F4</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
