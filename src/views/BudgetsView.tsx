import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Target, ChevronLeft, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { ViewState } from '../App';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { DynamicIcon } from '../components/DynamicIcon';
import { cn } from '../lib/utils';
import { subscribeBudgets, addBudget, deleteBudget as apiDeleteBudget } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface BudgetsViewProps {
  transactions: Transaction[];
  categories: Category[];
  setActiveView: (view: ViewState) => void;
}

export default function BudgetsView({ transactions, categories, setActiveView }: BudgetsViewProps) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formAmount, setFormAmount] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('all');
  const [formRecurring, setFormRecurring] = useState(true);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthDate = new Date();
  
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeBudgets(user.uid, (data) => {
      setBudgets(data);
      setIsLoading(false);
    });
    return unsub;
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await addBudget({
        categoryId: formCategoryId,
        amount: Number(formAmount),
        month: currentMonthStr,
        isRecurring: formRecurring
      } as Omit<Budget, 'id'>);

      toast.success(editingBudget ? 'Cập nhật thành công' : 'Thêm thành công');
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error('Không thể lưu ngân sách: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá ngân sách này?')) return;
    try {
      await apiDeleteBudget(id);
      toast.success('Đã xoá ngân sách');
    } catch (error: any) {
      toast.error('Không thể xoá: ' + error.message);
    }
  };

  const openForm = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormAmount(budget.amount.toString());
      setFormCategoryId(budget.categoryId);
      setFormRecurring(budget.isRecurring);
    } else {
      setEditingBudget(null);
      setFormAmount('');
      setFormCategoryId('all');
      setFormRecurring(true);
    }
    setIsModalOpen(true);
  };

  // Calculate spent for each budget in current month
  const expensesThisMonth = transactions.filter(t => 
    t.type === 'expense' &&
    isWithinInterval(new Date(t.date), { start: startOfMonth(currentMonthDate), end: endOfMonth(currentMonthDate) })
  );

  const getBudgetData = (b: Budget) => {
    let spent = 0;
    if (b.categoryId === 'all') {
      spent = expensesThisMonth.reduce((sum, t) => sum + t.amount, 0);
    } else {
      spent = expensesThisMonth.filter(t => t.categoryId === b.categoryId).reduce((sum, t) => sum + t.amount, 0);
    }
    
    const percentage = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
    let statusColor = 'bg-emerald-500';
    if (percentage > 90) statusColor = 'bg-rose-500';
    else if (percentage > 70) statusColor = 'bg-amber-500';

    const category = b.categoryId === 'all' 
      ? { name: 'Tổng ngân sách', icon: 'Target', color: '#1DBF73' }
      : categories.find(c => c.id === b.categoryId) || { name: 'Không rõ', icon: 'Box', color: '#94a3b8' };

    return { spent, percentage, statusColor, category, remaining: b.amount - spent };
  };

  // We only show budgets that are for current month OR isRecurring = true
  const activeBudgets = budgets.filter(b => b.month === currentMonthStr || b.isRecurring);

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-slate-900 pb-20">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 sticky top-0 z-10 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => setActiveView('profile')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white relative top-0.5">Ngân sách</h2>
        <button onClick={() => openForm()} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[#1DBF73]">
          <Plus size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DBF73]"></div>
          </div>
        ) : activeBudgets.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
             <div className="w-16 h-16 rounded-full bg-[#1DBF73]/10 text-[#1DBF73] flex items-center justify-center mb-3">
               <Target size={32} />
             </div>
             <p className="text-slate-500 font-medium mb-4">Chưa có ngân sách nào</p>
             <button onClick={() => openForm()} className="px-5 py-2.5 bg-[#1DBF73] text-white font-bold rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-transform">
               Tạo ngân sách đầu tiên
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-950 p-4 border border-[#1DBF73]/20 rounded-xl shadow-sm relative overflow-hidden">
               <div className="absolute -right-6 -top-6 text-[#1DBF73]/5">
                 <Target size={120} />
               </div>
               <p className="text-slate-500 text-sm font-medium mb-1">Tháng này</p>
               <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{format(currentMonthDate, 'MM/yyyy')}</h3>
            </div>
            
            {activeBudgets.map(b => {
              const data = getBudgetData(b);
              return (
                <div key={b.id} className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${data.category.color}15`, color: data.category.color }}>
                          <DynamicIcon name={data.category.icon as any} size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-[15px]">{data.category.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Còn lại: <span className={data.remaining < 0 ? 'text-rose-500' : 'text-[#1DBF73]'}>{formatCurrency(data.remaining)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openForm(b)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-sm font-bold">
                         <span className="text-slate-700 dark:text-slate-300">{formatCurrency(data.spent)}</span>
                         <span className="text-slate-400">{formatCurrency(b.amount)}</span>
                       </div>
                       <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className={cn("h-full rounded-full transition-all duration-500", data.statusColor)}
                           style={{ width: `${data.percentage}%` }}
                         />
                       </div>
                       <div className="flex justify-between text-xs text-slate-500 font-medium mt-1">
                          <span>Đã tiêu {data.percentage.toFixed(0)}%</span>
                          <span className="flex items-center gap-1">{b.isRecurring && <DynamicIcon name="RotateCcw" size={10} />} Lặp hàng tháng</span>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="mt-auto bg-[#F3F4F6] dark:bg-slate-900 rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-5 relative">
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-2 -ml-2 transition-colors z-10 text-[15px] font-medium">Hủy</button>
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white absolute inset-0 flex items-center justify-center pointer-events-none">
                {editingBudget ? 'Sửa ngân sách' : 'Tạo ngân sách'}
              </h2>
              <div className="w-8"></div>
            </header>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-slate-800 space-y-4">
                
                <div className="space-y-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Số tiền (₫)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="VD: 5,000,000"
                    className="w-full text-2xl font-bold bg-transparent outline-none px-1 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nhóm áp dụng</label>
                  <select 
                    value={formCategoryId} 
                    onChange={e => setFormCategoryId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Tất cả chi tiêu</option>
                    {categories.filter(c => c.type === 'expense').map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-1 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                     <DynamicIcon name="RotateCcw" size={18} className="text-slate-400" />
                     Lặp lại hàng tháng
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formRecurring}
                      onChange={e => setFormRecurring(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#1DBF73]"></div>
                  </label>
                </div>

              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-[#1DBF73] text-white font-bold text-[17px] rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all mt-4"
              >
                Lưu ngân sách
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
