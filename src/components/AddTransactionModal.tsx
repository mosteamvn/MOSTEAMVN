import { useState, useEffect, FormEvent, useMemo } from 'react';
import { ChevronRight, X, Delete } from 'lucide-react';
import { Wallet, Category, TransactionType } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { addTransaction } from '../lib/api';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

export default function AddTransactionModal({ isOpen, onClose, wallets, categories, onSuccess }: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [expression, setExpression] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id);
      
      const typeCategories = categories.filter(c => c.type === type);
      if (typeCategories.length > 0 && (!categoryId || !typeCategories.find(c => c.id === categoryId))) {
        setCategoryId(typeCategories[0].id);
      }
      setExpression('0');
      setShowKeypad(true);
    }
  }, [isOpen, wallets, categories, type]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedWallet = wallets.find(w => w.id === walletId);
  const selectedCategory = categories.find(c => c.id === categoryId);

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

      await addTransaction({
          type,
          amount: finalAmount,
          categoryId,
          walletId,
          note,
          date: new Date(date).toISOString()
      }, wallet.balance);
      
      toast.success('Thêm giao dịch thành công!');
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
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-950">
        <button onClick={onClose} className="text-slate-600 dark:text-slate-300 font-medium text-[15px]">
          Huỷ
        </button>
        <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Thêm Giao Dịch</h2>
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
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-all",
                    type === 'expense' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  Khoản chi
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-all",
                    type === 'income' ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                  )}
                >
                  Khoản thu
                </button>
                <button
                  type="button"
                  onClick={() => setType('debt')}
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
              <label className="relative flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5">
                    {selectedWallet ? <DynamicIcon name={selectedWallet.icon} size={20} style={{ color: selectedWallet.color }} /> : <DynamicIcon name="Wallet" size={20} className="text-slate-400" />}
                  </div>
                  <span className="text-[17px] text-slate-900 dark:text-gray-100">{selectedWallet?.name || 'Chọn ví'}</span>
                </div>
                <ChevronRight className="text-slate-400" size={20} />
                <select 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                >
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>

              {/* Amount Item */}
              <div 
                className="py-4 border-b border-slate-50 dark:border-slate-800 cursor-text"
                onClick={() => setShowKeypad(true)}
              >
                <p className="text-[13px] text-slate-500 mb-2">Số tiền</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-medium rounded-md">
                      VND
                    </span>
                    <span 
                      className={cn(
                        "text-[28px] font-medium truncate flex-1 outline-none min-h-[40px] flex items-center",
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
                        style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
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

              {/* Date Item */}
              <div className="flex items-center justify-between py-4">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 flex items-center justify-center text-slate-500">
                     <DynamicIcon name="Calendar" size={20} />
                   </div>
                   <input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onFocus={() => setShowKeypad(false)}
                    className="flex-1 text-[17px] bg-transparent outline-none text-slate-900 dark:text-white"
                   />
                 </div>
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
        </div>
      </div>

      {/* Custom Keypad */}
      <div 
        className={cn(
          "bg-white dark:bg-slate-950 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-6 pt-2 transition-transform duration-300 absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl",
          showKeypad ? "translate-y-0" : "translate-y-full hidden"
        )}
      >
        {/* Quick Amount Suggestion row */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto hide-scrollbar mb-2">
          {['40000', '30000', '20000', '50000', '100000'].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => setExpression(val)}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-[15px] text-slate-700 dark:text-slate-300 whitespace-nowrap"
            >
              {Number(val).toLocaleString()}
            </button>
          ))}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 px-4 h-64">
           {/* Row 1 */}
           <button type="button" onClick={() => handleKeypadPress('C')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-xl font-medium">C</button>
           <button type="button" onClick={() => handleKeypadPress('/')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-2xl font-medium">÷</button>
           <button type="button" onClick={() => handleKeypadPress('*')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-2xl font-medium">×</button>
           <button type="button" onClick={() => handleKeypadPress('DEL')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] flex items-center justify-center">
             <Delete size={24} />
           </button>

           {/* Row 2 */}
           <button type="button" onClick={() => handleKeypadPress('7')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">7</button>
           <button type="button" onClick={() => handleKeypadPress('8')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">8</button>
           <button type="button" onClick={() => handleKeypadPress('9')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">9</button>
           <button type="button" onClick={() => handleKeypadPress('-')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-4xl font-light pb-1">-</button>

           {/* Row 3 */}
           <button type="button" onClick={() => handleKeypadPress('4')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">4</button>
           <button type="button" onClick={() => handleKeypadPress('5')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">5</button>
           <button type="button" onClick={() => handleKeypadPress('6')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">6</button>
           <button type="button" onClick={() => handleKeypadPress('+')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-3xl font-medium">+</button>

           {/* Row 4 & 5 combined handling */}
           <div className="col-span-3 grid grid-cols-3 gap-2">
             <button type="button" onClick={() => handleKeypadPress('1')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">1</button>
             <button type="button" onClick={() => handleKeypadPress('2')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">2</button>
             <button type="button" onClick={() => handleKeypadPress('3')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">3</button>
             <button type="button" onClick={() => handleKeypadPress('0')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-2xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">0</button>
             <button type="button" onClick={() => handleKeypadPress('000')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50">000</button>
             <button type="button" onClick={() => handleKeypadPress('.')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-3xl font-medium text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/50 pb-2">.</button>
           </div>
           
           <button 
             type="button" 
             onClick={() => {
               if (['+', '-', '*', '/'].some(op => expression.includes(op))) {
                 setExpression(getCalculatedAmount().toString());
               } else {
                 setShowKeypad(false);
               }
             }} 
             className="row-span-2 bg-[#1DBF73] text-white rounded-xl text-[17px] font-bold shadow-sm"
           >
             {['+', '-', '*', '/'].some(op => expression.includes(op)) ? '=' : 'XONG'}
           </button>
        </div>
      </div>
      
      {/* Category Selector Modal */}
      {showCategorySelector && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-[#F3F4F6] dark:bg-slate-900 animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
             <button onClick={() => setShowCategorySelector(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
               <ChevronRight size={24} className="rotate-180" />
             </button>
             <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Chọn nhóm</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {filteredCategories.length === 0 && (
                <div className="text-center text-slate-500 py-10 text-[15px]">Không có nhóm nào</div>
             )}
             {filteredCategories.map(cat => (
               <button
                 key={cat.id}
                 type="button"
                 onClick={() => {
                   setCategoryId(cat.id);
                   setShowCategorySelector(false);
                 }}
                 className="flex items-center w-full gap-4 p-4 rounded-xl bg-white dark:bg-slate-950 shadow-sm border border-slate-50 dark:border-slate-800 active:scale-95 transition-transform"
               >
                 <div 
                   className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                   style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                 >
                   <DynamicIcon name={cat.icon} size={24} />
                 </div>
                 <span className="text-[16px] font-medium text-slate-900 dark:text-white flex-1 text-left">{cat.name}</span>
                 {categoryId === cat.id && (
                   <DynamicIcon name="Check" size={20} className="text-[#1DBF73]" />
                 )}
               </button>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}

