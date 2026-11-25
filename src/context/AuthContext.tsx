import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  sendPasswordResetEmail,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  handleFirestoreError, 
  OperationType,
  testConnection,
  writeBatch,
  deleteDoc
} from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Organization, OrgMember, UserProfile, UserRole, AuditLog } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface LoginSuccessPayload {
  name: string;
  role: UserRole;
  email: string;
  orgName: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | AppUser | null;
  userProfile: UserProfile | null;
  currentOrg: Organization | null;
  userRole: UserRole;
  userOrganizations: Organization[];
  loading: boolean;
  isOnline: boolean;
  loginSuccessPayload: LoginSuccessPayload | null;
  dismissLoginAnimation: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerOrganizationAndUser: (orgName: string, orgType: string, email: string, pass: string, fullName: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (orgName: string, orgType: string, address?: string, phone?: string) => Promise<Organization>;
  seedDemoData: () => Promise<void>;
  logAuditAction: (action: string, targetType: string, targetId: string, details: string) => Promise<void>;
  refreshOrgData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('petugas');
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [loginSuccessPayload, setLoginSuccessPayload] = useState<LoginSuccessPayload | null>(null);

  const dismissLoginAnimation = () => {
    setLoginSuccessPayload(null);
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ping Firestore connection test on boot
  useEffect(() => {
    testConnection().catch(console.error);
  }, []);

  // Fetch user organizations and active organization details
  const loadUserData = async (user: FirebaseUser | any) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let profile: UserProfile;
      if (userSnap.exists()) {
        profile = userSnap.data() as UserProfile;
      } else {
        profile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
      }
      setUserProfile(profile);

      // Check user membership across organizations
      // For this, we look for organizations where user is a member or owner
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgList: Organization[] = [];
      let matchedRole: UserRole = 'petugas';
      let activeOrg: Organization | null = null;

      for (const orgDoc of orgsSnap.docs) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        
        // Check member subcollection
        try {
          const memberRef = doc(db, 'organizations', orgDoc.id, 'members', user.uid);
          const memberSnap = await getDoc(memberRef);
          
          let memberData: OrgMember | null = null;
          if (memberSnap.exists()) {
            memberData = memberSnap.data() as OrgMember;
          } else if (user.email) {
            // Also check if member exists with this email (e.g. added before first login)
            const memsSnap = await getDocs(collection(db, 'organizations', orgDoc.id, 'members'));
            const emailMatch = memsSnap.docs.find(d => {
              const dData = d.data() as OrgMember;
              return dData.email?.toLowerCase() === user.email?.toLowerCase();
            });

            if (emailMatch) {
              memberData = emailMatch.data() as OrgMember;
              // Link this UID into organizations/{orgId}/members/{user.uid}
              await setDoc(doc(db, 'organizations', orgDoc.id, 'members', user.uid), {
                ...memberData,
                uid: user.uid,
                email: user.email.toLowerCase(),
                displayName: user.displayName || memberData.displayName || user.email.split('@')[0],
                status: memberData.status || 'active'
              });

              // Clean up placeholder record if it had a generated id
              if (emailMatch.id !== user.uid) {
                try {
                  await deleteDoc(doc(db, 'organizations', orgDoc.id, 'members', emailMatch.id));
                } catch (delErr) {
                  console.warn('Could not clean up legacy member doc:', delErr);
                }
              }
            }
          }

          if (memberData) {
            orgList.push(orgData);
            if (!activeOrg || (profile.currentOrgId && orgDoc.id === profile.currentOrgId)) {
              activeOrg = orgData;
              matchedRole = memberData.role;
            }
          } else if (orgData.ownerUid === user.uid || user.email === 'mahralkh26@gmail.com') {
            orgList.push(orgData);
            if (!activeOrg) {
              activeOrg = orgData;
              matchedRole = 'super_admin';
            }
          }
        } catch (e) {
          console.warn('Membership check warning for org:', orgDoc.id, e);
        }
      }

      setUserOrganizations(orgList);
      if (activeOrg) {
        setCurrentOrg(activeOrg);
        const resolvedRole: UserRole = user.email === 'mahralkh26@gmail.com' ? 'super_admin' : matchedRole;
        setUserRole(resolvedRole);
        setLoginSuccessPayload({
          name: profile.displayName || user.displayName || user.email?.split('@')[0] || 'Pengguna',
          role: resolvedRole,
          email: user.email || '',
          orgName: activeOrg.name
        });
      } else if (orgList.length > 0) {
        setCurrentOrg(orgList[0]);
      } else {
        // If user has no organization yet, create a default personal/initial organization
        const defaultOrg = await initializeDefaultOrg(user);
        setUserOrganizations([defaultOrg]);
        setCurrentOrg(defaultOrg);
        setUserRole('admin');
        setLoginSuccessPayload({
          name: profile.displayName || user.displayName || user.email?.split('@')[0] || 'Pengguna',
          role: 'admin',
          email: user.email || '',
          orgName: defaultOrg.name
        });
      }
    } catch (err) {
      console.error('Error loading user profile or org:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultOrg = async (user: FirebaseUser): Promise<Organization> => {
    const orgId = 'org_' + Math.random().toString(36).substring(2, 9);
    const newOrg: Organization = {
      id: orgId,
      name: 'Inventaris ' + (user.displayName || 'Utama'),
      code: 'INV-01',
      type: 'Perusahaan',
      address: 'Gedung Utama Lt. 1, Jakarta',
      phone: '021-5551234',
      email: user.email || 'info@inventaris.id',
      ownerUid: user.uid,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'organizations', orgId), newOrg);
      await setDoc(doc(db, 'organizations', orgId, 'members', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Administrator',
        role: 'admin',
        status: 'active',
        addedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', user.uid), { currentOrgId: orgId });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `organizations/${orgId}`);
    }
    return newOrg;
  };

  // Restore session from localStorage on mount (for email-based logins)
  useEffect(() => {
    const saved = localStorage.getItem('inventaris_auth_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.user && parsed?.currentOrg) {
          setCurrentUser(parsed.user);
          setUserProfile(parsed.profile);
          setCurrentOrg(parsed.currentOrg);
          setUserRole(parsed.userRole || 'petugas');
          setUserOrganizations([parsed.currentOrg]);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed parsing local auth session:', e);
      }
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserData(user);
      } else {
        // If there is an active email user session in localStorage, preserve it!
        const saved = localStorage.getItem('inventaris_auth_session');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed?.user && parsed?.currentOrg) {
              setCurrentUser(parsed.user);
              setUserProfile(parsed.profile);
              setCurrentOrg(parsed.currentOrg);
              setUserRole(parsed.userRole || 'petugas');
              setUserOrganizations([parsed.currentOrg]);
              setLoading(false);
              return;
            }
          } catch {}
        }
        setUserProfile(null);
        setCurrentOrg(null);
        setUserOrganizations([]);
        setUserRole('petugas');
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const emailClean = email.trim().toLowerCase();
    const passClean = pass.trim();

    if (!emailClean) {
      setLoading(false);
      throw new Error('Alamat email wajib diisi.');
    }
    if (!passClean) {
      setLoading(false);
      throw new Error('Kata sandi wajib diisi.');
    }

    try {
      // 1. Search for matching member across all organizations in Firestore
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      let foundMember: OrgMember | null = null;
      let foundOrg: Organization | null = null;
      let memberDocId: string = '';

      for (const orgDoc of orgsSnap.docs) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        const membersSnap = await getDocs(collection(db, 'organizations', orgDoc.id, 'members'));
        const match = membersSnap.docs.find(d => {
          const m = d.data() as OrgMember;
          return m.email?.trim().toLowerCase() === emailClean;
        });

        if (match) {
          foundMember = { id: match.id, ...match.data() } as OrgMember;
          foundOrg = orgData;
          memberDocId = match.id;
          break;
        }
      }

      // 2. If member exists in an organization
      if (foundMember && foundOrg) {
        if (foundMember.status === 'suspended') {
          throw new Error('Akun ini telah dinonaktifkan oleh Administrator. Hubungi pengelola inventaris.');
        }

        // Verify password
        const savedPass = foundMember.password;
        if (savedPass) {
          if (savedPass !== passClean) {
            throw new Error('Kata sandi tidak sesuai. Silakan periksa kembali kata sandi akun Anda.');
          }
        } else {
          // If no password set yet, save entered password or 123456
          try {
            await updateDoc(doc(db, 'organizations', foundOrg.id, 'members', memberDocId), {
              password: passClean
            });
          } catch (e) {
            console.warn('Could not save member password on first login:', e);
          }
        }

        const role: UserRole = emailClean === 'mahralkh26@gmail.com' ? 'super_admin' : (foundMember.role || 'petugas');
        const appUser: AppUser = {
          uid: foundMember.uid || memberDocId,
          email: foundMember.email,
          displayName: foundMember.displayName || foundMember.email.split('@')[0],
          photoURL: null
        };

        const profile: UserProfile = {
          uid: appUser.uid,
          email: appUser.email || '',
          displayName: appUser.displayName || 'Pengguna',
          currentOrgId: foundOrg.id,
          createdAt: foundMember.addedAt || new Date().toISOString()
        };

        // Persist session to local storage
        const sessionData = {
          user: appUser,
          profile,
          currentOrg: foundOrg,
          userRole: role,
          timestamp: Date.now()
        };
        localStorage.setItem('inventaris_auth_session', JSON.stringify(sessionData));

        setCurrentUser(appUser);
        setUserProfile(profile);
        setCurrentOrg(foundOrg);
        setUserRole(role);
        setUserOrganizations([foundOrg]);

        // Trigger Login Success Animation
        setLoginSuccessPayload({
          name: appUser.displayName || appUser.email || 'Pengguna',
          role: role,
          email: appUser.email || '',
          orgName: foundOrg.name
        });

        // Audit log in background
        logAuditAction('LOGIN', 'AUTH', appUser.uid, `Pengguna ${appUser.email} berhasil masuk sebagai ${role}`).catch(() => {});
        return;
      }

      // 3. Admin fallback for mahralkh26@gmail.com
      if (emailClean === 'mahralkh26@gmail.com') {
        const firstOrg: Organization = orgsSnap.docs.length > 0 
          ? ({ id: orgsSnap.docs[0].id, ...orgsSnap.docs[0].data() } as Organization)
          : {
              id: 'org_kitz14x',
              name: 'SMK NW Anjani',
              code: 'SMK',
              type: 'Sekolah / Madrasah',
              address: 'Anjani',
              phone: '-',
              email: emailClean,
              ownerUid: 'super_admin_1',
              createdAt: new Date().toISOString()
            };

        const appUser: AppUser = {
          uid: 'super_admin_1',
          email: emailClean,
          displayName: 'Mahral Kusuma',
          photoURL: null
        };

        const profile: UserProfile = {
          uid: appUser.uid,
          email: emailClean,
          displayName: 'Mahral Kusuma',
          currentOrgId: firstOrg.id,
          createdAt: new Date().toISOString()
        };

        const sessionData = {
          user: appUser,
          profile,
          currentOrg: firstOrg,
          userRole: 'super_admin' as UserRole,
          timestamp: Date.now()
        };
        localStorage.setItem('inventaris_auth_session', JSON.stringify(sessionData));

        setCurrentUser(appUser);
        setUserProfile(profile);
        setCurrentOrg(firstOrg);
        setUserRole('super_admin');
        setUserOrganizations([firstOrg]);

        setLoginSuccessPayload({
          name: 'Mahral Kusuma',
          role: 'super_admin',
          email: emailClean,
          orgName: firstOrg.name
        });
        return;
      }

      // 4. User not found in any organization
      throw new Error(`Email "${emailClean}" belum terdaftar di sistem. Pastikan akun sudah ditambahkan pada menu "Pengguna & Hak Akses" oleh Administrator.`);
    } catch (error: any) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerOrganizationAndUser = async (
    orgName: string, 
    orgType: string, 
    email: string, 
    pass: string, 
    fullName: string
  ) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      
      // Check if user's email was already invited/registered in an existing organization
      let foundExistingOrg: Organization | null = null;
      let existingRole: UserRole = 'admin';

      const orgsSnap = await getDocs(collection(db, 'organizations'));
      for (const orgDoc of orgsSnap.docs) {
        const memsSnap = await getDocs(collection(db, 'organizations', orgDoc.id, 'members'));
        const matchedMem = memsSnap.docs.find(d => {
          const dData = d.data() as OrgMember;
          return dData.email?.toLowerCase() === email.toLowerCase();
        });

        if (matchedMem) {
          const memData = matchedMem.data() as OrgMember;
          foundExistingOrg = { id: orgDoc.id, ...orgDoc.data() } as Organization;
          existingRole = memData.role || 'petugas';

          // Link member to this authenticated user's UID
          await setDoc(doc(db, 'organizations', orgDoc.id, 'members', user.uid), {
            ...memData,
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: fullName || memData.displayName || email.split('@')[0],
            role: existingRole,
            status: 'active'
          });

          // Remove legacy placeholder ID if different
          if (matchedMem.id !== user.uid) {
            try {
              await deleteDoc(doc(db, 'organizations', orgDoc.id, 'members', matchedMem.id));
            } catch {}
          }
          break;
        }
      }

      if (foundExistingOrg) {
        const userProf: UserProfile = {
          uid: user.uid,
          email: email.toLowerCase(),
          displayName: fullName || email.split('@')[0],
          currentOrgId: foundExistingOrg.id,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), userProf);

        setCurrentOrg(foundExistingOrg);
        setUserRole(email === 'mahralkh26@gmail.com' ? 'super_admin' : existingRole);
        setUserProfile(userProf);
        setUserOrganizations([foundExistingOrg]);
      } else {
        // Create new organization as normal
        const orgId = 'org_' + Date.now().toString(36);
        const orgData: Organization = {
          id: orgId,
          name: orgName,
          code: orgName.substring(0, 3).toUpperCase(),
          type: orgType,
          address: 'Kantor Pusat',
          phone: '-',
          email: email,
          ownerUid: user.uid,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'organizations', orgId), orgData);
        await setDoc(doc(db, 'organizations', orgId, 'members', user.uid), {
          uid: user.uid,
          email: email,
          displayName: fullName,
          role: 'admin',
          status: 'active',
          addedAt: new Date().toISOString()
        });

        const userProf: UserProfile = {
          uid: user.uid,
          email: email,
          displayName: fullName,
          currentOrgId: orgId,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), userProf);

        setCurrentOrg(orgData);
        setUserRole('admin');
        setUserProfile(userProf);
        setUserOrganizations([orgData]);
      }
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth).catch(() => {});
    } finally {
      localStorage.removeItem('inventaris_auth_session');
      setCurrentUser(null);
      setCurrentOrg(null);
      setUserProfile(null);
      setUserRole('petugas');
      setUserOrganizations([]);
      setLoginSuccessPayload(null);
    }
  };

  const switchOrganization = async (orgId: string) => {
    const target = userOrganizations.find(o => o.id === orgId);
    if (!target || !currentUser) return;

    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', currentUser.uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        const memData = memberSnap.data() as OrgMember;
        setUserRole(currentUser.email === 'mahralkh26@gmail.com' ? 'super_admin' : memData.role);
      }
      setCurrentOrg(target);
      await updateDoc(doc(db, 'users', currentUser.uid), { currentOrgId: orgId });
    } catch (e) {
      console.error('Failed to switch organization:', e);
    }
  };

  const createOrganization = async (orgName: string, orgType: string, address?: string, phone?: string): Promise<Organization> => {
    if (!currentUser) throw new Error('Not authenticated');

    const orgId = 'org_' + Date.now().toString(36);
    const newOrg: Organization = {
      id: orgId,
      name: orgName,
      code: orgName.substring(0, 3).toUpperCase(),
      type: orgType,
      address: address || '',
      phone: phone || '',
      email: currentUser.email || '',
      ownerUid: currentUser.uid,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'organizations', orgId), newOrg);
    await setDoc(doc(db, 'organizations', orgId, 'members', currentUser.uid), {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'Administrator',
      role: 'admin',
      status: 'active',
      addedAt: new Date().toISOString()
    });

    setUserOrganizations(prev => [...prev, newOrg]);
    setCurrentOrg(newOrg);
    setUserRole('admin');
    return newOrg;
  };

  const logAuditAction = async (action: string, targetType: string, targetId: string, details: string) => {
    if (!currentOrg || !currentUser) return;
    try {
      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const auditEntry: AuditLog = {
        id: logId,
        action,
        targetType,
        targetId,
        details,
        performedBy: userProfile?.displayName || currentUser.email || 'System',
        userEmail: currentUser.email || '',
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'organizations', currentOrg.id, 'auditLogs', logId), auditEntry);
    } catch (e) {
      console.warn('Audit logging warning:', e);
    }
  };

  const refreshOrgData = async () => {
    if (currentUser) {
      await loadUserData(currentUser);
    }
  };

  // Seed Realistic Demo Data into Firestore
  const seedDemoData = async () => {
    if (!currentOrg || !currentUser) return;
    const orgId = currentOrg.id;
    const batch = writeBatch(db);

    // Categories
    const categories = [
      { id: 'cat_elektronik', name: 'Elektronik & Perangkat Kantor', code: 'ELK', description: 'Komputer, printer, proyektor, dan monitor' },
      { id: 'cat_meubelair', name: 'Meubelair & Furnitur', code: 'MEU', description: 'Meja, kursi kerja, lemari arsip, dan sofa' },
      { id: 'cat_jaringan', name: 'Komputer & Jaringan', code: 'NET', description: 'Router, switch, server, dan kabel LAN' },
      { id: 'cat_kendaraan', name: 'Kendaraan Dinas', code: 'KND', description: 'Mobil dinas dan sepeda motor operasional' },
      { id: 'cat_atk', name: 'ATK & Barang Habis Pakai', code: 'ATK', description: 'Kertas HVS, toner printer, tinta, dan alat tulis' }
    ];

    for (const cat of categories) {
      batch.set(doc(db, 'organizations', orgId, 'categories', cat.id), {
        ...cat,
        createdAt: new Date().toISOString()
      });
    }

    // Locations
    const locations = [
      { id: 'loc_r101', building: 'Gedung A', floor: 'Lantai 1', roomName: 'Ruang Staf & Operasional', code: 'GA-101' },
      { id: 'loc_r102', building: 'Gedung A', floor: 'Lantai 1', roomName: 'Ruang Server & IT', code: 'GA-102' },
      { id: 'loc_r201', building: 'Gedung A', floor: 'Lantai 2', roomName: 'Ruang Rapat Utama', code: 'GA-201' },
      { id: 'loc_gudang', building: 'Gedung B', floor: 'Lantai Dasar', roomName: 'Gudang Pusat Logistik', code: 'GB-001' }
    ];

    for (const loc of locations) {
      batch.set(doc(db, 'organizations', orgId, 'locations', loc.id), {
        ...loc,
        createdAt: new Date().toISOString()
      });
    }

    // Suppliers
    const suppliers = [
      { id: 'sup_bh', name: 'PT Bhinneka Mentari Dimensi', contactPerson: 'Budi Santoso', phone: '021-4261100', email: 'corporate@bhinneka.com', address: 'Jl. Gunung Sahari No. 73, Jakarta' },
      { id: 'sup_gramedia', name: 'PT Gramedia Asri Media', contactPerson: 'Siti Rahma', phone: '021-53650110', email: 'supply@gramedia.id', address: 'Jl. Palmerah Barat, Jakarta Barat' },
      { id: 'sup_astra', name: 'PT Astra International Tbk', contactPerson: 'Hendra Wijaya', phone: '021-6522555', email: 'fleet@astra.co.id', address: 'Sunter, Jakarta Utara' }
    ];

    for (const sup of suppliers) {
      batch.set(doc(db, 'organizations', orgId, 'suppliers', sup.id), {
        ...sup,
        createdAt: new Date().toISOString()
      });
    }

    // PICs
    const pics = [
      { id: 'pic_1', name: 'Ahmad Fauzi, S.Kom', employeeId: 'NIP-19850412001', department: 'Divisi Teknologi Informasi', phone: '081234567890', email: 'fauzi@organisasi.id' },
      { id: 'pic_2', name: 'Dewi Lestari, S.E.', employeeId: 'NIP-19900823002', department: 'Divisi Keuangan & Akuntansi', phone: '081298765432', email: 'dewi@organisasi.id' },
      { id: 'pic_3', name: 'Rian Hidayat', employeeId: 'NIP-19921105003', department: 'Umum & Rumah Tangga', phone: '081377889900', email: 'rian@organisasi.id' }
    ];

    for (const pic of pics) {
      batch.set(doc(db, 'organizations', orgId, 'pics', pic.id), {
        ...pic,
        createdAt: new Date().toISOString()
      });
    }

    // Assets
    const assets = [
      {
        id: 'ast_laptop_dell',
        itemCode: 'INV-ELK-2024-001',
        name: 'Laptop Dell Latitude 5420 i7 16GB',
        categoryId: 'cat_elektronik',
        categoryName: 'Elektronik & Perangkat Kantor',
        brand: 'Dell',
        model: 'Latitude 5420',
        serialNumber: 'SN-DLL5420-9981',
        barcode: 'INV-ELK-2024-001',
        type: 'fixed_asset',
        unit: 'unit',
        quantity: 5,
        availableQuantity: 4,
        purchasePrice: 16500000,
        totalValue: 82500000,
        purchaseDate: '2024-02-15',
        fundingSource: 'Anggaran Tahunan 2024',
        condition: 'good',
        status: 'available',
        locationId: 'loc_r101',
        locationName: 'Ruang Staf & Operasional',
        picId: 'pic_1',
        picName: 'Ahmad Fauzi, S.Kom',
        supplierId: 'sup_bh',
        supplierName: 'PT Bhinneka Mentari Dimensi',
        warrantyExpiry: '2027-02-15',
        notes: 'Disediakan untuk tim pengembang dan analis sistem',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ast_printer_epson',
        itemCode: 'INV-ELK-2024-002',
        name: 'Printer Epson L15150 A3 Wi-Fi Duplex',
        categoryId: 'cat_elektronik',
        categoryName: 'Elektronik & Perangkat Kantor',
        brand: 'Epson',
        model: 'EcoTank L15150',
        serialNumber: 'SN-EPS-L15150-4412',
        barcode: 'INV-ELK-2024-002',
        type: 'fixed_asset',
        unit: 'unit',
        quantity: 2,
        availableQuantity: 2,
        purchasePrice: 14200000,
        totalValue: 28400000,
        purchaseDate: '2024-03-10',
        fundingSource: 'Anggaran Tahunan 2024',
        condition: 'good',
        status: 'in_use',
        locationId: 'loc_r101',
        locationName: 'Ruang Staf & Operasional',
        picId: 'pic_2',
        picName: 'Dewi Lestari, S.E.',
        supplierId: 'sup_bh',
        supplierName: 'PT Bhinneka Mentari Dimensi',
        notes: 'Printer warna multifungsi A3',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ast_proyektor_epson',
        itemCode: 'INV-ELK-2024-003',
        name: 'Proyektor Epson EB-E01 3300 Lumens',
        categoryId: 'cat_elektronik',
        categoryName: 'Elektronik & Perangkat Kantor',
        brand: 'Epson',
        model: 'EB-E01',
        serialNumber: 'SN-PRJ-3300-881',
        barcode: 'INV-ELK-2024-003',
        type: 'fixed_asset',
        unit: 'unit',
        quantity: 3,
        availableQuantity: 1,
        purchasePrice: 5800000,
        totalValue: 17400000,
        purchaseDate: '2024-01-20',
        fundingSource: 'Hibah Lembaga',
        condition: 'good',
        status: 'borrowed',
        locationId: 'loc_r201',
        locationName: 'Ruang Rapat Utama',
        picId: 'pic_3',
        picName: 'Rian Hidayat',
        notes: 'Digunakan untuk presentasi rapat dan seminar',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ast_switch_cisco',
        itemCode: 'INV-NET-2023-010',
        name: 'Cisco Catalyst 2960-X 24 Port Gigabit',
        categoryId: 'cat_jaringan',
        categoryName: 'Komputer & Jaringan',
        brand: 'Cisco',
        model: 'WS-C2960X-24TS-L',
        serialNumber: 'FOC2134Y2XA',
        barcode: 'INV-NET-2023-010',
        type: 'fixed_asset',
        unit: 'unit',
        quantity: 2,
        availableQuantity: 2,
        purchasePrice: 18500000,
        totalValue: 37000000,
        purchaseDate: '2023-08-14',
        condition: 'lightly_damaged',
        status: 'under_maintenance',
        locationId: 'loc_r102',
        locationName: 'Ruang Server & IT',
        picId: 'pic_1',
        picName: 'Ahmad Fauzi, S.Kom',
        notes: 'Port 1-4 kadang flapping, sedang dijadwalkan servis modul optik',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ast_kursi_ergonomis',
        itemCode: 'INV-MEU-2024-005',
        name: 'Kursi Kerja Ergonomis Mesh Fantech OCA258',
        categoryId: 'cat_meubelair',
        categoryName: 'Meubelair & Furnitur',
        brand: 'Fantech',
        model: 'OCA258',
        serialNumber: '-',
        barcode: 'INV-MEU-2024-005',
        type: 'fixed_asset',
        unit: 'unit',
        quantity: 20,
        availableQuantity: 20,
        purchasePrice: 1450000,
        totalValue: 29000000,
        purchaseDate: '2024-04-05',
        condition: 'good',
        status: 'in_use',
        locationId: 'loc_r101',
        locationName: 'Ruang Staf & Operasional',
        picId: 'pic_3',
        picName: 'Rian Hidayat',
        notes: 'Dilengkapi lumbar support dan headrest',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ast_kertas_a4',
        itemCode: 'INV-ATK-2024-020',
        name: 'Kertas HVS PaperOne A4 75gr (Box isi 5 Rim)',
        categoryId: 'cat_atk',
        categoryName: 'ATK & Barang Habis Pakai',
        brand: 'PaperOne',
        model: 'A4 75gsm',
        type: 'consumable',
        unit: 'box',
        quantity: 45,
        availableQuantity: 45,
        purchasePrice: 240000,
        totalValue: 10800000,
        purchaseDate: '2024-09-01',
        condition: 'good',
        status: 'available',
        locationId: 'loc_gudang',
        locationName: 'Gudang Pusat Logistik',
        picId: 'pic_3',
        picName: 'Rian Hidayat',
        supplierId: 'sup_gramedia',
        supplierName: 'PT Gramedia Asri Media',
        notes: 'Stok operasional administrasi semester genap',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const ast of assets) {
      batch.set(doc(db, 'organizations', orgId, 'assets', ast.id), ast);
    }

    // Stock Transactions
    const transactions = [
      {
        id: 'tx_in_001',
        transactionNumber: 'TRX-IN-202410-001',
        type: 'in',
        date: '2024-10-02',
        source: 'Pembelian Langsung',
        supplierId: 'sup_bh',
        supplierName: 'PT Bhinneka Mentari Dimensi',
        recipient: 'Rian Hidayat',
        assetId: 'ast_laptop_dell',
        assetName: 'Laptop Dell Latitude 5420 i7 16GB',
        quantity: 5,
        unitPrice: 16500000,
        totalAmount: 82500000,
        locationId: 'loc_r101',
        locationName: 'Ruang Staf & Operasional',
        status: 'approved',
        notes: 'Penerimaan unit pengadaan tahap 2',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_out_001',
        transactionNumber: 'TRX-OUT-202410-002',
        type: 'out',
        date: '2024-10-08',
        recipient: 'Divisi Keuangan (Dewi)',
        reason: 'Distribusi pemakaian operasional bulanan',
        assetId: 'ast_kertas_a4',
        assetName: 'Kertas HVS PaperOne A4 75gr (Box isi 5 Rim)',
        quantity: 5,
        unitPrice: 240000,
        totalAmount: 1200000,
        locationId: 'loc_gudang',
        locationName: 'Gudang Pusat Logistik',
        status: 'approved',
        notes: 'Surat Permintaan No. SP-ATK/10/24',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      }
    ];

    for (const tx of transactions) {
      batch.set(doc(db, 'organizations', orgId, 'transactions', tx.id), tx);
    }

    // Loans
    const loans = [
      {
        id: 'loan_001',
        loanNumber: 'PINJAM-202410-001',
        borrowerName: 'Siti Aminah, M.Pd.',
        department: 'Divisi Pendidikan & Pelatihan',
        contact: '081299112233',
        assetId: 'ast_proyektor_epson',
        assetName: 'Proyektor Epson EB-E01 3300 Lumens',
        quantity: 1,
        loanDate: '2024-10-10',
        dueDate: '2024-10-16', // Near due date
        conditionOnBorrow: 'Kondisi mulus, remote dan tas lengkap',
        handedBy: 'Ahmad Fauzi',
        status: 'active',
        notes: 'Peminjaman untuk workshop pembekalan staf',
        createdAt: new Date().toISOString()
      },
      {
        id: 'loan_002',
        loanNumber: 'PINJAM-202409-015',
        borrowerName: 'Ferry Pratama',
        department: 'Unit Kerja Humas',
        contact: '085712344321',
        assetId: 'ast_laptop_dell',
        assetName: 'Laptop Dell Latitude 5420 i7 16GB',
        quantity: 1,
        loanDate: '2024-09-15',
        dueDate: '2024-09-30', // Overdue!
        conditionOnBorrow: 'Baik, charger original',
        handedBy: 'Ahmad Fauzi',
        status: 'overdue',
        notes: 'Liputan dokumentasi luar kota',
        createdAt: new Date().toISOString()
      }
    ];

    for (const l of loans) {
      batch.set(doc(db, 'organizations', orgId, 'loans', l.id), l);
    }

    // Maintenance
    const maintenance = [
      {
        id: 'maint_001',
        ticketNumber: 'MT-202410-001',
        assetId: 'ast_switch_cisco',
        assetName: 'Cisco Catalyst 2960-X 24 Port Gigabit',
        maintenanceType: 'corrective',
        issueDescription: 'Port 1 sampai 4 mengalami flapping dan packet drop saat transfer data tinggi.',
        priority: 'high',
        reportedDate: '2024-10-05',
        technicianVendor: 'PT Mitra Jaringan Mandiri',
        estimatedCost: 1500000,
        actualCost: 0,
        startDate: '2024-10-07',
        status: 'in_progress',
        notes: 'Menunggu penggantian modul SFP dan pengujian kestabilan sinyal optik',
        createdAt: new Date().toISOString()
      }
    ];

    for (const m of maintenance) {
      batch.set(doc(db, 'organizations', orgId, 'maintenance', m.id), m);
    }

    // Audit Log initial
    const initialLog: AuditLog = {
      id: 'log_seed_' + Date.now(),
      action: 'SEED_DEMO_DATA',
      targetType: 'SYSTEM',
      targetId: orgId,
      details: 'Pengisian data simulasi demo inventaris (kategori, lokasi, aset, transaksi, dan peminjaman).',
      performedBy: currentUser.displayName || currentUser.email || 'Admin',
      userEmail: currentUser.email || '',
      timestamp: new Date().toISOString()
    };
    batch.set(doc(db, 'organizations', orgId, 'auditLogs', initialLog.id), initialLog);

    await batch.commit();
    await logAuditAction('GENERATE_DEMO', 'ORGANIZATION', orgId, 'Memuat paket data demonstrasi lengkap ke dalam Cloud Firestore.');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      currentOrg,
      userRole,
      userOrganizations,
      loading,
      isOnline,
      loginSuccessPayload,
      dismissLoginAnimation,
      loginWithGoogle,
      loginWithEmail,
      registerOrganizationAndUser,
      sendResetEmail,
      logout,
      switchOrganization,
      createOrganization,
      seedDemoData,
      logAuditAction,
      refreshOrgData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
