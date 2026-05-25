import { useState, FormEvent } from 'react';
import { ArrowLeft, Plus, X, Trash2, Check, Wallet as WalletIcon, CreditCard, Coins, Landmark, Banknote, PiggyBank, Delete } from 'lucide-react';
import toast from 'react-hot-toast';
import { Wallet } from '../types';
import { formatCurrency } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { addWallet, updateWallet, deleteWallet } from '../lib/api';

interface WalletsViewProps {
  wallets: Wallet[];
  setActiveView: (view: any) => void;
}

const PRESET_COLORS = [
  '#1DBF73', // Green
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#475569', // Slate
  '#6366f1', // Indigo
];

const PRESET_ICONS = [
  'Wallet',
  'CreditCard',
  'Coins',
  'Landmark',
  'Banknote',
  'PiggyBank',
];

export default function WalletsView({ wallets, setActiveView }: WalletsViewProps) {
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  
  // Form States
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);
  
  // Custom Keypad States for initial balance
  const [showKeypad, setShowKeypad] = useState(false);
  const [balanceExpression, setBalanceExpression] = useState('0');

  const openAddModal = () => {
    setEditingWallet(null);
    setName('');
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedIcon(PRESET_ICONS[0]);
    setBalanceExpression('0');
    setShowKeypad(false);
    setIsModalOpen(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setName(wallet.name);
    setSelectedColor(wallet.color);
    setSelectedIcon(wallet.icon || PRESET_ICONS[0]);
    setBalanceExpression(wallet.balance.toString());
    setShowKeypad(false);
    setIsModalOpen(true);
  };

  // Balance keypad logic
  const handleKeypadPress = (val: string) => {
    if (balanceExpression === '0' && !['+', '-', '*', '/'].includes(val) && val !== '000') {
      setBalanceExpression(val);
      return;
    }

    if (val === 'C') {
      setBalanceExpression('0');
      return;
    }

    if (val === 'DEL') {
      if (balanceExpression.length > 1) {
        setBalanceExpression(balanceExpression.slice(0, -1));
      } else {
        setBalanceExpression('0');
      }
      return;
    }

    // Prevent consecutive operators
    const lastChar = balanceExpression.slice(-1);
    const isOperator = ['+', '-', '*', '/'].includes(val);
    const lastIsOperator = ['+', '-', '*', '/'].includes(lastChar);
    
    if (isOperator && lastIsOperator) {
      setBalanceExpression(balanceExpression.slice(0, -1) + val);
      return;
    }

    setBalanceExpression(prev => prev + val);
  };

  const getCalculatedBalance = () => {
    try {
      let evalExpr = balanceExpression;
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
    let disp = exp.replace(/\*/g, ' x ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/\-/g, ' - ');
    return disp.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên ví');
      return;
    }

    const finalBalance = getCalculatedBalance();

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: name.trim(),
          balance: finalBalance,
          color: selectedColor,
          icon: selectedIcon,
        });
        toast.success('Đã cập nhật thông tin ví');
      } else {
        await addWallet({
          name: name.trim(),
          balance: finalBalance,
          color: selectedColor,
          icon: selectedIcon,
        });
        toast.success('Đã thêm ví mới thành công');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi lưu thông tin ví');
    }
  };

  const handleDelete = async () => {
    if (!editingWallet) return;
    if (!confirm(`Bạn có chắc muốn xoá ví "${editingWallet.name}"?`)) return;

    try {
      await deleteWallet(editingWallet.id);
      toast.success('Đã xoá ví thành công');
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể xoá ví');
    }
  };

  return (
    <div className="px-5 pb-5 space-y-5 flex flex-col h-full absolute inset-0 bg-slate-50 dark:bg-slate-950 z-50 animate-in slide-in-from-right duration-300">
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-5 pb-3 -mx-5 px-5 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Ví của tôi</h1>
        </div>
        <button 
          onClick={openAddModal}
          className="p-2 bg-[#1DBF73] text-white rounded-full shadow-md shadow-[#1DBF73]/30 hover:scale-105 transition-transform"
        >
          <Plus size={18} />
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
        <p className="text-slate-400 text-sm font-medium tracking-wide">Tổng số dư</p>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          {formatCurrency(totalBalance)}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-4">
        {wallets.map(wallet => (
          <div 
            key={wallet.id} 
            onClick={() => openEditModal(wallet)}
            className="rounded-xl p-4 text-white relative overflow-hidden shadow-md group cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
            style={{ backgroundColor: wallet.color }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <DynamicIcon name={wallet.icon || 'Wallet'} size={80} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <DynamicIcon name={wallet.icon || 'Wallet'} size={20} />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">{wallet.name}</p>
                  <p className="font-bold text-lg leading-tight mt-0.5">{formatCurrency(wallet.balance)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Wallet Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] border-t border-slate-150 dark:border-slate-850 animate-in slide-in-from-bottom duration-300">
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-905">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium"
              >
                Huỷ
              </button>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingWallet ? 'Sửa thông tin ví' : 'Thêm ví mới'}
              </h2>
              <div className="w-8"></div> {/* Spacer for symmetry */}
            </header>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
                
                {/* Tên ví */}
                <div className="space-y-1.5 border-b border-slate-100/60 dark:border-slate-800/40 pb-3">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Tên ví</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Ví MoMo, Thẻ ATM"
                    className="w-full text-base font-bold bg-transparent outline-none px-1 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Số dư / Số dư ban đầu */}
                <div 
                  className="space-y-1.5 border-b border-slate-100/60 dark:border-slate-800/40 pb-3 cursor-pointer select-none"
                  onClick={() => setShowKeypad(true)}
                >
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                    {editingWallet ? 'Số dư (₫)' : 'Số dư ban đầu (₫)'}
                  </label>
                  <div className="flex items-center justify-between px-1">
                    <span 
                      className={`text-2xl font-bold bg-transparent outline-none flex-1 py-1 min-h-[40px] flex items-center ${
                        balanceExpression === '0' || !balanceExpression ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {balanceExpression === '0' || !balanceExpression ? "0" : formatExpression(balanceExpression)}
                    </span>
                    {balanceExpression !== '0' && balanceExpression !== '' && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setBalanceExpression('0'); setShowKeypad(true); }} 
                        className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chọn biểu tượng */}
                <div className="space-y-1.5 border-b border-slate-100/60 dark:border-slate-800/40 pb-3">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Biểu tượng</label>
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setSelectedIcon(iconName)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                          selectedIcon === iconName 
                            ? 'bg-[#1DBF73]/10 border-[#1DBF73] text-[#1DBF73]' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-550 dark:text-slate-400'
                        }`}
                      >
                        <DynamicIcon name={iconName} size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn màu sắc vĩ */}
                <div className="space-y-1.5 pb-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Màu sắc</label>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setSelectedColor(hex)}
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
                        style={{ backgroundColor: hex }}
                      >
                        {selectedColor === hex && (
                          <Check size={14} className="text-white drop-shadow-sm font-bold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Keyboard Container */}
                {showKeypad && (
                  <div className="bg-[#FAFBFB] dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/85 pb-3.5 pt-3 rounded-b-2xl transition-all duration-300 -mx-4 -mb-4">
                    <div className="grid grid-cols-4 gap-1.5 px-3.5 h-[178px]">
                       {/* Row 1 */}
                       <button type="button" onClick={() => handleKeypadPress('C')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-base font-bold">C</button>
                       <button type="button" onClick={() => handleKeypadPress('/')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-lg font-bold">÷</button>
                       <button type="button" onClick={() => handleKeypadPress('*')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-lg font-bold">×</button>
                       <button type="button" onClick={() => handleKeypadPress('DEL')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] flex items-center justify-center">
                         <Delete size={18} />
                       </button>

                       {/* Row 2 */}
                       <button type="button" onClick={() => handleKeypadPress('7')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">7</button>
                       <button type="button" onClick={() => handleKeypadPress('8')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">8</button>
                       <button type="button" onClick={() => handleKeypadPress('9')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">9</button>
                       <button type="button" onClick={() => handleKeypadPress('-')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-lg font-bold">-</button>

                       {/* Row 3 */}
                       <button type="button" onClick={() => handleKeypadPress('4')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">4</button>
                       <button type="button" onClick={() => handleKeypadPress('5')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">5</button>
                       <button type="button" onClick={() => handleKeypadPress('6')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">6</button>
                       <button type="button" onClick={() => handleKeypadPress('+')} className="bg-[#F3F4F6] dark:bg-slate-800 rounded-xl text-[#1DBF73] text-lg font-bold">+</button>

                       {/* Row 4 */}
                       <button type="button" onClick={() => handleKeypadPress('1')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">1</button>
                       <button type="button" onClick={() => handleKeypadPress('2')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">2</button>
                       <button type="button" onClick={() => handleKeypadPress('3')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">3</button>
                       <button 
                         type="button" 
                         onClick={() => {
                           if (['+', '-', '*', '/'].some(op => balanceExpression.includes(op)) && getCalculatedBalance() > 0) {
                             setBalanceExpression(getCalculatedBalance().toString());
                           } else {
                             setShowKeypad(false);
                           }
                         }} 
                         className="row-span-2 h-full bg-[#1DBF73] hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center transition-colors select-none"
                       >
                         {['+', '-', '*', '/'].some(op => balanceExpression.includes(op)) ? '=' : 'XONG'}
                       </button>

                       {/* Row 5 */}
                       <button type="button" onClick={() => handleKeypadPress('0')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">0</button>
                       <button type="button" onClick={() => handleKeypadPress('000')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850">000</button>
                       <button type="button" onClick={() => handleKeypadPress('.')} className="bg-[#F9FAFB] dark:bg-slate-900 rounded-xl text-base font-bold text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-850 pb-1 flex items-center justify-center">.</button>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#1DBF73] hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#1DBF73]/20 transition-all text-sm block text-center"
                >
                  Lưu thông tin
                </button>

                {editingWallet && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-500 dark:text-rose-400 font-bold py-3.5 px-4 rounded-xl border border-rose-100 dark:border-rose-900/30 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Xoá ví này
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
