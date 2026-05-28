import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Check, RefreshCw, Calendar, Sparkles, 
  Clock, AlertCircle, Circle, ArrowUpRight, CheckCircle2, 
  Settings, Layers, HelpCircle, ChevronLeft, ChevronRight, X, ArrowLeftRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Transaction, Wallet, Category, TransactionType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction } from '../lib/api';
import { 
  detectRecurringPatterns, 
  calculateNextDueDate, 
  DetectedPattern, 
  RecurringTemplate 
} from '../utils/recurrenceDetector';

interface RecurringViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  setActiveView: (view: any) => void;
}

export default function RecurringView({ transactions, categories, wallets, setActiveView }: RecurringViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-setups' | 'suggestions'>('my-setups');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);

  // Form Fields State
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Selector modal overlays states
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Load custom templates from localStorage
  const localStorageKey = user ? `recurring_templates_${user.uid}` : 'recurring_templates_generic';
  
  const [myTemplates, setMyTemplates] = useState<RecurringTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Automatically detect patterns from transaction database
  const detectedPatterns = useMemo(() => {
    const patterns = detectRecurringPatterns(transactions);
    return patterns.filter(pat => {
      return !myTemplates.some(t => 
        t.note.toLowerCase().includes(pat.note.toLowerCase()) || 
        pat.note.toLowerCase().includes(t.note.toLowerCase())
      );
    });
  }, [transactions, myTemplates]);

  const saveToLocalStorage = (list: RecurringTemplate[]) => {
    setMyTemplates(list);
    localStorage.setItem(localStorageKey, JSON.stringify(list));
  };

  const openAddForm = (presetSugg?: DetectedPattern) => {
    if (presetSugg) {
      setNote(presetSugg.note);
      setAmount(presetSugg.amount);
      setAmountInput(new Intl.NumberFormat('vi-VN').format(presetSugg.amount));
      setCategoryId(presetSugg.categoryId);
      setType(presetSugg.type);
      setFrequency(presetSugg.frequency);
      
      const rawDateStr = presetSugg.nextDueDate || new Date().toISOString().slice(0, 10);
      setNextDueDate(rawDateStr.slice(0, 10));
    } else {
      setNote('');
      setAmount(0);
      setAmountInput('');
      
      const typeCategories = categories.filter(c => c.type === 'expense');
      setCategoryId(typeCategories[0]?.id || categories[0]?.id || '');
      setType('expense');
      setFrequency('monthly');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextDueDate(tomorrow.toISOString().slice(0, 10));
    }

    const defaultWallet = wallets.find(w => w.isDefault) || wallets[0];
    setWalletId(defaultWallet?.id || '');
    setIsActive(true);
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const openEditForm = (template: RecurringTemplate) => {
    setEditingTemplate(template);
    setNote(template.note);
    setAmount(template.amount);
    setAmountInput(new Intl.NumberFormat('vi-VN').format(template.amount));
    setCategoryId(template.categoryId);
    setWalletId(template.walletId);
    setType(template.type);
    setFrequency(template.frequency);
    setNextDueDate(template.nextDueDate.slice(0, 10));
    setIsActive(template.isActive);
    setIsFormOpen(true);
  };

  // Keep categories updated when changing Expense/Income tabs
  useEffect(() => {
    // Only adjust category if the current template editing isn't active 
    // or if the category type mismatches the current selected tab type.
    const currentCatObj = categories.find(c => c.id === categoryId);
    if (!currentCatObj || currentCatObj.type !== type) {
      const typeCategories = categories.filter(c => c.type === type);
      if (typeCategories.length > 0) {
        setCategoryId(typeCategories[0].id);
      }
    }
  }, [type, categories]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // strip non-decimals
    const num = Number(rawVal) || 0;
    setAmount(num);
    setAmountInput(rawVal ? new Intl.NumberFormat('vi-VN').format(num) : '');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error('Vui lòng điền nội dung/ghi chú!');
      return;
    }
    if (amount <= 0) {
      toast.error('Số tiền phải lớn hơn 0!');
      return;
    }
    if (!categoryId) {
      toast.error('Vui lòng chọn nhóm giao dịch!');
      return;
    }
    if (!walletId) {
      toast.error('Vui lòng chọn tài khoản ví!');
      return;
    }
    if (!nextDueDate) {
      toast.error('Vui lòng điền ngày bắt đầu kỳ tiếp theo!');
      return;
    }

    const tDate = new Date(nextDueDate);
    tDate.setHours(8, 0, 0, 0);

    if (editingTemplate) {
      const updated = myTemplates.map(item => {
        if (item.id === editingTemplate.id) {
          return {
            ...item,
            note: note.trim(),
            amount,
            categoryId,
            walletId,
            type,
            frequency,
            nextDueDate: tDate.toISOString(),
            isActive,
          };
        }
        return item;
      });
      saveToLocalStorage(updated);
      toast.success('Đã cập nhật giao dịch định kỳ thành công!');
    } else {
      const newTemp: RecurringTemplate = {
        id: `custom_${Date.now()}`,
        note: note.trim(),
        amount,
        categoryId,
        walletId,
        type,
        frequency,
        nextDueDate: tDate.toISOString(),
        isActive,
        confidence: 'high',
        createdAt: Date.now(),
      };
      saveToLocalStorage([newTemp, ...myTemplates]);
      toast.success('Đã thiết lập giao dịch định kỳ thành công!');
      setTimeout(() => triggerInstantEvaluation(newTemp), 300);
    }

    setIsFormOpen(false);
  };

  const triggerInstantEvaluation = async (t: RecurringTemplate) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextDueStr = t.nextDueDate.slice(0, 10);
    
    if (t.isActive && todayStr >= nextDueStr) {
      const wallet = wallets.find(w => w.id === t.walletId);
      if (!wallet) return;

      try {
        await addTransaction({
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          walletId: t.walletId,
          note: `${t.note} (Định kỳ tự động)`,
          date: new Date(t.nextDueDate).toISOString()
        }, wallet.balance);

        const newNextDue = calculateNextDueDate(t.nextDueDate, t.frequency);
        const updated = myTemplates.map(item => {
          if (item.id === t.id) {
            return {
              ...item,
              lastCreatedDate: todayStr,
              nextDueDate: newNextDue
            };
          }
          return item;
        });
        saveToLocalStorage(updated);
        toast.success(`Đã tự động ghi nhận giao dịch: "${t.note}"!`);
      } catch (err) {
        console.error('Lỗi khi kích hoạt tức thời:', err);
      }
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('Bạn có muốn xóa cấu hình giao dịch định kỳ này?')) return;
    const filtered = myTemplates.filter(t => t.id !== id);
    saveToLocalStorage(filtered);
    toast.success('Đã xóa thiết lập giao dịch định kỳ!');
    setIsFormOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = myTemplates.map(t => {
      if (t.id === id) {
        const nextState = !t.isActive;
        toast.success(`Đã ${nextState ? 'BẬT' : 'TẮT'} tự động ghi nhận: "${t.note}"`);
        return { ...t, isActive: nextState };
      }
      return t;
    });
    saveToLocalStorage(updated);
  };

  const handleTriggerManuallyNow = async (t: RecurringTemplate) => {
    const wallet = wallets.find(w => w.id === t.walletId);
    if (!wallet) {
      toast.error('Ví không tồn tại!');
      return;
    }

    const confirmPay = confirm(`Bạn muốn ghi nhận thanh toán ngay lập tức cho "${t.note}"?\nGiao dịch sẽ được ghi vào danh sách tài chính ngay hôm nay.`);
    if (!confirmPay) return;

    try {
      toast.loading('Đang ghi nhận...', { id: 'manual_trigger' });
      await addTransaction({
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        walletId: t.walletId,
        note: `${t.note} (Kỳ hạn ${new Date(t.nextDueDate).toLocaleDateString('vi-VN')})`,
        date: new Date().toISOString()
      }, wallet.balance);

      const advancedNextDate = calculateNextDueDate(t.nextDueDate, t.frequency);
      const updated = myTemplates.map(item => {
        if (item.id === t.id) {
          return {
            ...item,
            lastCreatedDate: new Date().toISOString().slice(0, 10),
            nextDueDate: advancedNextDate
          };
        }
        return item;
      });
      saveToLocalStorage(updated);
      toast.success('Ghi nhận giao dịch định kỳ thành công!', { id: 'manual_trigger' });
    } catch (err: any) {
      toast.error('Lỗi ghi nhận: ' + err.message, { id: 'manual_trigger' });
    }
  };

  const getDaysDiffText = (isoStringStr: string) => {
    const target = new Date(isoStringStr);
    target.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: 'Hôm nay', color: 'text-amber-500 font-bold bg-amber-500/10' };
    } else if (diffDays === 1) {
      return { text: 'Ngày mai', color: 'text-blue-500 font-bold bg-blue-500/10' };
    } else if (diffDays < 0) {
      return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, color: 'text-rose-500 font-bold bg-rose-500/10' };
    } else {
      return { text: `Trong ${diffDays} ngày nữa`, color: 'text-emerald-500 font-bold bg-emerald-500/10' };
    }
  };

  const getFreqText = (freq: 'weekly' | 'bi-weekly' | 'monthly') => {
    switch(freq) {
      case 'weekly': return 'Hàng tuần';
      case 'bi-weekly': return '2 tuần một kỳ';
      case 'monthly': return 'Hàng tháng';
      default: return 'Hàng tháng';
    }
  };

  const QUICK_PRESETS = [
    { note: 'Tiền thuê nhà', amount: 3500000, keyword: 'tiền nhà', categoryIcon: 'Home', color: '#8b5cf6' },
    { note: 'Gói xem phim Netflix', amount: 260000, keyword: 'netflix', categoryIcon: 'Video', color: '#ef4444' },
    { note: 'Nghe nhạc Spotify Premium', amount: 59000, keyword: 'spotify', categoryIcon: 'Music', color: '#10b981' },
    { note: 'Dung lượng iCloud 200GB', amount: 59000, keyword: 'icloud', categoryIcon: 'Cloud', color: '#06b6d4' },
    { note: 'Internet tốc độ cao', amount: 250000, keyword: 'internet', categoryIcon: 'Wifi', color: '#3b82f6' },
  ];

  const handleApplyQuickPreset = (p: typeof QUICK_PRESETS[0]) => {
    let cat = categories.find(c => c.name.toLowerCase().includes('nhà') || c.name.toLowerCase().includes('ở') || c.name.toLowerCase().includes('mua sắm') || c.name.toLowerCase().includes('dịch vụ'));
    if (!cat) cat = categories[0];
    
    setNote(p.note);
    setAmount(p.amount);
    setAmountInput(new Intl.NumberFormat('vi-VN').format(p.amount));
    setCategoryId(cat?.id || '');
    setType('expense');
    setFrequency('monthly');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNextDueDate(tomorrow.toISOString().slice(0, 10));

    const defaultWallet = wallets.find(w => w.isDefault) || wallets[0];
    setWalletId(defaultWallet?.id || '');
    setIsActive(true);
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  // category picker hierarchy structure helpers
  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => c && c.type === type);
  }, [categories, type]);

  const selectedCategory = useMemo(() => {
    return (categories || []).find(c => c && c.id === categoryId);
  }, [categories, categoryId]);

  const selectedWallet = useMemo(() => {
    return (wallets || []).find(w => w && w.id === walletId);
  }, [wallets, walletId]);

  const categoryTree = useMemo(() => {
    const map = new Map<string, Category & { children: any[] }>();
    filteredCategories.forEach(c => map.set(c.id, { ...c, children: [] }));
    const roots: (Category & { children: any[] })[] = [];
    map.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(map.get(c.id)!);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [filteredCategories]);

  // recursion tree selector node
  const renderCategoryNode = (node: Category & { children: any[] }, level = 0) => {
    const isSelected = categoryId === node.id;
    return (
      <div key={node.id} className="flex flex-col">
        <button
          type="button"
          onClick={() => {
            setCategoryId(node.id);
            setShowCategorySelector(false);
          }}
          className={cn(
            "flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all select-none text-left w-full",
            level > 0 ? "pl-14" : ""
          )}
        >
          <div className="flex items-center gap-3">
            {level > 0 && <div className="w-4 h-px bg-slate-200 dark:bg-slate-700 -ml-8"></div>}
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
              style={node.color ? { backgroundColor: `${node.color}15`, color: node.color } : {}}
            >
              <DynamicIcon name={node.icon} size={20} />
            </div>
            <span className={cn(
              "text-[15px] flex-1 text-left",
              level === 0 ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-600 dark:text-slate-300"
            )}>
              {node.name}
            </span>
          </div>
          {isSelected && (
            <Check size={20} className="text-[#1DBF73] shrink-0" />
          )}
        </button>
        {node.children.length > 0 && (
          <div className="flex flex-col border-l border-slate-100 dark:border-slate-850 ml-8">
            {node.children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col absolute inset-0 bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 z-30 overflow-hidden">
      
      {/* Header */}
      <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setActiveView('profile')} 
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Giao dịch định kỳ</h1>
        </div>
        <button 
          onClick={() => openAddForm()}
          className="w-10 h-10 bg-[#1DBF73] text-white rounded-full shadow-lg shadow-[#1DBF73]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="Thêm mới"
        >
          <Plus size={22} />
        </button>
      </header>

      {/* Tabs Menu */}
      <div className="flex px-5 pt-3 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/40 shrink-0 select-none">
        <button 
          onClick={() => setActiveTab('my-setups')}
          className={cn(
            "flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
            activeTab === 'my-setups' 
              ? "border-[#1DBF73] text-[#1DBF73] scale-102" 
              : "border-transparent text-slate-400 hover:text-slate-605 dark:text-slate-500"
          )}
        >
          <Layers size={16} />
          GD đã thiết lập ({myTemplates.length})
        </button>
        <button 
          onClick={() => setActiveTab('suggestions')}
          className={cn(
            "flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 relative",
            activeTab === 'suggestions' 
              ? "border-[#1DBF73] text-[#1DBF73] scale-102" 
              : "border-transparent text-slate-400 hover:text-slate-650 dark:text-slate-500"
          )}
        >
          <Sparkles size={16} className={detectedPatterns.length > 0 ? "text-amber-500 animate-pulse" : ""} />
          PH thông minh ({detectedPatterns.length})
          {detectedPatterns.length > 0 && (
            <span className="absolute top-0.5 right-6 w-2 h-2 rounded-full bg-rose-500"></span>
          )}
        </button>
      </div>

      {/* Main Column List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] space-y-4">
        
        {/* TAB 1: USER CONFIGURED RECURRENCES */}
        {activeTab === 'my-setups' && (
          <div className="space-y-4">
            
            {/* Explanatory Banner */}
            <div className="bg-[#1DBF73]/5 dark:bg-[#1DBF73]/10 border border-[#1DBF73]/15 rounded-2xl p-4 flex gap-3">
              <Clock size={20} className="text-[#1DBF73] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#1DBF73] uppercase tracking-wide">Tự động hóa tài chính</p>
                <p className="text-slate-500 dark:text-slate-300 text-[11px] leading-relaxed mt-1 font-semibold">
                  Ứng dụng sẽ tự động ghi nhận các giao dịch này vào lịch sử tài chính của bạn khi đến kỳ hẹn (Next Due Date) để bạn không bao giờ quên đóng hóa đơn hay đăng ký thuê bao!
                </p>
              </div>
            </div>

            {myTemplates.length === 0 ? (
              <div className="text-center py-10 space-y-6">
                <div className="bg-slate-100 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner text-slate-400">
                  <RefreshCw size={26} className="text-slate-400" />
                </div>
                <div className="space-y-1.5/2">
                  <p className="font-bold text-slate-900 dark:text-white text-base">Chưa thiết lập giao dịch định kỳ nào</p>
                  <p className="text-slate-450 dark:text-slate-550 text-sm max-w-xs mx-auto">Bạn có thể sử dụng presets bên dưới để bắt đầu nhanh hoặc tạo thủ công!</p>
                </div>

                {/* Popular Presets Block */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left pl-1">Bắt đầu nhanh với presets thông dụng</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {QUICK_PRESETS.map((p) => (
                      <button 
                        key={p.note}
                        onClick={() => handleApplyQuickPreset(p)}
                        className="p-3.5 bg-white dark:bg-slate-900/60 hover:bg-slate-55 dark:hover:bg-slate-800/20 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between text-left group transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: `${p.color}15`, color: p.color }}
                          >
                            <DynamicIcon name={p.categoryIcon} size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1DBF73] transition-colors">{p.note}</p>
                            <p className="text-xs text-slate-400 font-medium">Hàng tháng • {formatCurrency(p.amount)}</p>
                          </div>
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#1DBF73] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {myTemplates.map((t) => {
                  const category = categories.find(c => c.id === t.categoryId);
                  const wallet = wallets.find(w => w.id === t.walletId);
                  const statusInfo = getDaysDiffText(t.nextDueDate);

                  return (
                    <div 
                      key={t.id}
                      className={cn(
                        "bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-md flex flex-col gap-3 transition-all relative overflow-hidden group hover:shadow-lg",
                        t.isActive 
                          ? "border-[#1DBF73]/20 dark:border-[#1DBF73]/10 bg-gradient-to-br from-white to-emerald-500/[0.01] dark:from-slate-900 dark:to-emerald-500/[0.01]" 
                          : "border-dashed border-slate-200 dark:border-slate-800/45 opacity-70"
                      )}
                    >
                      {/* TopRow */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={category?.color ? { backgroundColor: category.color + '15', color: category.color } : {}}
                          >
                            <DynamicIcon name={category?.icon || 'Compass'} size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 onClick={() => openEditForm(t)} className="font-extrabold text-[#1f2937] dark:text-slate-100 text-[15px] hover:underline cursor-pointer leading-snug">
                                {t.note}
                              </h3>
                              <span className="text-[9px] font-black tracking-wider text-[#1DBF73] bg-[#1DBF73]/10 px-2 py-0.5 rounded-full uppercase">
                                {getFreqText(t.frequency)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wallet?.color || '#cbd5e1' }}></span>
                              {wallet?.name || 'Tài khoản chưa chọn'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "font-black text-base tracking-tight",
                            t.type === 'income' ? 'text-[#1DBF73]' : 'text-slate-900 dark:text-white'
                          )}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black inline-block mt-1 uppercase tracking-wide", statusInfo.color)}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      {/* MiddleInfo */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          Kỳ kế tiếp: <span className="text-slate-700 dark:text-slate-300 font-bold">{new Date(t.nextDueDate).toLocaleDateString('vi-VN')}</span>
                        </span>
                        {t.lastCreatedDate && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Gần nhất: {new Date(t.lastCreatedDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>

                      {/* BottomAction */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1.5">
                        
                        {/* Auto-activation Switch */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t.id)}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              t.isActive ? "bg-[#1DBF73]" : "bg-slate-200 dark:bg-slate-800"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                t.isActive ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            {t.isActive ? 'Tự ghi nhận' : 'Tạm dừng'}
                          </span>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEditForm(t)}
                            className="p-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-750 transition-all uppercase tracking-wider"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleTriggerManuallyNow(t)}
                            className="p-1.5 px-3 text-[10px] font-black tracking-wider uppercase text-[#1DBF73] bg-[#1DBF73]/10 hover:bg-[#1DBF73]/20 dark:hover:bg-[#1DBF73]/15 rounded-lg transition-all"
                            title="Thanh toán ngay lập tức"
                          >
                            Ghi nhận ngay
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: DATA-MINED SMART SUGGESTIONS */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">

            {/* AI Banner Explainer */}
            <div className="bg-gradient-to-tr from-amber-550/10 to-orange-550/10 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-500/15 rounded-2xl p-4 flex gap-3">
              <Sparkles size={20} className="text-amber-500 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">Nhận diện mẫu thanh toán (Smart Detection)</p>
                <p className="text-slate-500 dark:text-slate-300 text-[11px] leading-relaxed mt-1 font-semibold">
                  Giải thuật lọc và đối soát dữ liệu (Data Pattern Mining) quét toàn bộ lịch sử tài chính của bạn, học hỏi các giao dịch lặp đi lặp lại cùng một khoảng thời gian (như 30 ngày cho tiền thuê nhà, 7 ngày cho ăn uống định kỳ) và đề xuất các dịch vụ đóng hộ tự động.
                </p>
              </div>
            </div>

            {detectedPatterns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 mx-auto animate-pulse">
                  <HelpCircle size={22} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">Chưa phát hiện thêm giao dịch định kỳ</p>
                  <p className="text-[11px] leading-relaxed max-w-xs mx-auto text-slate-450 dark:text-slate-500 font-medium">
                    Hệ thống cần ít nhất 2 giao dịch có cùng ghi chú/loại trong các khoảng thời gian đều đặn (hoặc chứa từ khóa thuê bao như "Netflix", "Spotify") để đưa ra gợi ý gợi nhớ.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã phân tích tìm thấy ({detectedPatterns.length}) đề xuất</span>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    <Sparkles size={10} /> Auto-Matched
                  </div>
                </div>

                {detectedPatterns.map(pat => {
                  const category = categories.find(c => c.id === pat.categoryId);
                  
                  return (
                    <div 
                      key={pat.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 shadow-sm hover:border-[#1DBF73]/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                          style={category?.color ? { backgroundColor: category.color + '15', color: category.color } : {}}
                        >
                          <DynamicIcon name={category?.icon || 'Compass'} size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{pat.note}</h4>
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.2 font-bold rounded uppercase tracking-wider",
                              pat.confidence === 'high' ? 'bg-green-500/10 text-green-550' : 
                              pat.confidence === 'medium' ? 'bg-amber-500/10 text-amber-550' : 'bg-blue-500/10 text-blue-550'
                            )}>
                              Độ tin cậy: {pat.confidence === 'high' ? 'Cao' : pat.confidence === 'medium' ? 'Trung bình' : 'Gợi ý thêm'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-bold mt-1">
                            {formatCurrency(pat.amount)} • {getFreqText(pat.frequency)}
                          </p>
                          {pat.matchesCount > 1 && (
                            <p className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold mt-0.5">
                              Tìm thấy {pat.matchesCount} giao dịch trùng khớp trong lịch sử
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openAddForm(pat)}
                        className="bg-[#1DBF73] hover:bg-emerald-600 font-black text-xs text-white p-2.5 px-4 rounded-xl flex items-center gap-1 whitespace-nowrap shadow-md shadow-[#1DBF73]/10 transform active:scale-95 duration-100 select-none cursor-pointer"
                      >
                        Kích hoạt
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* FOOTER EXPOSURE */}
      <footer className="absolute bottom-4 left-0 w-full text-center px-6 pointer-events-none z-30 opacity-40">
        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-600 block">SMART RECURRENCE DETECTOR RECOGNIIZED</span>
      </footer>

      {/* POPUP ADDFORM/EDITFORM - MODULATED & FULL HEIGHT COMPATIBLE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end justify-center overflow-hidden">
          <form onSubmit={handleSaveTemplate} className="bg-slate-50 dark:bg-slate-950 w-full max-w-md rounded-t-3xl sm:rounded-3xl rounded-none shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[85vh] border-t border-slate-150 dark:border-slate-855/60 animate-in slide-in-from-bottom duration-300 overflow-hidden">
            
            {/* Form Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)} 
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-bold"
              >
                Hủy bỏ
              </button>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingTemplate ? 'Sửa giao dịch định kỳ' : 'Thiết lập định kỳ mới'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-805 transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            {/* Form Content - Separated card fields with scrollability */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-10">
              
              {/* Type Selection Tabs */}
              <div className="flex bg-slate-200/60 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all",
                    type === 'expense' 
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-rose-550' 
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Khoản chi
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all",
                    type === 'income' 
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-[#1DBF73]' 
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Khoản thu
                </button>
              </div>

              {/* SECTION 1: Core details */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-850/40 space-y-4">
                
                {/* Note Description */}
                <div className="space-y-1.5 pl-0.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Tên dịch vụ / Ghi chú</label>
                  <input
                    type="text"
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Netflix, Spotify, Tiền điện, Tiền nhà..."
                    className="w-full text-base font-bold bg-transparent outline-none px-1 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 focus:border-[#1DBF73] transition-all placeholder:font-normal placeholder:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Amount Numeric - REALTIME DECIMAL FORMATTED */}
                <div className="space-y-1.5 pl-0.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Số tiền chu kỳ</label>
                  <div className="relative border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={amountInput}
                      onChange={handleAmountChange}
                      placeholder="Mức tiền cố định..."
                      className="w-full text-xl font-black bg-transparent outline-none px-1 text-slate-950 dark:text-white focus:text-[#1DBF73] transition-colors placeholder:font-normal placeholder:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 px-2.5 py-1 rounded-lg shrink-0">VND</span>
                  </div>
                </div>

              </div>

              {/* SECTION 2: Category & Wallet Select - DYNAMIC MODAL OVERLAYS */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-850/40 space-y-4">
                
                {/* Category Selection Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider pl-1">Nhóm danh mục</label>
                  <button
                    type="button"
                    onClick={() => setShowCategorySelector(true)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-sm font-bold text-slate-805 dark:text-white outline-none flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {selectedCategory ? (
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                          style={selectedCategory.color ? { backgroundColor: `${selectedCategory.color}15`, color: selectedCategory.color } : {}}
                        >
                          <DynamicIcon name={selectedCategory.icon} size={15} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-850 flex items-center justify-center text-slate-400 shrink-0">
                          <DynamicIcon name="Box" size={14} />
                        </div>
                      )}
                      <span className="truncate">{selectedCategory?.name || 'Chọn nhóm danh mục'}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* Wallet select block */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider pl-1">Trừ tiền vào Ví</label>
                  <button
                    type="button"
                    onClick={() => setShowWalletSelector(true)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-sm font-bold text-slate-805 dark:text-white outline-none flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {selectedWallet ? (
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                          style={selectedWallet.color ? { backgroundColor: `${selectedWallet.color}15`, color: selectedWallet.color } : {}}
                        >
                          <DynamicIcon name={selectedWallet.icon} size={15} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-850 flex items-center justify-center text-slate-400 shrink-0">
                          <DynamicIcon name="Wallet" size={14} />
                        </div>
                      )}
                      <span className="truncate">{selectedWallet ? `${selectedWallet.name} (${formatCurrency(selectedWallet.balance)})` : 'Chọn ví tài khoản'}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* Frequency selector input */}
                <div className="space-y-1.5 pl-0.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1 block">Tần suất giao dịch</label>
                  <select 
                    value={frequency} 
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/85 text-sm font-bold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="weekly">Hàng tuần</option>
                    <option value="bi-weekly">2 tuần một kỳ</option>
                    <option value="monthly">Hàng tháng</option>
                  </select>
                </div>

                {/* Next Due Date calendar */}
                <div className="space-y-1.5 pl-0.5">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1 block">Kỳ tiếp theo bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-sm font-bold text-slate-850 dark:text-white outline-none"
                  />
                </div>

              </div>

              {/* SECTION 3: Auto Switch trigger toggle */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-150 dark:border-slate-850/40 flex items-center justify-between">
                <div className="space-y-0.5 max-w-[78%]">
                  <label className="text-sm font-black text-slate-955 dark:text-white">Cho phép tự ghi nhận</label>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                    Hệ thống tự động thêm giao dịch vào tài khoản mà không cần xác nhận khi đến kỳ hạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isActive ? "bg-[#1DBF73]" : "bg-slate-200 dark:bg-slate-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isActive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

            </div>

            {/* Sticky bottom submit and delete buttons */}
            <div className="p-4 px-5 bg-white dark:bg-slate-900/95 border-t border-slate-150 dark:border-slate-800/80 shrink-0 space-y-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] z-10 shadow-lg">
              <button
                type="submit"
                className="w-full bg-[#1DBF73] hover:bg-emerald-600 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-[#1DBF73]/20 transition-all text-sm block text-center uppercase tracking-wider select-none cursor-pointer"
              >
                {editingTemplate ? 'Lưu thay đổi' : 'Lưu thiết lập'}
              </button>

              {editingTemplate && (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(editingTemplate.id)}
                  className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-500 font-bold py-3.5 px-4 rounded-xl border border-rose-100 dark:border-[#991b1b]/30 transition-all text-sm flex items-center justify-center gap-2 select-none"
                >
                  <Trash2 size={16} />
                  Xóa giao dịch định kỳ này
                </button>
              )}
            </div>

          </form>
        </div>
      )}

      {/* Category Custom Selector Overlay Sheet */}
      {showCategorySelector && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shrink-0">
             <button onClick={() => setShowCategorySelector(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
               <ChevronLeft size={24} />
             </button>
             <h2 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase">Chọn nhóm danh mục</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
             {filteredCategories.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-[15px]">Không có nhóm nào</div>
             ) : (
                <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
                  {categoryTree.map(node => renderCategoryNode(node))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* Wallet Custom Selector Overlay Sheet */}
      {showWalletSelector && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-[#F3F4F6] dark:border-slate-800 shrink-0">
             <button onClick={() => setShowWalletSelector(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 transition-colors">
               <ChevronLeft size={24} />
             </button>
             <h2 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase">Chọn ví thanh toán</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {wallets.length === 0 && (
                <div className="text-center text-slate-500 py-10 text-[15px] bg-white dark:bg-slate-950 rounded-2xl">Không có ví nào</div>
             )}
             {wallets.map(wallet => (
               <button
                 key={wallet.id}
                 type="button"
                 onClick={() => {
                   setWalletId(wallet.id);
                   setShowWalletSelector(false);
                 }}
                 className="flex items-center w-full gap-4 p-4 rounded-xl bg-white dark:bg-slate-950 shadow-sm border border-slate-100 dark:border-slate-805 active:scale-95 transition-transform"
               >
                 <div 
                   className="w-12 h-12 rounded-full flex items-center justify-center p-1.5 shrink-0"
                   style={wallet.color ? { backgroundColor: `${wallet.color}20`, color: wallet.color } : {}}
                 >
                   <DynamicIcon name={wallet.icon} size={24} />
                 </div>
                 <div className="flex-1 text-left min-w-0">
                   <p className="text-[16px] font-bold text-slate-900 dark:text-white leading-tight truncate">{wallet.name}</p>
                   <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">{formatCurrency(wallet.balance)}</p>
                 </div>
                 {walletId === wallet.id && (
                   <Check size={20} className="text-[#1DBF73] shrink-0" />
                 )}
               </button>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
