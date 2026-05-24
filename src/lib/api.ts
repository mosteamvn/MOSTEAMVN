import { db, auth } from './firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, onSnapshot, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { Wallet, Category, Transaction, Budget } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helpers
export const subscribeWallets = (userId: string, cb: (data: Wallet[]) => void) => {
  const q = query(collection(db, 'wallets'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Wallet)));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallets'));
};

export const subscribeCategories = (userId: string, cb: (data: Category[]) => void) => {
  const q = query(collection(db, 'categories'), where('userId', 'in', [userId, 'system']));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));
};

export const subscribeTransactions = (userId: string, cb: (data: Transaction[]) => void) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => {
       const data = d.data();
       return { 
         id: d.id, 
         ...data,
         // we map category and wallet in the UI layer ideally, but here we just return the raw tx
       } as Transaction;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));
};

export const addTransaction = async (tx: Omit<Transaction, 'id' | 'category' | 'wallet'>, currentBalance: number) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    
    const batch = writeBatch(db);
    
    const txRef = doc(collection(db, 'transactions'));
    batch.set(txRef, {
      ...tx,
      userId,
      createdAt: Date.now()
    });

    const walletRef = doc(db, 'wallets', tx.walletId);
    let change = tx.type === 'income' ? tx.amount : -tx.amount;
    if (tx.type === 'debt') {
        change = ['9', '10'].includes(tx.categoryId) ? tx.amount : -tx.amount; // mock ids might not match, but we'll try
    }
    batch.update(walletRef, {
      balance: currentBalance + change
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'transactions');
  }
}

export const deleteTransaction = async (tx: Transaction, walletBalance: number) => {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'transactions', tx.id));
    
    const walletRef = doc(db, 'wallets', tx.walletId);
    let change = tx.type === 'income' ? -tx.amount : tx.amount;
    if (tx.type === 'debt') {
        change = ['9', '10'].includes(tx.categoryId) ? -tx.amount : tx.amount;
    }
    batch.update(walletRef, {
      balance: walletBalance + change
    });
    
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'transactions');
  }
}

export const addCategory = async (cat: Omit<Category, 'id'>) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    await setDoc(doc(collection(db, 'categories')), {
      ...cat,
      userId,
      createdAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'categories');
  }
}

export const updateCategory = async (id: string, data: Partial<Category>) => {
  try {
    await updateDoc(doc(db, 'categories', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'categories');
  }
}

export const deleteCategory = async (id: string) => {
  try {
    const categoriesSnapshot = await getDocs(query(collection(db, 'categories'), where('parentId', '==', id)));
    if (!categoriesSnapshot.empty) {
      throw new Error('Không thể xoá nhóm đang có nhóm con');
    }
    const txSnapshot = await getDocs(query(collection(db, 'transactions'), where('categoryId', '==', id)));
    if (!txSnapshot.empty) {
      throw new Error('Không thể xoá nhóm đang có giao dịch');
    }
    await deleteDoc(doc(db, 'categories', id));
  } catch (err) {
    if (err instanceof Error && err.message.includes('Không thể xoá')) {
      throw err; // rethrow logic errors so UI can show them
    }
    handleFirestoreError(err, OperationType.DELETE, 'categories');
  }
}

export const addBudget = async (budget: Omit<Budget, 'id'>) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');

    // check if it exists (very naive check)
    const existing = await getDocs(query(collection(db, 'budgets'), where('categoryId', '==', budget.categoryId), where('month', '==', budget.month), where('userId', '==', userId)));
    
    if (!existing.empty) {
      await updateDoc(doc(db, 'budgets', existing.docs[0].id), {
        amount: budget.amount,
        isRecurring: budget.isRecurring
      });
    } else {
      await setDoc(doc(collection(db, 'budgets')), {
        ...budget,
        userId,
        createdAt: Date.now()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'budgets');
  }
}

export const subscribeBudgets = (userId: string, cb: (data: Budget[]) => void) => {
  const q = query(collection(db, 'budgets'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Budget)));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'budgets'));
};

export const deleteBudget = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'budgets', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'budgets');
  }
}

// Initial Data Population
export const initializeUserData = async (userId: string) => {
  console.log('initializeUserData: starting for', userId);
  try {
    let w;
    try {
      console.log('initializeUserData: running getDocs on wallets query...');
      w = await getDocs(query(collection(db, 'wallets'), where('userId', '==', userId)));
      console.log('initializeUserData: wallets query run successfully, is empty:', w.empty);
    } catch (readErr: any) {
      console.error('initializeUserData: failed to read wallets collection', readErr);
      throw new Error(`Đọc danh sách ví thất bại: ${readErr.message}`);
    }

    if (w.empty) {
      console.log('initializeUserData: wallets collection is empty, prepping batch insertion...');
      const batch = writeBatch(db);
      
      const userEmail = auth.currentUser?.email || '';
      const userRole = userEmail === 'mosteamvn@gmail.com' ? 'admin' : 'user';
      const now = Date.now();

      // Create User record
      console.log('initializeUserData: adding users doc to batch...');
      batch.set(doc(db, 'users', userId), {
        email: userEmail,
        role: userRole,
        createdAt: now
      });

      // Create 1 wallet
      console.log('initializeUserData: adding wallets doc to batch...');
      const wRef = doc(collection(db, 'wallets'));
      batch.set(wRef, {
        userId, 
        name: 'Tiền mặt', 
        balance: 0, 
        color: '#1DBF73', 
        icon: 'Wallet', 
        createdAt: now
      });

      // Create some base categories
      console.log('initializeUserData: adding standard categories docs to batch...');
      const categoriesToCreate = [
        { name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#f59e0b', parentId: null },
        { name: 'Mua sắm', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', parentId: null },
        { name: 'Di chuyển', type: 'expense', icon: 'Car', color: '#3b82f6', parentId: null },
        { name: 'Lương', type: 'income', icon: 'Coins', color: '#10b981', parentId: null },
      ];
      
      categoriesToCreate.forEach(c => {
         const cRef = doc(collection(db, 'categories'));
         batch.set(cRef, { ...c, userId, createdAt: now });
      });

      try {
        console.log('initializeUserData: executing batch.commit()...');
        await batch.commit();
        console.log('initializeUserData: data initialized successfully!');
      } catch (writeErr: any) {
        console.error('initializeUserData: batch.commit failed', writeErr);
        throw new Error(`Ghi dữ liệu khởi tạo thất bại (batch.commit): ${writeErr.message}`);
      }
    } else {
      console.log('initializeUserData: wallets already exist, skipping initialization.');
    }
  } catch (err: any) {
    console.error('initializeUserData general error:', err);
    throw err;
  }
}
