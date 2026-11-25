import React, { useState } from 'react';
import { 
  FolderTree, 
  MapPin, 
  Truck, 
  UserCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Building2,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { Category, Location, Supplier, PIC } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

interface MasterDataViewProps {
  categories: Category[];
  locations: Location[];
  suppliers: Supplier[];
  pics: PIC[];
  onSaveCategory: (data: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveLocation: (data: Partial<Location>) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
  onSaveSupplier: (data: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onSavePIC: (data: Partial<PIC>) => Promise<void>;
  onDeletePIC: (id: string) => Promise<void>;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  categories,
  locations,
  suppliers,
  pics,
  onSaveCategory,
  onDeleteCategory,
  onSaveLocation,
  onDeleteLocation,
  onSaveSupplier,
  onDeleteSupplier,
  onSavePIC,
  onDeletePIC
}) => {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'locations' | 'suppliers' | 'pics'>('categories');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal forms
  const [categoryModal, setCategoryModal] = useState<Partial<Category> | null>(null);
  const [locationModal, setLocationModal] = useState<Partial<Location> | null>(null);
  const [supplierModal, setSupplierModal] = useState<Partial<Supplier> | null>(null);
  const [picModal, setPicModal] = useState<Partial<PIC> | null>(null);

  // Deletion confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = userRole === 'super_admin' || userRole === 'admin' || userRole === 'petugas';
  const canDelete = userRole === 'super_admin' || userRole === 'admin';

  // Category save
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryModal?.name || !categoryModal?.code) return;
    await onSaveCategory(categoryModal);
    setCategoryModal(null);
  };

  // Location save
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationModal?.building || !locationModal?.roomName || !locationModal?.code) return;
    await onSaveLocation(locationModal);
    setLocationModal(null);
  };

  // Supplier save
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierModal?.name) return;
    await onSaveSupplier(supplierModal);
    setSupplierModal(null);
  };

  // PIC save
  const handlePICSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picModal?.name) return;
    await onSavePIC(picModal);
    setPicModal(null);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'category') await onDeleteCategory(deleteTarget.id);
      else if (deleteTarget.type === 'location') await onDeleteLocation(deleteTarget.id);
      else if (deleteTarget.type === 'supplier') await onDeleteSupplier(deleteTarget.id);
      else if (deleteTarget.type === 'pic') await onDeletePIC(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e: any) {
      alert('Gagal menghapus: ' + (e.message || e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Master Data & Parameter Klasifikasi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pengelolaan kategori inventaris, denah lokasi ruangan, rekanan vendor, dan penanggung jawab
          </p>
        </div>

        {canEdit && (
          <div>
            {activeTab === 'categories' && (
              <button
                type="button"
                onClick={() => setCategoryModal({ name: '', code: '', description: '' })}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-300" />
                Tambah Kategori
              </button>
            )}
            {activeTab === 'locations' && (
              <button
                type="button"
                onClick={() => setLocationModal({ building: '', floor: 'Lantai 1', roomName: '', code: '', notes: '' })}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-300" />
                Tambah Ruangan / Lokasi
              </button>
            )}
            {activeTab === 'suppliers' && (
              <button
                type="button"
                onClick={() => setSupplierModal({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' })}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-300" />
                Tambah Rekanan Vendor
              </button>
            )}
            {activeTab === 'pics' && (
              <button
                type="button"
                onClick={() => setPicModal({ name: '', employeeId: '', department: '', phone: '', email: '' })}
                className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-300" />
                Tambah Penanggung Jawab
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#0B1930] p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap gap-1 transition-colors">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'categories' 
              ? 'bg-[#142B4A] dark:bg-[#3977D5] text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Kategori ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'locations' 
              ? 'bg-[#142B4A] dark:bg-[#3977D5] text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Lokasi & Ruang ({locations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'suppliers' 
              ? 'bg-[#142B4A] dark:bg-[#3977D5] text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Vendor ({suppliers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pics')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pics' 
              ? 'bg-[#142B4A] dark:bg-[#3977D5] text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Penanggung Jawab ({pics.length})
        </button>
      </div>

      {/* Content based on Tab */}

      {/* 1. KATEGORI */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">{c.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{c.description || '-'}</td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setCategoryModal(c)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: c.id, type: 'category', name: c.name })}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
      )}

      {/* 2. LOKASI */}
      {activeTab === 'locations' && (
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Kode Ruang</th>
                  <th className="py-3 px-4">Gedung</th>
                  <th className="py-3 px-4">Lantai</th>
                  <th className="py-3 px-4">Nama Ruangan / Area</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {locations.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">{l.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{l.building}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{l.floor}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{l.roomName}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{l.notes || '-'}</td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setLocationModal(l)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: l.id, type: 'location', name: `${l.building} - ${l.roomName}` })}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
      )}

      {/* 3. PEMASOK */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Perusahaan / Vendor</th>
                  <th className="py-3 px-4">Kontak Person</th>
                  <th className="py-3 px-4">Telepon & Email</th>
                  <th className="py-3 px-4">Alamat Kantor</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{s.contactPerson || '-'}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{s.phone || '-'}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.email || '-'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{s.address || '-'}</td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setSupplierModal(s)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: s.id, type: 'supplier', name: s.name })}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
      )}

      {/* 4. PIC (PENANGGUNG JAWAB) */}
      {activeTab === 'pics' && (
        <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NIP / ID Pegawai</th>
                  <th className="py-3 px-4">Unit Kerja / Divisi</th>
                  <th className="py-3 px-4">Kontak (HP/Email)</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {pics.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">{p.employeeId || '-'}</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{p.department || '-'}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{p.phone || '-'}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{p.email || '-'}</p>
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setPicModal(p)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: p.id, type: 'pic', name: p.name })}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
      )}

      {/* Modal Kategori */}
      {categoryModal && (
        <Modal
          isOpen={Boolean(categoryModal)}
          onClose={() => setCategoryModal(null)}
          title={categoryModal.id ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          maxWidth="sm"
        >
          <form onSubmit={handleCategorySubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kode Kategori (Singkatan) *</label>
              <input
                type="text"
                required
                value={categoryModal.code || ''}
                onChange={(e) => setCategoryModal(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Contoh: ELK / MEU / KND"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Kategori *</label>
              <input
                type="text"
                required
                value={categoryModal.name || ''}
                onChange={(e) => setCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Elektronik & Perangkat Komputer"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Singkat</label>
              <textarea
                rows={2}
                value={categoryModal.description || ''}
                onChange={(e) => setCategoryModal(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCategoryModal(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Lokasi */}
      {locationModal && (
        <Modal
          isOpen={Boolean(locationModal)}
          onClose={() => setLocationModal(null)}
          title={locationModal.id ? 'Edit Lokasi' : 'Tambah Ruangan / Lokasi'}
          maxWidth="sm"
        >
          <form onSubmit={handleLocationSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Gedung / Sayap *</label>
              <input
                type="text"
                required
                value={locationModal.building || ''}
                onChange={(e) => setLocationModal(prev => ({ ...prev, building: e.target.value }))}
                placeholder="Contoh: Gedung Rektorat / Gedung A"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lantai</label>
                <input
                  type="text"
                  value={locationModal.floor || ''}
                  onChange={(e) => setLocationModal(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="Lantai 1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kode Ruang *</label>
                <input
                  type="text"
                  required
                  value={locationModal.code || ''}
                  onChange={(e) => setLocationModal(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="GA-101"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Ruangan *</label>
              <input
                type="text"
                required
                value={locationModal.roomName || ''}
                onChange={(e) => setLocationModal(prev => ({ ...prev, roomName: e.target.value }))}
                placeholder="Ruang Guru / Lab Komputer"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLocationModal(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Supplier */}
      {supplierModal && (
        <Modal
          isOpen={Boolean(supplierModal)}
          onClose={() => setSupplierModal(null)}
          title={supplierModal.id ? 'Edit Rekanan' : 'Tambah Rekanan Vendor'}
          maxWidth="sm"
        >
          <form onSubmit={handleSupplierSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Vendor / Perusahaan *</label>
              <input
                type="text"
                required
                value={supplierModal.name || ''}
                onChange={(e) => setSupplierModal(prev => ({ ...prev, name: e.target.value }))}
                placeholder="PT Sumber Makmur"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Person (PIC Vendor)</label>
              <input
                type="text"
                value={supplierModal.contactPerson || ''}
                onChange={(e) => setSupplierModal(prev => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Nama perwakilan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telepon</label>
                <input
                  type="text"
                  value={supplierModal.phone || ''}
                  onChange={(e) => setSupplierModal(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="021-xxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={supplierModal.email || ''}
                  onChange={(e) => setSupplierModal(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@vendor.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat</label>
              <textarea
                rows={2}
                value={supplierModal.address || ''}
                onChange={(e) => setSupplierModal(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Alamat kantor..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSupplierModal(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal PIC */}
      {picModal && (
        <Modal
          isOpen={Boolean(picModal)}
          onClose={() => setPicModal(null)}
          title={picModal.id ? 'Edit Penanggung Jawab' : 'Tambah Penanggung Jawab (PIC)'}
          maxWidth="sm"
        >
          <form onSubmit={handlePICSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={picModal.name || ''}
                onChange={(e) => setPicModal(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nama staf penanggung jawab"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIP / NIK / ID Pegawai</label>
              <input
                type="text"
                value={picModal.employeeId || ''}
                onChange={(e) => setPicModal(prev => ({ ...prev, employeeId: e.target.value }))}
                placeholder="NIP-1985xxxxxx"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Divisi / Unit Kerja</label>
              <input
                type="text"
                value={picModal.department || ''}
                onChange={(e) => setPicModal(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Divisi Teknologi / Keuangan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. HP / WhatsApp</label>
                <input
                  type="text"
                  value={picModal.phone || ''}
                  onChange={(e) => setPicModal(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0812xxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={picModal.email || ''}
                  onChange={(e) => setPicModal(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="nama@organisasi.id"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPicModal(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog on Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        title="Hapus Master Data"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Pastikan tidak ada data aset aktif yang sedang mereferensikan parameter ini.`}
        confirmLabel="Hapus Parameter"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
