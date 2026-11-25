import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Asset, Category, Location, PIC, Supplier, AssetCondition, AssetStatus, AssetType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Save, Upload, AlertCircle } from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => Promise<void>;
  editingAsset: Asset | null;
  categories: Category[];
  locations: Location[];
  pics: PIC[];
  suppliers: Supplier[];
  existingAssetsCount: number;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAsset,
  categories,
  locations,
  pics,
  suppliers,
  existingAssetsCount
}) => {
  const { currentOrg } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [type, setType] = useState<AssetType>('fixed_asset');
  const [unit, setUnit] = useState('unit');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [fundingSource, setFundingSource] = useState('Anggaran Operasional');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('good');
  const [status, setStatus] = useState<AssetStatus>('available');
  const [locationId, setLocationId] = useState('');
  const [picId, setPicId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Auto generate unique item code if adding new
  const generateNewCode = (catCode = 'AST') => {
    const year = new Date().getFullYear();
    const seq = String(existingAssetsCount + 1).padStart(3, '0');
    return `INV-${catCode.toUpperCase()}-${year}-${seq}`;
  };

  useEffect(() => {
    if (editingAsset) {
      setItemCode(editingAsset.itemCode);
      setName(editingAsset.name);
      setDescription(editingAsset.description || '');
      setCategoryId(editingAsset.categoryId || '');
      setBrand(editingAsset.brand || '');
      setModel(editingAsset.model || '');
      setSerialNumber(editingAsset.serialNumber || '');
      setType(editingAsset.type || 'fixed_asset');
      setUnit(editingAsset.unit || 'unit');
      setQuantity(editingAsset.quantity || 1);
      setPurchasePrice(editingAsset.purchasePrice || 0);
      setPurchaseDate(editingAsset.purchaseDate || new Date().toISOString().substring(0, 10));
      setFundingSource(editingAsset.fundingSource || 'Anggaran Operasional');
      setInvoiceNumber(editingAsset.invoiceNumber || '');
      setCondition(editingAsset.condition || 'good');
      setStatus(editingAsset.status || 'available');
      setLocationId(editingAsset.locationId || '');
      setPicId(editingAsset.picId || '');
      setSupplierId(editingAsset.supplierId || '');
      setWarrantyExpiry(editingAsset.warrantyExpiry || '');
      setPhotoUrl(editingAsset.photoUrl || '');
      setNotes(editingAsset.notes || '');
    } else {
      // Default initial state
      const defaultCat = categories[0];
      const initialCatCode = defaultCat ? defaultCat.code : 'AST';
      setItemCode(generateNewCode(initialCatCode));
      setName('');
      setDescription('');
      setCategoryId(defaultCat ? defaultCat.id : '');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setType('fixed_asset');
      setUnit('unit');
      setQuantity(1);
      setPurchasePrice(0);
      setPurchaseDate(new Date().toISOString().substring(0, 10));
      setFundingSource('Anggaran Operasional');
      setInvoiceNumber('');
      setCondition('good');
      setStatus('available');
      setLocationId(locations[0]?.id || '');
      setPicId(pics[0]?.id || '');
      setSupplierId(suppliers[0]?.id || '');
      setWarrantyExpiry('');
      setPhotoUrl('');
      setNotes('');
    }
    setErrorMsg(null);
  }, [editingAsset, isOpen]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    setCategoryId(newCatId);
    if (!editingAsset) {
      const selectedCat = categories.find(c => c.id === newCatId);
      setItemCode(generateNewCode(selectedCat?.code || 'AST'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!itemCode.trim()) {
      setErrorMsg('Kode inventaris wajib diisi.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Nama barang wajib diisi.');
      return;
    }
    if (quantity < 1) {
      setErrorMsg('Kuantitas minimal 1 unit.');
      return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);
    const selectedLocation = locations.find(l => l.id === locationId);
    const selectedPIC = pics.find(p => p.id === picId);
    const selectedSupplier = suppliers.find(s => s.id === supplierId);

    const assetPayload: Partial<Asset> = {
      itemCode: itemCode.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      categoryId,
      categoryName: selectedCategory?.name || 'Umum',
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      barcode: itemCode.trim().toUpperCase(),
      type,
      unit: unit.trim() || 'unit',
      quantity: Number(quantity),
      availableQuantity: editingAsset ? editingAsset.availableQuantity : Number(quantity),
      purchasePrice: Number(purchasePrice) || 0,
      totalValue: (Number(quantity) || 1) * (Number(purchasePrice) || 0),
      purchaseDate,
      fundingSource,
      invoiceNumber: invoiceNumber.trim(),
      condition,
      status,
      locationId,
      locationName: selectedLocation ? `${selectedLocation.building} - ${selectedLocation.roomName}` : '-',
      picId,
      picName: selectedPIC?.name || '-',
      supplierId,
      supplierName: selectedSupplier?.name || '-',
      warrantyExpiry,
      photoUrl,
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onSave(assetPayload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAsset ? 'Edit Data Inventaris' : 'Tambah Barang Inventaris Baru'}
      subtitle={editingAsset ? `Perbarui informasi aset ${editingAsset.itemCode}` : 'Registrasi aset fisik atau barang habis pakai ke database'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Kode & Nama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Inventaris *</label>
              {!editingAsset && (
                <button
                  type="button"
                  onClick={() => {
                    const c = categories.find(cat => cat.id === categoryId);
                    setItemCode(generateNewCode(c?.code || 'AST'));
                  }}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  title="Generate nomor otomatis"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="INV-ELK-2026-001"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-[#142B4A] dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Barang / Aset *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Laptop Dell Latitude 5420 i7 16GB"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>
        </div>

        {/* Section 2: Kategori & Tipe */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Barang *</label>
            <select
              value={categoryId}
              onChange={handleCategoryChange}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Aset *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="fixed_asset">Aset Tetap (Capital Asset)</option>
              <option value="consumable">Barang Habis Pakai (Consumable)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Satuan</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="unit / buah / set / rim"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>
        </div>

        {/* Section 3: Brand, Model, Serial Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Merek / Brand</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Contoh: Dell / Epson / Cisco"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Model / Tipe</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Contoh: EcoTank L15150"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Seri (Serial No.)</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Contoh: SN-8823901"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>
        </div>

        {/* Section 4: Kuantitas, Harga Beli, Tanggal Pembelian */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jumlah Unit *</label>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Harga Beli Satuan (Rp)</label>
            <input
              type="number"
              min={0}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Perolehan</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>
        </div>

        {/* Section 5: Kondisi & Status Operasional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kondisi Fisik *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="good">Baik (Layak Operasional)</option>
              <option value="lightly_damaged">Rusak Ringan (Bisa Digunakan Sebagian)</option>
              <option value="heavily_damaged">Rusak Berat (Tidak Dapat Digunakan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Ketersediaan</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="available">Tersedia (Ready di Tempat)</option>
              <option value="in_use">Sedang Digunakan</option>
              <option value="borrowed">Sedang Dipinjam</option>
              <option value="under_maintenance">Sedang Dalam Perawatan</option>
              <option value="disposed">Diarsipkan / Dihapuskan</option>
            </select>
          </div>
        </div>

        {/* Section 6: Lokasi, Penanggung Jawab, Pemasok */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ruangan / Lokasi</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="">-- Pilih Lokasi --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.building} - {l.roomName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Penanggung Jawab (PIC)</label>
            <select
              value={picId}
              onChange={(e) => setPicId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="">-- Pilih Penanggung Jawab --</option>
              {pics.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.department || 'Staf'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vendor / Pemasok</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            >
              <option value="">-- Pilih Pemasok --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 7: Sumber Dana, Garansi, Foto URL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sumber Dana</label>
            <input
              type="text"
              value={fundingSource}
              onChange={(e) => setFundingSource(e.target.value)}
              placeholder="BOS / Yayasan / APBD / Hibah"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Masa Garansi Berakhir</label>
            <input
              type="date"
              value={warrantyExpiry}
              onChange={(e) => setWarrantyExpiry(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Foto Aset (Opsional)</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan & Spesifikasi</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Deskripsi kelengkapan, aksesoris, atau nomor faktur pembelian..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3977D5]"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#142B4A] dark:bg-[#3977D5] hover:bg-[#0B1930] dark:hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-blue-300" />
            {isSubmitting ? 'Menyimpan ke Firestore...' : editingAsset ? 'Perbarui Data Aset' : 'Simpan Barang Baru'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
