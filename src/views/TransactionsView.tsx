import { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, isThisWeek, isThisMonth, isThisYear, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Transaction, Wallet } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { Filter, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransactionsViewProps {
  transactions: Transaction[];
  wallets?: Wallet[];
  initialWalletId?: string;
  onDataChange: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

type FilterType = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';

export default function TransactionsView({ transactions, wallets = [], initialWalletId = 'all', onDataChange, onEditTransaction }: TransactionsViewProps) {
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(initialWalletId);

  useEffect(() => {
    setSelectedWalletId(initialWalletId);
  }, [initialWalletId]);

  const filteredTransactionsList = useMemo(() => {
    return transactions.filter(tx => {
      // Wallet filter
      if (selectedWalletId !== 'all' && tx.walletId !== selectedWalletId) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNote = tx.note?.toLowerCase().includes(query);
        const matchesCategory = tx.category?.name?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesNote && !matchesCategory && !matchesAmount) return false;
      }

      // Date filter
      const txDate = new Date(tx.date);
      if (filterType === 'all') return true;
      if (filterType === 'day') return isSameDay(txDate, new Date());
      if (filterType === 'week') return isThisWeek(txDate, { weekStartsOn: 1 });
      if (filterType === 'month') return isThisMonth(txDate);
      if (filterType === 'year') return isThisYear(txDate);
      if (filterType === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return isWithinInterval(txDate, { start, end });
      }
      return true;
    });
  }, [transactions, filterType, customStartDate, customEndDate, searchQuery, selectedWalletId]);

  const handleExportCSV = () => {
    if (filteredTransactionsList.length === 0) {
      toast.error('Không có giao dịch nào để xuất!');
      return;
    }

    try {
      // CSV Headers
      const headers = ['Ngày giao dịch', 'Hạng mục', 'Loại giao dịch', 'Ví tài khoản', 'Số tiền (VND)', 'Ghi chú'];
      
      // Map transactions data
      const rows = filteredTransactionsList.map(tx => {
        const dateStr = format(new Date(tx.date), 'dd/MM/yyyy HH:mm', { locale: vi });
        const categoryName = tx.category?.name || 'Khác';
        const typeStr = tx.type === 'income' ? 'Khoản thu' : tx.type === 'expense' ? 'Khoản chi' : 'Ghi nợ';
        const walletName = tx.wallet?.name || '';
        const amountStr = tx.amount.toString();
        const noteStr = (tx.note || '').replace(/"/g, '""'); // Escape double quotes

        return [
          `"${dateStr}"`,
          `"${categoryName}"`,
          `"${typeStr}"`,
          `"${walletName}"`,
          amountStr,
          `"${noteStr}"`
        ];
      });

      // Assemble CSV string
      const csvStr = [headers.join(','), ...rows.map(line => line.join(','))].join('\n');
      
      // UTF-8 BOM indicator so Excel displays Vietnamese correctly
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      const fileDateSuffix = format(new Date(), 'dd-MM-yyyy_HHmmss');
      link.setAttribute('download', `giao_dich_${filterType}_${fileDateSuffix}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Đã xuất thành công ${filteredTransactionsList.length} giao dịch sang CSV!`);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi tải file CSV: ' + err.message);
    }
  };

  const formatTimeStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const hrs = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${hrs}:${mins}`;
    } catch {
      return '';
    }
  };

  // Group transactions by date
  const groupedTransactions: { date: Date; items: Transaction[] }[] = [];
  
  // Sort the filtered list descending to guarantee correct order (latest first)
  const sortedAndFiltered = [...filteredTransactionsList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedAndFiltered.forEach(tx => {
    const txDate = new Date(tx.date);
    const existingGroup = groupedTransactions.find(g => isSameDay(g.date, txDate));
    if (existingGroup) {
      existingGroup.items.push(tx);
    } else {
      groupedTransactions.push({ date: txDate, items: [tx] });
    }
  });

  const { openingBalance, closingBalance, netChange } = useMemo(() => {
    let periodStart: Date | null = null;
    const now = new Date();

    if (filterType === 'day') {
      periodStart = startOfDay(now);
    } else if (filterType === 'week') {
      periodStart = startOfWeek(now, { weekStartsOn: 1 });
    } else if (filterType === 'month') {
      periodStart = startOfMonth(now);
    } else if (filterType === 'year') {
      periodStart = startOfYear(now);
    } else if (filterType === 'custom') {
      if (customStartDate) {
        periodStart = new Date(customStartDate);
      }
    }

    const getSignedAmount = (tx: Transaction) => {
      const isPositive = tx.type === 'income' || (tx.type === 'debt' && ['9', '10'].includes(tx.categoryId));
      return isPositive ? tx.amount : -tx.amount;
    };

    let opening = 0;
    if (filterType === 'all') {
      opening = 0;
    } else if (periodStart) {
      opening = transactions
        .filter(tx => {
          if (selectedWalletId !== 'all' && tx.walletId !== selectedWalletId) return false;
          return new Date(tx.date) < periodStart!;
        })
        .reduce((sum, tx) => sum + getSignedAmount(tx), 0);
    }

    const net = filteredTransactionsList.reduce((sum, tx) => sum + getSignedAmount(tx), 0);
    const closing = opening + net;

    return { openingBalance: opening, closingBalance: closing, netChange: net };
  }, [transactions, filteredTransactionsList, filterType, customStartDate]);

  return (
    <div className="px-5 pb-5 space-y-5">
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 -mx-5 px-5 flex items-center justify-between gap-2 border-b border-slate-100/50 dark:border-slate-800/10 mb-2">
        {!showSearch ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Giao dịch</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportCSV}
                className="p-2 rounded-full transition-colors bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#1DBF73]"
                title="Xuất dữ liệu CSV"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-full transition-colors bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <Search size={18} />
              </button>
              <button 
                onClick={() => setShowFilter(!showFilter)}
                className={cn("p-2 rounded-full transition-colors", showFilter ? "bg-[#1DBF73] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
              >
                <Filter size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-right-4">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-white placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <DynamicIcon name="X" size={16} />
            </button>
          </div>
        )}
      </header>

      {showFilter && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'day', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng này' },
              { id: 'year', label: 'Năm nay' },
              { id: 'custom', label: 'Tuỳ chọn' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as FilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  filterType === f.id 
                    ? "bg-[#1DBF73] text-white shadow-sm shadow-[#1DBF73]/20" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Từ ngày</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Đến ngày</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Selector Row with custom icons/colors */}
      {wallets && wallets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none shrink-0 select-none">
          <button
            onClick={() => setSelectedWalletId('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 duration-200 border",
              selectedWalletId === 'all'
                ? "bg-[#1DBF73] border-[#1DBF73] text-white shadow-sm shadow-[#1DBF73]/20 font-black"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <DynamicIcon name="Coins" size={13} />
            Tất cả ví
          </button>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWalletId(w.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 duration-200 border",
                selectedWalletId === w.id
                  ? "text-white font-black shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              style={selectedWalletId === w.id ? { backgroundColor: w.color, borderColor: w.color } : {}}
            >
              <DynamicIcon name={w.icon || 'Wallet'} size={13} />
              {w.name}
            </button>
          ))}
        </div>
      )}

      {/* Balance Summary Section */}
      <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-sm border border-slate-100/80 dark:border-slate-800/50 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DBF73]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
        <div className="space-y-2.5 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Số dư đầu</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(openingBalance)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Số dư cuối</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(closingBalance)}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <div className="text-right">
              <p className={cn(
                "text-lg font-black tracking-tight",
                netChange >= 0 ? "text-[#1DBF73]" : "text-slate-900 dark:text-white"
              )}>
                {netChange > 0 ? '+' : ''}{formatCurrency(netChange)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 text-center relative z-10">
          <button className="text-[11px] font-bold text-[#f59e0b] hover:opacity-80 transition-all uppercase tracking-wider bg-[#f59e0b]/10 px-4 py-1.5 rounded-full">
            Xem báo cáo cho giai đoạn này
          </button>
        </div>
      </div>

      {groupedTransactions.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <DynamicIcon name="Receipt" size={32} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white">Chưa có giao dịch nào</p>
          <p className="text-sm">Các giao dịch của bạn sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedTransactions.map(group => (
            <div key={group.date.toISOString()}>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">
                {format(group.date, 'EEEE, dd MMMM yyyy', { locale: vi })}
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50">
                {group.items.map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => onEditTransaction?.(tx)}
                    className="p-4 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 active:scale-[0.99] transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={tx.category?.color ? { backgroundColor: tx.category.color + '15', color: tx.category.color } : {}}
                      >
                        <DynamicIcon name={tx.category?.icon || 'Circle'} size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tx.category?.name}</p>
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            {formatTimeStr(tx.date)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {tx.note ? `${tx.note} • ${tx.wallet?.name || ''}` : (tx.wallet?.name || '')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-6"></div>
    </div>
  );
}
