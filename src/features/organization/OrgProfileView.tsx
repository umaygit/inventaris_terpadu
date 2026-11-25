import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Save, 
  Sparkles, 
  CheckCircle, 
  ShieldCheck, 
  AlertTriangle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, doc, updateDoc } from '../../services/firebase';
import { Modal } from '../../components/common/Modal';

export const OrgProfileView: React.FC = () => {
  const { currentOrg, userRole, createOrganization, seedDemoData, refreshOrgData, logAuditAction } = useAuth();
  
  // Edit Org Form
  const [name, setName] = useState(currentOrg?.name || '');
  const [code, setCode] = useState(currentOrg?.code || '');
  const [type, setType] = useState(currentOrg?.type || 'Perusahaan');
  const [address, setAddress] = useState(currentOrg?.address || '');
  const [phone, setPhone] = useState(currentOrg?.phone || '');
  const [email, setEmail] = useState(currentOrg?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Org Modal
  const [isNewOrgOpen, setIsNewOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('Sekolah / Madrasah');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateDoc(doc(db, 'organizations', currentOrg.id), {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim()
      });
      await logAuditAction('UPDATE_ORG_PROFILE', 'ORGANIZATION', currentOrg.id, `Memperbarui profil organisasi ${name}`);
      await refreshOrgData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan profil: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    try {
      await createOrganization(newOrgName.trim(), newOrgType, newOrgAddress);
      setIsNewOrgOpen(false);
      setNewOrgName('');
      setNewOrgAddress('');
      alert('Organisasi baru berhasil dibuat dan langsung diaktifkan!');
    } catch (err: any) {
      alert('Gagal membuat organisasi: ' + (err.message || err));
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleTriggerDemo = async () => {
    if (confirm('Muat paket data simulasi lengkap (kategori, ruangan, aset, transaksi, dan peminjaman) ke organisasi ini?')) {
      setIsSeeding(true);
      try {
        await seedDemoData();
        await refreshOrgData();
        alert('Data demonstrasi berhasil dimasukkan ke Cloud Firestore!');
      } catch (err: any) {
        alert('Gagal memuat data demo: ' + (err.message || err));
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const canEdit = userRole === 'super_admin' || userRole === 'admin';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Profil & Konfigurasi Organisasi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identitas lembaga, kode unik tenant inventaris, dan isolasi ruang data
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewOrgOpen(true)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Buat Ruang Organisasi Baru
        </button>
      </div>

      {/* Main Profile Form */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6 transition-colors">
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Profil organisasi berhasil diperbarui!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Organisasi / Lembaga / Sekolah *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Singkatan (Prefix Kode Aset) *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Lembaga / Sektor
              </label>
              <select
                disabled={!canEdit}
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
              >
                <option value="Sekolah / Madrasah">Sekolah / Madrasah</option>
                <option value="Perusahaan">Perusahaan Swasta / BUMN</option>
                <option value="Lembaga / Yayasan">Yayasan / Lembaga Sosial</option>
                <option value="Pemerintahan">Instansi Pemerintah / Dinas</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon Kantor
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Kontak Lembaga
              </label>
              <input
                type="email"
                disabled={!canEdit}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap Kantor / Kampus
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5] disabled:bg-slate-100 dark:disabled:bg-slate-800"
            />
          </div>

          {canEdit && (
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-blue-300" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Demo Seeding Section */}
      <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Paket Simulasi Data Demo
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5 max-w-xl">
            Muat kategori standar (Elektronik, Meubelair, Jaringan), lokasi (Gedung & Ruangan), aset contoh, serta riwayat peminjaman untuk menguji fungsionalitas sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerDemo}
          disabled={isSeeding}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isSeeding ? 'Memproses Demo...' : 'Muat Data Contoh'}
        </button>
      </div>

      {/* Modal Buat Organisasi Baru */}
      <Modal
        isOpen={isNewOrgOpen}
        onClose={() => setIsNewOrgOpen(false)}
        title="Buat Ruang Organisasi Baru (Multi-Tenant)"
        subtitle="Membuat ruang kerja terisolasi baru untuk entitas atau cabang organisasi lain"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateNewOrg} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Organisasi Baru *
            </label>
            <input
              type="text"
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Contoh: Cabang Surabaya / Yayasan Bina Insani"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jenis Organisasi
            </label>
            <select
              value={newOrgType}
              onChange={(e) => setNewOrgType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="Sekolah / Madrasah">Sekolah / Madrasah</option>
              <option value="Perusahaan">Perusahaan Swasta / BUMN</option>
              <option value="Lembaga / Yayasan">Yayasan / Lembaga Sosial</option>
              <option value="Pemerintahan">Instansi Pemerintah / Dinas</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat
            </label>
            <textarea
              rows={2}
              value={newOrgAddress}
              onChange={(e) => setNewOrgAddress(e.target.value)}
              placeholder="Alamat kantor..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewOrgOpen(false)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isCreatingOrg}
              className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Building2 className="w-3.5 h-3.5" />
              {isCreatingOrg ? 'Membuat...' : 'Buat Organisasi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
