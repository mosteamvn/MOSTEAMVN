import { useState, useMemo } from 'react';
import { formatCurrency } from '../lib/utils';
import { Wallet, Transaction } from '../types';
import { DynamicIcon } from '../components/DynamicIcon';
import { format, isThisMonth } from 'date-fns';
import { Search, X } from 'lucide-react';

interface DashboardViewProps {
  wallets: Wallet[];
  transactions: Transaction[];
  setActiveView: (view: 'wallets' | 'transactions' | any) => void;
}

export default function DashboardView({ wallets, transactions, setActiveView }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  
  const currentMonthTransactions = transactions.filter(t => isThisMonth(new Date(t.date)));
  const incomeThisMonth = currentMonthTransactions
    .filter(t => t.type === 'income' || (t.type === 'debt' && ['9', '10'].includes(t.categoryId)))
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseThisMonth = currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId)))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const recentTransactions = transactions.slice(0, 5);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return transactions.filter(tx => {
      const matchesNote = tx.note?.toLowerCase().includes(query);
      const matchesCategory = tx.category?.name?.toLowerCase().includes(query);
      const matchesAmount = tx.amount.toString().includes(query);
      return matchesNote || matchesCategory || matchesAmount;
    });
  }, [searchQuery, transactions]);

  return (
    <div className="px-5 pb-5 space-y-6">
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 -mx-5 px-5 flex justify-between items-center gap-4 border-b border-slate-100/50 dark:border-slate-800/10">
        {!isSearching ? (
          <>
            <div>
              <p className="text-slate-400 text-sm font-medium tracking-wide">Tổng số dư</p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(totalBalance)}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSearching(true)}
                className="w-11 h-11 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-full border border-[#1DBF73]/50 shadow-sm shadow-[#1DBF73]/10 animate-in fade-in slide-in-from-right-4">
            <Search size={20} className="text-[#1DBF73]" />
            <input 
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm giao dịch, số tiền..."
              className="flex-1 bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white"
            />
            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X size={18} />
            </button>
          </div>
        )}
      </header>

      {isSearching ? (
        <section className="animate-in fade-in">
          <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-wider uppercase">Kết quả tìm kiếm</h2>
          <div className="space-y-3">
            {searchResults.map(tx => (
              <div key={tx.id} className="group bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-[#1DBF73]/30 transition-colors cursor-pointer" onClick={() => setActiveView('transactions')}>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center opacity-90 shadow-sm"
                    style={{ backgroundColor: tx.category?.color + '15', color: tx.category?.color }}
                  >
                    <DynamicIcon name={tx.category?.icon || 'Circle'} size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tx.category?.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tx.note || format(new Date(tx.date), 'dd MMM yyyy')} • {tx.wallet?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    tx.type === 'income' || (tx.type === 'debt' && ['9', '10'].includes(tx.categoryId)) 
                      ? 'text-[#1DBF73]' 
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {tx.type === 'income' || (tx.type === 'debt' && ['9', '10'].includes(tx.categoryId)) ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">
                Không tìm thấy giao dịch nào phù hợp
              </div>
            )}
            {!searchQuery && (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">
                Nhập từ khóa để bắt đầu tìm kiếm
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Summary Cards */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#1DBF73] to-[#0D9488] p-5 flex flex-col justify-center shadow-lg shadow-[#1DBF73]/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <p className="text-white text-lg font-bold mb-4 relative z-10">Dòng tiền tháng</p>
        <div className="flex flex-col gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-3.5 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <DynamicIcon name="ArrowDownToLine" size={14} className="text-white" />
              </div>
              <p className="text-xs text-white/90 font-bold uppercase tracking-widest">Thu nhập</p>
            </div>
            <p className="text-lg font-bold text-white tracking-tight">{formatCurrency(incomeThisMonth)}</p>
          </div>
          <div className="bg-black/10 backdrop-blur-md rounded-lg p-3.5 flex items-center justify-between border border-black/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                <DynamicIcon name="ArrowUpFromLine" size={14} className="text-white" />
              </div>
              <p className="text-xs text-white/90 font-bold uppercase tracking-widest">Chi tiêu</p>
            </div>
            <p className="text-lg font-bold text-white tracking-tight">{formatCurrency(expenseThisMonth)}</p>
          </div>
        </div>
      </div>

      {/* Wallets */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">Ví của tôi</h2>
          <button onClick={() => setActiveView('wallets')} className="text-[#1DBF73] text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">Xem tất cả</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {wallets.map(wallet => (
            <div 
              key={wallet.id} 
              className="rounded-xl p-4 text-white relative overflow-hidden shadow-sm"
              style={{ backgroundColor: wallet.color }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                <DynamicIcon name={wallet.icon} size={64} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <DynamicIcon name={wallet.icon} size={16} />
                </div>
                <div>
                  <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider line-clamp-1">{wallet.name}</p>
                  <p className="font-bold text-sm sm:text-base break-words leading-tight mt-1">{formatCurrency(wallet.balance)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">Giao dịch gần đây</h2>
          <button onClick={() => setActiveView('transactions')} className="text-slate-400 text-xs font-medium hover:text-[#1DBF73] transition-colors">Xem toàn bộ</button>
        </div>
        <div className="space-y-3">
          {recentTransactions.map(tx => (
            <div key={tx.id} className="group bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-[#1DBF73]/30 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center opacity-90 shadow-sm"
                  style={{ backgroundColor: tx.category?.color + '15', color: tx.category?.color }}
                >
                  <DynamicIcon name={tx.category?.icon || 'Circle'} size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tx.category?.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tx.note || format(new Date(tx.date), 'dd MMM yyyy')} • {tx.wallet?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${
                  tx.type === 'income' || (tx.type === 'debt' && ['9', '10'].includes(tx.categoryId)) 
                    ? 'text-[#1DBF73]' 
                    : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {tx.type === 'income' || (tx.type === 'debt' && ['9', '10'].includes(tx.categoryId)) ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              Không có giao dịch gần đây
            </div>
          )}
        </div>
      </section>
      
      {/* Spacer for bottom nav */}
      <div className="h-6"></div>
      </>
      )}
    </div>
  );
}
