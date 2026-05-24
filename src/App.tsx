import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Home, List, PieChart, User, PlusCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { Transaction, Wallet, Category } from './types';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import StatisticsView from './views/StatisticsView';
import ProfileView from './views/ProfileView';
import CategoriesView from './views/CategoriesView';
import WalletsView from './views/WalletsView';
import AddTransactionModal from './components/AddTransactionModal';

export type ViewState = 'home' | 'transactions' | 'statistics' | 'profile' | 'categories' | 'wallets';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // App Data State
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [wRes, cRes, tRes] = await Promise.all([
        fetch('/api/wallets'),
        fetch('/api/categories'),
        fetch('/api/transactions')
      ]);
      setWallets(await wRes.json());
      setCategories(await cRes.json());
      setTransactions(await tRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'home', icon: Home, label: 'Trang chủ' },
    { id: 'transactions', icon: List, label: 'Giao dịch' },
    { id: 'add', icon: PlusCircle, label: 'Thêm', special: true },
    { id: 'statistics', icon: PieChart, label: 'Thống kê' },
    { id: 'profile', icon: User, label: 'Cá nhân' },
  ];

  return (
    <div className="flex justify-center bg-slate-100 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 min-h-screen shadow-xl relative overflow-hidden flex flex-col">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              {activeView === 'home' && <DashboardView wallets={wallets} transactions={transactions} setActiveView={setActiveView} />}
              {activeView === 'transactions' && <TransactionsView transactions={transactions} onDataChange={fetchData} />}
              {activeView === 'statistics' && <StatisticsView transactions={transactions} />}
              {activeView === 'profile' && <ProfileView setActiveView={setActiveView} />}
              {activeView === 'categories' && <CategoriesView categories={categories} onDataChange={fetchData} setActiveView={setActiveView} />}
              {activeView === 'wallets' && <WalletsView wallets={wallets} setActiveView={setActiveView} />}
            </>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 px-2 z-40">
          <ul className="flex justify-between items-center h-14">
            {navItems.map((item) => (
              <li key={item.id} className="flex-1">
                {item.special ? (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
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
                      activeView === item.id 
                        ? "text-[#1DBF73]" 
                        : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon size={24} className={cn(activeView === item.id && "fill-[#1DBF73]/20")} strokeWidth={activeView === item.id ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Modals & Toasters */}
        <Toaster position="top-center" />
        <AddTransactionModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          wallets={wallets}
          categories={categories}
          onSuccess={fetchData}
        />
      </div>
    </div>
  );
}
