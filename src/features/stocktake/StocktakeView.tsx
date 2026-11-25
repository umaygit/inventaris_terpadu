import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  QrCode, 
  FileSpreadsheet, 
  Calendar,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Stocktake, Asset, Location, Category, StocktakeItem } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

interface StocktakeViewProps {
  stocktakes: Stocktake[];
  assets: Asset[];
  locations: Location[];
  categories: Category[];
  onCreateStocktake: (data: Partial<Stocktake>) => Promise<void>;
  onUpdateStocktakeItems: (id: string, items: StocktakeItem[], isCompleted?: boolean) => Promise<void>;
  onOpenQRScanner: () => void;
}

export const StocktakeView: React.FC<StocktakeViewProps> = ({
  stocktakes,
  assets,
  locations,
  categories,
  onCreateStocktake,
  onUpdateStocktakeItems,
  onOpenQRScanner
}) => {
  const { userRole, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<Stocktake | null>(null);

  // New stocktake session form
  const [title, setTitle] = useState('');
  const [locationId, setLocationId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active session audit working state
  const [sessionItems, setSessionItems] = useState<StocktakeItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  const handleOpenCreate = () => {
    setTitle('Pemeriksaan Fisik Inventaris ' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
    setLocationId('');
    setCategoryId('');
    setNotes('');
    setDate(new Date().toISOString().substring(0, 10));
    setIsModalOpen(true);
  };

  const handleStartStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Filter relevant assets for snapshot
    let targetAssets = assets;
    if (locationId) targetAssets = targetAssets.filter(a => a.locationId === locationId);
    if (categoryId) targetAssets = targetAssets.filter(a => a.categoryId === categoryId);

    const snapshotItems: StocktakeItem[] = targetAssets.map(a => ({
      assetId: a.id,
      itemCode: a.itemCode,
      name: a.name,
      systemQty: a.quantity,
      physicalQty: a.quantity, // initial default to check
      difference: 0,
      condition: a.condition,
      status: 'matched'
    }));

    const loc = locations.find(l => l.id === locationId);
    const cat = categories.find(c => c.id === categoryId);
    const yearMonth = date.replace(/-/g, '').substring(0, 6);
    const scheduleNumber = `SO-${yearMonth}-${String(stocktakes.length + 1).padStart(3, '0')}`;

    const payload: Partial<Stocktake> = {
      scheduleNumber,
      title: title.trim(),
      locationId: locationId || undefined,
      locationName: loc ? `${loc.building} - ${loc.roomName}` : 'Semua Lokasi',
      categoryId: categoryId || undefined,
      categoryName: cat?.name || 'Semua Kategori',
      status: 'in_progress',
      date,
      items: snapshotItems,
      notes: notes.trim(),
      conductedBy: userProfile?.displayName || 'Petugas Auditor',
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onCreateStocktake(payload);
      setIsModalOpen(false);
    } catch (e: any) {
      alert('Gagal memulai sesi stock opname: ' + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSessionAudit = (st: Stocktake) => {
    setActiveSession(st);
    setSessionItems(st.items || []);
  };

  const handleUpdatePhysicalQty = (index: number, newQty: number) => {
    setSessionItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const diff = newQty - item.systemQty;
      let status: 'matched' | 'discrepancy' | 'missing' | 'damaged' = 'matched';
      if (newQty === 0 && item.systemQty > 0) status = 'missing';
      else if (diff !== 0) status = 'discrepancy';

      updated[index] = {
        ...item,
        physicalQty: newQty,
        difference: diff,
        status
      };
      return updated;
    });
  };

  const handleSaveAuditSession = async (complete = false) => {
    if (!activeSession) return;
    try {
      await onUpdateStocktakeItems(activeSession.id, sessionItems, complete);
      if (complete) {
        alert('Audit Stock Opname berhasil diselesaikan dan dicatat ke sistem!');
        setActiveSession(null);
      } else {
        alert('Perkembangan audit berhasil disimpan.');
      }
    } catch (e: any) {
      alert('Gagal menyimpan hasil audit: ' + (e.message || e));
    }
  };

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Stock Opname & Audit Fisik
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pemeriksaan fisik barang, rekonsiliasi selisih stok, dan verifikasi kondisi aset
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-blue-300" />
            Jadwalkan Stock Opname Baru
          </button>
        )}
      </div>

      {/* Stocktake Sessions List */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">Daftar Sesi Pemeriksaan Fisik</span>
          <span className="text-slate-400 dark:text-slate-500 text-[11px]">{stocktakes.length} Sesi Terjadwal</span>
        </div>

        {stocktakes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada sesi stock opname.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Mulai sesi baru untuk mengambil snapshot pembukuan dan memverifikasi fisik aset.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Jadwal</th>
                  <th className="py-3 px-4">Judul Audit</th>
                  <th className="py-3 px-4">Cakupan Lokasi & Kategori</th>
                  <th className="py-3 px-4 text-center">Item Diaudit</th>
                  <th className="py-3 px-4">Pelaksana</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right no-print">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {stocktakes.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#142B4A] dark:text-blue-400">
                      {st.scheduleNumber}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {st.title}
                      <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">{st.date}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <p className="font-semibold">{st.locationName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{st.categoryName}</p>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                      {st.items?.length || 0} Barang
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {st.conductedBy}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {st.status === 'completed' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Sedang Berlangsung
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right no-print">
                      <button
                        type="button"
                        onClick={() => handleOpenSessionAudit(st)}
                        className="px-3 py-1 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white font-semibold rounded-lg text-[11px] transition-colors"
                      >
                        {st.status === 'completed' ? 'Lihat Hasil' : 'Lakukan Audit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Mulai Stock Opname Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Jadwalkan Sesi Stock Opname Baru"
        subtitle="Sistem akan mengambil snapshot pembukuan aset saat ini untuk diverifikasi di lapangan"
        maxWidth="lg"
      >
        <form onSubmit={handleStartStocktake} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul / Keterangan Sesi *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Audit Fisik Aset Akhir Tahun 2026"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Ruangan / Gedung</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="">Semua Lokasi / Seluruh Gedung</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.building} - {l.roomName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Kategori Barang</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pelaksanaan</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan / Instruksi Tim Auditor</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruksi penempelan stiker barcode fisik atau pengecekan nomor seri..."
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
              <ClipboardCheck className="w-4 h-4 text-blue-300" />
              {isSubmitting ? 'Membuat Snapshot...' : 'Mulai Audit Stock Opname'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Audit Session Inspection Drawer / Modal */}
      {activeSession && (
        <Modal
          isOpen={Boolean(activeSession)}
          onClose={() => setActiveSession(null)}
          title={`Pemeriksaan Fisik: ${activeSession.title}`}
          subtitle={`No: ${activeSession.scheduleNumber} | Lokasi: ${activeSession.locationName}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Cari item dalam sesi..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={onOpenQRScanner}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Scan QR Cepat
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  Cetak Lembar Audit
                </button>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Kode & Nama Barang</th>
                    <th className="p-2.5 text-center">Buku (Sistem)</th>
                    <th className="p-2.5 text-center">Fisik Nyata</th>
                    <th className="p-2.5 text-center">Selisih</th>
                    <th className="p-2.5 text-center">Status Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sessionItems
                    .filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.itemCode.toLowerCase().includes(itemSearch.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-2.5">
                          <span className="font-mono font-bold text-[#142B4A] dark:text-blue-400">{item.itemCode}</span>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        </td>

                        <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.systemQty}
                        </td>

                        <td className="p-2.5 text-center">
                          {activeSession.status === 'completed' ? (
                            <span className="font-bold text-slate-900 dark:text-white">{item.physicalQty}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={item.physicalQty}
                              onChange={(e) => handleUpdatePhysicalQty(idx, parseInt(e.target.value) || 0)}
                              className="w-16 p-1 text-center font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          )}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold">
                          {item.difference === 0 ? (
                            <span className="text-slate-400 dark:text-slate-500">0</span>
                          ) : item.difference > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+{item.difference}</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">{item.difference}</span>
                          )}
                        </td>

                        <td className="p-2.5 text-center">
                          {item.status === 'matched' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Cocok</span>
                          ) : item.status === 'missing' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">Hilang (0)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Selisih Fisik</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Tutup
              </button>

              {activeSession.status !== 'completed' && canWrite && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAuditSession(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Simpan Draf Perkembangan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveAuditSession(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    Selesaikan & Rekonsiliasi Audit
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
