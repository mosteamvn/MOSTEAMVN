import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getAllUsers, updateUserRole, deleteUser } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { DynamicIcon } from '../components/DynamicIcon';
import { formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface AdminViewProps {
  setActiveView: (view: any) => void;
  previousView?: any;
}

export default function AdminView({ setActiveView, previousView }: AdminViewProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<{ id: string; email: string; role: string; createdAt: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      // Sắp xếp: admin lên trước, rồi tới ngày tạo mới nhất
      const sorted = [...data].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setUsers(sorted);
    } catch (err: any) {
      toast.error('Không thể tải danh sách người dùng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleToggle = async (targetUser: typeof users[0]) => {
    if (targetUser.id === user?.uid) {
      toast.error('Bạn không thể tự hạ quyền của chính mình!');
      return;
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Bạn có chắc muốn ${nextRole === 'admin' ? 'nâng quyền Admin' : 'hạ quyền xuống Thành viên'} cho tài khoản ${targetUser.email}?`;
    
    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(targetUser.id);
    try {
      await updateUserRole(targetUser.id, nextRole);
      toast.success('Cập nhật vai trò thành công!');
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: nextRole } : u));
      setSelectedUser(prev => prev && prev.id === targetUser.id ? { ...prev, role: nextRole } : prev);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser: typeof users[0]) => {
    if (targetUser.id === user?.uid) {
      toast.error('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    const confirmMsg = `CẢNH BÁO CỰC KỲ NGUY HIỂM:\nHành động này sẽ xóa vĩnh viễn tài khoản và bản ghi người dùng ${targetUser.email} khỏi cơ sở dữ liệu!\nBạn có chắc chắn muốn xóa?`;
    
    if (!window.confirm(confirmMsg)) return;

    setDeletingUserId(targetUser.id);
    try {
      await deleteUser(targetUser.id);
      toast.success('Đã xóa người dùng khỏi hệ thống!');
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      setSelectedUser(null);
    } catch (err: any) {
      toast.error('Có lỗi khi xóa người dùng: ' + err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter(u => u.email.toLowerCase().includes(query) || u.id.toLowerCase().includes(query));
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = total - adminCount;
    return { total, adminCount, userCount };
  }, [users]);

  return (
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-slate-50 dark:bg-slate-950 z-45 md:z-10 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setActiveView(previousView || 'profile')} 
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <DynamicIcon name="ArrowLeft" size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Quản Trị Hệ Thống</h1>
        </div>
        <button 
          onClick={loadUsers} 
          disabled={loading}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:text-[#1DBF73]"
        >
          <DynamicIcon name="RefreshCw" size={16} className={cn(loading && "animate-spin")} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] space-y-6">
        {/* Info Warning */}
        <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-205 dark:border-amber-900/40 p-3.5 rounded-2xl flex gap-3">
          <div className="text-amber-500 shrink-0 mt-0.5">
            <DynamicIcon name="AlertTriangle" size={18} />
          </div>
          <div className="text-[11px] text-amber-850 dark:text-amber-300 space-y-0.5 font-medium leading-relaxed">
            <p className="font-bold text-amber-900 dark:text-amber-200">Khu vực Bảo mật cao (Admin Control Room)</p>
            <p>Nhấp chạm trực tiếp vào bất kỳ tài khoản nào bên dưới để xem chi tiết, sửa vai trò quyền hạn hoặc xóa khỏi hệ thống.</p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100/60 dark:border-slate-850 text-center space-y-0.5 shadow-xs">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tổng User</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {loading ? '...' : stats.total}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100/60 dark:border-slate-850 text-center space-y-0.5 shadow-xs">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quản trị</p>
            <p className="text-lg font-black text-rose-500">
              {loading ? '...' : stats.adminCount}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100/60 dark:border-slate-850 text-center space-y-0.5 shadow-xs">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Thành viên</p>
            <p className="text-lg font-black text-[#1DBF73]">
              {loading ? '...' : stats.userCount}
            </p>
          </div>
        </div>

        {/* User Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
            <DynamicIcon name="Search" size={15} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài khoản theo email..."
            className="w-full bg-white dark:bg-slate-900 pl-10 pr-10 py-3 rounded-xl border border-slate-100 dark:border-slate-850 outline-none text-xs font-semibold transition-all focus:border-[#1DBF73] focus:ring-1 focus:ring-[#1DBF73] text-slate-900 dark:text-white placeholder:text-slate-450"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <DynamicIcon name="X" size={15} />
            </button>
          )}
        </div>

        {/* Users List (Compact & Clean) */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
            Danh sách tài khoản ({filteredUsers.length})
          </h3>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 py-12 rounded-2xl border border-slate-100/60 dark:border-slate-850 flex flex-col items-center justify-center text-slate-400 gap-3">
              <DynamicIcon name="RefreshCw" size={20} className="animate-spin text-[#1DBF73]" />
              <p className="text-xs font-medium">Đang đồng bộ từ mây...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 py-12 rounded-2xl border border-slate-100/60 dark:border-slate-850 flex flex-col items-center justify-center text-slate-400 gap-2">
              <DynamicIcon name="Users" size={24} className="text-slate-350" />
              <p className="text-xs font-medium">Không tìm thấy kết quả nào</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100/60 dark:border-slate-850 overflow-hidden divide-y divide-slate-100/50 dark:divide-slate-800/40">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === user?.uid;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-850/20 transition-all active:bg-slate-100/60 dark:active:bg-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs",
                        u.role === 'admin' 
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/10" 
                          : "bg-[#1DBF73]/10 text-[#1DBF73] border border-[#1DBF73]/10"
                      )}>
                        <DynamicIcon name={u.role === 'admin' ? "ShieldAlert" : "User"} size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                            {u.email}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] font-black text-[#1DBF73] bg-[#1DBF73]/10 px-1.5 py-0.5 rounded-full select-none shrink-0">Bạn</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]">ID: {u.id.substring(0, 10)}...</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0",
                        u.role === 'admin' 
                          ? "text-rose-500 bg-rose-500/10 border border-rose-500/20" 
                          : "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-transparent"
                      )}>
                        {u.role === 'admin' ? 'Admin' : 'Thành viên'}
                      </span>
                      <DynamicIcon name="ChevronRight" size={14} className="text-slate-350 dark:text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-6"></div>
      </div>

      {/* Modern Admin Bottom Sheet / Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in duration-200">
          {/* Overlay background with backdrop-blur */}
          <div 
            onClick={() => setSelectedUser(null)} 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          ></div>

          {/* Bottom Sheet Body */}
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl shadow-2xl border-t border-slate-100 dark:border-slate-800/80 z-10 p-5 space-y-5 animate-in slide-in-from-bottom duration-300 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            
            {/* Grabber indicator */}
            <div className="w-12 h-1 bg-slate-250 dark:bg-slate-800 rounded-full mx-auto -mt-1.5 mb-2"></div>

            {/* Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-white",
                  selectedUser.role === 'admin' ? "bg-rose-500" : "bg-[#1DBF73]"
                )}>
                  <DynamicIcon name={selectedUser.role === 'admin' ? "ShieldAlert" : "User"} size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chi tiết tài khoản</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Quản trị viên chỉnh sửa thông tin</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <DynamicIcon name="X" size={14} />
              </button>
            </div>

            {/* Info Body cards */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850/30 space-y-2.5">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Địa chỉ Email</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-all select-all flex items-center gap-1.5 leading-tight">
                  <DynamicIcon name="Mail" size={12} className="text-slate-400" />
                  {selectedUser.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vai trò quyền</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-tight">
                    <DynamicIcon name="Shield" size={12} className="text-slate-400" />
                    {selectedUser.role === 'admin' ? 'Quản trị' : 'Thành viên'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ngày đăng ký</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-tight truncate">
                    <DynamicIcon name="Calendar" size={12} className="text-slate-400" />
                    {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40 space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID hệ thống (UID)</p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 select-all break-all leading-tight">
                  {selectedUser.id}
                </p>
              </div>
            </div>

            {/* Actions for other accounts only */}
            {selectedUser.id === user?.uid ? (
              <div className="bg-emerald-50/65 dark:bg-emerald-950/10 border border-emerald-100/70 p-3 rounded-xl text-center text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                Đây là tài khoản hiện tại của bạn. Bạn không thể thay đổi vai trò hoặc tự xóa chính mình.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* 1. Toggle Role Action */}
                <button
                  type="button"
                  disabled={updatingUserId === selectedUser.id}
                  onClick={() => handleRoleToggle(selectedUser)}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all select-none shadow-xs border",
                    selectedUser.role === 'admin'
                      ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border-transparent"
                      : "bg-[#1DBF73] hover:opacity-90 text-white border-transparent"
                  )}
                >
                  {updatingUserId === selectedUser.id ? (
                    <DynamicIcon name="RefreshCw" size={13} className="animate-spin" />
                  ) : (
                    <DynamicIcon name={selectedUser.role === 'admin' ? "ShieldOff" : "ShieldAlert"} size={13} />
                  )}
                  <span>{selectedUser.role === 'admin' ? 'Hạ quyền xuống Thành viên' : 'Nâng cấp quyền Admin'}</span>
                </button>

                {/* 2. Delete User Action */}
                <button
                  type="button"
                  disabled={deletingUserId === selectedUser.id}
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="w-full py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs flex items-center justify-center gap-2 transition-all select-none border border-rose-500/20"
                >
                  {deletingUserId === selectedUser.id ? (
                    <DynamicIcon name="RefreshCw" size={13} className="animate-spin" />
                  ) : (
                    <DynamicIcon name="Trash2" size={13} />
                  )}
                  <span>Xóa vĩnh viễn tài khoản này</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
