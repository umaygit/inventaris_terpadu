import React from 'react';
import { AssetCondition, AssetStatus, UserRole } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const variantStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    info: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    purple: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-sm px-3 py-1 rounded-full font-medium'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
};

export const ConditionBadge: React.FC<{ condition: AssetCondition }> = ({ condition }) => {
  switch (condition) {
    case 'good':
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Baik
        </Badge>
      );
    case 'lightly_damaged':
      return (
        <Badge variant="warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Rusak Ringan
        </Badge>
      );
    case 'heavily_damaged':
      return (
        <Badge variant="danger">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Rusak Berat
        </Badge>
      );
    default:
      return <Badge>{condition}</Badge>;
  }
};

export const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  switch (status) {
    case 'available':
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Tersedia
        </Badge>
      );
    case 'in_use':
      return (
        <Badge variant="info">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          Digunakan
        </Badge>
      );
    case 'borrowed':
      return (
        <Badge variant="warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Dipinjam
        </Badge>
      );
    case 'under_maintenance':
      return (
        <Badge variant="purple">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Perawatan
        </Badge>
      );
    case 'disposed':
      return (
        <Badge variant="danger">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Diarsipkan/Afkir
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  switch (role) {
    case 'super_admin':
      return <Badge variant="purple">Super Admin</Badge>;
    case 'admin':
      return <Badge variant="info">Admin Organisasi</Badge>;
    case 'petugas':
      return <Badge variant="success">Petugas Inventaris</Badge>;
    case 'kepala':
      return <Badge variant="warning">Kepala / Manajer</Badge>;
    case 'auditor':
      return <Badge variant="neutral">Auditor / Pengawas</Badge>;
    default:
      return <Badge>{role}</Badge>;
  }
};
