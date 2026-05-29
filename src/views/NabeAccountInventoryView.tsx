import { useState, useMemo } from 'react';
import { Plus, Users, Layout, Package, Trash2, Edit2, AlertTriangle, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { NabeAccount, NabeAccountType } from '../types';
import { deleteNabeAccount } from '../lib/nabeApi';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import NabeAccountModal from '../components/NabeAccountModal';

interface NabeViewProps {
  nabeAccounts: NabeAccount[];
  setActiveView: (view: any) => void;
}

export default function NabeAccountInventoryView({ nabeAccounts, setActiveView }: NabeViewProps) {
  const [activeType, setActiveType] = useState<NabeAccountType>('family');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredAccounts = useMemo(() => {
    return nabeAccounts.filter(a => a.type === activeType);
  }, [nabeAccounts, activeType]);

  const handleDelete = async (id: string) => {
    if (confirm('Bạn chắc chắn muốn xoá tài khoản này?')) {
        await deleteNabeAccount(id);
        toast.success('Đã xoá thành công');
    }
  }

  return (
    <div className="flex flex-col absolute inset-0 bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 z-30">
      {/* Dynamic Native Mobile Sticky Header */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('profile')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase">Kho Nabe</h1>
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
        <div className="grid gap-3">
          {filteredAccounts.length > 0 ? filteredAccounts.map(account => (
            <div key={account.id} className="bg-white dark:bg-slate-905 border border-slate-100/80 dark:border-slate-900 rounded-2xl p-4.5 shadow-xs flex items-center justify-between group hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-200">
              <div className="flex gap-3.5 items-center min-w-0">
                  <div className="w-11 h-11 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                      <Tag size={20} />
                  </div>
                  <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{account.name}</h3>
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
              <div className="flex gap-1">
                <button onClick={() => handleDelete(account.id)} className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
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
    </div>
  );
}
