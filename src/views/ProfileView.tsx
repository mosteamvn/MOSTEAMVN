import { useState } from 'react';
import { DynamicIcon } from '../components/DynamicIcon';
import { ViewState } from '../App';
import { useAuth } from '../contexts/AuthContext';
import PinLockView from '../components/PinLockView';
import NotificationModal from '../components/NotificationModal';
import SettingsModal from '../components/SettingsModal';
import HelpSupportModal from '../components/HelpSupportModal';

interface ProfileViewProps {
  setActiveView: (view: ViewState) => void;
}

export default function ProfileView({ setActiveView }: ProfileViewProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.email === 'mosteamvn@gmail.com';
  const [pinFlow, setPinFlow] = useState<'setup' | 'change' | 'disable' | null>(null);
  const [showNotif, setShowNotif] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  const storedPinKey = user ? `app_pin_${user.uid}` : 'app_pin_generic';
  const [hasPin, setHasPin] = useState<boolean>(() => {
    return !!localStorage.getItem(storedPinKey);
  });

  const profileOptions = [
    { icon: 'CreditCard', label: 'Ví của tôi', color: '#3b82f6', action: () => setActiveView('wallets' as any) },
    { icon: 'Grid', label: 'Nhóm giao dịch', color: '#f59e0b', action: () => setActiveView('categories') },
    { icon: 'Target', label: 'Ngân sách tháng', color: '#1DBF73', action: () => setActiveView('budgets' as any) },
  ];

  const securityOptions = !hasPin ? [
    { 
      icon: 'Lock', 
      label: 'Đặt mã pin', 
      color: '#10b981',
      badge: 'Chưa kích hoạt',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      action: () => setPinFlow('setup') 
    }
  ] : [
    { 
      icon: 'Key', 
      label: 'Thay đổi mã PIN', 
      color: '#3b82f6',
      badge: 'Đang bật',
      badgeColor: 'bg-[#1DBF73]/10 text-[#1DBF73] border-[#1DBF73]/20',
      action: () => setPinFlow('change') 
    },
    { 
      icon: 'ShieldOff', 
      label: 'Tắt khóa mã PIN', 
      color: '#f43f5e',
      action: () => setPinFlow('disable') 
    }
  ];

  const otherOptions = [
    { icon: 'Bell', label: 'Thông báo', color: '#8b5cf6', action: () => setShowNotif(true) },
    { icon: 'Settings', label: 'Cài đặt', color: '#64748b', action: () => setShowSettings(true) },
    { icon: 'HelpCircle', label: 'Trợ giúp & Hỗ trợ', color: '#10b981', action: () => setShowHelp(true) },
  ];

  const handlePinFlowSuccess = () => {
    setHasPin(!!localStorage.getItem(storedPinKey));
    setPinFlow(null);
  };

  return (
    <div className="px-5 pb-5 space-y-6">
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 -mx-5 px-5 flex items-center justify-center border-b border-slate-100/50 dark:border-slate-800/10 mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Cá nhân</h1>
      </header>

      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-green-600 p-1 mb-4 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-[3px] border-white dark:border-slate-900 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <DynamicIcon name="User" size={32} className="text-slate-400" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          {user?.displayName || 'Thành viên'}
        </h2>
        <p className="text-slate-400 text-xs font-medium">{user?.email || 'Chưa đăng nhập'}</p>
        <div className="mt-4 px-3 py-1 bg-[#1DBF73]/10 text-[#1DBF73] font-bold tracking-wide rounded-full text-[10px] uppercase border border-[#1DBF73]/20">
          Thành viên Premium
        </div>
      </div>

      {/* Primary Directory Settings */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Dữ liệu tài chính</h3>
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
      </div>

      {/* Security PIN Settings */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Bảo mật thiết bị</h3>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50 p-1.5">
          {securityOptions.map(option => (
            <button key={option.label} onClick={option.action} className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: `${option.color}15`, color: option.color }}>
                    <DynamicIcon name={option.icon} size={18} />
                 </div>
                 <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{option.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {option.badge && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${option.badgeColor}`}>
                    {option.badge}
                  </span>
                )}
                <DynamicIcon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-slate-500" />
              </div>
            </button>
          ))}
        </div>
        {!hasPin ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-1 leading-relaxed font-semibold">
            🍀 <span className="text-slate-405 dark:text-slate-500">Trường hợp muốn đổi mã PIN:</span> Sau khi đặt thành công, tùy chọn <span className="text-blue-500 font-bold">"Thay đổi mã PIN"</span> sẽ xuất hiện ngay tại đây để bạn cập nhật bất cứ lúc nào.
          </p>
        ) : (
          <p className="text-[11px] text-[#1DBF73] dark:text-[#1DBF73]/80 pl-1 leading-relaxed font-semibold">
            ✔ Mã PIN đã kích hoạt. Bạn có thể sử dụng các tùy chọn trên để đổi hoặc tắt mã khóa.
          </p>
        )}
      </div>

      {/* Other Non-PIN Settings */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Ứng dụng</h3>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50 p-1.5">
          {otherOptions.map(option => (
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
      </div>

      {/* Admin Panel Link */}
      {isAdmin && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest pl-1 mb-1">Hệ thống</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 border-rose-100 dark:border-rose-950/20 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50 p-1.5">
            <button 
              onClick={() => setActiveView('admin' as any)} 
              className="w-full p-3.5 flex items-center justify-between hover:bg-rose-50/20 dark:hover:bg-rose-950/10 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 shadow-sm transition-transform group-hover:scale-105">
                    <DynamicIcon name="ShieldAlert" size={18} />
                 </div>
                 <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Phân quyền Thành viên</span>
              </div>
              <DynamicIcon name="ChevronRight" size={16} className="text-rose-400 group-hover:text-rose-500" />
            </button>

            <button 
              onClick={() => setActiveView('premium' as any)} 
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group animate-pulse"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 shadow-sm transition-transform group-hover:scale-105">
                    <DynamicIcon name="Sparkles" size={18} />
                 </div>
                 <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Quản lý Nabe Account</span>
              </div>
              <DynamicIcon name="ChevronRight" size={16} className="text-emerald-500 group-hover:text-emerald-600" />
            </button>
          </div>
        </div>
      )}

      <button onClick={logout} className="w-full p-4 flex items-center justify-center gap-2 text-rose-500 font-bold bg-white dark:bg-slate-900 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shadow-sm border border-slate-50 dark:border-slate-800">
        <DynamicIcon name="LogOut" size={18} />
        Đăng xuất
      </button>

      <div className="h-6"></div>

      {/* Render PIN Settings Overlay Modal */}
      {pinFlow && (
        <PinLockView 
          mode={pinFlow} 
          onSuccess={handlePinFlowSuccess} 
          onCancel={() => setPinFlow(null)} 
        />
      )}

      {/* Notifications Overlay Modal */}
      {showNotif && (
        <NotificationModal onClose={() => setShowNotif(false)} />
      )}

      {/* Settings Overlay Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Help & Support Overlay Modal */}
      {showHelp && (
        <HelpSupportModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
