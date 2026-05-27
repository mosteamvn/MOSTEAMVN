import { useState, useEffect, FormEvent, useMemo } from 'react';
import { ChevronRight, ChevronLeft, X, Delete } from 'lucide-react';
import { Wallet, Category, Transaction, TransactionType } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { cn, formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';
import { addTransaction, updateTransaction, deleteTransaction } from '../lib/api';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  editingTransaction?: Transaction | null;
}

export default function AddTransactionModal({ isOpen, onClose, wallets = [], categories = [], onSuccess, editingTransaction }: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [expression, setExpression] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setExpression(editingTransaction.amount.toString());
        setCategoryId(editingTransaction.categoryId);
        setWalletId(editingTransaction.walletId);
        setNote(editingTransaction.note || '');
        const formattedDate = editingTransaction.date ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0];
        setDate(formattedDate);
        setShowKeypad(false);
      } else {
        setType('expense');
        setExpression('0');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        if (wallets && wallets.length > 0) {
          const defaultWallet = wallets.find(w => w && w.isDefault);
          setWalletId(defaultWallet ? defaultWallet.id : (wallets[0]?.id || ''));
        }
        
        const typeCategories = categories ? categories.filter(c => c && c.type === 'expense') : [];
        if (typeCategories.length > 0) {
          setCategoryId(typeCategories[0]?.id || '');
        } else {
          setCategoryId('');
        }
        setShowKeypad(false);
      }
    }
  }, [isOpen, editingTransaction, wallets, categories]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const typeCategories = categories ? categories.filter(c => c && c.type === newType) : [];
    if (typeCategories.length > 0) {
      setCategoryId(typeCategories[0]?.id || '');
    } else {
      setCategoryId('');
    }
  };

  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => c && c.type === type);
  }, [categories, type]);

  const selectedWallet = useMemo(() => (wallets || []).find(w => w && w.id === walletId), [wallets, walletId]);
  const selectedCategory = useMemo(() => (categories || []).find(c => c && c.id === categoryId), [categories, categoryId]);

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
            "flex items-center justify-between p-3.5 bg-white dark:bg-slate-950 border-b border-slate-50 dark:border-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-900/35 transition-all select-none text-left w-full",
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
            <DynamicIcon name="Check" size={20} className="text-[#1DBF73] shrink-0" />
          )}
        </button>
        {node.children.length > 0 && (
          <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 ml-8">
            {node.children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  // Keypad logic
  const handleKeypadPress = (val: string) => {
    if (expression === '0' && !['+', '-', '*', '/'].includes(val) && val !== '000') {
      setExpression(val);
      return;
    }

    if (val === 'C') {
      setExpression('0');
      return;
    }

    if (val === 'DEL') {
      if (expression.length > 1) {
        setExpression(expression.slice(0, -1));
      } else {
        setExpression('0');
      }
      return;
    }

    // Prevent consecutive operators
    const lastChar = expression.slice(-1);
    const isOperator = ['+', '-', '*', '/'].includes(val);
    const lastIsOperator = ['+', '-', '*', '/'].includes(lastChar);
    
    if (isOperator && lastIsOperator) {
      setExpression(expression.slice(0, -1) + val);
      return;
    }

    setExpression(prev => prev + val);
  };

  const getCalculatedAmount = () => {
    try {
      // Remove trailing operators
      let evalExpr = expression;
      if (['+', '-', '*', '/'].includes(evalExpr.slice(-1))) {
        evalExpr = evalExpr.slice(0, -1);
      }
      if (!evalExpr) return 0;
      
      const calcFunc = new Function('return ' + evalExpr);
      const result = calcFunc();
      return isNaN(result) ? 0 : result;
    } catch (e) {
      return 0;
    }
  };

  const formatExpression = (exp: string) => {
    // Basic formatting: 10000+2000 -> 10,000+2,000
    // Replace operators for display
    let disp = exp.replace(/\*/g, ' x ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/\-/g, ' - ');
    // We would need a regex to format numbers with commas, but keep it simple for now or use a basic replace
    return disp.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const currentAmount = getCalculatedAmount();

  const handleAdjustDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatVietnameseDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dayIndex = d.getDay();
      const vnDays = ['C.Nhật', 'T.Hai', 'T.Ba', 'T.Tư', 'T.Năm', 'T.Sáu', 'T.Bảy'];
      const formattedDay = vnDays[dayIndex];
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${formattedDay}, ${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const finalAmount = getCalculatedAmount();

    if (finalAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) throw new Error('Không tìm thấy ví');

      if (editingTransaction) {
        const oldWallet = wallets.find(w => w.id === editingTransaction.walletId);
        await updateTransaction(
          editingTransaction,
          {
            type,
            amount: finalAmount,
            categoryId,
            walletId,
            note,
            date: new Date(date).toISOString()
          },
          oldWallet ? oldWallet.balance : 0,
          wallet.balance
        );
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await addTransaction({
            type,
            amount: finalAmount,
            categoryId,
            walletId,
            note,
            date: new Date(date).toISOString()
        }, wallet.balance);
        toast.success('Thêm giao dịch thành công!');
      }
      
      setExpression('0');
      setNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Có lỗi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-bottom-full duration-300">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-950 sticky top-0 z-20 shrink-0 border-b border-slate-100 dark:border-slate-900">
        <button onClick={onClose} className="text-slate-600 dark:text-slate-300 font-medium text-[15px]">
          Huỷ
        </button>
         <h2 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase">
          {editingTransaction ? 'Chỉnh Sửa Giao Dịch' : 'Thêm Giao Dịch'}
        </h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>
      
      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
            
            {/* Tabs */}
            <div className="p-4 pb-0">
              <div className="flex bg-[#F3F4F6] dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={cn(
                    "flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-all",
                    type === 'expense' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  Khoản chi
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={cn(
                    "flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-all",
                    type === 'income' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  Khoản thu
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('debt')}
                  className={cn(
                    "flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-all",
                    type === 'debt' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  Vay/Nợ
                </button>
              </div>
            </div>

            <div className="px-4 py-2">
              
              {/* Wallet Item */}
              <button 
                type="button"
                className="w-full relative flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setShowWalletSelector(true)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center p-1.5"
                    style={selectedWallet ? { backgroundColor: `${selectedWallet.color}20`, color: selectedWallet.color } : {}}
                  >
                    {selectedWallet ? <DynamicIcon name={selectedWallet.icon} size={20} /> : <DynamicIcon name="Wallet" size={20} className="text-slate-400" />}
                  </div>
                  <span className="text-[17px] text-slate-900 dark:text-gray-100">{selectedWallet?.name || 'Chọn ví'}</span>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
              </button>

              {/* Amount Item */}
              <div 
                className="py-1 border-b border-slate-50 dark:border-slate-800 cursor-text"
                onClick={() => setShowKeypad(true)}
              >
                <p className="text-[13px] text-slate-500 mb-1 pl-1 pt-3">Số tiền</p>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-medium rounded-md">
                      VND
                    </span>
                    <span 
                      className={cn(
                        "text-[28px] font-medium truncate flex-1 outline-none min-h-[40px] flex items-center pl-1",
                        expression === '0' ? "text-slate-400" : "text-slate-900 dark:text-white"
                      )}
                    >
                      {formatExpression(expression)}
                    </span>
                  </div>
                  {expression !== '0' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpression('0'); setShowKeypad(true); }} 
                      className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 mx-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Custom Keypad - Fixed at bottom of screen with shortcuts */}
                {showKeypad && (
                  <div className="fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-slate-900 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 transition-all duration-300 animate-in slide-in-from-bottom">
                    {/* Shortcuts Row */}
                    <div className="flex items-center gap-2 px-4 mb-3 overflow-x-auto no-scrollbar py-1">
                      {[20000, 50000, 100000, 200000, 500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setExpression(amt.toString())}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap active:bg-slate-200 transition-colors"
                        >
                          {new Intl.NumberFormat('vi-VN').format(amt)}
                        </button>
                      ))}
                    </div>

                    {/* Keypad Grid */}
                    <div className="grid grid-cols-4 gap-2 px-4 h-[280px] pb-4">
                       {/* Row 1 */}
                       <button type="button" onClick={() => handleKeypadPress('C')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] text-2xl font-bold flex items-center justify-center transition-colors active:bg-slate-200">C</button>
                       <button type="button" onClick={() => handleKeypadPress('/')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] text-3xl font-bold flex items-center justify-center transition-colors active:bg-slate-200">÷</button>
                       <button type="button" onClick={() => handleKeypadPress('*')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] text-3xl font-bold flex items-center justify-center transition-colors active:bg-slate-200">×</button>
                       <button type="button" onClick={() => handleKeypadPress('DEL')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] flex items-center justify-center transition-colors active:bg-slate-200">
                         <Delete size={28} />
                       </button>

                       {/* Row 2 */}
                       <button type="button" onClick={() => handleKeypadPress('7')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">7</button>
                       <button type="button" onClick={() => handleKeypadPress('8')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">8</button>
                       <button type="button" onClick={() => handleKeypadPress('9')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">9</button>
                       <button type="button" onClick={() => handleKeypadPress('-')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] text-3xl font-bold flex items-center justify-center transition-colors active:bg-slate-200">-</button>

                       {/* Row 3 */}
                       <button type="button" onClick={() => handleKeypadPress('4')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">4</button>
                       <button type="button" onClick={() => handleKeypadPress('5')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">5</button>
                       <button type="button" onClick={() => handleKeypadPress('6')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">6</button>
                       <button type="button" onClick={() => handleKeypadPress('+')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-2xl text-[#1DBF73] text-3xl font-bold flex items-center justify-center transition-colors active:bg-slate-200">+</button>

                       {/* Row 4 */}
                       <button type="button" onClick={() => handleKeypadPress('1')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">1</button>
                       <button type="button" onClick={() => handleKeypadPress('2')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">2</button>
                       <button type="button" onClick={() => handleKeypadPress('3')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">3</button>
                       <button 
                         type="button" 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (['+', '-', '*', '/'].some(op => expression.includes(op)) && getCalculatedAmount() > 0) {
                             setExpression(getCalculatedAmount().toString());
                           } else {
                             setShowKeypad(false);
                           }
                         }} 
                         className="row-span-2 h-full bg-[#1DBF73] hover:bg-emerald-600 text-white rounded-2xl text-lg font-extrabold shadow-sm flex items-center justify-center transition-colors select-none active:bg-emerald-700"
                       >
                         {['+', '-', '*', '/'].some(op => expression.includes(op)) ? '=' : 'XONG'}
                       </button>

                       {/* Row 5 */}
                       <button type="button" onClick={() => handleKeypadPress('0')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">0</button>
                       <button type="button" onClick={() => handleKeypadPress('000')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 transition-colors active:bg-slate-200">000</button>
                       <button type="button" onClick={() => handleKeypadPress('.')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl text-2xl font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 pb-1 flex items-center justify-center transition-colors active:bg-slate-200">.</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Item */}
              <button 
                type="button"
                className="w-full relative flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setShowCategorySelector(true)}
              >
                <div className="flex items-center gap-3">
                   {selectedCategory ? (
                     <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center p-1.5"
                        style={selectedCategory.color ? { backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color } : {}}
                     >
                       <DynamicIcon name={selectedCategory.icon} size={20} />
                     </div>
                   ) : (
                     <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                       <DynamicIcon name="Box" size={16} />
                     </div>
                   )}
                  <span className={cn(
                    "text-[17px]",
                    selectedCategory ? "text-slate-900 dark:text-gray-100" : "text-slate-400"
                  )}>
                    {selectedCategory?.name || 'Chọn nhóm'}
                  </span>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
              </button>

              {/* Note Item */}
              <div className="flex items-center gap-3 py-4 border-b border-slate-50 dark:border-slate-800">
                 <div className="w-8 h-8 flex items-center justify-center text-slate-500">
                   <DynamicIcon name="AlignLeft" size={20} />
                 </div>
                 <input 
                   type="text"
                   placeholder="Ghi chú"
                   value={note}
                   onChange={e => setNote(e.target.value)}
                   onFocus={() => setShowKeypad(false)}
                   className="flex-1 text-[17px] bg-transparent outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                 />
              </div>

              {/* Symmetric Date Selector */}
              <div className="flex items-center justify-between gap-3 py-4 px-1">
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdjustDate(-1); }}
                  className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#1DBF73] active:scale-90 transition-all shadow-sm shrink-0"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex-1 relative group h-11">
                  <div className="w-full h-full bg-[#FAFBFB] dark:bg-slate-900/60 rounded-xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-800/50 shadow-inner px-3">
                    <DynamicIcon name="Calendar" size={18} className="text-slate-400 shrink-0" />
                    <span className="text-[#1DBF73] font-bold text-[14px] truncate">
                      {formatVietnameseDate(date)}
                    </span>
                  </div>
                  <input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onFocus={() => setShowKeypad(false)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                </div>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdjustDate(1); }}
                  className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#1DBF73] active:scale-90 transition-all shadow-sm shrink-0"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

            </div>

          </div>
          
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || currentAmount <= 0}
            className="w-full py-3.5 mt-4 rounded-xl text-white font-semibold text-[17px] shadow-sm transition-transform active:scale-95 disabled:opacity-70 bg-slate-400 dark:bg-slate-700"
            style={{ 
              backgroundColor: currentAmount > 0 && type === 'expense' ? '#f43f5e' : (currentAmount > 0 && type === 'income' ? '#1DBF73' : (currentAmount > 0 ? '#3b82f6' : undefined)) 
            }}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
          </button>

          {editingTransaction && (
            <button 
              type="button"
              onClick={async () => {
                const confirmed = window.confirm('Bạn có chắc chắn muốn xoá giao dịch này không?');
                if (!confirmed) return;
                setIsSubmitting(true);
                try {
                  const txWallet = wallets.find(w => w.id === editingTransaction.walletId);
                  await deleteTransaction(editingTransaction, txWallet ? txWallet.balance : 0);
                  toast.success('Xoá giao dịch thành công!');
                  onSuccess();
                  onClose();
                } catch (e: any) {
                  toast.error('Có lỗi xảy ra: ' + e.message);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-sm shadow-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-rose-100/60 transition-transform active:scale-95"
            >
              <DynamicIcon name="Trash2" size={16} />
              Xoá giao dịch
            </button>
          )}
        </div>
      </div>
      
      {/* Wallet Selector Modal */}
      {showWalletSelector && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <button onClick={() => setShowWalletSelector(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
               <ChevronRight size={24} className="rotate-180" />
             </button>
             <h2 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase">Chọn ví</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {wallets.length === 0 && (
                <div className="text-center text-slate-500 py-10 text-[15px]">Không có ví nào</div>
             )}
             {wallets.map(wallet => (
               <button
                 key={wallet.id}
                 type="button"
                 onClick={() => {
                   setWalletId(wallet.id);
                   setShowWalletSelector(false);
                 }}
                 className="flex items-center w-full gap-4 p-4 rounded-xl bg-white dark:bg-slate-950 shadow-sm border border-slate-50 dark:border-slate-800 active:scale-95 transition-transform"
               >
                 <div 
                   className="w-12 h-12 rounded-full flex items-center justify-center p-1.5"
                   style={wallet.color ? { backgroundColor: `${wallet.color}20`, color: wallet.color } : {}}
                 >
                   <DynamicIcon name={wallet.icon} size={24} />
                 </div>
                 <div className="flex-1 text-left">
                   <p className="text-[16px] font-semibold text-slate-900 dark:text-white leading-tight">{wallet.name}</p>
                   <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{formatCurrency(wallet.balance)}</p>
                 </div>
                 {walletId === wallet.id && (
                   <DynamicIcon name="Check" size={20} className="text-[#1DBF73]" />
                 )}
               </button>
             ))}
          </div>
        </div>
      )}

      {/* Category Selector Modal */}
      {showCategorySelector && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <button onClick={() => setShowCategorySelector(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
               <ChevronRight size={24} className="rotate-180" />
             </button>
             <h2 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase">Chọn nhóm</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-4 shrink-0">
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
    </div>
  );
}

