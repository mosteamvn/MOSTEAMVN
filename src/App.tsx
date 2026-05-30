import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Home, List, PieChart, User, PlusCircle, Calendar, Sparkles, Bot, Target, RefreshCw, Moon, Sun, Package, Shield } from 'lucide-react';
import { cn } from './lib/utils';
import { Transaction, Wallet, Category, Budget, NabeAccount } from './types';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import StatisticsView from './views/StatisticsView';
import ProfileView from './views/ProfileView';
import CategoriesView from './views/CategoriesView';
import WalletsView from './views/WalletsView';
import AddTransactionModal from './components/AddTransactionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import NabeAccountInventoryView from './views/NabeAccountInventoryView';

import BudgetsView from './views/BudgetsView';
import MoneyInsiderView from './views/MoneyInsiderView';
import AdminView from './views/AdminView';
import PremiumView from './views/PremiumView';
import { useAuth } from './contexts/AuthContext';
import LoginView from './views/LoginView';
import { subscribeWallets, subscribeCategories, subscribeTransactions, subscribeBudgets, initializeUserData, addTransaction } from './lib/api';
import { subscribeNabeAccounts } from './lib/nabeApi';
import PinLockView from './components/PinLockView';
import RecurringView from './views/RecurringView';
import { calculateNextDueDate, RecurringTemplate } from './utils/recurrenceDetector';
import CalendarView from './views/CalendarView';

