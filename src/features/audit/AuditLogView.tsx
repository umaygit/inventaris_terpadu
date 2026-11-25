import React, { useState } from 'react';
import { ShieldCheck, Search, Calendar, User, Clock, Printer, Filter } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = logs.filter(log => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || 
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q);

    const matchAction = actionFilter === 'all' || log.action.includes(actionFilter);
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0B1930] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Jejak Audit Keamanan & Log Aktivitas (Audit Trail)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catatan permanen dan tidak dapat diubah (append-only) atas seluruh aksi pengguna di Firestore
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Cetak Rekap Audit
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-[#0B1930] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aktivitas, nama pengguna, email..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:bg-white focus:outline-none shrink-0"
          >
            <option value="all">Semua Tindakan ({logs.length})</option>
            <option value="ASSET">Aset (Tambah/Edit/Hapus)</option>
            <option value="TRANSACTION">Transaksi (In/Out)</option>
            <option value="LOAN">Peminjaman</option>
            <option value="USER">Pengguna & Akses</option>
          </select>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 self-end sm:self-auto">
          Total {filteredLogs.length} entri tercatat
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0B1930] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-xs transition-colors">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada log aktivitas yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Waktu (WIB)</th>
                  <th className="py-3 px-4">Aktor / Pengguna</th>
                  <th className="py-3 px-4">Jenis Tindakan</th>
                  <th className="py-3 px-4">Objek Sasaran</th>
                  <th className="py-3 px-4">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{log.performedBy}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{log.userEmail}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {log.targetType}
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
