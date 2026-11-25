import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  Filter, 
  Printer, 
  Building2,
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Maintenance, Asset, MaintenancePriority, MaintenanceStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

interface MaintenanceViewProps {
  maintenanceList: Maintenance[];
  assets: Asset[];
  onCreateMaintenance: (data: Partial<Maintenance>) => Promise<void>;
  onUpdateStatus: (id: string, status: MaintenanceStatus, actualCost: number, notes?: string) => Promise<void>;
  onDeleteMaintenance?: (id: string) => Promise<void>;
  preselectedAsset?: Asset | null;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenanceList,
  assets,
  onCreateMaintenance,
  onUpdateStatus,
  onDeleteMaintenance,
  preselectedAsset
}) => {
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedAsset));

  // Form states
  const [assetId, setAssetId] = useState(preselectedAsset?.id || assets[0]?.id || '');
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective'>('corrective');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [technicianVendor, setTechnicianVendor] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().substring(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status update modal
  const [updatingTicket, setUpdatingTicket] = useState<Maintenance | null>(null);
  const [newStatus, setNewStatus] = useState<MaintenanceStatus>('in_progress');
  const [actualCost, setActualCost] = useState(0);
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [ticketToDelete, setTicketToDelete] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!ticketToDelete || !onDeleteMaintenance) return;
    setIsDeleting(true);
    try {
      await onDeleteMaintenance(ticketToDelete.id);
      setTicketToDelete(null);
    } catch (err: any) {
      alert('Gagal menghapus tiket pemeliharaan: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === assetId);

  const filteredTickets = maintenanceList.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || 
      t.ticketNumber.toLowerCase().includes(q) ||
      t.assetName.toLowerCase().includes(q) ||
      t.issueDescription.toLowerCase().includes(q) ||
      (t.technicianVendor && t.technicianVendor.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const totalCostActual = maintenanceList.reduce((acc, curr) => acc + (curr.actualCost || 0), 0);
  const activeRepairsCount = maintenanceList.filter(m => m.status === 'in_progress' || m.status === 'reported' || m.status === 'waiting_parts').length;

  const handleOpenCreate = () => {
    setAssetId(assets[0]?.id || '');
    setMaintenanceType('corrective');
    setIssueDescription('');
    setPriority('medium');
    setTechnicianVendor('');
    setEstimatedCost(0);
    setReportedDate(new Date().toISOString().substring(0, 10));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAsset) {
      setFormError('Pilih barang inventaris yang memerlukan perbaikan.');
      return;
    }
    if (!issueDescription.trim()) {
      setFormError('Uraikan deskripsi kerusakan atau jenis perawatan.');
      return;
    }

    const yearMonth = reportedDate.replace(/-/g, '').substring(0, 6);
    const ticketNumber = `MT-${yearMonth}-${String(maintenanceList.length + 1).padStart(3, '0')}`;

    const payload: Partial<Maintenance> = {
      ticketNumber,
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      maintenanceType,
      issueDescription: issueDescription.trim(),
      priority,
      reportedDate,
      technicianVendor: technicianVendor.trim(),
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: 0,
      status: 'reported',
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onCreateMaintenance(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat tiket perbaikan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingTicket) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(updatingTicket.id, newStatus, actualCost, statusNotes);
      setUpdatingTicket(null);
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + (err.message || err));
    } finally {
      setIsUpdating(false);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const getPriorityBadge = (p: MaintenancePriority) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/40">Darurat (Urgent)</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300/40">Tinggi</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">Sedang</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">Rendah</span>;
    }
  };

  const getStatusBadge = (s: MaintenanceStatus) => {
    switch (s) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Selesai</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Dalam Perbaikan</span>;
      case 'waiting_parts':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Menunggu Sparepart</span>;
      case 'unrepairable':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">Tidak Dapat Diperbaiki</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Dilaporkan</span>;
    }
  };

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Pemeliharaan & Perawatan Aset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penanganan tiket servis, jadwal perawatan berkala, dan rekapitulasi biaya perbaikan
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-blue-300" />
            Buka Tiket Perbaikan
          </button>
        )}
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0B1930] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Sedang Dikerjakan</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{activeRepairsCount} Tiket</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1930] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Selesai Diperbaiki</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              {maintenanceList.filter(m => m.status === 'completed').length} Aset
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1930] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Total Biaya Aktual</p>
            <h4 className="text-lg font-bold font-mono text-[#142B4A] dark:text-blue-400">
              {formatIDR(totalCostActual)}
            </h4>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no tiket, nama barang, teknisi..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none shrink-0"
          >
            <option value="all">Semua Status ({maintenanceList.length})</option>
            <option value="reported">Dilaporkan</option>
            <option value="in_progress">Dalam Perbaikan</option>
            <option value="waiting_parts">Menunggu Sparepart</option>
            <option value="completed">Selesai</option>
            <option value="unrepairable">Afkir / Tidak Bisa Diservis</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Cetak Rekap Perawatan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Wrench className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada tiket pemeliharaan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Tiket</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Kendala / Kerusakan</th>
                  <th className="py-3 px-4 text-center">Prioritas</th>
                  <th className="py-3 px-4">Vendor / Teknisi</th>
                  <th className="py-3 px-4 text-right">Biaya (Est / Akt)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right no-print">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                      {t.ticketNumber}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {t.assetName}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                      {t.issueDescription}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getPriorityBadge(t.priority)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {t.technicianVendor || '-'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      <div>{formatIDR(t.actualCost || t.estimatedCost || 0)}</div>
                      {t.actualCost > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Aktual</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWrite && t.status !== 'completed' && t.status !== 'unrepairable' && (
                          <button
                            type="button"
                            onClick={() => {
                              setUpdatingTicket(t);
                              setNewStatus(t.status === 'reported' ? 'in_progress' : 'completed');
                              setActualCost(t.actualCost || t.estimatedCost || 0);
                              setStatusNotes('');
                            }}
                            className="px-2.5 py-1 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Update Status
                          </button>
                        )}

                        {canWrite && onDeleteMaintenance && (
                          <button
                            type="button"
                            onClick={() => setTicketToDelete(t)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Tiket Pemeliharaan"
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

      {/* Modal Buka Tiket */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buka Tiket Perbaikan & Pemeliharaan"
        subtitle="Laporkan kerusakan aset atau jadwalkan perawatan teknis"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Barang yang Bermasalah *</label>
            <select
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.itemCode} - {a.name} ({a.condition === 'good' ? 'Kondisi Baik' : a.condition === 'lightly_damaged' ? 'Rusak Ringan' : 'Rusak Berat'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipe Pemeliharaan</label>
              <select
                value={maintenanceType}
                onChange={(e: any) => setMaintenanceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="corrective">Perbaikan Kerusakan (Corrective)</option>
                <option value="preventive">Perawatan Berkala (Preventive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tingkat Prioritas</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
                <option value="urgent">Darurat (Segera)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Kerusakan / Kendala Teknis *</label>
            <textarea
              required
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Jelaskan gejala kerusakan, komponen yang tidak berfungsi..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teknisi / Bengkel / Vendor Servis</label>
              <input
                type="text"
                value={technicianVendor}
                onChange={(e) => setTechnicianVendor(e.target.value)}
                placeholder="Contoh: Service Center Epson / Tim IT Internal"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Estimasi Biaya Perbaikan (Rp)</label>
              <input
                type="number"
                min={0}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>
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
              className="px-5 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Wrench className="w-4 h-4 text-blue-300" />
              {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Tiket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Update Status Tiket */}
      {updatingTicket && (
        <Modal
          isOpen={Boolean(updatingTicket)}
          onClose={() => setUpdatingTicket(null)}
          title={`Perbarui Status ${updatingTicket.ticketNumber}`}
          subtitle={`Aset: ${updatingTicket.assetName}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteStatusUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Pekerjaan Baru *</label>
              <select
                value={newStatus}
                onChange={(e: any) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="in_progress">Dalam Perbaikan (Sedang Dikerjakan)</option>
                <option value="waiting_parts">Menunggu Suku Cadang (Pending)</option>
                <option value="completed">Selesai (Barang Normal Kembali)</option>
                <option value="unrepairable">Tidak Dapat Diperbaiki (Afkir/Rusak Berat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Biaya Aktual Realisasi (Rp)</label>
              <input
                type="number"
                min={0}
                value={actualCost}
                onChange={(e) => setActualCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tindakan / Suku Cadang Diganti</label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Rincian pergantian sparepart, hasil pengetesan..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUpdatingTicket(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Tiket Pemeliharaan */}
      <Modal
        isOpen={Boolean(ticketToDelete)}
        onClose={() => setTicketToDelete(null)}
        title="Hapus Data Pemeliharaan"
        subtitle="Konfirmasi penghapusan tiket servis / pemeliharaan barang"
        maxWidth="sm"
      >
        {ticketToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Hapus tiket {ticketToDelete.ticketNumber}?</p>
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                  Data perbaikan barang <strong>{ticketToDelete.assetName}</strong> akan dihapus permanen. Status barang akan disesuaikan kembali ke tersedia bila tidak ada perbaikan lain yang aktif.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
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
