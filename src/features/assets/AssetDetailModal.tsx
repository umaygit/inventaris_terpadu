import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../../components/common/Modal';
import { ConditionBadge, StatusBadge } from '../../components/common/Badge';
import { Asset, Organization } from '../../types';
import { 
  QrCode, 
  Printer, 
  Edit3, 
  Calendar, 
  MapPin, 
  User, 
  Truck, 
  Tag, 
  ShieldAlert, 
  CheckCircle,
  Coins,
  Repeat,
  Wrench,
  ArrowLeftRight
} from 'lucide-react';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  organization: Organization | null;
  onEdit: (asset: Asset) => void;
  onPrintLabel: (asset: Asset) => void;
  onInitiateTransfer?: (asset: Asset) => void;
  onInitiateMaintenance?: (asset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
  organization,
  onEdit,
  onPrintLabel,
  onInitiateTransfer,
  onInitiateMaintenance
}) => {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (asset && isOpen) {
      QRCode.toDataURL(asset.itemCode, { width: 180, margin: 1 })
        .then(url => setQrUrl(url))
        .catch(console.error);
    }
  }, [asset, isOpen]);

  if (!asset) return null;

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rincian Kartu Inventaris Aset"
      subtitle={`Informasi lengkap spesifikasi dan histori ${asset.itemCode}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[#142B4A] dark:text-blue-400">
                  {asset.itemCode}
                </span>
                <ConditionBadge condition={asset.condition} />
                <StatusBadge status={asset.status} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {asset.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {asset.categoryName} &bull; {asset.type === 'fixed_asset' ? 'Aset Tetap' : 'Barang Habis Pakai'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPrintLabel(asset)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-blue-500" />
            Cetak Label Stiker
          </button>
        </div>

        {/* Detailed Grid Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Spesifikasi Teknis */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              Spesifikasi & Identifikasi
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-400 dark:text-slate-500">Merek:</span>
              <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{asset.brand || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Model / Tipe:</span>
              <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{asset.model || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Nomor Seri:</span>
              <span className="col-span-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{asset.serialNumber || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Barcode:</span>
              <span className="col-span-2 font-mono text-slate-600 dark:text-slate-300">{asset.barcode || asset.itemCode}</span>

              <span className="text-slate-400 dark:text-slate-500">Jumlah Total:</span>
              <span className="col-span-2 font-bold text-slate-900 dark:text-white">{asset.quantity} {asset.unit}</span>

              <span className="text-slate-400 dark:text-slate-500">Ketersediaan:</span>
              <span className="col-span-2 font-bold text-emerald-600 dark:text-emerald-400">{asset.availableQuantity ?? asset.quantity} {asset.unit}</span>
            </div>
          </div>

          {/* Penempatan & Penanggung Jawab */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Lokasi & Penanggung Jawab
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-400 dark:text-slate-500">Ruangan:</span>
              <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{asset.locationName || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">PIC / Pj:</span>
              <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{asset.picName || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Pemasok:</span>
              <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{asset.supplierName || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Garansi S/D:</span>
              <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{asset.warrantyExpiry || 'Tidak ada garansi'}</span>
            </div>
          </div>

          {/* Data Finansial & Pengadaan */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Finansial & Pengadaan
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-400 dark:text-slate-500">Harga Satuan:</span>
              <span className="col-span-2 font-mono font-bold text-slate-900 dark:text-white">{formatIDR(asset.purchasePrice)}</span>

              <span className="text-slate-400 dark:text-slate-500">Nilai Total:</span>
              <span className="col-span-2 font-mono font-bold text-[#142B4A] dark:text-blue-300">{formatIDR(asset.totalValue || (asset.quantity * asset.purchasePrice))}</span>

              <span className="text-slate-400 dark:text-slate-500">Tgl Perolehan:</span>
              <span className="col-span-2 text-slate-700 dark:text-slate-300">{asset.purchaseDate || '-'}</span>

              <span className="text-slate-400 dark:text-slate-500">Sumber Dana:</span>
              <span className="col-span-2 text-slate-700 dark:text-slate-300">{asset.fundingSource || 'Operasional'}</span>

              <span className="text-slate-400 dark:text-slate-500">No Faktur:</span>
              <span className="col-span-2 font-mono text-slate-700 dark:text-slate-300">{asset.invoiceNumber || '-'}</span>
            </div>
          </div>

          {/* Catatan & Riwayat */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Catatan & Status Sistem
            </h4>
            <div className="space-y-1.5">
              <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                {asset.notes || 'Tidak ada catatan tambahan untuk aset ini.'}
              </p>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                <p>Terakhir diperbarui: {new Date(asset.updatedAt || asset.createdAt).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {onInitiateTransfer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInitiateTransfer(asset);
                }}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Mutasi Ruangan
              </button>
            )}
            {onInitiateMaintenance && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInitiateMaintenance(asset);
                }}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Tiket Pemeliharaan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(asset);
              }}
              className="px-4 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-300" />
              Edit Aset
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
