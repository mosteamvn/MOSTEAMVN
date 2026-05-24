import { DynamicIcon } from '../components/DynamicIcon';
import { ViewState } from '../App';

interface ProfileViewProps {
  setActiveView: (view: ViewState) => void;
}

export default function ProfileView({ setActiveView }: ProfileViewProps) {
  const profileOptions = [
    { icon: 'CreditCard', label: 'Ví của tôi', color: '#3b82f6', action: () => setActiveView('wallets' as any) },
    { icon: 'Grid', label: 'Nhóm giao dịch', color: '#f59e0b', action: () => setActiveView('categories') },
    { icon: 'Bell', label: 'Thông báo', color: '#8b5cf6', action: () => {} },
    { icon: 'Settings', label: 'Cài đặt', color: '#64748b', action: () => {} },
    { icon: 'HelpCircle', label: 'Trợ giúp & Hỗ trợ', color: '#10b981', action: () => {} },
  ];

  return (
    <div className="p-5 space-y-6">
      <header className="py-2 mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Cá nhân</h1>
      </header>

      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-green-600 p-1 mb-4 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-[3px] border-white dark:border-slate-900 overflow-hidden">
            <DynamicIcon name="User" size={32} className="text-slate-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Người dùng Demo</h2>
        <p className="text-slate-400 text-xs font-medium">demo@example.com</p>
        <div className="mt-4 px-3 py-1 bg-[#1DBF73]/10 text-[#1DBF73] font-bold tracking-wide rounded-full text-[10px] uppercase border border-[#1DBF73]/20">
          Thành viên Premium
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50 p-1.5">
        {profileOptions.map(option => (
          <button key={option.label} onClick={option.action} className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: `${option.color}15`, color: option.color }}>
                 <DynamicIcon name={option.icon} size={18} />
               </div>
               <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{option.label}</span>
            </div>
            <DynamicIcon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-slate-500" />
          </button>
        ))}
      </div>

      <button className="w-full p-4 flex items-center justify-center gap-2 text-rose-500 font-bold bg-white dark:bg-slate-900 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shadow-sm border border-slate-50 dark:border-slate-800">
        <DynamicIcon name="LogOut" size={18} />
        Đăng xuất
      </button>

      <div className="h-6"></div>
    </div>
  );
}
