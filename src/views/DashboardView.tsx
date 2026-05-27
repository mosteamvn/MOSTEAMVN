import { useState, useMemo } from 'react';
import { formatCurrency, cn } from '../lib/utils';
import { Wallet, Transaction } from '../types';
import { DynamicIcon } from '../components/DynamicIcon';
import { format, isThisMonth, isThisWeek } from 'date-fns';
import { 
  Search, 
  X, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight, 
  Bot, 
  Lightbulb, 
  ArrowRight,
  PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

interface DashboardViewProps {
  wallets: Wallet[];
  transactions: Transaction[];
  setActiveView: (view: 'wallets' | 'transactions' | 'statistics' | 'insider' | any) => void;
}

export default function DashboardView({ wallets, transactions, setActiveView }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Persisted show/hide balance toggle state
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('hb_show_balance');
    return saved !== 'false';
  });

  const toggleBalance = () => {
    const next = !showBalance;
    setShowBalance(next);
    localStorage.setItem('hb_show_balance', String(next));
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  
  const currentMonthTransactions = transactions.filter(t => isThisMonth(new Date(t.date)));
  
  const incomeThisMonth = currentMonthTransactions
    .filter(t => t.type === 'income' || (t.type === 'debt' && ['9', '10'].includes(t.categoryId)))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseThisMonth = currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId)))
    .reduce((sum, t) => sum + t.amount, 0);

  const [recentTab, setRecentTab] = useState<'week' | 'month'>('week');

  // Filter based on tab and slice to maximum 3 transactions
  const filteredRecentTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        if (recentTab === 'week') {
          return isThisWeek(tDate, { weekStartsOn: 1 });
        } else {
          return isThisMonth(tDate);
        }
      })
      .slice(0, 3);
  }, [transactions, recentTab]);

  const [highestSpendingTab, setHighestSpendingTab] = useState<'week' | 'month'>('month');

  // Total expenses for the selected period ('week' or 'month') for percentage calculations
  const expenseThisPeriod = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        const isExpense = t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId));
        if (!isExpense) return false;
        
        if (highestSpendingTab === 'week') {
          return isThisWeek(tDate, { weekStartsOn: 1 });
        } else {
          return isThisMonth(tDate);
        }
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, highestSpendingTab]);

  // Highest spending categories of the week or month dynamic
  const highestSpendings = useMemo(() => {
    const expenseTxs = transactions.filter(t => {
      const tDate = new Date(t.date);
      const isExpense = t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId));
      if (!isExpense) return false;
      
      if (highestSpendingTab === 'week') {
        return isThisWeek(tDate, { weekStartsOn: 1 });
      } else {
        return isThisMonth(tDate);
      }
    });
    const categoryTotals: Record<string, { total: number; category: any }> = {};
    
    expenseTxs.forEach(t => {
      if (!t.category) return;
      if (!categoryTotals[t.categoryId]) {
        categoryTotals[t.categoryId] = { total: 0, category: t.category };
      }
      categoryTotals[t.categoryId].total += t.amount;
    });

    const sortedByAmount = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    return sortedByAmount.slice(0, 3);
  }, [transactions, highestSpendingTab]);

  // Aggregate daily expenses of this month for Recharts
  const monthlyChartData = useMemo(() => {
    const daysInMonth = 31;
    const expensesMap: Record<number, number> = {};
    const incomesMap: Record<number, number> = {};
    
    currentMonthTransactions.forEach(t => {
      try {
        const d = new Date(t.date).getDate();
        if (t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId))) {
          expensesMap[d] = (expensesMap[d] || 0) + t.amount;
        } else if (t.type === 'income' || (t.type === 'debt' && ['9', '10'].includes(t.categoryId))) {
          incomesMap[d] = (incomesMap[d] || 0) + t.amount;
        }
      } catch (e) {
        console.error(e);
      }
    });

    const points = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      return {
        dayLabel: `N${day}`,
        'Chi tiêu': expensesMap[day] || 0,
        'Thu nhập': incomesMap[day] || 0,
      };
    });

    // Sub-sample or filter to keep chart clean if too wide, or just return points with activity
    const activePoints = points.filter(p => p['Chi tiêu'] > 0 || p['Thu nhập'] > 0);
    if (activePoints.length === 0) {
      // Pleasant placeholder chart if no transactions this month
      return [
        { dayLabel: 'N1', 'Chi tiêu': 120000, 'Thu nhập': 450000 },
        { dayLabel: 'N10', 'Chi tiêu': 280000, 'Thu nhập': 120000 },
        { dayLabel: 'N18', 'Chi tiêu': 95000, 'Thu nhập': 620000 },
        { dayLabel: 'N25', 'Chi tiêu': 350000, 'Thu nhập': 100000 },
        { dayLabel: 'N30', 'Chi tiêu': 180000, 'Thu nhập': 50000 },
      ];
    }
    return activePoints;
  }, [currentMonthTransactions]);

  // Search Results
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

  // Smart Money Insider preview local advice
  const insiderPreviewAdvice = useMemo(() => {
    if (expenseThisMonth === 0) {
      return {
        status: "Lên đỉnh điểm",
        percentage: 0,
        tip: "Hãy bắt đầu thêm các giao dịch hôm nay để AI Insider phân tích thói quen dòng tiền của bạn!"
      };
    }
    const ratio = Math.round((expenseThisMonth / (incomeThisMonth || 1)) * 100);
    let tip = "Cơ cấu dòng tiền của bạn đang thặng dư tuyệt vời. Hãy giữ vững phong độ!";
    if (ratio > 80) {
      tip = "Tỷ lệ chi tiêu vượt ngưỡng 80% thu nhập. Nên tối ưu hóa các nhóm tiêu dùng ăn uống, giải trí.";
    } else if (ratio > 50) {
      tip = "Dòng tiền nằm trong giới hạn an toàn, tuy nhiên tích lũy còn khiêm tốn. Đặt hạn mức chi tiêu để bứt phá.";
    }
    return {
      status: ratio > 80 ? "Red Alert" : ratio > 50 ? "Bình thường" : "Khỏe mạnh",
      percentage: ratio,
      tip
    };
  }, [incomeThisMonth, expenseThisMonth]);

  return (
    <div className="px-5 pb-8 space-y-6">
      
      {/* HEADER SECTION with Searching option */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 -mx-5 px-5 flex justify-between items-center gap-4 border-b border-slate-100/50 dark:border-slate-800/10">
        {!isSearching ? (
          <>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Chào mừng trở lại</p>
              <h1 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Cá nhân của bạn</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSearching(true)}
                className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-[#1DBF73]/50 shadow-sm shadow-[#1DBF73]/10 animate-in fade-in duration-200">
            <Search size={18} className="text-[#1DBF73]" />
            <input 
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm giao dịch, số tiền..."
              className="flex-1 bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white text-sm"
            />
            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        )}
      </header>

      {isSearching ? (
        <section className="animate-in fade-in duration-200">
          <h2 className="text-xs font-bold text-slate-500 mb-4 tracking-wider uppercase">Kết quả tìm kiếm</h2>
          <div className="space-y-3">
            {searchResults.map(tx => (
              <div key={tx.id} className="group bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex items-center justify-between hover:border-[#1DBF73]/30 transition-colors cursor-pointer" onClick={() => setActiveView('transactions')}>
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
          
          {/* 1. TỔNG SỐ DƯ (Show/Hide Toggle Eye Button) */}
          <section className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tổng số dư khả dụng</span>
              <button 
                onClick={toggleBalance}
                className="p-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                {showBalance ? (
                  <>
                    <EyeOff size={14} />
                    <span>Ẩn</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span>Xem</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {showBalance ? formatCurrency(totalBalance) : "•••••••• đ"}
              </span>
            </div>
          </section>

          {/* 2. BÁO CÁO THÁNG NÀY DẠNG BIỂU ĐỒ (Click and view stats details) */}
          <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <PieIcon size={16} className="text-[#1DBF73]" />
                  Báo cáo tháng {new Date().getMonth() + 1}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Xem đồ thị dòng tiền</p>
              </div>
              <button 
                onClick={() => setActiveView('statistics')} 
                className="text-[#1DBF73] text-xs font-extrabold uppercase hover:opacity-80 transition-opacity flex items-center gap-0.5"
              >
                Xem chi tiết
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Inflow & Outflow Monthly overview */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#1DBF73]/5 dark:bg-[#1DBF73]/10 p-3 rounded-xl border border-[#1DBF73]/10 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <TrendingDown size={12} className="text-[#1DBF73]" /> Thu nhập
                </span>
                <span className="text-base font-extrabold text-[#1DBF73] mt-1">
                  {showBalance ? formatCurrency(incomeThisMonth) : "•••• đ"}
                </span>
              </div>
              <div className="bg-rose-500/5 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-505/10 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <TrendingUp size={12} className="text-rose-500" /> Chi tiêu
                </span>
                <span className="text-base font-extrabold text-rose-500 mt-1">
                  {showBalance ? formatCurrency(expenseThisMonth) : "•••• đ"}
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DBF73" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1DBF73" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '11px' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area type="monotone" dataKey="Chi tiêu" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorChi)" />
                  <Area type="monotone" dataKey="Thu nhập" stroke="#1DBF73" strokeWidth={2} fillOpacity={1} fill="url(#colorThu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 3. CHI TIÊU NHIỀU NHẤT (With category and details) */}
          <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/10 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Chi tiêu nhiều nhất</h3>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Nhóm dịch vụ chiếm tỷ trọng cao</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Tabs view tuần/tháng */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setHighestSpendingTab('week')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95",
                      highestSpendingTab === 'week' 
                        ? "bg-[#1DBF73] text-white shadow-sm" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => setHighestSpendingTab('month')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95",
                      highestSpendingTab === 'month' 
                        ? "bg-[#1DBF73] text-white shadow-sm" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Tháng này
                  </button>
                </div>
                <button 
                  onClick={() => setActiveView('transactions')} 
                  className="text-slate-400 text-xs font-bold uppercase hover:text-[#1DBF73] transition-colors flex items-center gap-0.5 shrink-0"
                >
                  Nhật kí
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {highestSpendings.length > 0 ? (
              <div className="space-y-3">
                {highestSpendings.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100/10 hover:border-red-500/20 transition-colors animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${item.category.color}15`, color: item.category.color }}
                      >
                        <DynamicIcon name={item.category.icon} size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.category.name}
                        </h4>
                        <span className="text-[11px] text-rose-500 font-semibold uppercase tracking-wider">
                          Chiếm {Math.round((item.total / (expenseThisPeriod || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-[#EF4444] dark:text-red-400">
                        -{formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-400 text-xs font-semibold">
                Không ghi nhận chi tiêu phát sinh nào trong {highestSpendingTab === 'week' ? 'tuần này' : 'tháng này'}!
              </div>
            )}
          </section>

          {/* VÍ CỦA TÔI */}
          <section>
            <div className="flex justify-between items-center mb-3.5">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Ví của tôi</h2>
              <button onClick={() => setActiveView('wallets')} className="text-[#1DBF73] text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {wallets.slice(0, 2).map(wallet => (
                <div 
                  key={wallet.id} 
                  className="rounded-xl p-4 text-white relative overflow-hidden shadow-xs cursor-pointer active:scale-95 transition-transform"
                  style={{ backgroundColor: wallet.color }}
                  onClick={() => setActiveView('wallets')}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-15 transform translate-x-4 -translate-y-4">
                    <DynamicIcon name={wallet.icon} size={64} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <DynamicIcon name={wallet.icon} size={16} />
                    </div>
                    <div>
                      <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider line-clamp-1">{wallet.name}</p>
                      <p className="font-extrabold text-sm sm:text-base break-words leading-tight mt-1">
                        {showBalance ? formatCurrency(wallet.balance) : "•••• đ"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. CÁC GIAO DỊCH GẦN ĐÂY LIỆT KÊ KHOẢNG 3 GIAO DỊCH VỚI TABS */}
          <section className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/10 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Giao dịch gần đây</h2>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Tối đa 3 giao dịch mới</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Tabs view tuần/tháng */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setRecentTab('week')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95",
                      recentTab === 'week' 
                        ? "bg-[#1DBF73] text-white shadow-sm" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentTab('month')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95",
                      recentTab === 'month' 
                        ? "bg-[#1DBF73] text-white shadow-sm" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Tháng này
                  </button>
                </div>
                <button 
                  onClick={() => setActiveView('transactions')} 
                  className="text-[#1DBF73] text-xs font-extrabold uppercase hover:opacity-85 transition-opacity flex items-center gap-0.5 shrink-0"
                >
                  Xem tất cả
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 animate-in fade-in duration-300">
              {filteredRecentTransactions.map(tx => (
                <div 
                  key={tx.id} 
                  className="group bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between hover:border-[#1DBF73]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center opacity-90 shadow-sm"
                      style={{ backgroundColor: tx.category?.color + '15', color: tx.category?.color }}
                    >
                      <DynamicIcon name={tx.category?.icon || 'Circle'} size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tx.category?.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {tx.note || format(new Date(tx.date), 'dd MMM yyyy')} • {tx.wallet?.name}
                      </p>
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
              {filteredRecentTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  Không có giao dịch nào trong {recentTab === 'week' ? 'tuần này' : 'tháng này'}
                </div>
              )}
            </div>
          </section>

          {/* 5. MONEY INSIDER (Integrated Assistant with dynamic AI insights trigger) */}
          <section className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-[#0f113a] to-slate-950 border border-indigo-500/10 shadow-lg shadow-indigo-500/5 space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DBF73]/5 rounded-full blur-3xl"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-[#1DBF73]/10 p-2 rounded-xl border border-[#1DBF73]/20 flex items-center justify-center text-[#1DBF73]">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wide">
                    Insider AI
                    <Sparkles size={14} className="text-[#1DBF73] animate-pulse" />
                  </h3>
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Cố vấn tài chính</span>
                </div>
              </div>
              <div className="bg-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/10">
                {insiderPreviewAdvice.status}
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/5 space-y-1">
              <p className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider flex items-center gap-1">
                <Lightbulb size={12} className="text-indigo-400" /> Nhận định tuần này
              </p>
              <p className="text-slate-200 text-sm leading-relaxed font-medium">
                "{insiderPreviewAdvice.tip}"
              </p>
            </div>

            <button 
              onClick={() => setActiveView('insider')} 
              className="w-full py-2.5 bg-gradient-to-r from-indigo-505 via-[#1DBF73] to-emerald-500 hover:opacity-90 active:scale-[0.99] rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#1DBF73]/10"
              style={{ backgroundColor: '#1DBF73' }}
            >
              Phân tích chuyên sâu từ AI
              <ArrowRight size={14} />
            </button>
          </section>

          <div className="h-6"></div>
        </>
      )}
    </div>
  );
}
