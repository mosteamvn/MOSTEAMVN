import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { DynamicIcon } from './DynamicIcon';
import toast from 'react-hot-toast';

interface NotificationModalProps {
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: 'alert' | 'info' | 'success';
}

export default function NotificationModal({ onClose }: NotificationModalProps) {
  const { user } = useAuth();
  const storageKey = user ? `user_notifs_${user.uid}` : 'user_notifs_generic';

  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setNotifs(JSON.parse(saved));
      } catch (err) {
        initializeDefaultNotifs();
      }
    } else {
      initializeDefaultNotifs();
    }
  }, [storageKey]);

  const initializeDefaultNotifs = () => {
    const defaults: NotificationItem[] = [
      {
        id: '1',
        title: 'Cảnh báo hạn mức ngân sách',
        desc: 'Danh mục "Ăn uống" của bạn đã tiêu thụ đạt 92% mức giới hạn đặt ra cho tháng này. Hãy cân đối chi tiêu hợp lý nhé!',
        time: 'Vừa xong',
        read: false,
        type: 'alert',
      },
      {
        id: '2',
        title: 'Bảo mật mã PIN thiết bị',
        desc: 'Bạn chưa kích hoạt tính năng khóa mã PIN. Hãy bật mã PIN trong phần "Bảo mật thiết bị" để nâng cao an toàn thông tin.',
        time: '2 giờ trước',
        read: false,
        type: 'info',
      },
      {
        id: '3',
        title: 'Xuất dữ liệu giao dịch thành công',
        desc: 'Tính năng xuất dữ liệu CSV đã được triển khai! Bạn có thể chủ động tải lịch sử giao dịch trực tiếp từ màn hình lịch sử.',
        time: '1 ngày trước',
        read: true,
        type: 'success',
      },
      {
        id: '4',
        title: 'Chào mừng thành viên Premium',
        desc: 'Cảm ơn bạn đã tin tưởng dịch vụ quản lý chi tiêu cá nhân. Gói tài khoản của bạn đã được kích hoạt vĩnh viễn.',
        time: '2 ngày trước',
        read: true,
        type: 'success',
      }
    ];
    setNotifs(defaults);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  };

  const saveNotifs = (updated: NotificationItem[]) => {
    setNotifs(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifs(updated);
  };

  const handleMarkAllRead = () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    saveNotifs(updated);
    toast.success('Đã đánh dấu tất cả các thông báo là đã đọc.');
  };

  const handleDeleteNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifs.filter(n => n.id !== id);
    saveNotifs(updated);
    toast.success('Đã xóa thông báo.');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử thông báo?')) {
      saveNotifs([]);
      toast.success('Đã dọn dẹp tất cả thông báo.');
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end p-0"
    >
      {/* Background close area */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <motion.div 
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="relative bg-slate-50 dark:bg-slate-950 w-full h-[85vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-900"
      >
        {/* Modal Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-violet-500/10 text-violet-500 flex items-center justify-center rounded-xl">
              <DynamicIcon name="Bell" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Thông báo</h2>
              <p className="text-slate-400 text-xs font-medium">
                {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
          >
            <DynamicIcon name="X" size={16} />
          </button>
        </div>

        {/* Notif Core Options Toolbar */}
        {notifs.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-100/50 dark:bg-slate-900/30 flex justify-between items-center text-xs font-bold border-b border-slate-100 dark:border-slate-900/50">
            <button 
              onClick={handleMarkAllRead}
              className="text-[#1DBF73] hover:underline flex items-center gap-1"
            >
              <DynamicIcon name="CheckCheck" size={14} />
              Đọc tất cả
            </button>
            <button 
              onClick={handleClearAll}
              className="text-slate-400 hover:text-rose-500 hover:underline flex items-center gap-1"
            >
              <DynamicIcon name="Trash" size={14} />
              Xóa tất cả
            </button>
          </div>
        )}

        {/* Notification Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
          {notifs.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-850 rounded-2xl flex items-center justify-center text-slate-400">
                <DynamicIcon name="Inbox" size={32} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Hộp thư trống</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[200px] mx-auto">
                  Bạn đã giải quyết tất cả các thông báo và cảnh báo!
                </p>
              </div>
              <button 
                onClick={initializeDefaultNotifs}
                className="mt-2 text-xs font-bold text-[#1DBF73] hover:underline"
              >
                Tải lại thông báo mẫu
              </button>
            </div>
          ) : (
            notifs.map((item) => {
              const bgClass = item.read 
                ? 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-850' 
                : 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100/30 dark:border-[#1DBF73]/10 ring-1 ring-emerald-500/5';
              
              const iconBoxColor = item.type === 'alert' 
                ? 'bg-rose-500/10 text-rose-500' 
                : item.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-blue-500/10 text-blue-500';

              const iconName = item.type === 'alert' 
                ? 'AlertTriangle' 
                : item.type === 'success' 
                  ? 'CheckCircle2' 
                  : 'Info';

              return (
                <div 
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id)}
                  className={`p-4 rounded-xl border flex gap-3 transition-colors cursor-pointer relative group ${bgClass}`}
                >
                  {/* Read dot */}
                  {!item.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#1DBF73]"></div>
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBoxColor}`}>
                    <DynamicIcon name={iconName} size={18} />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className={`text-xs font-extrabold truncate text-slate-900 dark:text-white`}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      {item.desc}
                    </p>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-2">
                      {item.time}
                    </span>
                  </div>

                  {/* Individual Delete Action */}
                  <button
                    onClick={(e) => handleDeleteNotif(item.id, e)}
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                    title="Xóa thông báo"
                  >
                    <DynamicIcon name="Trash2" size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
