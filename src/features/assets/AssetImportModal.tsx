import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Asset, Category, Location } from '../../types';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBatch: (assets: Partial<Asset>[]) => Promise<void>;
  categories: Category[];
  locations: Location[];
}

export const AssetImportModal: React.FC<AssetImportModalProps> = ({
  isOpen,
  onClose,
  onImportBatch,
  categories,
  locations
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleTemplate = `Kode Inventaris,Nama Barang,Kategori,Merek,Model,Nomor Seri,Tipe (fixed/consumable),Satuan,Kuantitas,Harga Satuan,Kondisi (good/lightly_damaged/heavily_damaged)
INV-ELK-2026-101,Monitor LED 24 Inch,Elektronik,LG,24MP400,LG24-9981,fixed_asset,unit,5,1850000,good
INV-ATK-2026-102,Spidol Whiteboard Hitam,ATK,Snowman,BG-12,-,consumable,lusin,10,85000,good`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_inventaris.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    setErrorMsg(null);
    try {
      const lines = text.trim().split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setErrorMsg('Data CSV harus memiliki baris judul kolom dan minimal satu baris data.');
        setParsedRows([]);
        return;
      }

      const rows: any[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          rows.push({
            itemCode: cols[0],
            name: cols[1],
            categoryName: cols[2] || 'Umum',
            brand: cols[3] || '',
            model: cols[4] || '',
            serialNumber: cols[5] || '',
            type: cols[6] === 'consumable' ? 'consumable' : 'fixed_asset',
            unit: cols[7] || 'unit',
            quantity: parseInt(cols[8]) || 1,
            purchasePrice: parseInt(cols[9]) || 0,
            condition: (cols[10] === 'lightly_damaged' || cols[10] === 'heavily_damaged') ? cols[10] : 'good'
          });
        }
      }

      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg('Gagal memproses format CSV: ' + err.message);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Map rows with default categories & locations if matching
      const defaultCat = categories[0];
      const defaultLoc = locations[0];

      const assetsToCreate: Partial<Asset>[] = parsedRows.map(r => {
        const matchedCat = categories.find(c => c.name.toLowerCase().includes(r.categoryName.toLowerCase()) || c.code.toLowerCase() === r.categoryName.toLowerCase());
        return {
          itemCode: r.itemCode,
          name: r.name,
          categoryId: matchedCat?.id || defaultCat?.id || 'cat_default',
          categoryName: matchedCat?.name || r.categoryName || 'Umum',
          brand: r.brand,
          model: r.model,
          serialNumber: r.serialNumber,
          barcode: r.itemCode,
          type: r.type,
          unit: r.unit,
          quantity: r.quantity,
          availableQuantity: r.quantity,
          purchasePrice: r.purchasePrice,
          totalValue: r.quantity * r.purchasePrice,
          purchaseDate: new Date().toISOString().substring(0, 10),
          condition: r.condition,
          status: 'available',
          locationId: defaultLoc?.id || '',
          locationName: defaultLoc ? `${defaultLoc.building} - ${defaultLoc.roomName}` : '-',
          notes: 'Diimpor massal dari CSV'
        };
      });

      await onImportBatch(assetsToCreate);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengimpor data ke Firestore.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Data Inventaris dari CSV"
      subtitle="Unggah berkas spreadsheet CSV atau tempel teks data barang untuk registrasi massal"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Template helper banner */}
        <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
          <div>
            <p className="font-bold text-[#142B4A]">Format Template Kolom CSV Standar</p>
            <p className="text-slate-500 text-[11px]">Gunakan template CSV agar struktur data sesuai dengan sistem.</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-semibold hover:bg-blue-100/50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Template
          </button>
        </div>

        {/* Upload box */}
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">
              Pilih file CSV dari komputer Anda
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Format .csv dengan pemisah koma
            </p>
          </label>
        </div>

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Pratinjau Data ({parsedRows.length} Baris Terbaca)
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Siap Disimpan
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Kode</th>
                    <th className="p-2">Nama Barang</th>
                    <th className="p-2">Kategori</th>
                    <th className="p-2">Jumlah</th>
                    <th className="p-2">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-blue-700">{row.itemCode}</td>
                      <td className="p-2 font-medium text-slate-800">{row.name}</td>
                      <td className="p-2 text-slate-600">{row.categoryName}</td>
                      <td className="p-2 font-bold">{row.quantity} {row.unit}</td>
                      <td className="p-2 font-mono">Rp {row.purchasePrice.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className="px-5 py-2 bg-[#142B4A] hover:bg-[#0B1930] text-white text-xs font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-300" />
            {isProcessing ? 'Mengimpor ke Firestore...' : `Impor ${parsedRows.length} Aset`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
