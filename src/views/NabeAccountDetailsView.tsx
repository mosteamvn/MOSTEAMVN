import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Users, Layout, Package, Clock, Plus, Trash2, 
  Edit2, CheckCircle, AlertCircle, User, Mail, Key, Activity, Save, 
  Smartphone, ShieldAlert, ChevronRight, X
} from 'lucide-react';
import { NabeAccount, NabeMemberSlot } from '../types';
import { updateNabeAccount } from '../lib/nabeApi';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface DetailsProps {
  account: NabeAccount;
  onClose: () => void;
}

export default function NabeAccountDetailsView({ account, onClose }: DetailsProps) {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotName, setSlotName] = useState('');
  const [slotEmail, setSlotEmail] = useState('');
  const [slotProfile, setSlotProfile] = useState('');
  const [slotPin, setSlotPin] = useState('');

  // Manual activity logging input
  const [customActivity, setCustomActivity] = useState('');

  // Countdowns and renewal calculations
  const renewalInfo = useMemo(() => {
    if (!account.expiryDate) return { daysLeft: 999, isExpiringSoon: false, isExpired: false };
    const expiry = new Date(account.expiryDate);
    const now = new Date();
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const differenceInMs = expiry.getTime() - now.getTime();
    const days = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
    return {
      daysLeft: days,
      isExpiringSoon: days <= 7 && days >= 0,
      isExpired: days < 0,
    };
  }, [account.expiryDate]);

  // Open the editor for a specific slot index
  const handleOpenSlotEditor = (index: number) => {
    const currentMember = account.members[index];
    setEditingSlotIndex(index);
    if (currentMember) {
      setSlotName(currentMember.name || '');
      setSlotEmail(currentMember.email || '');
      setSlotProfile(currentMember.profile || '');
      setSlotPin(currentMember.pin || '');
    } else {
      setSlotName('');
      setSlotEmail('');
      setSlotProfile('');
      setSlotPin('');
    }
  };

  // Save the slot update and append history
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSlotIndex === null) return;

    try {
      const updatedMembers = [...(account.members || [])];
      
      // Pad empty members if modifying high indices
      while (updatedMembers.length < account.slotCapacity) {
        updatedMembers.push({ name: '', email: '', profile: '', pin: '' });
      }

      const original = updatedMembers[editingSlotIndex];
      const isNewUser = !original?.email && (slotName || slotEmail);
      const isClearing = !slotName && !slotEmail && !slotProfile && !slotPin;

      updatedMembers[editingSlotIndex] = {
        name: slotName,
        email: slotEmail,
        profile: slotProfile,
        pin: slotPin,
      };

      // Clean up empty members at the end
      const finalizedMembers = updatedMembers.filter((m, idx) => {
        // Keep if it has data or is before the capacity
        return idx < account.slotCapacity && (m.name || m.email || m.profile || m.pin);
      });

      // Construct activity text
      let actionText = '';
      if (isClearing) {
        actionText = `Đã thu hồi slot ${editingSlotIndex + 1}`;
      } else if (isNewUser) {
        actionText = `Kích hoạt slot ${editingSlotIndex + 1} cho khách hàng ${slotName}`;
      } else {
        actionText = `Cập nhật thông tin slot ${editingSlotIndex + 1} (${slotName})`;
      }

      const newActivity = {
        id: crypto.randomUUID(),
        date: Date.now(),
        text: actionText,
      };

      const updatedActivities = [newActivity, ...(account.activities || [])];

      await updateNabeAccount(account.id, {
        members: finalizedMembers,
        activities: updatedActivities,
      });

      toast.success('Cập nhật slot thành công!');
      setEditingSlotIndex(null);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    }
  };

  // Add custom manual activity note
  const handleAddCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActivity.trim()) return;

    try {
      const newActivity = {
        id: crypto.randomUUID(),
        date: Date.now(),
        text: customActivity.trim(),
      };

      const updatedActivities = [newActivity, ...(account.activities || [])];
      await updateNabeAccount(account.id, {
        activities: updatedActivities,
      });

      toast.success('Đã thêm ghi chú lịch sử');
      setCustomActivity('');
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    }
  };

  // Render slots for display
  const slotsList = useMemo(() => {
    if (account.type === 'physical') return [];
    
    const slots = [];
    for (let i = 0; i < account.slotCapacity; i++) {
      slots.push({
        index: i,
        member: account.members[i] || null,
      });
    }
    return slots;
  }, [account]);

  // Expose total slots count
  const occupiedSlotsCount = useMemo(() => {
    return account.members.filter(m => m.name || m.email || m.profile || m.pin).length;
  }, [account.members]);

  const remainingSlotsCount = account.slotCapacity - occupiedSlotsCount;

  return (
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 z-40 md:z-10">
      {/* Header */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-35 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
            {account.name}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
          account.type === 'family' ? "bg-indigo-500/10 text-indigo-500" :
          account.type === 'regular' ? "bg-cyan-500/10 text-cyan-500" :
          "bg-amber-500/10 text-amber-500"
        )}>
          {account.type === 'family' ? 'Family (5s)' : account.type === 'regular' ? 'Thường (1s)' : 'Vật chất'}
        </span>
      </header>

      {/* Main Core View Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] space-y-5">
        
        {/* Continuous 7 Days Warning Block */}
        {renewalInfo.isExpiringSoon && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3.5 animate-pulse">
            <div className="bg-rose-500/20 text-rose-500 p-2 rounded-xl">
              <ShieldAlert size={20} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Cảnh báo gia hạn</h4>
              <p className="text-[11px] font-bold text-rose-500 dark:text-rose-300 leading-relaxed">
                Tài khoản sắp hết hạn vào ngày <strong className="underline font-black">{new Date(account.expiryDate).toLocaleDateString('vi-VN')}</strong> (Còn <strong className="font-black text-rose-600 dark:text-rose-400 text-xs">{renewalInfo.daysLeft} ngày</strong>). Hãy chuẩn bị gia hạn liên tục!
              </p>
            </div>
          </div>
        )}

        {/* Expired alert indicator */}
        {renewalInfo.isExpired && (
          <div className="bg-red-500/25 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3.5">
            <div className="bg-red-500/20 text-red-500 p-2 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Tài khoản hết hạn</h4>
              <p className="text-[11px] font-bold text-red-500 dark:text-red-300 leading-relaxed">
                Tài khoản đã hết hạn vào ngày <strong className="font-extrabold">{new Date(account.expiryDate).toLocaleDateString('vi-VN')}</strong>. Cần gia hạn ngay để không ảnh hưởng dịch vụ của khách hàng.
              </p>
            </div>
          </div>
        )}

        {/* Essential Package Meta info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/50 rounded-2xl p-4.5 space-y-3 shadow-xs">
          <h3 className="font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Thông tin tổng đại diện</h3>
          
          <div className="grid grid-cols-2 gap-3.5 pt-1.5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold block">Email gốc</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 select-all block break-all">{account.ownerEmail || 'Chưa cấu hình'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold block">Hạn gia hạn</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block md:inline-flex items-center gap-1">
                <Calendar size={13} className="inline text-slate-400" />
                {new Date(account.expiryDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold block">Trạng thái kho</span>
              <span className={cn(
                "text-[10px] font-extrabold inline-flex items-center gap-1 px-2.0 py-0.5 rounded-full",
                account.type === 'physical' 
                  ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600" 
                  : remainingSlotsCount === 0 
                  ? "bg-rose-100 dark:bg-rose-500/10 text-rose-500" 
                  : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600"
              )}>
                {account.type === 'physical' ? 'Sản Phẩm Vật Lý' : remainingSlotsCount === 0 ? 'HẾT SLOT' : `CÒN ${remainingSlotsCount} SLOT`}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 font-bold block">Số ngày còn lại</span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {renewalInfo.isExpired ? 'Đã quá hạn' : `${renewalInfo.daysLeft} ngày`}
              </span>
            </div>
          </div>
        </div>

        {/* Slots management list (Family & Regular) */}
        {account.type !== 'physical' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-emerald-500" />
                Danh sách Slot ({occupiedSlotsCount}/{account.slotCapacity})
              </h3>
            </div>

            <div className="space-y-2.5">
              {slotsList.map(({ index, member }) => (
                <div 
                  key={index} 
                  onClick={() => handleOpenSlotEditor(index)}
                  className="bg-white dark:bg-slate-901 border border-slate-100/50 dark:border-slate-800/50 rounded-2xl p-4 hover:border-[#1DBF73]/40 dark:hover:border-[#1DBF73]/30 transition-all duration-200 cursor-pointer group shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs shrink-0 transition-transform group-hover:scale-105",
                        member 
                          ? "bg-rose-500/10 text-rose-500" 
                          : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        Slot {index + 1}
                      </div>
                      <div>
                        {member ? (
                          <>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5 leading-tight">
                              {member.name || 'Khách chưa đặt tên'}
                              {member.pin && <span className="font-mono text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-semibold">PIN: {member.pin}</span>}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold break-all mt-0.5">{member.email || 'Email: Không có'}</p>
                            {member.profile && <p className="text-[10px] text-slate-500 font-bold mt-0.5">Profile: {member.profile}</p>}
                          </>
                        ) : (
                          <>
                            <h4 className="font-bold text-xs text-slate-400 dark:text-slate-500">Slot chưa sử dụng</h4>
                            <p className="text-[10px] text-emerald-650 font-bold mt-0.5">CÒN TRỐNG (Mở bán được ngay)</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button className="p-1 px-2.5 text-[9px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 hover:bg-[#1DBF73] hover:text-white transition-colors duration-200 rounded-lg text-slate-500 dark:text-slate-300">
                      CÀI ĐẶT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History / Recent Activity Log Section */}
        <div className="space-y-3 pt-2">
          <h3 className="font-extra-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
            <Activity size={14} className="text-emerald-500" />
            Lịch sử & Hoạt động gần đây
          </h3>

          {/* Quick Manual History Note Form */}
          <form onSubmit={handleAddCustomActivity} className="flex gap-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-1.5 rounded-xl">
            <input 
              value={customActivity}
              onChange={e => setCustomActivity(e.target.value)}
              placeholder="Thêm ghi chú hoạt động..."
              className="flex-1 bg-transparent px-3 text-xs text-slate-800 dark:text-slate-200 outline-none placeholder-slate-400 font-medium"
            />
            <button 
              type="submit"
              className="bg-slate-900 dark:bg-slate-800 text-white px-3.5 py-2 rounded-lg hover:bg-slate-800 transition text-[10px] font-extrabold shrink-0"
            >
              Lưu
            </button>
          </form>

          {/* Activity Logs Listing */}
          <div className="space-y-2.5">
            {account.activities && account.activities.length > 0 ? (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4.5 space-y-4 pt-1.5 ml-3">
                {account.activities.map((activity) => (
                  <div key={activity.id} className="relative text-xs">
                    {/* Visual dot on the timeline */}
                    <span className="absolute -left-[24.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-slate-50 dark:border-slate-950 ring-2 ring-emerald-500/20" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{activity.text}</span>
                      <span className="text-[10px] text-slate-450 font-bold">
                        {new Date(activity.date).toLocaleString('vi-VN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-905 border border-slate-100/50 dark:border-slate-800 rounded-2xl">
                <Clock size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-[11px] font-bold">Chưa ghi nhận hoạt động nào</p>
                <p className="text-[9px] text-slate-400/80 mt-0.5">Hệ thống sẽ ghi tự động khi bạn cài đặt các Slot</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Editing Slot Sub-modal popup (inside mobile frame screen size) */}
      {editingSlotIndex !== null && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-300 space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-black text-slate-900 dark:text-white">Cài đặt Slot {editingSlotIndex + 1}</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Cập nhật tài khoản thành viên trong gia đình</p>
              </div>
              <button 
                onClick={() => setEditingSlotIndex(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold px-1">Tên khách hàng</label>
                <div className="relative flex items-center">
                  <User size={14} className="absolute left-3 text-slate-400" />
                  <input 
                    type="text" 
                    value={slotName}
                    onChange={e => setSlotName(e.target.value)}
                    placeholder="Nhập tên người mua..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 py-2.5 rounded-xl text-xs outline-none focus:border-[#1DBF73] text-slate-900 dark:text-white placeholder-slate-400 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold px-1">Email thành viên</label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3 text-slate-400" />
                  <input 
                    type="email" 
                    value={slotEmail}
                    onChange={e => setSlotEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 py-2.5 rounded-xl text-xs outline-none focus:border-[#1DBF73] text-slate-900 dark:text-white placeholder-slate-400 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold px-1">Tên Profile</label>
                  <div className="relative flex items-center">
                    <Smartphone size={14} className="absolute left-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={slotProfile}
                      onChange={e => setSlotProfile(e.target.value)}
                      placeholder="VD: Profile 1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 py-2.5 rounded-xl text-xs outline-none focus:border-[#1DBF73] text-slate-900 dark:text-white placeholder-slate-400 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold px-1">Mã PIN profile</label>
                  <div className="relative flex items-center">
                    <Key size={14} className="absolute left-3 text-slate-400" />
                    <input 
                      type="text" 
                      maxLength={6}
                      value={slotPin}
                      onChange={e => setSlotPin(e.target.value)}
                      placeholder="VD: 1234"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 py-2.5 rounded-xl text-xs outline-none focus:border-[#1DBF73] text-slate-900 dark:text-white placeholder-slate-400 font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    // Quick Clear All values which acts as "Free the slot"
                    setSlotName('');
                    setSlotEmail('');
                    setSlotProfile('');
                    setSlotPin('');
                  }}
                  className="flex-1 border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 py-3 rounded-xl text-xs font-extrabold transition-colors"
                >
                  Xoá Trống
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#1DBF73] text-white py-3 rounded-xl text-xs font-heading font-extrabold hover:bg-emerald-600 transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Save size={14} />
                  Lưu slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
