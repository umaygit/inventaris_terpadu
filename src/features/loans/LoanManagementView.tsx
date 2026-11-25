import React, { useState } from 'react';
import { 
  Repeat, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  Printer, 
  ArrowRight,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Loan, Asset } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

interface LoanManagementViewProps {
  loans: Loan[];
  assets: Asset[];
  onCreateLoan: (loanData: Partial<Loan>) => Promise<void>;
  onReturnLoan: (loanId: string, assetId: string, quantity: number, conditionOnReturn: string, returnNotes: string) => Promise<void>;
  onDeleteLoan?: (loan: Loan) => Promise<void>;
}

export const LoanManagementView: React.FC<LoanManagementViewProps> = ({
  loans,
  assets,
  onCreateLoan,
  onReturnLoan,
  onDeleteLoan
}) => {
  const { userRole, currentOrg, userProfile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create loan modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [department, setDepartment] = useState('');
  const [contact, setContact] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loanDate, setLoanDate] = useState(new Date().toISOString().substring(0, 10));
  
  // Default due date: 7 days from today
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const [dueDate, setDueDate] = useState(defaultDueDate.toISOString().substring(0, 10));
  const [conditionOnBorrow, setConditionOnBorrow] = useState('Kondisi baik dan lengkap');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Return modal
  const [returningLoan, setReturningLoan] = useState<Loan | null>(null);
  const [conditionOnReturn, setConditionOnReturn] = useState('Baik');
  const [returnNotes, setReturnNotes] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // Printable slip
  const [slipLoan, setSlipLoan] = useState<Loan | null>(null);

  // Delete modal state
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!loanToDelete || !onDeleteLoan) return;
    setIsDeleting(true);
    try {
      await onDeleteLoan(loanToDelete);
      setLoanToDelete(null);
    } catch (err: any) {
      alert('Gagal menghapus data peminjaman: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  const today = new Date();

  const filteredLoans = loans.filter(l => {
    // Dynamic overdue check
    const isOverdue = l.status !== 'returned' && new Date(l.dueDate) < today;
    const computedStatus = l.status === 'returned' ? 'returned' : isOverdue ? 'overdue' : 'active';

    const matchesStatus = statusFilter === 'all' || computedStatus === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || 
      l.loanNumber.toLowerCase().includes(q) ||
      l.borrowerName.toLowerCase().includes(q) ||
      l.assetName.toLowerCase().includes(q) ||
      (l.department && l.department.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  const handleOpenCreate = () => {
    setSelectedAssetId(assets.find(a => (a.availableQuantity ?? a.quantity) > 0)?.id || assets[0]?.id || '');
    setBorrowerName('');
    setDepartment('');
    setContact('');
    setQuantity(1);
    setConditionOnBorrow('Kondisi baik dan lengkap');
    setNotes('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAsset) {
      setFormError('Pilih aset yang akan dipinjam.');
      return;
    }

    const available = selectedAsset.availableQuantity ?? selectedAsset.quantity;
    if (quantity > available) {
      setFormError(`Kuantitas melebihi stok yang tersedia (${available} unit).`);
      return;
    }

    const yearMonth = loanDate.replace(/-/g, '').substring(0, 6);
    const loanNumber = `PINJAM-${yearMonth}-${String(loans.length + 1).padStart(3, '0')}`;

    const payload: Partial<Loan> = {
      loanNumber,
      borrowerName: borrowerName.trim(),
      department: department.trim(),
      contact: contact.trim(),
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      quantity: Number(quantity),
      loanDate,
      dueDate,
      conditionOnBorrow: conditionOnBorrow.trim(),
      handedBy: userProfile?.displayName || 'Petugas Inventaris',
      status: 'active',
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onCreateLoan(payload);
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi peminjaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLoan) return;

    setIsReturning(true);
    try {
      await onReturnLoan(
        returningLoan.id,
        returningLoan.assetId,
        returningLoan.quantity,
        conditionOnReturn,
        returnNotes
      );
      setReturningLoan(null);
    } catch (err: any) {
      alert('Gagal memproses pengembalian: ' + (err.message || err));
    } finally {
      setIsReturning(false);
    }
  };

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Peminjaman & Pengembalian Aset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pengelolaan sirkulasi pinjam pakai barang, pemantauan jatuh tempo, dan rekam kondisi
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-blue-300" />
            Catat Peminjaman Baru
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no pinjam, peminjam, barang..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({loans.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'active' 
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              Dipinjam
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'overdue' 
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300'
              }`}
            >
              Terlambat
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('returned')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'returned' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              Kembali
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 self-end sm:self-auto transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Cetak Rekap
        </button>
      </div>

      {/* Loans Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Repeat className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada data peminjaman yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No Pinjam</th>
                  <th className="py-3 px-4">Peminjam</th>
                  <th className="py-3 px-4">Barang Dipinjam</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4">Tgl Pinjam</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLoans.map((loan) => {
                  const isOverdue = loan.status !== 'returned' && new Date(loan.dueDate) < today;
                  const daysLeft = Math.ceil((new Date(loan.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                        {loan.loanNumber}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{loan.borrowerName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{loan.department || '-'} &bull; {loan.contact || '-'}</p>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {loan.assetName}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {loan.quantity}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {loan.loanDate}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : daysLeft <= 3 && loan.status !== 'returned' ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {loan.dueDate}
                        </span>
                        {loan.status !== 'returned' && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                            {isOverdue ? `Terlambat ${Math.abs(daysLeft)} hari` : `${daysLeft} hari lagi`}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {loan.status === 'returned' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Dikembalikan
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                            Terlambat
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Dipinjam
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSlipLoan(loan)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title="Cetak Surat Peminjaman"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {canWrite && loan.status !== 'returned' && (
                            <button
                              type="button"
                              onClick={() => setReturningLoan(loan)}
                              className="px-2.5 py-1 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Kembalikan
                            </button>
                          )}

                          {canWrite && onDeleteLoan && (
                            <button
                              type="button"
                              onClick={() => setLoanToDelete(loan)}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data Peminjaman"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Catat Peminjaman */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Formulir Peminjaman Barang Inventaris"
        subtitle="Catat penyerahan barang kepada peminjam dan tetapkan tanggal batas waktu kembali"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Peminjam *</label>
              <input
                type="text"
                required
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="Nama lengkap peminjam"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Kerja / Divisi / Kelas</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Contoh: Tim IT / Keuangan / Kelas 10A"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kontak / No Telepon</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Barang yang Dipinjam *</label>
              <select
                required
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="">-- Pilih Barang --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id} disabled={(a.availableQuantity ?? a.quantity) <= 0}>
                    {a.itemCode} - {a.name} (Tersedia: {a.availableQuantity ?? a.quantity} {a.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pinjam</label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Batas Jatuh Tempo *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kondisi Barang Saat Diserahkan</label>
            <input
              type="text"
              value={conditionOnBorrow}
              onChange={(e) => setConditionOnBorrow(e.target.value)}
              placeholder="Kelengkapan, kondisi fisik, aksesoris..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan / Keperluan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kegiatan presentasi, rapat dinas, dll..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Repeat className="w-4 h-4 text-blue-300" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Peminjaman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pengembalian */}
      {returningLoan && (
        <Modal
          isOpen={Boolean(returningLoan)}
          onClose={() => setReturningLoan(null)}
          title="Proses Pengembalian Barang"
          subtitle={`Konfirmasi pengembalian aset dari ${returningLoan.borrowerName}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteReturn} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Barang: <span className="font-bold text-[#142B4A] dark:text-blue-300">{returningLoan.assetName}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400">Jumlah: {returningLoan.quantity} unit</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">Kondisi saat diserahkan: {returningLoan.conditionOnBorrow}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kondisi Barang Saat Dikembalikan *
              </label>
              <select
                value={conditionOnReturn}
                onChange={(e) => setConditionOnReturn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="Baik dan Lengkap">Baik dan Lengkap</option>
                <option value="Ada Lecet Ringan">Ada Lecet / Goresan Ringan</option>
                <option value="Rusak / Komponen Hilang">Rusak / Komponen Hilang (Perlu Perawatan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Penerimaan Pengembalian
              </label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Catatan kebersihan, aksesoris pengisi daya, dll..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReturningLoan(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isReturning}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                {isReturning ? 'Memproses...' : 'Konfirmasi Pengembalian'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Surat Peminjaman Slip */}
      {slipLoan && (
        <Modal
          isOpen={Boolean(slipLoan)}
          onClose={() => setSlipLoan(null)}
          title="Surat Bukti Peminjaman Barang"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div id="printable-loan-slip" className="p-6 bg-white border border-slate-300 rounded-xl space-y-4 text-xs font-sans text-slate-900">
              <div className="text-center border-b pb-3">
                <h4 className="font-extrabold text-sm uppercase text-[#142B4A]">{currentOrg?.name}</h4>
                <p className="text-[10px] text-slate-500">{currentOrg?.address || 'Sistem Inventaris Terpadu'}</p>
                <div className="mt-2 py-1 bg-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  SURAT TANDA BUKTI PINJAM PAKAI ASET
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">No. Peminjaman:</span>
                  <p className="font-mono font-bold">{slipLoan.loanNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Pinjam:</span>
                  <p className="font-semibold">{slipLoan.loanDate}</p>
                </div>
                <div>
                  <span className="text-slate-500">Peminjam:</span>
                  <p className="font-bold">{slipLoan.borrowerName}</p>
                  <p className="text-[10px] text-slate-500">{slipLoan.department || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Batas Kembali (Jatuh Tempo):</span>
                  <p className="font-bold text-rose-600">{slipLoan.dueDate}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Nama Barang Aset</th>
                      <th className="p-2 text-center">Jumlah</th>
                      <th className="p-2">Kondisi Serah Terima</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-medium">{slipLoan.assetName}</td>
                      <td className="p-2 text-center font-bold">{slipLoan.quantity}</td>
                      <td className="p-2 text-[10px] text-slate-600">{slipLoan.conditionOnBorrow}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[9px] text-slate-500 italic">
                * Peminjam bertanggung jawab penuh atas keutuhan dan kelayakan fungsi aset yang dipinjam serta wajib mengembalikan sesuai jadwal.
              </p>

              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[10px]">
                <div>
                  <p className="text-slate-500 mb-8">Peminjam / Penerima Barang,</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">{slipLoan.borrowerName}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-8">Petugas Penyerah Barang,</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">{slipLoan.handedBy || 'Petugas'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setSlipLoan(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                Cetak Surat Bukti
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Peminjaman */}
      <Modal
        isOpen={Boolean(loanToDelete)}
        onClose={() => setLoanToDelete(null)}
        title="Hapus Data Peminjaman"
        subtitle="Konfirmasi penghapusan data riwayat peminjaman barang"
        maxWidth="sm"
      >
        {loanToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Hapus peminjaman {loanToDelete.loanNumber}?</p>
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                  Data peminjaman <strong>{loanToDelete.quantity} unit {loanToDelete.assetName}</strong> oleh <strong>{loanToDelete.borrowerName}</strong> akan dihapus permanen.
                  {loanToDelete.status !== 'returned' && (
                    <span className="block mt-1 font-semibold text-rose-900 dark:text-rose-200">
                      * Jumlah barang yang belum dikembalikan ({loanToDelete.quantity} unit) akan otomatis dipulihkan ke stok tersedia.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLoanToDelete(null)}
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
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
