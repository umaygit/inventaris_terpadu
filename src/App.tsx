import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './features/auth/AuthView';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ApkDownloadModal } from './components/common/ApkDownloadModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { AssetListView } from './features/assets/AssetListView';
import { AssetFormModal } from './features/assets/AssetFormModal';
import { AssetDetailModal } from './features/assets/AssetDetailModal';
import { AssetLabelModal } from './components/common/AssetLabelModal';
import { AssetImportModal } from './features/assets/AssetImportModal';
import { QRScannerModal } from './components/common/QRScannerModal';
import { StockTransactionView } from './features/stock/StockTransactionView';
import { LoanManagementView } from './features/loans/LoanManagementView';
import { AssetTransferView } from './features/transfers/AssetTransferView';
import { MaintenanceView } from './features/maintenance/MaintenanceView';
import { StocktakeView } from './features/stocktake/StocktakeView';
import { MasterDataView } from './features/master/MasterDataView';
import { ReportView } from './features/reports/ReportView';
import { UserManagementView } from './features/users/UserManagementView';
import { OrgProfileView } from './features/organization/OrgProfileView';
import { AuditLogView } from './features/audit/AuditLogView';
import { NotificationView } from './features/notifications/NotificationView';
import { LoginSuccessModal } from './components/common/LoginSuccessModal';

import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  handleFirestoreError,
  OperationType 
} from './services/firebase';

import { 
  Asset, 
  StockTransaction, 
  Loan, 
  Transfer, 
  Maintenance, 
  Stocktake, 
  Category, 
  Location, 
  Supplier, 
  PIC, 
  AuditLog, 
  NotificationItem,
  StocktakeItem
} from './types';

