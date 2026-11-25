import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Filter, 
  Calendar, 
  Boxes, 
  Repeat, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Wrench, 
  Coins 
} from 'lucide-react';
import { 
  Asset, 
  StockTransaction, 
  Loan, 
  Transfer, 
  Maintenance, 
  Stocktake, 
  Category, 
  Location 
} from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ReportViewProps {
  assets: Asset[];
  transactions: StockTransaction[];
  loans: Loan[];
  transfers: Transfer[];
  maintenance: Maintenance[];
  stocktakes: Stocktake[];
  categories: Category[];
  locations: Location[];
}

export type ReportType = 
  | 'all_assets'
  | 'by_category'
  | 'by_location'
  | 'by_condition'
  | 'stock_in'
  | 'stock_out'
  | 'active_loans'
  | 'overdue_loans'
  | 'mutations'
  | 'maintenance_costs'
  | 'stocktake_results'
  | 'consumables'
  | 'asset_values';

export const ReportView: React.FC<ReportViewProps> = ({
  assets,
  transactions,
  loans,
  transfers,
  maintenance,
  stocktakes,
  categories,
  locations
}) => {
  const { currentOrg, userProfile } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('all_assets');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const reportDefinitions = [
    { key: 'all_assets', title: '1. Daftar Seluruh Inventaris Barang', icon: Boxes },
    { key: 'by_category', title: '2. Inventaris Berdasarkan Kategori', icon: Boxes },
    { key: 'by_location', title: '3. Inventaris Berdasarkan Ruangan & Lokasi', icon: Boxes },
    { key: 'by_condition', title: '4. Rekapitulasi Kondisi Kelayakan Aset', icon: Boxes },
    { key: 'stock_in', title: '5. Laporan Penerimaan Barang Masuk', icon: ArrowDownToLine },
    { key: 'stock_out', title: '6. Laporan Penyaluran Barang Keluar', icon: ArrowUpFromLine },
    { key: 'active_loans', title: '7. Laporan Peminjaman Barang Aktif', icon: Repeat },
    { key: 'overdue_loans', title: '8. Daftar Aset Terlambat Dikembalikan', icon: Repeat },
    { key: 'mutations', title: '9. Riwayat Mutasi & Pemindahan Lokasi', icon: FileText },
    { key: 'maintenance_costs', title: '10. Pemeliharaan & Rekap Biaya Perawatan', icon: Wrench },
    { key: 'stocktake_results', title: '11. Hasil Audit Fisik & Stock Opname', icon: FileText },
    { key: 'consumables', title: '12. Rekapitulasi Barang Habis Pakai', icon: Boxes },
    { key: 'asset_values', title: '13. Nilai Perolehan & Aset Tetap', icon: Coins },
  ];

  // Active Report title
  const currentTitle = reportDefinitions.find(r => r.key === selectedReport)?.title || 'Laporan Inventaris';

  // Compute table data based on active report type
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'all_assets':
      case 'by_category':
      case 'by_location':
      case 'by_condition':
      case 'asset_values':
        return assets.filter(a => {
          const matchCat = filterCategory === 'all' || a.categoryId === filterCategory;
          const matchLoc = filterLocation === 'all' || a.locationId === filterLocation;
          return matchCat && matchLoc;
        });

      case 'consumables':
        return assets.filter(a => a.type === 'consumable');

      case 'stock_in':
        return transactions.filter(t => t.type === 'in');

      case 'stock_out':
        return transactions.filter(t => t.type === 'out');

      case 'active_loans':
        return loans.filter(l => l.status === 'active' || l.status === 'overdue');

      case 'overdue_loans':
        return loans.filter(l => {
          if (l.status === 'returned') return false;
          return new Date(l.dueDate) < new Date();
        });

      case 'mutations':
        return transfers;

      case 'maintenance_costs':
        return maintenance;

      case 'stocktake_results':
        return stocktakes;

      default:
        return assets;
    }
  }, [selectedReport, assets, transactions, loans, transfers, maintenance, stocktakes, filterCategory, filterLocation]);

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    let csvContent = '';

    if (selectedReport.includes('asset') || selectedReport.includes('by_') || selectedReport === 'consumables') {
      const headers = ['Kode', 'Nama', 'Kategori', 'Kuantitas', 'Satuan', 'Harga', 'Total', 'Kondisi', 'Status', 'Lokasi'];
      const rows = (reportData as Asset[]).map(a => [
        `"${a.itemCode}"`,
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.categoryName || ''}"`,
        a.quantity,
        `"${a.unit}"`,
        a.purchasePrice,
        a.totalValue || (a.quantity * a.purchasePrice),
        `"${a.condition}"`,
        `"${a.status}"`,
        `"${a.locationName || ''}"`
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else {
      // Generic JSON to CSV fallback
      const firstItem = reportData[0] as any;
      const headers = Object.keys(firstItem).filter(k => typeof firstItem[k] !== 'object');
      const rows = reportData.map((item: any) => headers.map(h => `"${String(item[h] || '').replace(/"/g, '""')}"`));
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedReport}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Selector and Filter Toolbar (hidden on print) */}
      <div className="bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs no-print space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pusat Laporan & Ekspor Berkas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih jenis laporan resmi untuk ditampilkan, diunduh dalam CSV, atau dicetak dengan kop organisasi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Unduh CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              Cetak Laporan Resmi
            </button>
          </div>
        </div>

        {/* Report Category Select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Pilih Jenis Laporan
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-semibold text-[#142B4A] dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              {reportDefinitions.map(r => (
                <option key={r.key} value={r.key}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Filter Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Filter Lokasi
            </label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Ruangan</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.building} - {l.roomName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report Document Card (Keeps clean paper styling for print and high contrast) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-8 space-y-6 text-slate-900">
        
        {/* Formal Kop Surat Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#142B4A]">
            {currentOrg?.name || 'Inventaris Terpadu'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {currentOrg?.address || 'Pusat Manajemen Inventaris dan Aset'} &bull; Telp: {currentOrg?.phone || '-'} &bull; Email: {currentOrg?.email || '-'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">{currentTitle}</span>
            <span className="text-slate-500">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
          </div>
        </div>

        {/* Data Table */}
        {reportData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada data untuk kriteria laporan ini.
          </div>
        ) : selectedReport.includes('asset') || selectedReport.includes('by_') || selectedReport === 'consumables' ? (
          /* Asset Table View */
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300">No</th>
                  <th className="p-2 border border-slate-300">Kode Aset</th>
                  <th className="p-2 border border-slate-300">Nama Barang</th>
                  <th className="p-2 border border-slate-300">Kategori</th>
                  <th className="p-2 border border-slate-300 text-center">Qty</th>
                  <th className="p-2 border border-slate-300 text-right">Harga Satuan</th>
                  <th className="p-2 border border-slate-300 text-right">Nilai Total</th>
                  <th className="p-2 border border-slate-300 text-center">Kondisi</th>
                  <th className="p-2 border border-slate-300">Lokasi / Ruangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(reportData as Asset[]).map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono font-bold">{a.itemCode}</td>
                    <td className="p-2 border border-slate-200 font-semibold">{a.name}</td>
                    <td className="p-2 border border-slate-200">{a.categoryName}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold">{a.quantity} {a.unit}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono">{formatIDR(a.purchasePrice)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-bold">
                      {formatIDR(a.totalValue || (a.quantity * a.purchasePrice))}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {a.condition === 'good' ? 'Baik' : a.condition === 'lightly_damaged' ? 'Rusak Ringan' : 'Rusak Berat'}
                    </td>
                    <td className="p-2 border border-slate-200">{a.locationName || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-2 border border-slate-300 text-right uppercase">Total Rekapitulasi:</td>
                  <td className="p-2 border border-slate-300 text-center">
                    {(reportData as Asset[]).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} Unit
                  </td>
                  <td className="p-2 border border-slate-300 text-right">-</td>
                  <td className="p-2 border border-slate-300 text-right font-mono">
                    {formatIDR((reportData as Asset[]).reduce((sum, i) => sum + (Number(i.totalValue) || (i.quantity * i.purchasePrice) || 0), 0))}
                  </td>
                  <td colSpan={2} className="p-2 border border-slate-300"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : selectedReport === 'stock_in' || selectedReport === 'stock_out' ? (
          /* Transaction Report Table */
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300">No</th>
                  <th className="p-2 border border-slate-300">No. Transaksi</th>
                  <th className="p-2 border border-slate-300">Tanggal</th>
                  <th className="p-2 border border-slate-300">Nama Barang</th>
                  <th className="p-2 border border-slate-300">{selectedReport === 'stock_in' ? 'Sumber / Rekanan' : 'Penerima'}</th>
                  <th className="p-2 border border-slate-300 text-center">Jumlah</th>
                  <th className="p-2 border border-slate-300 text-right">Total Nilai</th>
                  <th className="p-2 border border-slate-300">Keperluan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(reportData as StockTransaction[]).map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono font-bold">{t.transactionNumber}</td>
                    <td className="p-2 border border-slate-200">{t.date}</td>
                    <td className="p-2 border border-slate-200 font-semibold">{t.assetName}</td>
                    <td className="p-2 border border-slate-200">{t.supplierName || t.source || t.recipient || '-'}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold">{t.quantity}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatIDR(t.totalAmount || 0)}</td>
                    <td className="p-2 border border-slate-200">{t.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedReport.includes('loan') ? (
          /* Loans Report Table */
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300">No</th>
                  <th className="p-2 border border-slate-300">No. Pinjam</th>
                  <th className="p-2 border border-slate-300">Peminjam</th>
                  <th className="p-2 border border-slate-300">Nama Barang</th>
                  <th className="p-2 border border-slate-300 text-center">Qty</th>
                  <th className="p-2 border border-slate-300">Tgl Pinjam</th>
                  <th className="p-2 border border-slate-300">Jatuh Tempo</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(reportData as Loan[]).map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono font-bold">{l.loanNumber}</td>
                    <td className="p-2 border border-slate-200 font-semibold">{l.borrowerName} ({l.department || '-'})</td>
                    <td className="p-2 border border-slate-200">{l.assetName}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold">{l.quantity}</td>
                    <td className="p-2 border border-slate-200">{l.loanDate}</td>
                    <td className="p-2 border border-slate-200 font-bold text-rose-600">{l.dueDate}</td>
                    <td className="p-2 border border-slate-200 text-center font-semibold">{l.status === 'returned' ? 'Kembali' : 'Dipinjam'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Generic Report View */
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border border-slate-300">No</th>
                  <th className="p-2 border border-slate-300">Identifikasi</th>
                  <th className="p-2 border border-slate-300">Keterangan</th>
                  <th className="p-2 border border-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item: any, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono font-bold">{item.ticketNumber || item.transferNumber || item.scheduleNumber || item.id}</td>
                    <td className="p-2 border border-slate-200">{item.issueDescription || item.reason || item.title || item.assetName}</td>
                    <td className="p-2 border border-slate-200 font-semibold">{item.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formal Signature Columns (Prints nicely on paper) */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs page-break">
          <div>
            <p className="text-slate-500 mb-16">Mengetahui,<br /><span className="font-bold text-slate-800">Pimpinan / Kepala Organisasi</span></p>
            <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[160px]">( ............................................ )</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">Dibuat oleh,<br /><span className="font-bold text-slate-800">Petugas Pengelola Inventaris</span></p>
            <p className="font-bold border-t border-slate-400 pt-1 inline-block min-w-[160px]">
              {userProfile?.displayName || 'Petugas Inventaris'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
