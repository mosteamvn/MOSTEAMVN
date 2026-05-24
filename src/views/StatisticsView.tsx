import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isAfter, startOfMonth, startOfWeek } from 'date-fns';
import { Sparkles, TrendingDown, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface StatisticsViewProps {
  transactions: Transaction[];
  setActiveView: (view: any) => void;
}

export default function StatisticsView({ transactions, setActiveView }: StatisticsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');

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

  // Expenses by Category (30 days)
  const categoryData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const expenses = transactions.filter(t => (t.type === 'expense' || (t.type === 'debt' && ['8', '11'].includes(t.categoryId))) && isAfter(new Date(t.date), thirtyDaysAgo));
    
    const catMap = new Map<string, {name: string, value: number, color: string, icon: string}>();
    
    expenses.forEach(tx => {
      if (!tx.category) return;
      const existing = catMap.get(tx.categoryId);
      if (existing) {
        existing.value += tx.amount;
      } else {
        catMap.set(tx.categoryId, {
          name: tx.category.name,
          value: tx.amount,
          color: tx.category.color,
          icon: tx.category.icon
        });
      }
    });
    
    return Array.from(catMap.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpense30d = useMemo(() => categoryData.reduce((s, c) => s + c.value, 0), [categoryData]);

  const reportMetrics = useMemo(() => {
    const thisMonth = startOfMonth(new Date());
    const txThisMonth = transactions.filter(t => isAfter(new Date(t.date), thisMonth));
    const incomeMonth = txThisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseMonth = txThisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netMonth = incomeMonth - expenseMonth;

    return { incomeMonth, expenseMonth, netMonth };
  }, [transactions]);

  return (
    <div className="p-5 space-y-5">
      <header className="py-2 mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Thống kê</h1>
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
          className={cn("flex-1 py-1.5 text-sm font-bold rounded-lg transition-all", activeTab === 'overview' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          Tổng quan
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn("flex-1 py-1.5 text-sm font-bold rounded-lg transition-all", activeTab === 'reports' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          Báo cáo chi tiết
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
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
            {categoryData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
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
                  {categoryData.slice(0, 5).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                  {categoryData.length > 5 && (
                    <div className="text-center pt-2">
                       <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-[#1DBF73] hover:underline">Xem tất cả</button>
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

          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-6 mb-2 flex items-center justify-between">
            Chi tiết từng nhóm (30 ng. qua)
            <span className="text-xs text-slate-400 font-medium">Tổng: {formatCurrency(totalExpense30d)}</span>
          </h2>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {categoryData.length > 0 ? categoryData.map(cat => {
              const percentage = totalExpense30d > 0 ? Math.round((cat.value / totalExpense30d) * 100) : 0;
              return (
                 <div key={cat.name} className="p-4 grid gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-[15px] text-slate-900 dark:text-white">{cat.name}</span>
                      </div>
                      <span className="text-[15px] text-slate-900 dark:text-white font-bold">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }}></div>
                       </div>
                       <span className="text-xs font-bold text-slate-400 w-8 text-right">{percentage}%</span>
                    </div>
                 </div>
              );
            }) : (
              <div className="p-6 text-center text-sm font-medium text-slate-400">Không có dữ liệu chi tiêu</div>
            )}
          </div>
        </div>
      )}

      <div className="h-6"></div>
    </div>
  );
}
