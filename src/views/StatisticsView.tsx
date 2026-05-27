import { useState, useMemo } from 'react';
import { Transaction, Category, Wallet } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isAfter, startOfMonth } from 'date-fns';
import { Sparkles, TrendingDown, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import { DynamicIcon } from '../components/DynamicIcon';

interface StatisticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  setActiveView: (view: any) => void;
}

export default function StatisticsView({ transactions, categories, wallets = [], setActiveView }: StatisticsViewProps) {
  const [activeTab, setActiveTab ] = useState<'overview' | 'reports'>('overview');
  const [reportType, setReportType] = useState<'expense' | 'income'>('expense');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  // Last 7 days chart data
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dayLabel = format(d, 'dd/MM');
      
      const dayTxs = transactions.filter(t => format(new Date(t.date), 'dd/MM') === dayLabel);
      const income = dayTxs.filter(t => t.type === 'income' || (t.type === 'debt' && ['9', '10'].includes(t.categoryId))).reduce((s, t) => s + t.amount, 0);
      const expense = dayTxs.filter(t => t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId))).reduce((s, t) => s + t.amount, 0);
      
      data.push({ name: dayLabel, income, expense });
    }
    return data;
  }, [transactions]);

  // Simple Expenses by Category for Overview Pie Chart (30 days, aggregated by parent category to keep it clean)
  const overviewCategoryData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const expenses = transactions.filter(t => (t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId))) && isAfter(new Date(t.date), thirtyDaysAgo));
    
    const catMap = new Map<string, {name: string, value: number, color: string, icon: string}>();
    
    expenses.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;
      
      let topCat = cat;
      if (cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent) {
          topCat = parent;
        }
      }

      const existing = catMap.get(topCat.id);
      if (existing) {
        existing.value += tx.amount;
      } else {
        catMap.set(topCat.id, {
          name: topCat.name,
          value: tx.amount,
          color: topCat.color,
          icon: topCat.icon
        });
      }
    });
    
    return Array.from(catMap.values()).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Aggregated data by Top-Level Category for Reports (30 days)
  const reportCategoryData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const filteredTxs = transactions.filter(t => {
      const is30Days = isAfter(new Date(t.date), thirtyDaysAgo);
      if (!is30Days) return false;
      
      if (reportType === 'expense') {
        return t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId));
      } else {
        return t.type === 'income' || (t.type === 'debt' && ['9', '10'].includes(t.categoryId));
      }
    });

    const parentMap = new Map<string, {
      id: string;
      name: string;
      value: number;
      color: string;
      icon: string;
      subCategories: { [subId: string]: { name: string, value: number, color: string, icon: string } };
    }>();

    filteredTxs.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;

      // Find top-level parent
      let topCat = cat;
      let isSub = false;
      if (cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent) {
          topCat = parent;
          isSub = true;
        }
      }

      if (!parentMap.has(topCat.id)) {
        parentMap.set(topCat.id, {
          id: topCat.id,
          name: topCat.name,
          value: 0,
          color: topCat.color,
          icon: topCat.icon,
          subCategories: {}
        });
      }

      const topItem = parentMap.get(topCat.id)!;
      topItem.value += tx.amount;

      // Track sub-category contributions
      const subKey = isSub ? cat.id : 'parent_direct';
      const subName = isSub ? cat.name : `${topCat.name} (Khác)`;
      const subColor = isSub ? cat.color : topCat.color;
      const subIcon = isSub ? cat.icon : topCat.icon;

      if (!topItem.subCategories[subKey]) {
        topItem.subCategories[subKey] = {
          name: subName,
          value: 0,
          color: subColor,
          icon: subIcon
        };
      }
      topItem.subCategories[subKey].value += tx.amount;
    });

    return Array.from(parentMap.values())
      .map(item => ({
        ...item,
        subCategoriesList: Object.entries(item.subCategories)
          .map(([id, sub]) => ({ id, ...sub }))
          .sort((a, b) => b.value - a.value)
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, reportType]);

  const totalAmount30d = useMemo(() => reportCategoryData.reduce((s, c) => s + c.value, 0), [reportCategoryData]);

  const reportMetrics = useMemo(() => {
    const thisMonth = startOfMonth(new Date());
    const txThisMonth = transactions.filter(t => isAfter(new Date(t.date), thisMonth));
    const incomeMonth = txThisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseMonth = txThisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netMonth = incomeMonth - expenseMonth;

    return { incomeMonth, expenseMonth, netMonth };
  }, [transactions]);

  return (
    <div className="px-5 pb-5 space-y-5">
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 -mx-5 px-5 flex items-center justify-between gap-2 border-b border-slate-100/50 dark:border-slate-800/10 mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Thống kê</h1>
        <button 
          onClick={() => setActiveView('insider')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold text-sm shadow-sm hover:scale-105 transition-transform"
        >
          <Sparkles size={16} />
          Insider
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('overview')}
          className={cn("flex-1 py-1.5 text-sm font-bold rounded-lg transition-all", activeTab === 'overview' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-550 hover:text-slate-750 dark:hover:text-slate-350")}
        >
          Tổng quan
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn("flex-1 py-1.5 text-sm font-bold rounded-lg transition-all", activeTab === 'reports' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-550 hover:text-slate-750 dark:hover:text-slate-350")}
        >
          Báo cáo chi tiết
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Wallets & Asset Overview Section */}
          <section className="space-y-4 animate-in fade-in duration-300">
            {/* Total Balance Summary Header Card */}
            <div className="bg-gradient-to-br from-[#1DBF73] to-[#148F54] p-5 rounded-2xl text-white shadow-lg shadow-[#1DBF73]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-4 -translate-y-4">
                <Coins size={120} />
              </div>
              <p className="text-white/85 text-[11px] font-bold uppercase tracking-widest">Tổng hợp tài sản</p>
              <h3 className="text-2xl font-black tracking-tight mt-1">{formatCurrency(totalBalance)}</h3>
              <div className="flex items-center gap-1.5 mt-3 text-white/95 text-xs font-semibold bg-white/10 w-fit px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <Coins size={14} />
                <span>Số dư tích lũy hiện tại trong tất cả các ví</span>
              </div>
            </div>

            {/* Individual Wallet Asset Share */}
            {wallets && wallets.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-50 dark:border-slate-800/10 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Phân bổ tài sản ({wallets.length} ví)</h3>
                
                <div className="space-y-4 divide-y divide-slate-100/50 dark:divide-slate-850/45">
                  {wallets.map((wallet, idx) => {
                    const percentage = totalBalance > 0 ? (wallet.balance / totalBalance) * 100 : 0;
                    return (
                      <div key={wallet.id} className={cn("pt-4 first:pt-0 space-y-1.5")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div 
                              style={{ backgroundColor: wallet.color }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                            >
                              <DynamicIcon name={wallet.icon || 'Wallet'} size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{wallet.name}</p>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{percentage.toFixed(1)}% tài sản</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(wallet.balance)}</p>
                            {wallet.isDefault && (
                              <span className="inline-block text-[9px] font-bold text-[#1DBF73] bg-[#1DBF73]/10 px-1.5 py-0.5 rounded-full mt-0.5 select-none">Mặc định</span>
                            )}
                          </div>
                        </div>

                        {/* Visual asset share progress bar */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${percentage}%`, backgroundColor: wallet.color }}
                            className="h-full rounded-full transition-all duration-500"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Cash Flow Chart */}
          <section className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 animate-in fade-in">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Dòng tiền (7 ngày)</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DBF73" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1DBF73" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => value === 0 ? '' : (value/1000) + 'k'} tick={{fill: '#94a3b8'}} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#1DBF73" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Categories Pie Chart */}
          <section className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 animate-in fade-in delay-100">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Cơ cấu chi tiêu (30 ngày)</h2>
            {overviewCategoryData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewCategoryData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {overviewCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-4 mt-8">
                  {overviewCategoryData.slice(0, 5).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                  {overviewCategoryData.length > 5 && (
                    <div className="text-center pt-2">
                       <button onClick={() => { setActiveTab('reports'); setReportType('expense'); }} className="text-xs font-bold text-[#1DBF73] hover:underline">Xem tất cả</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
               <div className="text-center py-8 text-slate-400 text-sm font-medium">Không có chi tiêu trong 30 ngày qua</div>
            )}
          </section>
        </>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          {/* Executive Summary */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng Thu (Tháng)</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(reportMetrics.incomeMonth)}</span>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2 text-rose-500 mb-1">
                  <TrendingDown size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng Chi (Tháng)</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(reportMetrics.expenseMonth)}</span>
             </div>
          </div>
          
          <div className={cn(
            "p-5 rounded-xl shadow-sm border flex items-center justify-between",
            reportMetrics.netMonth >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50" : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50"
          )}>
            <div>
               <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500">Tích luỹ tháng này</p>
               <h3 className={cn("text-2xl font-bold", reportMetrics.netMonth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                 {reportMetrics.netMonth >= 0 ? '+' : ''}{formatCurrency(reportMetrics.netMonth)}
               </h3>
            </div>
            <div className={cn("p-3 rounded-full", reportMetrics.netMonth >= 0 ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600" : "bg-rose-100 dark:bg-rose-900/50 text-rose-600")}>
              {reportMetrics.netMonth >= 0 ? <TrendingUp size={24} /> : <AlertCircle size={24} />}
            </div>
          </div>

          {/* Sub-toggle for Report Type */}
          <div className="grid grid-cols-2 gap-2 bg-slate-250/60 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 mt-4 shadow-xs">
            <button
              onClick={() => { setReportType('expense'); setExpandedCategoryId(null); }}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                reportType === 'expense'
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/10"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <TrendingDown size={14} />
              Khoản chi
            </button>
            <button
              onClick={() => { setReportType('income'); setExpandedCategoryId(null); }}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                reportType === 'income'
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <TrendingUp size={14} />
              Khoản thu
            </button>
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-6 mb-2 flex items-center justify-between">
            Chi tiết (30 ngày)
            <span className="text-xs text-slate-400 font-medium">Tổng: {formatCurrency(totalAmount30d)}</span>
          </h2>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {reportCategoryData.length > 0 ? reportCategoryData.map(cat => {
              const percentage = totalAmount30d > 0 ? Math.round((cat.value / totalAmount30d) * 100) : 0;
              const isExpanded = expandedCategoryId === cat.id;

              return (
                 <div key={cat.id} className="divide-y divide-slate-100/50 dark:divide-slate-800/30">
                   {/* Parent Category Row */}
                   <div 
                     onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                     className="p-4 grid gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
                   >
                      <div className="flex items-center justify-between font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: cat.color }}></div>
                          <span className="text-[15px] font-bold text-slate-900 dark:text-white">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] text-slate-900 dark:text-white font-extrabold">{formatCurrency(cat.value)}</span>
                          <span className="text-xs text-slate-400 font-bold ml-1">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }}></div>
                         </div>
                         <span className="text-xs font-bold text-slate-400 w-8 text-right">{percentage}%</span>
                      </div>
                   </div>

                   {/* Child Subcategories Breakdown */}
                   {isExpanded && cat.subCategoriesList && cat.subCategoriesList.length > 0 && (
                     <div className="bg-slate-50/50 dark:bg-slate-900/20 px-4 py-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                       {cat.subCategoriesList.map(sub => {
                         const subPct = cat.value > 0 ? Math.round((sub.value / cat.value) * 100) : 0;
                         return (
                           <div key={sub.id} className="flex items-center justify-between py-1.5 pl-5 border-l-2 border-slate-200 dark:border-slate-800">
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub.color }}></div>
                               <span className="text-xs font-bold text-slate-500 dark:text-slate-450">{sub.name}</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-slate-400">{subPct}%</span>
                               <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(sub.value)}</span>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
              );
            }) : (
              <div className="p-6 text-center text-sm font-medium text-slate-400">
                Không có dữ liệu {reportType === 'expense' ? 'chi tiêu' : 'thu nhập'}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-6"></div>
    </div>
  );
}