export type ViewState = 'home' | 'transactions' | 'statistics' | 'profile' | 'categories' | 'wallets' | 'budgets' | 'insider' | 'admin' | 'premium' | 'recurring' | 'calendar' | 'nabe-accounts';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveViewRaw] = useState<ViewState>('home');
  const [previousView, setPreviousView] = useState<ViewState | null>(null);

  const setActiveView = (view: ViewState) => {
    setActiveViewRaw(prev => {
      if (prev !== view) {
        setPreviousView(prev);
      }
      return view;
    });
  };

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Reset lock state when user logs out
  useEffect(() => {
    if (!user) {
      setIsAppLocked(true);
    }
  }, [user]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);

  // Khởi tạo theme tối/sáng dựa trên localStorage hoặc tùy chọn hệ thống
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  const hasPin = useMemo(() => {
    if (!user) return false;
    return !!localStorage.getItem(`app_pin_${user.uid}`);
  }, [user]);
  
  // App Data State
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [nabeAccounts, setNabeAccounts] = useState<NabeAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalletIdForFilter, setSelectedWalletIdForFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    let unsubscribes: (() => void)[] = [];

    if (user) {
      setIsLoading(true);
      initializeUserData(user.uid)
        .then(() => {
          if (!active) return;
          
          const unsubWallets = subscribeWallets(user.uid, (data) => {
            if (active) setWallets(data);
          });
          const unsubCategories = subscribeCategories(user.uid, (data) => {
            if (active) setCategories(data);
          });
          const unsubTransactions = subscribeTransactions(user.uid, (data) => {
            if (active) setRawTransactions(data);
          });
          const unsubBudgets = subscribeBudgets(user.uid, (data) => {
            if (active) setBudgets(data);
          });
          const unsubNabeAccounts = subscribeNabeAccounts(user.uid, (data) => {
            if (active) setNabeAccounts(data);
          });
          
          unsubscribes.push(unsubWallets, unsubCategories, unsubTransactions, unsubBudgets, unsubNabeAccounts);
          setIsLoading(false);
        })
        .catch((error: any) => {
          if (!active) return;
          console.error('Initialization error:', error);
          toast.error('Lỗi khởi tạo dữ liệu: ' + error.message);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const transactions = useMemo(() => {
    return rawTransactions
      .map(t => ({
        ...t,
        category: categories.find(c => c.id === t.categoryId),
        wallet: wallets.find(w => w.id === t.walletId)
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawTransactions, categories, wallets]);

  const highlightedView = useMemo(() => {
    if (activeView === 'wallets') return 'profile';
    if (activeView === 'categories') return 'profile';
    if (activeView === 'budgets') return 'profile';
    if (activeView === 'insider') return 'statistics';
    return activeView;
  }, [activeView]);

  // Alert notifications when spending reaches 80%, 90%, or 100% of budget limit
  useEffect(() => {
    if (!user || budgets.length === 0 || transactions.length === 0) return;

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentDate = new Date();

    const expensesThisMonth = transactions.filter(t => 
      t.type === 'expense' &&
      isWithinInterval(new Date(t.date), { start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
    );

    const activeBudgets = budgets.filter(b => b.month === currentMonthStr || b.isRecurring);

    activeBudgets.forEach(b => {
      let spent = 0;
      if (b.categoryId === 'all') {
        spent = expensesThisMonth.reduce((sum, t) => sum + t.amount, 0);
      } else {
        const subCategoryIds = categories
          .filter(c => c.parentId === b.categoryId)
          .map(c => c.id);
        spent = expensesThisMonth
          .filter(t => t.categoryId === b.categoryId || subCategoryIds.includes(t.categoryId))
          .reduce((sum, t) => sum + t.amount, 0);
      }

      if (b.amount > 0) {
        const percentage = (spent / b.amount) * 100;
        const categoryName = b.categoryId === 'all'
          ? 'Tổng ngân sách'
          : categories.find(c => c.id === b.categoryId)?.name || 'Chi tiêu';

        const toastDetails = (threshold: 80 | 90 | 100) => {
          const storageKey = `budget_notified_${user.uid}_${currentMonthStr}_${b.id || b.categoryId}_${b.amount}_${threshold}`;
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, 'true');

            const limitStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.amount);
            const spentStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(spent);
            const percentStr = Math.round(percentage);

            const isExceeded = threshold === 100;
            const borderColors = threshold === 100 
              ? 'border-red-600 dark:border-red-500' 
              : threshold === 90 
                ? 'border-rose-500' 
                : 'border-amber-500';
            const iconSymbol = threshold === 100 ? '🚨' : threshold === 90 ? '⚠️' : 'ℹ️';
            const titleText = threshold === 100 
              ? 'Vượt hạn mức chi tiêu!' 
              : `Cảnh báo hạn mức (${percentStr}%)`;

            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-slate-800 p-4 border-l-4 ${borderColors} transition-all duration-300`}
              >
                <div className="flex-1 w-0">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <span className="text-xl">{iconSymbol}</span>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {titleText}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                        Ngân sách <span className="font-semibold text-slate-800 dark:text-slate-200">"{categoryName}"</span> tháng này đạt <span className="font-semibold p-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400">{spentStr}</span>, {isExceeded ? `đã vượt quá hạn mức (${limitStr})` : `đạt ${percentStr}% hạn mức (${limitStr})`}.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      setActiveView('budgets' as any);
                    }}
                    className="text-[#1DBF73] text-xs font-bold hover:underline shrink-0 self-center mr-2 select-none"
                  >
                    Xem
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-transparent rounded-lg p-1 inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
                  >
                    <span className="sr-only">Đóng</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ), { duration: 6000 });
          }
        };

        if (percentage >= 100) {
          toastDetails(100);
        } else if (percentage >= 90) {
          toastDetails(90);
        } else if (percentage >= 80) {
          toastDetails(80);
        }
      }
    });

  }, [budgets, transactions, categories, user]);

  // Alert upcoming recurring payments
  useEffect(() => {
    if (isLoading || !user) return;

    const storageKey = `recurring_templates_${user.uid}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const templates: RecurringTemplate[] = JSON.parse(saved);
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayDate = new Date(todayStr);

      const itemsNearDue: { note: string; amountText: string; daysLeft: number }[] = [];

      templates.forEach(t => {
        if (!t.isActive) return;
        const nextDueStr = t.nextDueDate.slice(0, 10);
        const tDate = new Date(nextDueStr);
        const diffTime = tDate.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 3) {
          const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.amount);
          itemsNearDue.push({
            note: t.note,
            amountText: formattedAmount,
            daysLeft: diffDays
          });
        }
      });

      if (itemsNearDue.length > 0) {
        const notifyStorageKey = `recurring_near_due_notified_${user.uid}_${todayStr}`;
        if (!localStorage.getItem(notifyStorageKey)) {
          localStorage.setItem(notifyStorageKey, 'true');

          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-slate-800 p-4 border-l-4 border-emerald-500 transition-all duration-300`}
              style={{ borderLeftColor: '#1DBF73' }}
            >
              <div className="flex-1 w-0 flex flex-col justify-center">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <span className="text-xl">📅</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Nhắc nhở hóa đơn sắp đến hạn!
                    </p>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {itemsNearDue.map((item, idx) => (
                        <p key={idx} className="leading-relaxed">
                          • <span className="font-semibold text-slate-800 dark:text-slate-200">"{item.note}"</span> ({item.amountText}) {item.daysLeft === 0 ? 'đến hạn hôm nay' : `đến hạn sau ${item.daysLeft} ngày`}.
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex items-center">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setActiveView('recurring' as any);
                  }}
                  className="text-[#1DBF73] text-xs font-bold hover:underline shrink-0 mr-2 select-none"
                >
                  Xem
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-transparent rounded-lg p-1 inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
                >
                  <span className="sr-only">Đóng</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ), { duration: 8000 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [isLoading, user]);

  // Auto-trigger recurring transactions
  useEffect(() => {
    if (isLoading || !user || wallets.length === 0 || categories.length === 0) return;

    const runAutoRecurrence = async () => {
      const storageKey = `recurring_templates_${user.uid}`;
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;

      try {
        const templates: RecurringTemplate[] = JSON.parse(saved);
        let hasChanges = false;
        const updatedTemplates = [...templates];

        const todayStr = new Date().toISOString().slice(0, 10);

        for (let i = 0; i < updatedTemplates.length; i++) {
          const t = updatedTemplates[i];
          if (!t.isActive) continue;

          const nextDueStr = t.nextDueDate.slice(0, 10);
          
          if (todayStr >= nextDueStr) {
            const wallet = wallets.find(w => w.id === t.walletId);
            if (!wallet) continue;

            const category = categories.find(c => c.id === t.categoryId);
            if (!category) continue;

            // Prevent infinite auto cycles by skipping if we already ran today
            if (t.lastCreatedDate === todayStr) return;

            // Log transaction into Firestore
            await addTransaction({
              type: t.type,
              amount: t.amount,
              categoryId: t.categoryId,
              walletId: t.walletId,
              note: `${t.note} (Định kỳ tự động)`,
              date: new Date(t.nextDueDate).toISOString()
            }, wallet.balance);

            toast.success(`Đã tự động ghi nhận thành công: "${t.note}" (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.amount)})`, { 
              id: `auto_tx_created_${t.id}`,
              duration: 5000 
            });

            const nextDue = calculateNextDueDate(t.nextDueDate, t.frequency);

            updatedTemplates[i] = {
              ...t,
              lastCreatedDate: todayStr,
              nextDueDate: nextDue,
            };
            hasChanges = true;
          }
        }

        if (hasChanges) {
          localStorage.setItem(storageKey, JSON.stringify(updatedTemplates));
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra giao dịch định kỳ:', err);
      }
    };

    // Run check once
    runAutoRecurrence();
  }, [isLoading, user, wallets, categories]);

  if (loading) {
    return (
      <div className="flex justify-center bg-slate-50 dark:bg-slate-950 min-h-[100dvh]">
        <div className="flex items-center justify-center w-full h-[100dvh]">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center bg-slate-50 dark:bg-slate-950 min-h-[100dvh] p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-2 animate-in fade-in zoom-in-95 duration-350">
          <LoginView />
          <Toaster position="top-center" />
        </div>
      </div>
    );
  }

  if (hasPin && isAppLocked) {
    return (
      <div className="flex justify-center items-center bg-slate-50 dark:bg-slate-950 min-h-[100dvh] p-4">
        <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <PinLockView mode="unlock" onUnlock={() => setIsAppLocked(false)} />
          <Toaster position="top-center" />
        </div>
      </div>
    );
  }

  const fetchData = async () => {}; // Used by some components temporarily

  const isAdmin = user?.email === 'mosteamvn@gmail.com';

  const navItems = [
    { id: 'home', icon: Home, label: 'Trang chủ' },
    { id: 'transactions', icon: List, label: 'Giao dịch' },
    { id: 'add', icon: PlusCircle, label: 'Thêm', special: true },
    { id: 'statistics', icon: PieChart, label: 'Thống kê' },
    { id: 'profile', icon: User, label: 'Cá nhân' },
  ];

  // Grouped Navigation Items matching Nabe Money and Nabe Account sections
  const nabeMoneyItems = [
    { id: 'home', icon: Home, label: 'Bản tin Trang chủ' },
    { id: 'transactions', icon: List, label: 'Lịch sử dòng tiền' },
    { id: 'statistics', icon: PieChart, label: 'Thống kê & Biểu đồ' },
    { id: 'insider', icon: Bot, label: 'Trợ lý tài chính AI' },
    { id: 'budgets', icon: Target, label: 'Mục tiêu ngân sách' },
    { id: 'recurring', icon: RefreshCw, label: 'Giao dịch định kỳ' },
    { id: 'wallets', icon: User, label: 'Ví & Tài khoản', isWallet: true },
    { id: 'categories', icon: List, label: 'Danh mục chi tiêu', isCategory: true },
  ];

  const nabeAccountItems = [
    { id: 'premium', icon: Sparkles, label: 'Dịch vụ liên kết' },
    { id: 'nabe-accounts', icon: Package, label: 'Kho Account' },
  ];

  const utilityItems = [
    { id: 'calendar', icon: Calendar, label: 'Lịch vạn niên & Tử vi' },
  ];

  return (
    <div className="w-full h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex overflow-hidden">
      
      {/* 1. PROFESSIONAL DESKTOP SIDEBAR (Visible only on md screens and up) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-850 h-full shrink-0 z-45 select-none">
        
        {/* Elegant top logo header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1DBF73] text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-[#1DBF73]/20 shrink-0">
              N
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-950 dark:text-white tracking-tight uppercase">Nabe Group</h1>
              <p className="text-[10px] text-[#1DBF73] font-extrabold tracking-widest uppercase">Finance &amp; Subscription</p>
            </div>
          </div>
        </div>

        {/* Sidebar Middle Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 hide-scrollbar">
          
          {/* SECTION 1: NABE MONEY */}
          <div className="space-y-1">
            <span className="px-3.5 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest block mb-2 font-mono">1. Nabe Money</span>
            {nabeMoneyItems.map(item => {
              const isActive = activeView === item.id || 
                (item.isCategory && activeView === 'categories') || 
                (item.isWallet && activeView === 'wallets');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ViewState)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] group relative",
                    isActive 
                      ? "bg-[#1DBF73]/10 text-[#1DBF73]" 
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <item.icon size={16} className={cn("stroke-2 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-[#1DBF73]" : "text-slate-400 dark:text-slate-500")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1DBF73]" />}
                </button>
              );
            })}
          </div>

          {/* SECTION 2: NABE ACCOUNT */}
          <div className="space-y-1">
            <span className="px-3.5 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest block mb-2 font-mono">2. Nabe Account</span>
            {nabeAccountItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ViewState)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] group relative",
                    isActive 
                      ? "bg-blue-500/10 text-blue-500" 
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <item.icon size={16} className={cn("stroke-2 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-blue-500" : "text-slate-400 dark:text-slate-500")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </button>
              );
            })}
          </div>

          {/* SECTION 3: UTILITIES */}
          <div className="space-y-1">
            <span className="px-3.5 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-2 font-mono">3. Tiện ích &amp; Hệ thống</span>
            {utilityItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ViewState)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] group relative",
                    isActive 
                      ? "bg-slate-500/10 text-slate-850 dark:text-slate-100" 
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <item.icon size={16} className={cn("stroke-2 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-slate-900 dark:text-slate-200" : "text-slate-400 dark:text-slate-500")} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-500" />}
                </button>
              );
            })}

            {isAdmin && (
              <button
                onClick={() => setActiveView('admin')}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] group mt-1.5 relative border border-dashed border-rose-500/10",
                  activeView === 'admin' 
                    ? "bg-rose-500/10 text-rose-500" 
                    : "text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-450 hover:bg-rose-500/5"
                )}
              >
                <div className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] uppercase font-black shrink-0">A</div>
                <span className="truncate">Hệ Thống Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Footer - Account Profile info & Theme Switcher */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-1.5 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1DBF73] to-emerald-500 flex items-center justify-center font-bold text-white text-xs shrink-0 select-none">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.displayName || 'Thành viên'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-semibold leading-none">{user?.email}</p>
              </div>
            </div>

            {/* Dark & Light toggler inside left bar footer */}
            <button 
              onClick={toggleTheme}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-250/20 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#1DBF73] transition-colors shrink-0 shadow-sm"
              title="Chuyển đổi sáng/tối"
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>

          <button 
            onClick={logout}
            className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-rose-500/10"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* 2. MAIN ACTIVE VIEW AREA (Responsive full size layout) */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Floating Add Transaction FAB for PC viewports */}
        <button
          onClick={() => {
            setEditingTransaction(null);
            setIsAddModalOpen(true);
          }}
          className="hidden md:flex absolute bottom-8 right-8 z-[48] bg-[#1DBF73] hover:bg-emerald-600 text-white rounded-full p-4 pl-4.5 pr-5.5 shadow-xl shadow-emerald-500/25 hover:-translate-y-0.5 active:scale-95 transition-all duration-250 group items-center gap-2"
        >
          <PlusCircle size={18} className="transition-transform group-hover:rotate-90 duration-300" />
          <span className="text-xs font-black uppercase tracking-wider">Thêm giao dịch</span>
        </button>

        {/* Dynamic Inner Content Loader */}
        <div className="flex-1 overflow-y-auto relative w-full h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DBF73]"></div>
            </div>
          ) : (
            <div className="w-full h-full">
              {activeView === 'home' && (
                <DashboardView 
                  wallets={wallets} 
                  transactions={transactions} 
                  budgets={budgets} 
                  categories={categories} 
                  nabeAccounts={nabeAccounts}
                  user={user} 
                  setActiveView={setActiveView} 
                />
              )}
              {activeView === 'transactions' && (
                <TransactionsView 
                  transactions={transactions} 
                  wallets={wallets}
                  initialWalletId={selectedWalletIdForFilter}
                  onDataChange={fetchData} 
                  onEditTransaction={(tx) => {
                    setEditingTransaction(tx);
                    setIsAddModalOpen(true);
                  }}
                />
              )}
              {activeView === 'statistics' && <StatisticsView transactions={transactions} categories={categories} wallets={wallets} setActiveView={setActiveView} />}
              {activeView === 'profile' && <ProfileView setActiveView={setActiveView} />}
            </div>
          )}
        </div>

        {/* 3. MOBILE ONLY BOTTOM MENU */}
        <nav className="flex md:hidden absolute bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 px-4 z-40">
          <div className="w-full">
            <ul className="flex justify-between items-center h-14">
              {navItems.map((item) => (
                <li key={item.id} className="flex-1">
                  {item.special ? (
                    <button 
                      onClick={() => {
                        setEditingTransaction(null);
                        setIsAddModalOpen(true);
                      }}
                      className="w-full flex justify-center items-center -mt-6"
                    >
                      <div className="bg-[#1DBF73] text-white rounded-full p-3.5 border-4 border-slate-50 dark:border-slate-950 shadow-xl shadow-[#1DBF73]/30 hover:scale-105 active:scale-95 transition-transform">
                        <item.icon size={24} />
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveView(item.id as ViewState)}
                      className={cn(
                        "w-full flex flex-col items-center justify-center gap-1 transition-colors",
                        highlightedView === item.id 
                          ? "text-[#1DBF73]" 
                          : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200"
                      )}
                    >
                      <item.icon size={24} className={cn(highlightedView === item.id && "fill-[#1DBF73]/20")} strokeWidth={highlightedView === item.id ? 2.5 : 2} />
                      <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Fullscreen Overlay Views (In mobile layout they are fullscreen relative to window, on PC they stack cleanly inside this view domain) */}
        {!isLoading && (
          <>
            {activeView === 'categories' && <CategoriesView categories={categories} onDataChange={fetchData} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'wallets' && <WalletsView wallets={wallets} categories={categories} setActiveView={setActiveView} onSelectWalletForFilter={setSelectedWalletIdForFilter} previousView={previousView || undefined} />}
            {activeView === 'nabe-accounts' && <NabeAccountInventoryView nabeAccounts={nabeAccounts} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'budgets' && <BudgetsView transactions={transactions} categories={categories} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'insider' && <MoneyInsiderView transactions={transactions} wallets={wallets} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'admin' && <AdminView setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'premium' && <PremiumView nabeAccounts={nabeAccounts} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'recurring' && <RecurringView transactions={transactions} categories={categories} wallets={wallets} setActiveView={setActiveView} previousView={previousView || undefined} />}
            {activeView === 'calendar' && <CalendarView setActiveView={setActiveView} previousView={previousView || undefined} />}
          </>
        )}

      </div>

      {/* Unified Modals and Toasters */}
      <Toaster position="top-center" />
      <ErrorBoundary>
        <AddTransactionModal 
          isOpen={isAddModalOpen} 
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingTransaction(null);
          }} 
          wallets={wallets}
          categories={categories}
          onSuccess={fetchData}
          editingTransaction={editingTransaction}
          transactions={transactions}
        />
      </ErrorBoundary>
    </div>
  );
}
