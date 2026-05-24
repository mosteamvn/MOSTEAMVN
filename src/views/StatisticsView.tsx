import { useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isAfter } from 'date-fns';

interface StatisticsViewProps {
  transactions: Transaction[];
}

export default function StatisticsView({ transactions }: StatisticsViewProps) {
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
    
    const catMap = new Map<string, {name: string, value: number, color: string}>();
    
    expenses.forEach(tx => {
      if (!tx.category) return;
      const existing = catMap.get(tx.categoryId);
      if (existing) {
        existing.value += tx.amount;
      } else {
        catMap.set(tx.categoryId, {
          name: tx.category.name,
          value: tx.amount,
          color: tx.category.color
        });
      }
    });
    
    return Array.from(catMap.values()).sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="p-5 space-y-5">
      <header className="py-2 mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Thống kê</h1>
      </header>

      {/* Cash Flow Chart */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
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
      <section className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Chi tiêu theo nhóm (30 ngày)</h2>
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
              {categoryData.map(cat => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
           <div className="text-center py-8 text-slate-400 text-sm font-medium">Không có chi tiêu trong 30 ngày qua</div>
        )}
      </section>

      <div className="h-6"></div>
    </div>
  );
}
