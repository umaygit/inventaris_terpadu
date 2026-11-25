import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, Download, QrCode as QrIcon, FileImage } from 'lucide-react';
import { Modal } from './Modal';
import { Asset, Organization } from '../../types';
import { downloadAssetLabelImage } from '../../utils/labelImageGenerator';

interface AssetLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  organization: Organization | null;
}

export const AssetLabelModal: React.FC<AssetLabelModalProps> = ({
  isOpen,
  onClose,
  asset,
  organization
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<'png' | 'jpeg' | null>(null);

  useEffect(() => {
    if (asset && isOpen) {
      const qrPayload = JSON.stringify({
        org: organization?.code || 'INV',
        code: asset.itemCode,
        name: asset.name,
        dana: asset.fundingSource || '-'
      });

      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0B1930',
          light: '#FFFFFF'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
    }
  }, [asset, organization, isOpen]);

  if (!asset) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFullLabel = async (format: 'png' | 'jpeg') => {
    setIsDownloading(format);
    try {
      await downloadAssetLabelImage(
        asset,
        organization?.name || 'SMK NW ANJANI',
        organization?.code || 'INV',
        format
      );
    } catch (err) {
      console.error('Failed to download label image:', err);
      alert('Gagal mengunduh gambar label. Silakan coba lagi.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadRawQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${asset.itemCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Label & Barcode Aset (5 × 3 cm)"
      subtitle={`Ukuran Standar: Lebar 5 cm × Tinggi 3 cm untuk ${asset.itemCode}`}
      maxWidth="md"
    >
      <div className="flex flex-col items-center">
        {/* Dimension & Format Badge */}
        <div className="w-full mb-3 flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Format Standar Stiker: <strong>Lebar 5 cm × Tinggi 3 cm</strong> (50 × 30 mm)
          </span>
          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-200 dark:border-slate-700">
            Rasio 5:3
          </span>
        </div>

        {/* Printable & Preview Label Card Matching Mockup with Enlarged Readable Fonts */}
        <div 
          id="printable-asset-label" 
          className="w-full aspect-[5/3] bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-900 font-sans flex flex-col justify-between"
        >
          {/* Label Header */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 leading-none">
                  PROPERTI / ASET
                </p>
                <h4 className="text-base sm:text-lg font-black text-[#142B4A] uppercase tracking-tight leading-tight mt-1">
                  {organization?.name || 'SMK NW ANJANI'}
                </h4>
              </div>
              <span className="text-[11px] font-bold bg-slate-50 text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 shrink-0">
                {asset.type === 'fixed_asset' ? 'ASET TETAP' : 'HABIS PAKAI'}
              </span>
            </div>

            {/* Label Content */}
            <div className="flex items-start gap-4">
              {/* QR Code */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl p-1 shadow-2xs">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <QrIcon className="w-10 h-10 text-slate-400 animate-pulse" />
                )}
              </div>

              {/* Asset Data with Enlarged Text for Easy Reading */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">KODE ASET:</span>
                  <p className="font-mono font-black text-base sm:text-lg text-[#142B4A] leading-tight break-all">
                    {asset.itemCode}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">NAMA BARANG:</span>
                  <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                    {asset.name}
                  </p>
                </div>

                <div className="pt-0.5 space-y-1 text-xs text-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-semibold">
                      <span className="text-slate-500 font-normal">Merek:</span> {asset.brand || '-'}
                    </span>
                    <span className="font-semibold">
                      <span className="text-slate-500 font-normal">Sumber Dana:</span> {asset.fundingSource || 'Operasional'}
                    </span>
                  </div>
                  <div className="truncate font-semibold">
                    <span className="text-slate-500 font-normal">Lokasi:</span> {asset.locationName || '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashed Separator & Footer */}
          <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span>DILARANG MELEPAS / MERUSAK LABEL INI</span>
            <span>TGL: {asset.purchaseDate || new Date().toISOString().substring(0, 10)}</span>
          </div>
        </div>

        {/* Action Buttons: Download as PNG/JPG or Print */}
        <div className="space-y-2.5 w-full mt-5 no-print">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={Boolean(isDownloading)}
              onClick={() => handleDownloadFullLabel('png')}
              className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <FileImage className="w-4 h-4 text-blue-500" />
              <span>{isDownloading === 'png' ? 'Membuat PNG...' : 'Unduh Gambar PNG (5×3 cm)'}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(isDownloading)}
              onClick={() => handleDownloadFullLabel('jpeg')}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{isDownloading === 'jpeg' ? 'Membuat JPG...' : 'Unduh Gambar JPG (5×3 cm)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              Cetak Label Stiker
            </button>

            <button
              type="button"
              onClick={handleDownloadRawQR}
              title="Unduh file gambar QR Code kotak saja"
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
            >
              <QrIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>QR Saja</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