function MainApp() {
  const { 
    currentUser, 
    currentOrg, 
    loading, 
    userRole, 
    logAuditAction,
    loginSuccessPayload,
    dismissLoginAnimation
  } = useAuth();
  
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live Data States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pics, setPics] = useState<PIC[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [labelAsset, setLabelAsset] = useState<Asset | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);

  // Preselected Asset for transfers or maintenance
  const [preselectedAsset, setPreselectedAsset] = useState<Asset | null>(null);

  // Search state passed to Asset list
  const [searchQuery, setSearchQuery] = useState('');

  // Register PWA Service Worker & capture install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('Service Worker registration skipped:', err);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Firestore Live Listeners for Current Organization
  useEffect(() => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;

    // 1. Assets
    const unsubAssets = onSnapshot(collection(db, 'organizations', orgId, 'assets'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
      setAssets(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/assets`));

    // 2. Transactions
    const unsubTx = onSnapshot(collection(db, 'organizations', orgId, 'transactions'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction));
      // Sort newest first
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setTransactions(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/transactions`));

    // 3. Loans
    const unsubLoans = onSnapshot(collection(db, 'organizations', orgId, 'loans'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
      list.sort((a, b) => (b.loanDate || '').localeCompare(a.loanDate || ''));
      setLoans(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/loans`));

    // 4. Transfers
    const unsubTransfers = onSnapshot(collection(db, 'organizations', orgId, 'transfers'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setTransfers(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/transfers`));

    // 5. Maintenance
    const unsubMaint = onSnapshot(collection(db, 'organizations', orgId, 'maintenance'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Maintenance));
      list.sort((a, b) => (b.reportedDate || '').localeCompare(a.reportedDate || ''));
      setMaintenance(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/maintenance`));

    // 6. Stocktakes
    const unsubStocktakes = onSnapshot(collection(db, 'organizations', orgId, 'stocktakes'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Stocktake));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setStocktakes(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/stocktakes`));

    // 7. Categories
    const unsubCats = onSnapshot(collection(db, 'organizations', orgId, 'categories'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/categories`));

    // 8. Locations
    const unsubLocs = onSnapshot(collection(db, 'organizations', orgId, 'locations'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
      setLocations(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/locations`));

    // 9. Suppliers
    const unsubSups = onSnapshot(collection(db, 'organizations', orgId, 'suppliers'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
      setSuppliers(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/suppliers`));

    // 10. PICs
    const unsubPics = onSnapshot(collection(db, 'organizations', orgId, 'pics'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PIC));
      setPics(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/pics`));

    // 11. Audit Logs
    const unsubAudit = onSnapshot(collection(db, 'organizations', orgId, 'auditLogs'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setAuditLogs(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `organizations/${orgId}/auditLogs`));

    return () => {
      unsubAssets();
      unsubTx();
      unsubLoans();
      unsubTransfers();
      unsubMaint();
      unsubStocktakes();
      unsubCats();
      unsubLocs();
      unsubSups();
      unsubPics();
      unsubAudit();
    };
  }, [currentOrg]);

  // Compute Notifications dynamically from system state
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];
    const now = new Date();

    // 1. Overdue loans
    loans.forEach(loan => {
      if (loan.status !== 'returned') {
        const dueDate = new Date(loan.dueDate);
        if (dueDate < now) {
          list.push({
            id: 'notif_loan_overdue_' + loan.id,
            title: 'Peminjaman Telah Melewati Jatuh Tempo',
            message: `Aset "${loan.assetName}" yang dipinjam oleh ${loan.borrowerName} telah terlambat dikembalikan sejak ${loan.dueDate}.`,
            type: 'critical',
            read: false,
            link: 'loans',
            createdAt: loan.createdAt
          });
        }
      }
    });

    // 2. Low stock warning for consumables (<= 5 units)
    assets.forEach(asset => {
      if (asset.type === 'consumable' && asset.quantity <= 5) {
        list.push({
          id: 'notif_low_stock_' + asset.id,
          title: 'Peringatan Stok Menipis',
          message: `Stok barang habis pakai "${asset.name}" tersisa ${asset.quantity} ${asset.unit}. Segera buat rencana pengadaan baru.`,
          type: 'warning',
          read: false,
          link: 'assets',
          createdAt: asset.updatedAt || asset.createdAt
        });
      }
    });

    // 3. Urgent maintenance tickets
    maintenance.forEach(m => {
      if (m.priority === 'urgent' && m.status !== 'completed' && m.status !== 'unrepairable') {
        list.push({
          id: 'notif_maint_' + m.id,
          title: 'Perbaikan Prioritas Darurat',
          message: `Aset "${m.assetName}" mengalami kendala mendesak: "${m.issueDescription}". Memerlukan tindakan segera.`,
          type: 'critical',
          read: false,
          link: 'maintenance',
          createdAt: m.createdAt
        });
      }
    });

    return list;
  }, [loans, assets, maintenance]);

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const activeNotifications = notifications.filter(n => !dismissedNotifIds.includes(n.id));

  // Handler: Save Asset (Create or Update)
  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    if (!currentOrg || !currentUser) return;
    const orgId = currentOrg.id;

    if (editingAsset) {
      // Update existing
      const assetRef = doc(db, 'organizations', orgId, 'assets', editingAsset.id);
      await updateDoc(assetRef, {
        ...assetData,
        updatedAt: new Date().toISOString()
      });
      await logAuditAction('UPDATE_ASSET', 'ASSET', editingAsset.id, `Memperbarui data aset "${assetData.name}" (${editingAsset.itemCode})`);
    } else {
      // Create new
      const assetId = 'ast_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const newAsset: Asset = {
        ...assetData as Asset,
        id: assetId,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'organizations', orgId, 'assets', assetId), newAsset);
      await logAuditAction('CREATE_ASSET', 'ASSET', assetId, `Mendaftarkan aset baru "${newAsset.name}" dengan kode ${newAsset.itemCode}`);
    }
  };

  // Handler: Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!currentOrg) return;
    const target = assets.find(a => a.id === assetId);
    await deleteDoc(doc(db, 'organizations', currentOrg.id, 'assets', assetId));
    await logAuditAction('DELETE_ASSET', 'ASSET', assetId, `Menghapus aset "${target?.name || assetId}" dari sistem`);
  };

  // Handler: Batch Import Assets from CSV
  const handleImportBatch = async (newAssets: Partial<Asset>[]) => {
    if (!currentOrg || !currentUser) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    newAssets.forEach(a => {
      const assetId = 'ast_' + Math.random().toString(36).substring(2, 10);
      const fullAsset: Asset = {
        ...a as Asset,
        id: assetId,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(doc(db, 'organizations', orgId, 'assets', assetId), fullAsset);
    });

    await batch.commit();
    await logAuditAction('IMPORT_ASSETS_CSV', 'ASSET', orgId, `Mengimpor massal ${newAssets.length} barang dari file CSV`);
  };

  // Handler: Record Stock In / Out Transaction (Atomic quantity updates)
  const handleRecordTransaction = async (txData: Partial<StockTransaction>) => {
    if (!currentOrg || !currentUser) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    const txId = 'tx_' + Date.now().toString(36);
    const fullTx: StockTransaction = {
      ...txData as StockTransaction,
      id: txId,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'organizations', orgId, 'transactions', txId), fullTx);

    // Update asset stock balance atomically
    const assetRef = doc(db, 'organizations', orgId, 'assets', fullTx.assetId);
    const targetAsset = assets.find(a => a.id === fullTx.assetId);
    if (targetAsset) {
      const delta = fullTx.type === 'in' ? fullTx.quantity : -fullTx.quantity;
      const newTotalQty = Math.max(0, targetAsset.quantity + delta);
      const newAvailableQty = Math.max(0, (targetAsset.availableQuantity ?? targetAsset.quantity) + delta);
      
      batch.update(assetRef, {
        quantity: newTotalQty,
        availableQuantity: newAvailableQty,
        totalValue: newTotalQty * (targetAsset.purchasePrice || 0),
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    await logAuditAction('RECORD_TRANSACTION', 'TRANSACTION', txId, `Mencatat mutasi ${fullTx.type.toUpperCase()}: ${fullTx.quantity} unit ${fullTx.assetName}`);
  };

  // Handler: Delete Stock Transaction (Barang Masuk / Barang Keluar)
  const handleDeleteTransaction = async (tx: StockTransaction, revertStock: boolean = true) => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    batch.delete(doc(db, 'organizations', orgId, 'transactions', tx.id));

    if (revertStock) {
      const targetAsset = assets.find(a => a.id === tx.assetId);
      if (targetAsset) {
        // If tx.type === 'in', undoing it means subtracting quantity
        // If tx.type === 'out', undoing it means restoring quantity
        const delta = tx.type === 'in' ? -tx.quantity : tx.quantity;
        const newTotalQty = Math.max(0, targetAsset.quantity + delta);
        const curAvail = targetAsset.availableQuantity ?? targetAsset.quantity;
        const newAvailableQty = Math.max(0, curAvail + delta);

        batch.update(doc(db, 'organizations', orgId, 'assets', targetAsset.id), {
          quantity: newTotalQty,
          availableQuantity: newAvailableQty,
          totalValue: newTotalQty * (targetAsset.purchasePrice || 0),
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();
    await logAuditAction(
      'DELETE_TRANSACTION', 
      'TRANSACTION', 
      tx.id, 
      `Menghapus data mutasi ${tx.type === 'in' ? 'Barang Masuk' : 'Barang Keluar'} ${tx.transactionNumber} (${tx.assetName})`
    );
  };

  // Handler: Create Loan (decrements available quantity)
  const handleCreateLoan = async (loanData: Partial<Loan>) => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    const loanId = 'loan_' + Date.now().toString(36);
    const fullLoan: Loan = {
      ...loanData as Loan,
      id: loanId,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'organizations', orgId, 'loans', loanId), fullLoan);

    // Decrement available quantity on asset
    const targetAsset = assets.find(a => a.id === fullLoan.assetId);
    if (targetAsset) {
      const currentAvail = targetAsset.availableQuantity ?? targetAsset.quantity;
      batch.update(doc(db, 'organizations', orgId, 'assets', targetAsset.id), {
        availableQuantity: Math.max(0, currentAvail - fullLoan.quantity),
        status: (currentAvail - fullLoan.quantity <= 0) ? 'borrowed' : targetAsset.status,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    await logAuditAction('CREATE_LOAN', 'LOAN', loanId, `Peminjaman ${fullLoan.quantity} unit ${fullLoan.assetName} oleh ${fullLoan.borrowerName}`);
  };

  // Handler: Return Loan (restores available quantity)
  const handleReturnLoan = async (loanId: string, assetId: string, quantity: number, conditionOnReturn: string, returnNotes: string) => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    batch.update(doc(db, 'organizations', orgId, 'loans', loanId), {
      status: 'returned',
      returnDate: new Date().toISOString().substring(0, 10),
      conditionOnReturn,
      notes: returnNotes
    });

    const targetAsset = assets.find(a => a.id === assetId);
    if (targetAsset) {
      const currentAvail = targetAsset.availableQuantity ?? targetAsset.quantity;
      batch.update(doc(db, 'organizations', orgId, 'assets', targetAsset.id), {
        availableQuantity: Math.min(targetAsset.quantity, currentAvail + quantity),
        status: targetAsset.status === 'borrowed' ? 'available' : targetAsset.status,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    await logAuditAction('RETURN_LOAN', 'LOAN', loanId, `Pengembalian aset (${quantity} unit) dengan kondisi: ${conditionOnReturn}`);
  };

  // Handler: Delete Loan Record
  const handleDeleteLoan = async (loan: Loan) => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    batch.delete(doc(db, 'organizations', orgId, 'loans', loan.id));

    // If loan is not returned yet, restore availableQuantity to asset
    if (loan.status !== 'returned') {
      const targetAsset = assets.find(a => a.id === loan.assetId);
      if (targetAsset) {
        const curAvail = targetAsset.availableQuantity ?? targetAsset.quantity;
        const newAvail = Math.min(targetAsset.quantity, curAvail + loan.quantity);
        batch.update(doc(db, 'organizations', orgId, 'assets', targetAsset.id), {
          availableQuantity: newAvail,
          status: newAvail > 0 && targetAsset.status === 'borrowed' ? 'available' : targetAsset.status,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();
    await logAuditAction('DELETE_LOAN', 'LOAN', loan.id, `Menghapus data riwayat peminjaman ${loan.loanNumber} (${loan.assetName})`);
  };

  // Handler: Execute Asset Transfer (updates asset room and PIC)
  const handleExecuteTransfer = async (transferData: Partial<Transfer>) => {
    if (!currentOrg || !currentUser) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    const trId = 'tr_' + Date.now().toString(36);
    const fullTr: Transfer = {
      ...transferData as Transfer,
      id: trId,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'organizations', orgId, 'transfers', trId), fullTr);

    // Update asset position
    batch.update(doc(db, 'organizations', orgId, 'assets', fullTr.assetId), {
      locationId: fullTr.targetLocationId,
      locationName: fullTr.targetLocationName,
      picId: fullTr.newPicId,
      picName: fullTr.newPicName,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    await logAuditAction('TRANSFER_ASSET', 'TRANSFER', trId, `Mutasi ${fullTr.assetName} ke ${fullTr.targetLocationName}`);
  };

  // Handler: Maintenance Ticket
  const handleCreateMaintenance = async (data: Partial<Maintenance>) => {
    if (!currentOrg) return;
    const mId = 'mt_' + Date.now().toString(36);
    const fullMaint: Maintenance = {
      ...data as Maintenance,
      id: mId,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'organizations', currentOrg.id, 'maintenance', mId), fullMaint);

    // Mark asset under maintenance
    await updateDoc(doc(db, 'organizations', currentOrg.id, 'assets', fullMaint.assetId), {
      status: 'under_maintenance',
      updatedAt: new Date().toISOString()
    });
    await logAuditAction('CREATE_MAINTENANCE', 'MAINTENANCE', mId, `Membuka tiket servis ${fullMaint.ticketNumber} untuk ${fullMaint.assetName}`);
  };

  const handleUpdateMaintenanceStatus = async (id: string, newStatus: any, actualCost: number, notes?: string) => {
    if (!currentOrg) return;
    const m = maintenance.find(item => item.id === id);
    await updateDoc(doc(db, 'organizations', currentOrg.id, 'maintenance', id), {
      status: newStatus,
      actualCost: Number(actualCost) || 0,
      notes: notes || m?.notes || '',
      completionDate: newStatus === 'completed' ? new Date().toISOString().substring(0, 10) : undefined
    });

    // If completed, return asset to available
    if (m && newStatus === 'completed') {
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'assets', m.assetId), {
        status: 'available',
        condition: 'good',
        updatedAt: new Date().toISOString()
      });
    } else if (m && newStatus === 'unrepairable') {
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'assets', m.assetId), {
        status: 'disposed',
        condition: 'heavily_damaged',
        updatedAt: new Date().toISOString()
      });
    }

    await logAuditAction('UPDATE_MAINTENANCE', 'MAINTENANCE', id, `Memperbarui status tiket perbaikan menjadi ${newStatus}`);
  };

  // Handler: Delete Maintenance Ticket
  const handleDeleteMaintenance = async (id: string) => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    const target = maintenance.find(m => m.id === id);

    await deleteDoc(doc(db, 'organizations', orgId, 'maintenance', id));

    // If ticket was active and set asset to under_maintenance, restore asset to available if no other active repairs
    if (target && target.status !== 'completed' && target.status !== 'unrepairable') {
      const remainingActive = maintenance.filter(m => m.id !== id && m.assetId === target.assetId && m.status !== 'completed' && m.status !== 'unrepairable');
      if (remainingActive.length === 0) {
        await updateDoc(doc(db, 'organizations', orgId, 'assets', target.assetId), {
          status: 'available',
          updatedAt: new Date().toISOString()
        });
      }
    }

    await logAuditAction('DELETE_MAINTENANCE', 'MAINTENANCE', id, `Menghapus data tiket perbaikan ${target?.ticketNumber || id}`);
  };

  // Handler: Stocktake Session
  const handleCreateStocktake = async (data: Partial<Stocktake>) => {
    if (!currentOrg) return;
    const stId = 'st_' + Date.now().toString(36);
    const fullSt: Stocktake = {
      ...data as Stocktake,
      id: stId,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'organizations', currentOrg.id, 'stocktakes', stId), fullSt);
    await logAuditAction('CREATE_STOCKTAKE', 'STOCKTAKE', stId, `Menjadwalkan audit fisik stock opname "${fullSt.title}"`);
  };

  const handleUpdateStocktakeItems = async (id: string, items: StocktakeItem[], isCompleted?: boolean) => {
    if (!currentOrg) return;
    await updateDoc(doc(db, 'organizations', currentOrg.id, 'stocktakes', id), {
      items,
      status: isCompleted ? 'completed' : 'in_progress',
      completedAt: isCompleted ? new Date().toISOString() : undefined
    });
    if (isCompleted) {
      await logAuditAction('COMPLETE_STOCKTAKE', 'STOCKTAKE', id, `Menyelesaikan dan merekonsiliasi hasil audit fisik stock opname`);
    }
  };

  // Handler: Master Categories, Locations, Suppliers, PICs
  const handleSaveCategory = async (data: Partial<Category>) => {
    if (!currentOrg) return;
    const catId = data.id || ('cat_' + Date.now().toString(36));
    await setDoc(doc(db, 'organizations', currentOrg.id, 'categories', catId), {
      ...data,
      id: catId,
      createdAt: data.createdAt || new Date().toISOString()
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!currentOrg) return;
    await deleteDoc(doc(db, 'organizations', currentOrg.id, 'categories', id));
  };

  const handleSaveLocation = async (data: Partial<Location>) => {
    if (!currentOrg) return;
    const locId = data.id || ('loc_' + Date.now().toString(36));
    await setDoc(doc(db, 'organizations', currentOrg.id, 'locations', locId), {
      ...data,
      id: locId,
      createdAt: data.createdAt || new Date().toISOString()
    });
  };

  const handleDeleteLocation = async (id: string) => {
    if (!currentOrg) return;
    await deleteDoc(doc(db, 'organizations', currentOrg.id, 'locations', id));
  };

  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    if (!currentOrg) return;
    const sId = data.id || ('sup_' + Date.now().toString(36));
    await setDoc(doc(db, 'organizations', currentOrg.id, 'suppliers', sId), {
      ...data,
      id: sId,
      createdAt: data.createdAt || new Date().toISOString()
    });
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!currentOrg) return;
    await deleteDoc(doc(db, 'organizations', currentOrg.id, 'suppliers', id));
  };

  const handleSavePIC = async (data: Partial<PIC>) => {
    if (!currentOrg) return;
    const pId = data.id || ('pic_' + Date.now().toString(36));
    await setDoc(doc(db, 'organizations', currentOrg.id, 'pics', pId), {
      ...data,
      id: pId,
      createdAt: data.createdAt || new Date().toISOString()
    });
  };

  const handleDeletePIC = async (id: string) => {
    if (!currentOrg) return;
    await deleteDoc(doc(db, 'organizations', currentOrg.id, 'pics', id));
  };

  // QR Scan Result Handler: Match item code, open detail modal
  const handleQRScanResult = (code: string) => {
    // Try to parse if it's JSON from our generated label
    let searchKey = code.trim();
    try {
      const parsed = JSON.parse(code);
      if (parsed.code) searchKey = String(parsed.code).trim();
      else if (parsed.itemCode) searchKey = String(parsed.itemCode).trim();
    } catch {}

    const matchedAsset = assets.find(a => 
      a.itemCode?.toLowerCase() === searchKey.toLowerCase() ||
      (a.serialNumber && a.serialNumber.toLowerCase() === searchKey.toLowerCase()) ||
      (a.barcode && a.barcode.toLowerCase() === searchKey.toLowerCase())
    );

    if (matchedAsset) {
      setViewingAsset(matchedAsset);
    } else {
      // Filter list and switch to assets tab
      setSearchQuery(searchKey);
      setCurrentTab('assets');
    }
  };

  // Header Global Search Handler
  const handleGlobalSearch = (term: string) => {
    setSearchQuery(term);
    setCurrentTab('assets');
  };

  // Page titles map
  const pageTitles: Record<NavItemKey, string> = {
    'dashboard': 'Dashboard Inventaris & Aset',
    'assets': 'Master Data Inventaris Barang',
    'stock-in': 'Penerimaan Barang Masuk',
    'stock-out': 'Penyaluran Barang Keluar',
    'loans': 'Peminjaman & Pengembalian',
    'transfers': 'Mutasi Lokasi & Ruangan',
    'maintenance': 'Pemeliharaan & Perbaikan',
    'stocktake': 'Stock Opname & Audit Fisik',
    'master': 'Master Klasifikasi & Parameter',
    'reports': 'Laporan Inventaris & Ekspor',
    'notifications': 'Pusat Notifikasi Sistem',
    'users': 'Manajemen Pengguna & Hak Akses',
    'org-profile': 'Profil & Konfigurasi Organisasi',
    'audit': 'Log Audit & Jejak Keamanan'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#070F1E] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-[#142B4A] dark:bg-[#3977D5] flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
          <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
        </div>
        <p className="font-extrabold text-[#142B4A] dark:text-white text-base">Inventaris Terpadu</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Menyiapkan autentikasi dan database Cloud Firestore...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onOpenApkModal={() => setIsApkModalOpen(true)} />;
  }

  return (
    <div className="min-h-screen flex bg-[#F5F7FB] dark:bg-[#070F1E] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Login Success Celebration Animation Modal */}
      {loginSuccessPayload && (
        <LoginSuccessModal
          name={loginSuccessPayload.name}
          role={loginSuccessPayload.role}
          email={loginSuccessPayload.email}
          orgName={loginSuccessPayload.orgName}
          onFinish={dismissLoginAnimation}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        unreadNotifsCount={activeNotifications.length}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          onOpenApkModal={() => setIsApkModalOpen(true)}
          pageTitle={pageTitles[currentTab] || 'Inventaris'}
          notifications={activeNotifications}
          onMarkNotificationRead={(id) => setDismissedNotifIds(prev => [...prev, id])}
          onNavigateToNotifications={() => setCurrentTab('notifications')}
          onGlobalSearch={handleGlobalSearch}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              assets={assets}
              transactions={transactions}
              loans={loans}
              categories={categories}
              auditLogs={auditLogs}
              onNavigateTab={setCurrentTab}
              onOpenAddAsset={() => {
                setEditingAsset(null);
                setIsAssetFormOpen(true);
              }}
              onSelectAsset={(a) => setViewingAsset(a)}
            />
          )}

          {currentTab === 'assets' && (
            <AssetListView
              assets={assets}
              categories={categories}
              locations={locations}
              pics={pics}
              suppliers={suppliers}
              onAddAsset={() => {
                setEditingAsset(null);
                setIsAssetFormOpen(true);
              }}
              onEditAsset={(a) => {
                setEditingAsset(a);
                setIsAssetFormOpen(true);
              }}
              onViewAsset={(a) => setViewingAsset(a)}
              onPrintLabel={(a) => setLabelAsset(a)}
              onDeleteAsset={handleDeleteAsset}
              onOpenImport={() => setIsImportOpen(true)}
              initialSearchQuery={searchQuery}
            />
          )}

          {(currentTab === 'stock-in' || currentTab === 'stock-out') && (
            <StockTransactionView
              transactions={transactions}
              assets={assets}
              suppliers={suppliers}
              locations={locations}
              onRecordTransaction={handleRecordTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              defaultType={currentTab === 'stock-in' ? 'in' : 'out'}
            />
          )}

          {currentTab === 'loans' && (
            <LoanManagementView
              loans={loans}
              assets={assets}
              onCreateLoan={handleCreateLoan}
              onReturnLoan={handleReturnLoan}
              onDeleteLoan={handleDeleteLoan}
            />
          )}

          {currentTab === 'transfers' && (
            <AssetTransferView
              transfers={transfers}
              assets={assets}
              locations={locations}
              pics={pics}
              onExecuteTransfer={handleExecuteTransfer}
              preselectedAsset={preselectedAsset}
            />
          )}

          {currentTab === 'maintenance' && (
            <MaintenanceView
              maintenanceList={maintenance}
              assets={assets}
              onCreateMaintenance={handleCreateMaintenance}
              onUpdateStatus={handleUpdateMaintenanceStatus}
              onDeleteMaintenance={handleDeleteMaintenance}
              preselectedAsset={preselectedAsset}
            />
          )}

          {currentTab === 'stocktake' && (
            <StocktakeView
              stocktakes={stocktakes}
              assets={assets}
              locations={locations}
              categories={categories}
              onCreateStocktake={handleCreateStocktake}
              onUpdateStocktakeItems={handleUpdateStocktakeItems}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
            />
          )}

          {currentTab === 'master' && (
            <MasterDataView
              categories={categories}
              locations={locations}
              suppliers={suppliers}
              pics={pics}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              onSaveLocation={handleSaveLocation}
              onDeleteLocation={handleDeleteLocation}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onSavePIC={handleSavePIC}
              onDeletePIC={handleDeletePIC}
            />
          )}

          {currentTab === 'reports' && (
            <ReportView
              assets={assets}
              transactions={transactions}
              loans={loans}
              transfers={transfers}
              maintenance={maintenance}
              stocktakes={stocktakes}
              categories={categories}
              locations={locations}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationView
              notifications={activeNotifications}
              onMarkRead={(id) => setDismissedNotifIds(prev => [...prev, id])}
              onMarkAllRead={() => setDismissedNotifIds(notifications.map(n => n.id))}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'users' && <UserManagementView />}

          {currentTab === 'org-profile' && <OrgProfileView />}

          {currentTab === 'audit' && <AuditLogView logs={auditLogs} />}
        </main>
      </div>

      {/* Global Modals */}

      {/* 1. Add / Edit Asset Modal */}
      <AssetFormModal
        isOpen={isAssetFormOpen}
        onClose={() => {
          setIsAssetFormOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAsset}
        editingAsset={editingAsset}
        categories={categories}
        locations={locations}
        pics={pics}
        suppliers={suppliers}
        existingAssetsCount={assets.length}
      />

      {/* 2. Asset Detail Card Modal */}
      <AssetDetailModal
        isOpen={Boolean(viewingAsset)}
        onClose={() => setViewingAsset(null)}
        asset={viewingAsset}
        organization={currentOrg}
        onEdit={(a) => {
          setViewingAsset(null);
          setEditingAsset(a);
          setIsAssetFormOpen(true);
        }}
        onPrintLabel={(a) => setLabelAsset(a)}
        onInitiateTransfer={(a) => {
          setPreselectedAsset(a);
          setCurrentTab('transfers');
        }}
        onInitiateMaintenance={(a) => {
          setPreselectedAsset(a);
          setCurrentTab('maintenance');
        }}
      />

      {/* 3. Asset Printable QR Label Modal */}
      <AssetLabelModal
        isOpen={Boolean(labelAsset)}
        onClose={() => setLabelAsset(null)}
        asset={labelAsset}
        organization={currentOrg}
      />

      {/* 4. CSV Import Modal */}
      <AssetImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportBatch={handleImportBatch}
        categories={categories}
        locations={locations}
      />

      {/* 5. QR Code & Barcode Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanResult={handleQRScanResult}
        assets={assets}
      />

      {/* 6. Mobile Bottom Navigation (Navigasi Layar HP / APK) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        unreadNotifsCount={activeNotifications.length}
      />

      {/* 7. Unduh & Pasang APK Modal */}
      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        pwaInstallPrompt={pwaInstallPrompt}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
