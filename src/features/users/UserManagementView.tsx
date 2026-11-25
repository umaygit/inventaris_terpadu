import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Mail, 
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { OrgMember, UserRole } from '../../types';
import { RoleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  createAuthUserWithoutSignout 
} from '../../services/firebase';

export const UserManagementView: React.FC = () => {
  const { currentOrg, userRole, currentUser, logAuditAction } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('petugas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success dialog after creating account
  const [createdInfo, setCreatedInfo] = useState<{ email: string; pass: string; role: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [memberToDelete, setMemberToDelete] = useState<OrgMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change password state
  const [memberToChangePassword, setMemberToChangePassword] = useState<OrgMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'organizations', currentOrg.id, 'members'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgMember));
      setMembers(list);
    } catch (e) {
      console.error('Error fetching members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentOrg]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !inviteEmail.trim()) return;
    setFormError(null);

    const emailClean = inviteEmail.trim().toLowerCase();
    const passClean = invitePassword.trim();
    if (passClean.length < 6) {
      setFormError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);

    try {
      let createdUid = 'mem_' + Date.now().toString(36);

      // Attempt to register real Firebase Auth account without logging out current admin
      try {
        const uidFromAuth = await createAuthUserWithoutSignout(emailClean, passClean);
        if (uidFromAuth) {
          createdUid = uidFromAuth;
        }
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          console.info('Email already exists in Firebase Auth, attaching existing account to organization.');
        } else {
          console.warn('Firebase Auth creation note:', authErr.message || authErr);
        }
      }

      const newMember: OrgMember = {
        uid: createdUid,
        email: emailClean,
        displayName: inviteName.trim() || emailClean.split('@')[0],
        role: inviteRole,
        status: 'active',
        addedAt: new Date().toISOString(),
        password: passClean
      };

      // Save to organization members subcollection
      await setDoc(doc(db, 'organizations', currentOrg.id, 'members', createdUid), newMember);
      
      // Also write basic user profile so currentOrgId and role are populated
      try {
        await setDoc(doc(db, 'users', createdUid), {
          uid: createdUid,
          email: emailClean,
          displayName: newMember.displayName,
          currentOrgId: currentOrg.id,
          role: inviteRole,
          password: passClean,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (errUser) {
        console.warn('User profile sync notice:', errUser);
      }

      await logAuditAction(
        'ADD_MEMBER', 
        'USER', 
        createdUid, 
        `Menambahkan akun pengguna ${emailClean} dengan role ${inviteRole}`
      );

      setMembers(prev => {
        const filtered = prev.filter(m => m.email.toLowerCase() !== emailClean);
        return [...filtered, newMember];
      });

      // Show credentials popup so admin can share them
      setCreatedInfo({
        email: emailClean,
        pass: passClean,
        role: inviteRole,
        name: newMember.displayName
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('123456');
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan anggota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (member: OrgMember, newRole: UserRole) => {
    if (!currentOrg) return;
    try {
      const docId = member.id || member.uid;
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'members', docId), {
        role: newRole
      });
      await logAuditAction('UPDATE_ROLE', 'USER', member.uid, `Mengubah hak akses ${member.email} menjadi ${newRole}`);
      setMembers(prev => prev.map(m => m.uid === member.uid ? { ...m, role: newRole } : m));
    } catch (e: any) {
      alert('Gagal mengubah hak akses: ' + (e.message || e));
    }
  };

  const handleToggleStatus = async (member: OrgMember) => {
    if (!currentOrg) return;
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      const docId = member.id || member.uid;
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'members', docId), {
        status: newStatus
      });
      await logAuditAction('TOGGLE_STATUS', 'USER', member.uid, `Mengubah status ${member.email} menjadi ${newStatus}`);
      setMembers(prev => prev.map(m => m.uid === member.uid ? { ...m, status: newStatus } : m));
    } catch (e: any) {
      alert('Gagal mengubah status anggota: ' + (e.message || e));
    }
  };

  const handleDeleteMember = async () => {
    if (!currentOrg || !memberToDelete) return;
    setIsDeleting(true);
    try {
      const docId = memberToDelete.id || memberToDelete.uid;
      await deleteDoc(doc(db, 'organizations', currentOrg.id, 'members', docId));
      await logAuditAction(
        'DELETE_MEMBER', 
        'USER', 
        memberToDelete.uid, 
        `Menghapus akses akun anggota ${memberToDelete.email} (${memberToDelete.displayName}) dari organisasi`
      );
      setMembers(prev => prev.filter(m => (m.id || m.uid) !== docId && m.uid !== memberToDelete.uid));
      setMemberToDelete(null);
    } catch (e: any) {
      alert('Gagal menghapus anggota: ' + (e.message || e));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !memberToChangePassword) return;
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    const passClean = newPassword.trim();
    if (passClean.length < 6) {
      setChangePasswordError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const docId = memberToChangePassword.id || memberToChangePassword.uid;
      
      // Update in organization members subcollection
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'members', docId), {
        password: passClean
      });

      // Update in users collection if exists
      try {
        await updateDoc(doc(db, 'users', memberToChangePassword.uid), {
          password: passClean
        });
      } catch (errUser) {
        console.warn('User profile password sync notice:', errUser);
      }

      await logAuditAction(
        'CHANGE_PASSWORD',
        'USER',
        memberToChangePassword.uid,
        `Mengubah kata sandi untuk pengguna ${memberToChangePassword.email}`
      );

      setMembers(prev => prev.map(m => (m.uid === memberToChangePassword.uid || m.id === docId) ? { ...m, password: passClean } : m));
      setChangePasswordSuccess(`Kata sandi untuk ${memberToChangePassword.email} berhasil diperbarui menjadi: ${passClean}`);
      
      setTimeout(() => {
        setMemberToChangePassword(null);
        setNewPassword('');
        setChangePasswordSuccess(null);
      }, 3000);
    } catch (e: any) {
      setChangePasswordError('Gagal mengubah kata sandi: ' + (e.message || e));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyCredentials = () => {
    if (!createdInfo) return;
    const text = `Akun Inventaris:\nEmail: ${createdInfo.email}\nKata Sandi: ${createdInfo.pass}\nPeran: ${createdInfo.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredMembers = members.filter(m => {
    const q = searchTerm.toLowerCase();
    return !q || m.email.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Pengguna & Hak Akses Organisasi (RBAC)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola akun, kata sandi login, peran akses (Admin, Petugas, Kepala/Manajer, Auditor), serta hapus akun anggota.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsInviteOpen(true);
          }}
          className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-blue-300" />
          Tambah Anggota Baru
        </button>
      </div>

      {/* Role Explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white dark:bg-[#0B1930] rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-2xs transition-colors">
          <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">Admin Organisasi</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Akses penuh mengelola seluruh aset, master data, anggota tim, hapus data, dan konfigurasi.</p>
        </div>

        <div className="p-3 bg-white dark:bg-[#0B1930] rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs transition-colors">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Petugas Inventaris</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Menginput barang, mencatat barang masuk/keluar, peminjaman, perbaikan, dan mutasi fisik.</p>
        </div>

        <div className="p-3 bg-white dark:bg-[#0B1930] rounded-xl border border-amber-100 dark:border-amber-900/40 shadow-2xs transition-colors">
          <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">Kepala / Manajer</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Melihat dashboard statistik, laporan berkala, dan verifikasi persetujuan transaksi.</p>
        </div>

        <div className="p-3 bg-white dark:bg-[#0B1930] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Auditor / Pengawas</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Hanya melihat data (read-only) dan mengunduh audit log tanpa izin modifikasi.</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none"
            />
          </div>

          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">
            {members.length} Anggota Terdaftar
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">Memuat anggota organisasi...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">Tidak ada anggota yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama & Email</th>
                  <th className="py-3 px-4">Hak Akses (Role)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tgl Bergabung</th>
                  <th className="py-3 px-4 text-right no-print">Aksi & Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredMembers.map((m) => {
                  const isCurrentActiveUser = currentUser?.uid === m.uid || currentUser?.email?.toLowerCase() === m.email?.toLowerCase();

                  return (
                    <tr key={m.uid || m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {m.displayName}
                              {isCurrentActiveUser && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-normal">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <RoleBadge role={m.role} />
                      </td>

                      <td className="py-3 px-4">
                        {m.status === 'active' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Aktif</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">Dinonaktifkan</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {m.addedAt ? new Date(m.addedAt).toLocaleDateString('id-ID') : '-'}
                      </td>

                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={m.role}
                            disabled={isCurrentActiveUser && userRole === 'admin'}
                            onChange={(e) => handleUpdateRole(m, e.target.value as UserRole)}
                            className="p-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                            title="Ubah Peran"
                          >
                            <option value="admin">Admin</option>
                            <option value="petugas">Petugas</option>
                            <option value="kepala">Kepala</option>
                            <option value="auditor">Auditor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(m)}
                            disabled={isCurrentActiveUser}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-40 ${
                              m.status === 'active' 
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60' 
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            }`}
                            title={m.status === 'active' ? 'Tangguhkan Akun' : 'Aktifkan Akun'}
                          >
                            {m.status === 'active' ? 'Suspend' : 'Aktif'}
                          </button>

                          {/* Tombol Ganti Kata Sandi */}
                          <button
                            type="button"
                            onClick={() => {
                              setMemberToChangePassword(m);
                              setNewPassword('');
                              setChangePasswordError(null);
                              setChangePasswordSuccess(null);
                            }}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Ganti Kata Sandi"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Tombol Aksi Hapus Data Pengguna */}
                          <button
                            type="button"
                            onClick={() => setMemberToDelete(m)}
                            disabled={isCurrentActiveUser}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                            title={isCurrentActiveUser ? 'Tidak dapat menghapus akun Anda sendiri' : 'Hapus data pengguna ini'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal Invite / Tambah Member Baru */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Tambah Akun Pengguna Baru"
        subtitle="Buat akun login dengan email, kata sandi, dan tetapkan hak akses peran"
        maxWidth="sm"
      >
        <form onSubmit={handleAddMember} className="space-y-3.5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Pengguna *</label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Contoh: Rina Wahyuni, S.E."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Email Login *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nama@organisasi.id"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kata Sandi Login *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Minimal 6 karakter (default: 123456)"
                className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Pengguna dapat langsung masuk dengan email & kata sandi ini.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hak Akses (Role)</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="admin">Admin Organisasi (Akses Penuh)</option>
              <option value="petugas">Petugas Inventaris (Input Data, Transaksi, & Mutasi)</option>
              <option value="kepala">Kepala / Manajer (Pengawasan & Persetujuan)</option>
              <option value="auditor">Auditor (Hanya Baca / Read-Only)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Membuat Akun...' : 'Buat Akun & Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Akun Berhasil Dibuat (Credential Info) */}
      <Modal
        isOpen={Boolean(createdInfo)}
        onClose={() => setCreatedInfo(null)}
        title="Akun Berhasil Dibuat!"
        subtitle="Salin dan berikan kredensial berikut kepada pengguna untuk login"
        maxWidth="sm"
      >
        {createdInfo && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Nama:</span>
                <span className="font-bold text-slate-900 dark:text-white">{createdInfo.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Email:</span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{createdInfo.email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Kata Sandi:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{createdInfo.pass}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Peran Akses:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">{createdInfo.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex-1 py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Tersalin ke Clipboard' : 'Salin Kredensial'}
              </button>

              <button
                type="button"
                onClick={() => setCreatedInfo(null)}
                className="py-2 px-4 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] text-white rounded-xl text-xs font-semibold"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Ganti Kata Sandi */}
      <Modal
        isOpen={Boolean(memberToChangePassword)}
        onClose={() => setMemberToChangePassword(null)}
        title="Ganti Kata Sandi Pengguna"
        subtitle={`Perbarui kata sandi login untuk ${memberToChangePassword?.displayName || memberToChangePassword?.email}`}
        maxWidth="sm"
      >
        {memberToChangePassword && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {changePasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru * (Minimal 6 karakter)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Pengguna dapat langsung menggunakan kata sandi baru ini untuk masuk ke sistem.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToChangePassword(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-1.5 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isChangingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Konfirmasi Hapus Member */}
      <Modal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        title="Hapus Data Pengguna"
        subtitle="Konfirmasi pencabutan akses anggota dari organisasi"
        maxWidth="sm"
      >
        {memberToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Apakah Anda yakin ingin menghapus akun ini?</p>
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                  Pengguna <strong>{memberToDelete.displayName}</strong> ({memberToDelete.email}) dengan peran <strong>{memberToDelete.role}</strong> tidak akan bisa lagi mengakses data organisasi ini.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteMember}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
