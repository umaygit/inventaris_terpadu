import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  MapPin, 
  User, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Transfer, Asset, Location, PIC } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

interface AssetTransferViewProps {
  transfers: Transfer[];
  assets: Asset[];
  locations: Location[];
  pics: PIC[];
  onExecuteTransfer: (transferData: Partial<Transfer>) => Promise<void>;
  preselectedAsset?: Asset | null;
}

export const AssetTransferView: React.FC<AssetTransferViewProps> = ({
  transfers,
  assets,
  locations,
  pics,
  onExecuteTransfer,
  preselectedAsset
}) => {
  const { userRole, currentOrg } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedAsset));
  
  // Form state
  const [assetId, setAssetId] = useState(preselectedAsset?.id || assets[0]?.id || '');
  const [targetLocationId, setTargetLocationId] = useState(locations[0]?.id || '');
  const [newPicId, setNewPicId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Printable Berita Acara
  const [printTransfer, setPrintTransfer] = useState<Transfer | null>(null);

  const selectedAsset = assets.find(a => a.id === assetId);

  const filteredTransfers = transfers.filter(t => {
    const q = searchTerm.toLowerCase();
    return !q || 
      t.transferNumber.toLowerCase().includes(q) ||
      t.assetName.toLowerCase().includes(q) ||
      t.sourceLocationName.toLowerCase().includes(q) ||
      t.targetLocationName.toLowerCase().includes(q);
  });

  const handleOpenModal = () => {
    setAssetId(assets[0]?.id || '');
    setTargetLocationId(locations[0]?.id || '');
    setNewPicId('');
    setReason('');
    setDate(new Date().toISOString().substring(0, 10));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAsset) {
      setFormError('Pilih barang yang akan dimutasi.');
      return;
    }

    if (!targetLocationId) {
      setFormError('Pilih lokasi / ruangan tujuan mutasi.');
      return;
    }

    const targetLoc = locations.find(l => l.id === targetLocationId);
    const targetPic = pics.find(p => p.id === newPicId);

    if (selectedAsset.locationId === targetLocationId && (!newPicId || selectedAsset.picId === newPicId)) {
      setFormError('Lokasi tujuan atau PIC baru harus berbeda dengan posisi aset saat ini.');
      return;
    }

    const yearMonth = date.replace(/-/g, '').substring(0, 6);
    const transferNumber = `MUTASI-${yearMonth}-${String(transfers.length + 1).padStart(3, '0')}`;

    const payload: Partial<Transfer> = {
      transferNumber,
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      sourceLocationId: selectedAsset.locationId || '',
      sourceLocationName: selectedAsset.locationName || 'Lokasi Belum Ditentukan',
      targetLocationId,
      targetLocationName: targetLoc ? `${targetLoc.building} - ${targetLoc.roomName}` : 'Ruangan Baru',
      oldPicId: selectedAsset.picId || '',
      oldPicName: selectedAsset.picName || '-',
      newPicId: newPicId || selectedAsset.picId,
      newPicName: targetPic ? targetPic.name : selectedAsset.picName || '-',
      date,
      reason: reason.trim(),
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onExecuteTransfer(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi mutasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Mutasi Aset & Pemindahan Lokasi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan perpindahan fisik barang antar gedung, ruangan, atau alih penanggung jawab
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-blue-300" />
            Catat Mutasi Baru
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari no mutasi, aset, ruangan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
          />
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Cetak Rekap Mutasi
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada riwayat mutasi aset.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Mutasi</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Aset Terkait</th>
                  <th className="py-3 px-4">Lokasi Asal</th>
                  <th className="py-3 px-4">Lokasi Tujuan</th>
                  <th className="py-3 px-4">Pj Baru</th>
                  <th className="py-3 px-4">Alasan</th>
                  <th className="py-3 px-4 text-right no-print">Berita Acara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                      {t.transferNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {t.date}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {t.assetName}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {t.sourceLocationName}
                    </td>

                    <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                      {t.targetLocationName}
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {t.newPicName || '-'}
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {t.reason || '-'}
                    </td>

                    <td className="py-3 px-4 text-right no-print">
                      <button
                        type="button"
                        onClick={() => setPrintTransfer(t)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Lihat Berita Acara Serah Terima Mutasi"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Mutasi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formulir Mutasi / Pemindahan Aset"
        subtitle="Memindahkan aset ke ruangan baru dan memperbarui penanggung jawab"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Barang yang Dimutasi *</label>
            <select
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.itemCode} - {a.name} (Saat ini di: {a.locationName || 'Lokasi umum'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lokasi Tujuan Baru *</label>
              <select
                required
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.building} - {l.roomName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Penanggung Jawab (PIC) Baru</label>
              <select
                value={newPicId}
                onChange={(e) => setNewPicId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="">-- Tetap Sesuai PIC Sebelumnya --</option>
                {pics.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.department || 'Staf'})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pemindahan</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan Mutasi *</label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Penataan ulang tata letak ruang kerja / alih fungsi laboratorium..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
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
              <ArrowLeftRight className="w-4 h-4 text-blue-300" />
              {isSubmitting ? 'Memproses...' : 'Eksekusi Mutasi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Berita Acara Mutasi */}
      {printTransfer && (
        <Modal
          isOpen={Boolean(printTransfer)}
          onClose={() => setPrintTransfer(null)}
          title="Berita Acara Mutasi Aset"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div id="printable-mutation-doc" className="p-6 bg-white border border-slate-300 rounded-xl space-y-4 text-xs font-sans text-slate-900">
              <div className="text-center border-b pb-3">
                <h4 className="font-extrabold text-sm uppercase text-[#142B4A]">{currentOrg?.name}</h4>
                <p className="text-[10px] text-slate-500">{currentOrg?.address || 'Sistem Inventaris Terpadu'}</p>
                <div className="mt-2 py-1 bg-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  BERITA ACARA SERAH TERIMA & MUTASI ASET
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Nomor Mutasi:</span>
                  <p className="font-mono font-bold">{printTransfer.transferNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal:</span>
                  <p className="font-semibold">{printTransfer.date}</p>
                </div>
                <div>
                  <span className="text-slate-500">Nama Aset:</span>
                  <p className="font-bold">{printTransfer.assetName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Alasan Mutasi:</span>
                  <p className="font-medium">{printTransfer.reason}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">POSISI ASAL</span>
                  <p className="font-bold text-slate-800">{printTransfer.sourceLocationName}</p>
                  <p className="text-[11px] text-slate-500">PIC: {printTransfer.oldPicName || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">POSISI BARU (TUJUAN)</span>
                  <p className="font-bold text-emerald-700">{printTransfer.targetLocationName}</p>
                  <p className="text-[11px] text-slate-500">PIC: {printTransfer.newPicName || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[10px]">
                <div>
                  <p className="text-slate-500 mb-8">Pihak Yang Menyerahkan,</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">{printTransfer.oldPicName || 'Petugas Asal'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-8">Pihak Yang Menerima (PIC Baru),</p>
                  <p className="font-bold border-t border-slate-300 pt-1 inline-block min-w-[120px]">{printTransfer.newPicName || 'Petugas Tujuan'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setPrintTransfer(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                Cetak Berita Acara
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
