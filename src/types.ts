export type TransactionType = 'income' | 'expense' | 'debt';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  parentId?: string | null;
}

export interface Budget {
  id: string;
  categoryId: string; // 'all' for total budget, or specific category id
  amount: number;
  month: string; // e.g. '2023-10'
  isRecurring: boolean;
}

export interface Transaction {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  date: string;
  note: string;
  type: TransactionType;
  category?: Category;
  wallet?: Wallet;
}

export interface PremiumProduct {
  id: string;
  name: string;
  isSystem?: boolean;
  createdAt: number;
}

export interface PremiumSubscription {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  productId: string;
  productName: string;
  durationDays: number;
  purchasePrice: number;
  purchaseDate: string;
  bonusDays?: number;
  source?: string;
  contactChannel?: string;
  refundStatus?: 'none' | 'pending' | 'completed';
  refundAmount?: number;
  refundDate?: string;
  notes?: string;
  userUid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NabeMemberSlot {
  name: string;
  email: string;
  profile: string;
  pin: string;
}

export type NabeAccountType = 'family' | 'regular' | 'physical';

export interface NabeAccount {
  id: string;
  userId: string;
  name: string;
  type: NabeAccountType;
  ownerEmail: string;
  ownerPin?: string;
  members: NabeMemberSlot[];
  slotCapacity: number; // 5 for family, 1 for regular, 0 for physical
  expiryDate: string; // ISO string
  createdAt: number;
  status?: 'active' | 'archived'; // Add status field
  activities?: { id: string; date: number; text: string }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  notes?: string;
  date: string;
  type: 'note' | 'reminder';
  time?: string;
  isCompleted?: boolean;
}


