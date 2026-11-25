import React, { useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle, Clock } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationViewProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: any) => void;
}

export const NotificationView: React.FC<NotificationViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'critical') return n.type === 'critical' || n.type === 'warning';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Pusat Notifikasi & Pengingat Sistem
          </h3>
          <p className="text-xs text-slate-500">
            Peringatan stok minimum, pengingat jatuh tempo peminjaman, dan status perbaikan
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Tandai Semua Telah Dibaca
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-[#142B4A] text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'unread' ? 'bg-[#142B4A] text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('critical')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'critical' ? 'bg-[#142B4A] text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Kritis & Peringatan
        </button>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Tidak ada notifikasi untuk ditampilkan.</p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onMarkRead(n.id);
                if (n.link) onNavigateTab(n.link);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                n.read 
                  ? 'bg-white border-slate-200/80 hover:border-slate-300' 
                  : 'bg-blue-50/40 border-blue-200/80 hover:border-blue-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'critical' ? 'bg-rose-100 text-rose-600' :
                  n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {n.type === 'critical' ? <AlertCircle className="w-5 h-5" /> :
                   n.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                   <Info className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                    {new Date(n.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {n.link && (
                <span className="text-xs font-semibold text-blue-600 shrink-0 self-center hover:underline">
                  Lihat Detail &rarr;
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
