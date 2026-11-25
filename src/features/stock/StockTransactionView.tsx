import React, { useState } from 'react';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Printer, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { StockTransaction, Asset, Supplier, Location } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

interface StockTransactionViewProps {
  transactions: StockTransaction[];
  assets: Asset[];
  suppliers: Supplier[];
  locations: Location[];
  onRecordTransaction: (txData: Partial<StockTransaction>) => Promise<void>;
  onDeleteTransaction?: (tx: StockTransaction, revertStock?: boolean) => Promise<void>;
  defaultType?: 'in' | 'out';
}

export const StockTransactionView: React.FC<StockTransactionViewProps> = ({
  transactions,
  assets,
  suppliers,
  locations,
  onRecordTransaction,
  onDeleteTransaction,
  defaultType = 'in'
}) => {
  const { userRole, currentOrg } = useAuth();
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>(defaultType);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<StockTransaction | null>(null);

  // Delete modal state
  const [txToDelete, setTxToDelete] = useState<StockTransaction | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!txToDelete || !onDeleteTransaction) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(txToDelete, revertStockOnDelete);
      setTxToDelete(null);
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Form states
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [sourceOrRecipient, setSourceOrRecipient] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  const filteredTransactions = transactions.filter(tx => {
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || 
      tx.transactionNumber.toLowerCase().includes(q) ||
      tx.assetName.toLowerCase().includes(q) ||
      (tx.recipient && tx.recipient.toLowerCase().includes(q)) ||
      (tx.supplierName && tx.supplierName.toLowerCase().includes(q));

    return matchesType && matchesSearch;
  });

  const handleOpenModal = (t: 'in' | 'out') => {
    setModalType(t);
    setSelectedAssetId(assets[0]?.id || '');
    setQuantity(1);
    setUnitPrice(assets[0]?.purchasePrice || 0);
    setSourceOrRecipient('');
    setSupplierId(suppliers[0]?.id || '');
    setLocationId(locations[0]?.id || '');
    setReason('');
    setNotes('');
    setDate(new Date().toISOString().substring(0, 10));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aId = e.target.value;
    setSelectedAssetId(aId);
    const ast = assets.find(a => a.id === aId);
    if (ast) {
      setUnitPrice(ast.purchasePrice || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAsset) {
      setFormError('Silakan pilih barang inventaris.');
      return;
    }

    if (quantity <= 0) {
      setFormError('Kuantitas harus lebih besar dari 0.');
      return;
    }

    // Negative stock prevention for OUT transactions
    if (modalType === 'out' && quantity > (selectedAsset.availableQuantity ?? selectedAsset.quantity)) {
      setFormError(`Stok tidak mencukupi! Stok tersedia saat ini: ${selectedAsset.availableQuantity ?? selectedAsset.quantity} ${selectedAsset.unit}.`);
      return;
    }

    const yearMonth = date.replace(/-/g, '').substring(0, 6);
    const txPrefix = modalType === 'in' ? 'TRX-IN' : 'TRX-OUT';
    const txNumber = `${txPrefix}-${yearMonth}-${String(transactions.length + 1).padStart(3, '0')}`;

    const chosenSupplier = suppliers.find(s => s.id === supplierId);
    const chosenLocation = locations.find(l => l.id === locationId);

    const payload: Partial<StockTransaction> = {
      transactionNumber: txNumber,
      type: modalType,
      date,
      source: modalType === 'in' ? (sourceOrRecipient || 'Pembelian Langsung') : undefined,
      recipient: modalType === 'out' ? sourceOrRecipient : undefined,
      supplierId: modalType === 'in' ? supplierId : undefined,
      supplierName: modalType === 'in' ? chosenSupplier?.name : undefined,
      locationId,
      locationName: chosenLocation ? `${chosenLocation.building} - ${chosenLocation.roomName}` : undefined,
      reason: reason.trim(),
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount: Number(quantity) * Number(unitPrice),
      notes: notes.trim(),
      status: 'approved'
    };

    setIsSubmitting(true);
    try {
      await onRecordTransaction(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi mutasi stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Buku Besar Transaksi Barang (In / Out)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Riwayat penerimaan stok masuk dan penyaluran barang keluar secara atomik
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenModal('in')}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-200" />
              Barang Masuk (IN)
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('out')}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowUpFromLine className="w-4 h-4 text-rose-200" />
              Barang Keluar (OUT)
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no transaksi, barang, rekanan..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                typeFilter === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('in')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                typeFilter === 'in' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('out')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                typeFilter === 'out' 
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300'
              }`}
            >
              Keluar
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 self-end sm:self-auto transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Cetak Rekap Mutasi
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada catatan mutasi stok.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Catat barang masuk atau barang keluar untuk mulai melacak pergerakan aset.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No Transaksi</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Sumber / Penerima</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4 text-right">Total Nilai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right no-print">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                      {tx.transactionNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {tx.date}
                    </td>

                    <td className="py-3 px-4">
                      {tx.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <ArrowDownToLine className="w-3 h-3" /> MASUK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          <ArrowUpFromLine className="w-3 h-3" /> KELUAR
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{tx.assetName}</p>
                      {tx.reason && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{tx.reason}</p>}
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {tx.type === 'in' ? (
                        <span>{tx.supplierName || tx.source || '-'}</span>
                      ) : (
                        <span>{tx.recipient || '-'}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white font-mono">
                      {tx.type === 'in' ? `+${tx.quantity}` : `-${tx.quantity}`}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {formatIDR(tx.totalAmount || 0)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Disetujui
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForPrint(tx)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          title="Lihat & Cetak Bukti Transaksi"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={() => setTxToDelete(tx)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title={tx.type === 'in' ? 'Hapus Barang Masuk' : 'Hapus Barang Keluar'}
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
        )}
      </div>

      {/* Modal: Input Barang Masuk / Keluar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'in' ? 'Penerimaan Barang Masuk (Stok Masuk)' : 'Penyaluran Barang Keluar (Stok Keluar)'}
        subtitle={modalType === 'in' ? 'Mencatat pengadaan, hibah, atau retur ke saldo inventaris' : 'Mencatat distribusi operasional, barang habis pakai, atau penyerahan unit'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Barang Inventaris *</label>
            <select
              required
              value={selectedAssetId}
              onChange={handleAssetSelect}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="">-- Pilih Barang --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.itemCode} - {a.name} (Tersedia: {a.availableQuantity ?? a.quantity} {a.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jumlah Unit *</label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
          </div>

          {/* Conditional Fields based on In vs Out */}
          {modalType === 'in' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sumber Pengadaan / Dokumen</label>
                <input
                  type="text"
                  value={sourceOrRecipient}
                  onChange={(e) => setSourceOrRecipient(e.target.value)}
                  placeholder="Contoh: Pembelian APBD / Donasi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pemasok / Vendor</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                >
                  <option value="">-- Tanpa Vendor Khusus --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Penerima / Unit Kerja Tujuan *</label>
              <input
                type="text"
                required
                value={sourceOrRecipient}
                onChange={(e) => setSourceOrRecipient(e.target.value)}
                placeholder="Contoh: Bagian Keuangan / Staf IT / Pemusnahan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan Transaksi / Keperluan</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pengadaan semester ganjil / Permintaan ATK bulanan"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Total Transaksi:</span>
            <span className="font-bold font-mono text-base text-slate-900 dark:text-white">
              {formatIDR(quantity * unitPrice)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                modalType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? 'Memproses Mutasi...' : modalType === 'in' ? 'Simpan Barang Masuk' : 'Simpan Barang Keluar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Surat Bukti Transaksi */}
      {selectedTxForPrint && (
        <Modal
          isOpen={Boolean(selectedTxForPrint)}
          onClose={() => setSelectedTxForPrint(null)}
          title="Bukti Tanda Terima / Surat Jalan"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div id="printable-receipt" className="p-6 bg-white border border-slate-300 rounded-xl space-y-4 text-xs font-sans text-slate-900">
              <div className="text-center border-b pb-3">
                <h4 className="font-extrabold text-sm uppercase text-[#142B4A]">{currentOrg?.name}</h4>
                <p className="text-[10px] text-slate-500">{currentOrg?.address || 'Sistem Inventaris Terpadu'}</p>
                <div className="mt-2 py-1 bg-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  {selectedTxForPrint.type === 'in' ? 'SURAT BUKTI BARANG MASUK' : 'SURAT BUKTI BARANG KELUAR'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">No. Transaksi:</span>
                  <p className="font-mono font-bold">{selectedTxForPrint.transactionNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal:</span>
                  <p className="font-semibold">{selectedTxForPrint.date}</p>
                </div>
                <div>
                  <span className="text-slate-500">{selectedTxForPrint.type === 'in' ? 'Sumber / Rekanan:' : 'Penerima:'}</span>
                  <p className="font-semibold">{selectedTxForPrint.supplierName || selectedTxForPrint.source || selectedTxForPrint.recipient || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Keperluan:</span>
                  <p className="font-medium">{selectedTxForPrint.reason || '-'}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item Barang</th>
                      <th className="p-2 text-center">Jumlah</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-medium">{selectedTxForPrint.assetName}</td>
                      <td className="p-2 text-center font-bold">{selectedTxForPrint.quantity}</td>
                      <td className="p-2 text-right font-mono">{formatIDR(selectedTxForPrint.unitPrice || 0)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatIDR(selectedTxForPrint.totalAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[10px]">
                <div>
                  <p className="text-slate-500 mb-8">Petugas Penerima / Pemeriksa,</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">( ................................ )</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-8">Pihak Yang Menyerahkan,</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">( ................................ )</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setSelectedTxForPrint(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                Cetak Surat Bukti
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Transaksi (Barang Masuk / Barang Keluar) */}
      <Modal
        isOpen={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        title={txToDelete?.type === 'in' ? 'Hapus Transaksi Barang Masuk' : 'Hapus Transaksi Barang Keluar'}
        subtitle="Konfirmasi penghapusan data mutasi inventaris"
        maxWidth="sm"
      >
        {txToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Hapus mutasi {txToDelete.transactionNumber}?</p>
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                  Data mutasi <strong>{txToDelete.type === 'in' ? 'Barang Masuk' : 'Barang Keluar'}</strong> sebanyak <strong>{txToDelete.quantity} unit {txToDelete.assetName}</strong> akan dihapus dari riwayat transaksi.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={revertStockOnDelete}
                onChange={(e) => setRevertStockOnDelete(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>
                <strong>Sesuaikan kembali saldo stok barang otomatis:</strong>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {txToDelete.type === 'in'
                    ? `Kurangi saldo stok barang sebanyak ${txToDelete.quantity} unit (karena pengadaan dibatalkan).`
                    : `Kembalikan saldo stok barang sebanyak ${txToDelete.quantity} unit (karena pengeluaran dibatalkan).`}
                </span>
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
