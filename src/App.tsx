import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Home, List, PieChart, User, PlusCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { Transaction, Wallet, Category, Budget } from './types';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import StatisticsView from './views/StatisticsView';
import ProfileView from './views/ProfileView';
import CategoriesView from './views/CategoriesView';
import WalletsView from './views/WalletsView';
import AddTransactionModal from './components/AddTransactionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import BudgetsView from './views/BudgetsView';
import MoneyInsiderView from './views/MoneyInsiderView';
import AdminView from './views/AdminView';
import PremiumView from './views/PremiumView';
import { useAuth } from './contexts/AuthContext';
import LoginView from './views/LoginView';
import { subscribeWallets, subscribeCategories, subscribeTransactions, subscribeBudgets, initializeUserData, addTransaction } from './lib/api';
import PinLockView from './components/PinLockView';
import RecurringView from './views/RecurringView';
import { calculateNextDueDate, RecurringTemplate } from './utils/recurrenceDetector';
import CalendarView from './views/CalendarView';

export type ViewState = 'home' | 'transactions' | 'statistics' | 'profile' | 'categories' | 'wallets' | 'budgets' | 'insider' | 'admin' | 'premium' | 'recurring' | 'calendar';

export default function App() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);

  // Reset lock state when user logs out
  useEffect(() => {
    if (!user) {
      setIsAppLocked(true);
    }
  }, [user]);

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
          
          unsubscribes.push(unsubWallets, unsubCategories, unsubTransactions, unsubBudgets);
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

  const navItems = [
    { id: 'home', icon: Home, label: 'Trang chủ' },
    { id: 'transactions', icon: List, label: 'Giao dịch' },
    { id: 'add', icon: PlusCircle, label: 'Thêm', special: true },
    { id: 'statistics', icon: PieChart, label: 'Thống kê' },
    { id: 'profile', icon: User, label: 'Cá nhân' },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl h-[100dvh] bg-slate-50 dark:bg-slate-950 md:shadow-lg relative overflow-hidden flex flex-col md:border-x md:border-slate-100 md:dark:border-slate-900">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="w-full h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <>
                {activeView === 'home' && (
                  <DashboardView 
                    wallets={wallets} 
                    transactions={transactions} 
                    budgets={budgets} 
                    categories={categories} 
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
              </>
            )}
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 px-4 z-40">
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
                      <div className="bg-[#1DBF73] text-white rounded-full p-3.5 border-4 border-slate-100 dark:border-slate-900 shadow-xl shadow-[#1DBF73]/30 hover:scale-105 active:scale-95 transition-transform">
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

        {/* Fullscreen Overlay Views */}
        {!isLoading && (
          <>
            {activeView === 'categories' && <CategoriesView categories={categories} onDataChange={fetchData} setActiveView={setActiveView} />}
            {activeView === 'wallets' && <WalletsView wallets={wallets} categories={categories} setActiveView={setActiveView} onSelectWalletForFilter={setSelectedWalletIdForFilter} />}
            {activeView === 'budgets' && <BudgetsView transactions={transactions} categories={categories} setActiveView={setActiveView} />}
            {activeView === 'insider' && <MoneyInsiderView transactions={transactions} wallets={wallets} setActiveView={setActiveView} />}
            {activeView === 'admin' && <AdminView setActiveView={setActiveView} />}
            {activeView === 'premium' && <PremiumView setActiveView={setActiveView} />}
            {activeView === 'recurring' && <RecurringView transactions={transactions} categories={categories} wallets={wallets} setActiveView={setActiveView} />}
            {activeView === 'calendar' && <CalendarView setActiveView={setActiveView} />}
          </>
        )}

        {/* Modals & Toasters */}
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
    </div>
  );
}
