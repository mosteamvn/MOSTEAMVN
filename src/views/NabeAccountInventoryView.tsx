import { useState, useMemo } from 'react';
import { Plus, Users, Layout, Package, Trash2, Edit2, AlertTriangle, Calendar, Tag, ArrowLeft, Clock } from 'lucide-react';
import { NabeAccount, NabeAccountType } from '../types';
import { deleteNabeAccount, updateNabeAccount } from '../lib/nabeApi';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import NabeAccountModal from '../components/NabeAccountModal';
import NabeAccountDetailsView from './NabeAccountDetailsView';

interface NabeViewProps {
  nabeAccounts: NabeAccount[];
  setActiveView: (view: any) => void;
  isEmbedded?: boolean;
  previousView?: any;
}

export default function NabeAccountInventoryView({ nabeAccounts, setActiveView, isEmbedded = false, previousView }: NabeViewProps) {
  const [activeType, setActiveType] = useState<NabeAccountType>('family');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<NabeAccount | null>(null);

  const filteredAccounts = useMemo(() => {
    return nabeAccounts.filter(a => a.type === activeType && a.status !== 'archived');
  }, [nabeAccounts, activeType]);

  const activeDetailAccount = useMemo(() => {
    if (!selectedAccount) return null;
    return nabeAccounts.find(a => a.id === selectedAccount.id) || null;
  }, [nabeAccounts, selectedAccount]);

  const handleArchive = async (account: NabeAccount) => {
    if (confirm(`Bạn muốn lưu trữ tài khoản "${account.name}" (giữ lại dữ liệu) không?`)) {
        await updateNabeAccount(account.id, { ...account, status: 'archived' });
        toast.success(`Đã lưu trữ thành công "${account.name}"`);
    }
  }

  const handleDelete = async (account: NabeAccount) => {
    if (confirm(`CHÚ Ý: Bạn muốn XOÁ VĨNH VIỄN tài khoản "${account.name}"? Dữ liệu bên trong sẽ mất hết.`)) {
        await deleteNabeAccount(account.id);
        toast.success(`Đã xoá vĩnh viễn "${account.name}"`);
    }
  }

  if (isEmbedded) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Simple embedded headers row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#1DBF73]" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Kho Tài Khoản ({nabeAccounts.length})</h2>
          </div>
          <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#1DBF73] text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={14} /> Thêm vào kho
          </button>
        </div>

        {isAddModalOpen && <NabeAccountModal onClose={() => setIsAddModalOpen(false)} />}

        {/* Dynamic Segment Control Selector */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-inner">
          {(['family', 'regular', 'physical'] as NabeAccountType[]).map(t => (
              <button 
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={cn(
                      "flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5", 
                      activeType === t 
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                        : "bg-transparent text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white"
                  )}
              >
                  {t === 'family' ? <Users size={14}/> : t === 'regular' ? <Layout size={14}/> : <Package size={14}/>}
                  {t === 'family' ? 'Family' : t === 'regular' ? 'Thường' : 'Vật chất'}
              </button>
          ))}
        </div>

        {/* Product Grid Items */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.length > 0 ? filteredAccounts.map(account => (
            <div key={account.id} className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs flex flex-col gap-3 group hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-200">
              <div className="flex items-start justify-between min-w-0">
                <div className="flex gap-3.5 items-center min-w-0">
                    <div className="w-11 h-11 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                        <Tag size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wider uppercase block">
                          {account.type === 'family' ? 'Gói Family' : account.type === 'regular' ? 'Gói Cá Nhân' : 'Sản phẩm'}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">{account.name}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Hạn: {new Date(account.expiryDate).toLocaleDateString('vi-VN')}</p>
                        {account.slotCapacity > 0 && (
                            <p className={cn("text-[10px] font-bold mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full",                
                              account.slotCapacity - account.members.length === 0 
                                ? "bg-rose-500/10 text-rose-500" 
                                : "bg-emerald-500/10 text-emerald-600"
                            )}>
                              Còn {account.slotCapacity - account.members.length}/{account.slotCapacity} slot
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={() => handleArchive(account.id)} className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Interactive bottom bar with direct link to details and audit trail */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100/50 dark:border-slate-800/10">
                <button 
                  onClick={() => setSelectedAccount(account)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#1DBF73] hover:text-emerald-650 transition active:scale-[0.98]"
                >
                  <Clock size={13} />
                  Xem lịch sử & Slot
                </button>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                  {account.type === 'family' ? 'Family 5 Slots' : account.type === 'regular' ? '1 Slot' : 'Vật chất'}
                </span>
              </div>
            </div>
          )) : (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Package size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-xs font-bold">Chưa có sản phẩm nào trong kho</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Bấm nút Thêm vào kho phía trên</p>
              </div>
          )}
        </div>

        {activeDetailAccount && (
          <NabeAccountDetailsView 
            account={activeDetailAccount} 
            onClose={() => setSelectedAccount(null)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 z-30 md:z-10">
      {/* Dynamic Native Mobile Sticky Header */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView(previousView || 'profile')} className="md:hidden p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Kho Nabe</h1>
        </div>
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#1DBF73] text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <Plus size={14} /> Thêm sản phẩm
        </button>
      </header>

      {isAddModalOpen && <NabeAccountModal onClose={() => setIsAddModalOpen(false)} />}

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] space-y-4">
        {/* Dynamic Segment Control Selector */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-inner">
          {(['family', 'regular', 'physical'] as NabeAccountType[]).map(t => (
              <button 
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={cn(
                      "flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5", 
                      activeType === t 
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                        : "bg-transparent text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white"
                  )}
              >
                  {t === 'family' ? <Users size={14}/> : t === 'regular' ? <Layout size={14}/> : <Package size={14}/>}
                  {t === 'family' ? 'Family' : t === 'regular' ? 'Thường' : 'Vật chất'}
              </button>
          ))}
        </div>

        {/* Product Grid Items */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.length > 0 ? filteredAccounts.map(account => (
            <div key={account.id} className="bg-white dark:bg-slate-905 border border-slate-100/80 dark:border-slate-900 rounded-2xl p-4.5 shadow-xs flex flex-col gap-3 group hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-200">
              <div className="flex items-start justify-between min-w-0">
                <div className="flex gap-3.5 items-center min-w-0">
                    <div className="w-11 h-11 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                        <Tag size={20} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wider uppercase block">
                          {account.type === 'family' ? 'Gói Family' : account.type === 'regular' ? 'Gói Cá Nhân' : 'Sản phẩm'}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">{account.name}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Hạn: {new Date(account.expiryDate).toLocaleDateString('vi-VN')}</p>
                        {account.slotCapacity > 0 && (
                            <p className={cn("text-[10px] font-bold mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full", 
                              account.slotCapacity - account.members.length === 0 
                                ? "bg-rose-500/10 text-rose-500" 
                                : "bg-emerald-500/10 text-emerald-600"
                            )}>
                              Còn {account.slotCapacity - account.members.length}/{account.slotCapacity} slot
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={() => handleArchive(account.id)} className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Interactive bottom bar with direct link to details and audit trail */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100/50 dark:border-slate-800/10">
                <button 
                  onClick={() => setSelectedAccount(account)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#1DBF73] hover:text-emerald-650 transition active:scale-[0.98]"
                >
                  <Clock size={13} />
                  Xem lịch sử & Slot
                </button>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                  {account.type === 'family' ? 'Family 5 Slots' : account.type === 'regular' ? '1 Slot' : 'Vật chất'}
                </span>
              </div>
            </div>
          )) : (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-905 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Package size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-xs font-bold">Chưa có sản phẩm nào trong kho</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Bấm nút Thêm sản phẩm phía trên</p>
              </div>
          )}
        </div>
      </div>

      {activeDetailAccount && (
        <NabeAccountDetailsView 
          account={activeDetailAccount} 
          onClose={() => setSelectedAccount(null)} 
        />
      )}
    </div>
  );
}
