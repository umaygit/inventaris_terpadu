export type UserRole = 'super_admin' | 'admin' | 'petugas' | 'kepala' | 'auditor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currentOrgId?: string;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: string; // 'Sekolah / Madrasah' | 'Perusahaan' | 'Lembaga / Yayasan' | 'Pemerintahan' | 'Lainnya'
  address: string;
  phone: string;
  email: string;
  ownerUid: string;
  createdAt: string;
}

export interface OrgMember {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'suspended';
  addedAt: string;
  password?: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  building: string;
  floor: string;
  roomName: string;
  code: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface PIC {
  id: string;
  name: string;
  employeeId?: string; // NIP / NIK
  department?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export type AssetCondition = 'good' | 'lightly_damaged' | 'heavily_damaged';
export type AssetStatus = 'available' | 'in_use' | 'borrowed' | 'under_maintenance' | 'disposed';
export type AssetType = 'fixed_asset' | 'consumable';

export interface Asset {
  id: string;
  itemCode: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  barcode?: string;
  type: AssetType;
  unit: string; // 'unit', 'buah', 'rim', 'box', 'set', etc.
  quantity: number;
  availableQuantity: number;
  purchasePrice: number;
  totalValue: number;
  purchaseDate: string;
  fundingSource?: string; // APBD, BOS, Yayasan, Hibah, Mandiri
  invoiceNumber?: string;
  condition: AssetCondition;
  status: AssetStatus;
  locationId: string;
  locationName?: string;
  picId?: string;
  picName?: string;
  supplierId?: string;
  supplierName?: string;
  warrantyExpiry?: string;
  photoUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'in' | 'out' | 'adjustment';
export type TransactionStatus = 'approved' | 'pending' | 'rejected';

export interface StockTransaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  date: string;
  source?: string; // Pembelian, Hibah, Donasi, Bantuan
  supplierId?: string;
  supplierName?: string;
  recipient?: string;
  reason?: string;
  assetId: string;
  assetName: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  locationId?: string;
  locationName?: string;
  notes?: string;
  status: TransactionStatus;
  createdBy: string;
  createdAt: string;
}

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface Loan {
  id: string;
  loanNumber: string;
  borrowerName: string;
  department?: string;
  contact?: string;
  assetId: string;
  assetName: string;
  quantity: number;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  conditionOnBorrow: string;
  conditionOnReturn?: string;
  handedBy?: string;
  receivedBy?: string;
  status: LoanStatus;
  notes?: string;
  createdAt: string;
}

export type TransferStatus = 'completed' | 'pending' | 'rejected';

export interface Transfer {
  id: string;
  transferNumber: string;
  assetId: string;
  assetName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  targetLocationId: string;
  targetLocationName: string;
  oldPicId?: string;
  oldPicName?: string;
  newPicId?: string;
  newPicName?: string;
  date: string;
  reason: string;
  status: TransferStatus;
  createdBy: string;
  createdAt: string;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus = 'reported' | 'in_progress' | 'waiting_parts' | 'completed' | 'unrepairable';

export interface Maintenance {
  id: string;
  ticketNumber: string;
  assetId: string;
  assetName: string;
  maintenanceType: 'preventive' | 'corrective';
  issueDescription: string;
  priority: MaintenancePriority;
  reportedDate: string;
  technicianVendor?: string;
  estimatedCost: number;
  actualCost: number;
  startDate?: string;
  completionDate?: string;
  status: MaintenanceStatus;
  notes?: string;
  createdAt: string;
}

export interface StocktakeItem {
  assetId: string;
  itemCode: string;
  name: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  condition: AssetCondition;
  notes?: string;
  status: 'matched' | 'discrepancy' | 'missing' | 'damaged';
}

export interface Stocktake {
  id: string;
  scheduleNumber: string;
  title: string;
  locationId?: string;
  locationName?: string;
  categoryId?: string;
  categoryName?: string;
  status: 'draft' | 'in_progress' | 'completed';
  date: string;
  items: StocktakeItem[];
  notes?: string;
  conductedBy: string;
  approvedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  performedBy: string;
  userEmail: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'critical' | 'success';
  read: boolean;
  link?: string;
  createdAt: string;
}
