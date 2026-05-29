import { db, auth } from './firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { NabeAccount } from '../types';
import { handleFirestoreError, OperationType } from './api';

export const subscribeNabeAccounts = (userId: string, cb: (data: NabeAccount[]) => void) => {
  const q = query(collection(db, 'nabe_accounts'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NabeAccount)));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'nabe_accounts'));
};

export const addNabeAccount = async (account: Omit<NabeAccount, 'id' | 'createdAt'>) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const docRef = doc(collection(db, 'nabe_accounts'));
    await setDoc(docRef, {
      ...account,
      userId,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'nabe_accounts');
  }
}

export const updateNabeAccount = async (id: string, data: Partial<NabeAccount>) => {
  try {
    await updateDoc(doc(db, 'nabe_accounts', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'nabe_accounts');
  }
}

export const deleteNabeAccount = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'nabe_accounts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'nabe_accounts');
  }
}
