import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { DynamicIcon } from './DynamicIcon';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user } = useAuth();
  
  // Real dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Sound effects state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app_sound_enabled') !== 'false';
  });

  // Budget warning threshold state
  const [threshold, setThreshold] = useState<string>(() => {
    return localStorage.getItem('app_budget_threshold') || '80_90';
  });

  // Primary Currency format preference
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('app_currency_pref') || 'VND';
  });

  // Handle dark mode toggle
  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    toast.success(nextDark ? 'Chế độ tối hoạt động' : 'Chế độ sáng hoạt động');
  };

  // Toggle sound fx
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('app_sound_enabled', String(nextVal));
    
    if (nextVal) {
      // Small simulated sound beep!
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (err) {}
      toast.success('Đã bật phản hồi âm thanh/hiệu ứng');
    } else {
      toast.success('Đã tắt hiệu ứng âm thanh');
    }
  };

  // Change notification threshold setup
  const handleThresholdChange = (val: string) => {
    setThreshold(val);
    localStorage.setItem('app_budget_threshold', val);
    toast.success('Đã cập nhật hạn mức cảnh báo ngân sách thành công.');
  };

  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    localStorage.setItem('app_currency_pref', val);
    toast.success(`Đã đổi đơn vị tiền tệ hiển thị sang: ${val}`);
  };

  // Interactive reset all notification cache
  const handleResetNotificationsCache = () => {
    if (!user) return;
    try {
      // Find and delete any key starting with budget_notified_
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`budget_notified_${user.uid}`)) {
          localStorage.removeItem(key);
          count++;
          i--; // adjust index since we removed item
        }
      }
      toast.success(`Đã làm mới bộ nhớ đệm thành công! Bạn có thể nhận lại tín hiệu cảnh báo ngân sách.`);
    } catch (err) {
      toast.error('Không tìm thấy tệp bộ nhớ đệm phù hợp.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end p-0"
    >
      <div className="absolute inset-0" onClick={onClose}></div>

      <motion.div 
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="relative bg-slate-50 dark:bg-slate-950 w-full h-[85vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-900"
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-slate-600/10 text-slate-500 dark:text-slate-400 flex items-center justify-center rounded-xl">
              <DynamicIcon name="Settings" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">Cài đặt ứng dụng</h2>
              <p className="text-slate-400 text-xs font-medium">Tùy chỉnh giao diện & cấu hình cảnh báo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
          >
            <DynamicIcon name="X" size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">
          
          {/* General Appearance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-450 uppercase pl-1 tracking-wider">Giao diện hiển thị</h4>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-4 space-y-4 shadow-sm">
              
              {/* Dark mode list option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <DynamicIcon name={darkMode ? "Moon" : "Sun"} size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Chế độ nền tối (Dark mode)</span>
                    <p className="text-[10px] text-slate-400 font-medium">Giúp tiết kiệm pin & dịu mắt ban đêm</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleDarkMode}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors relative outline-none cursor-pointer ${darkMode ? 'bg-[#1DBF73]' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <motion.div 
                    layout 
                    className="w-4.5 h-4.5 rounded-full bg-white shadow"
                    animate={{ x: darkMode ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <DynamicIcon name="Coins" size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Đơn vị tiền tệ chính</span>
                    <p className="text-[10px] text-slate-400 font-medium">Áp dụng cho mọi biểu đồ, tính phí</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-75 *::text-xs">
                  {['VND', 'USD'].map((curr) => (
                    <button
                      key={curr}
                      onClick={() => handleCurrencyChange(curr)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === curr ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sound settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-450 uppercase pl-1 tracking-wider">Phản hồi & Tương tác</h4>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <DynamicIcon name="Volume2" size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Hiệu ứng âm thanh nhấn phím</span>
                    <p className="text-[10px] text-slate-400 font-medium">Bật âm thanh click phím ảo mã PIN và nút</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleSound}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors relative outline-none cursor-pointer ${soundEnabled ? 'bg-[#1DBF73]' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <motion.div 
                    layout 
                    className="w-4.5 h-4.5 rounded-full bg-white shadow"
                    animate={{ x: soundEnabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Budget Warnings Threshold option */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-450 uppercase pl-1 tracking-wider">Cảnh báo hạn mức ngân sách</h4>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-4 space-y-4 shadow-sm">
              <div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">Thông báo ngưỡng vượt</span>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Hệ thống sẽ gửi thông báo (toast) khi chạm ngưỡng cài đặt</p>
              </div>

              {/* Threshold radio fields */}
              <div className="space-y-2">
                {[
                  { value: '80_90', title: 'Cảnh báo ở cả 80% & 90% (Khuyên dùng)', subtitle: 'Nhận cảnh báo sớm và cảnh báo khẩn cấp' },
                  { value: '90', title: 'Chỉ cảnh báo khi chạm 90%', subtitle: 'Tránh thông báo nhiều lần không cần thiết' },
                  { value: 'disable', title: 'Tắt toàn bộ cảnh báo ngân sách', subtitle: 'Hệ thống sẽ giữ yên lặng hoàn toàn' },
                ].map((item) => {
                  const isChecked = threshold === item.value;
                  return (
                    <div 
                      key={item.value} 
                      onClick={() => handleThresholdChange(item.value)}
                      className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-[#1DBF73] bg-[#1DBF73]/5 dark:bg-[#1DBF73]/5' 
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/45'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isChecked ? 'border-[#1DBF73]' : 'border-slate-400 dark:border-slate-600'
                      }`}>
                        {isChecked && <div className="w-2 h-2 rounded-full bg-[#1DBF73]"></div>}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-150 block">{item.title}</span>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cache helper utility reset buttons */}
              <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Reset bộ nhớ đệm thông báo</span>
                    <p className="text-[9px] text-slate-400 mt-0.5 max-w-[260px]">Xóa trạng thái đã gửi cảnh báo ngân sách để kiểm tra lại tính năng thông báo.</p>
                  </div>
                  <button
                    onClick={handleResetNotificationsCache}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-750 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl h-9 hover:underline transition-all"
                  >
                    Xóa Cache
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
