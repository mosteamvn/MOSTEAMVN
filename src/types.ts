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
  notes?: string;
  userUid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  notes?: string;
  date: string; // Solar date 'YYYY-MM-DD'
  type: 'note' | 'reminder';
  time?: string; // 'HH:MM'
  isCompleted?: boolean;
}


