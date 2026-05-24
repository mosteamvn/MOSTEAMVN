import { useState, useMemo } from 'react';
import { format, isSameDay, isThisWeek, isThisMonth, isThisYear, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import toast from 'react-hot-toast';
import { Trash2, Filter } from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  onDataChange: () => void;
}

type FilterType = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';

export default function TransactionsView({ transactions, onDataChange }: TransactionsViewProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xoá giao dịch');
        onDataChange();
      } else {
        toast.error('Xoá giao dịch thất bại');
      }
    } catch (e) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredTransactionsList = useMemo(() => {
    return transactions.filter(tx => {
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
  }, [transactions, filterType, customStartDate, customEndDate]);

  // Group transactions by date
  const groupedTransactions: { date: Date; items: Transaction[] }[] = [];
  
  filteredTransactionsList.forEach(tx => {
    const txDate = new Date(tx.date);
    const existingGroup = groupedTransactions.find(g => isSameDay(g.date, txDate));
    if (existingGroup) {
      existingGroup.items.push(tx);
    } else {
      groupedTransactions.push({ date: txDate, items: [tx] });
    }
  });

  return (
    <div className="p-5 space-y-5">
      <header className="py-2 mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Giao dịch</h1>
        <button 
          onClick={() => setShowFilter(!showFilter)}
          className={cn("p-2 rounded-full transition-colors", showFilter ? "bg-[#1DBF73] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
        >
          <Filter size={18} />
        </button>
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
                  <div key={tx.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: tx.category?.color + '15', color: tx.category?.color }}
                      >
                        <DynamicIcon name={tx.category?.icon || 'Circle'} size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tx.category?.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tx.note || tx.wallet?.name}</p>
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
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        disabled={isDeleting === tx.id}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-2 -mr-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Transaction"
                      >
                         <Trash2 size={16} />
                      </button>
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
