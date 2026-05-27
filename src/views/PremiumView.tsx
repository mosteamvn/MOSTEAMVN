import React, { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { DynamicIcon } from '../components/DynamicIcon';
import { formatCurrency, cn } from '../lib/utils';
import { 
  subscribePremiumProducts,
  addPremiumProduct,
  subscribeAllPremiumSubscriptions,
  subscribeMyPremiumSubscriptions,
  savePremiumSubscription,
  deletePremiumSubscription
} from '../lib/api';
import { PremiumProduct, PremiumSubscription } from '../types';
import toast from 'react-hot-toast';

interface PremiumViewProps {
  setActiveView: (view: any) => void;
}

const DEFAULT_PRODUCTS = [
  'Youtube Premium',
  'Netflix 4K',
  'Capcut Pro',
  'Canva Pro',
  'Google Drive 2TB',
  'Google Drive 5TB'
];

const formatNumberWithCommas = (value: string | number) => {
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('en-US');
};

export default function PremiumView({ setActiveView }: PremiumViewProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'mosteamvn@gmail.com';

  // State arrays
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<PremiumSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'near-expiry'>('all');

  // Modal / Form state
  const [selectedSub, setSelectedSub] = useState<PremiumSubscription | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Sub Form state
  const [formId, setFormId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formDurationDays, setFormDurationDays] = useState<number>(30);
  const [formPurchasePrice, setFormPurchasePrice] = useState<string>('0');
  const [formPurchaseDate, setFormPurchaseDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [formBonusDays, setFormBonusDays] = useState<number>(0);
  const [formSource, setFormSource] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Sync real-time data
  useEffect(() => {
    setLoading(true);

    const unsubProducts = subscribePremiumProducts((data) => {
      setProducts(data);
    });

    // Subscriptions based on user authorization structure
    let unsubSubs: () => void;
    if (isAdmin) {
      unsubSubs = subscribeAllPremiumSubscriptions((data) => {
        setSubscriptions(data);
        setLoading(false);
      });
    } else {
      unsubSubs = subscribeMyPremiumSubscriptions(user?.email || '', (data) => {
        setSubscriptions(data);
        setLoading(false);
      });
    }

    return () => {
      unsubProducts();
      unsubSubs();
    };
  }, [isAdmin, user?.email]);

  // Merge Firestore products with Default fallback list
  const allProductsList = useMemo(() => {
    const firestoreProductNames = new Set(products.map(p => p.name.toLowerCase()));
    const merged: string[] = [...products.map(p => p.name)];
    
    DEFAULT_PRODUCTS.forEach(defName => {
      if (!firestoreProductNames.has(defName.toLowerCase())) {
        merged.push(defName);
      }
    });

    return merged.sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Automated computations based on form input variables
  const computedFormValues = useMemo(() => {
    try {
      const duration = Number(formDurationDays) || 30;
      const bonus = Number(formBonusDays) || 0;
      const price = Number(String(formPurchasePrice).replace(/,/g, '')) || 0;

      // Calculate Expiry End Date (purchaseDate + durationDays + bonusDays)
      const parts = formPurchaseDate.split('-');
      let baseDate = new Date();
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      
      const expiryDate = addDays(baseDate, duration + bonus);
      const expiryDateStr = format(expiryDate, 'dd/MM/yyyy');
      const isoExpiryStr = format(expiryDate, 'yyyy-MM-dd');

      // Calculate Days Remaining
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const remainingDays = differenceInDays(expiryDate, today);

      // Save refund value based on Vietnamese policy math: (price / duration) * remaining
      const refundValue = remainingDays > 0 
        ? Math.max(0, Math.min(price, Math.floor((price / duration) * remainingDays))) 
        : 0;

      return {
        expiryDateStr,
        isoExpiryStr,
        remainingDays,
        refundValue
      };
    } catch (e) {
      return {
        expiryDateStr: 'N/A',
        isoExpiryStr: 'N/A',
        remainingDays: 0,
        refundValue: 0
      };
    }
  }, [formPurchaseDate, formDurationDays, formBonusDays, formPurchasePrice]);

  // Process item values for listing cards
  const subListDecorated = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return subscriptions.map(sub => {
      // Expiry calc
      const parts = sub.purchaseDate.split('-');
      let baseDate = new Date();
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }

      const duration = Number(sub.durationDays) || 30;
      const bonus = Number(sub.bonusDays) || 0;
      const expiryDate = addDays(baseDate, duration + bonus);

      const remainingDays = differenceInDays(expiryDate, today);
      const refundValue = remainingDays > 0 
        ? Math.max(0, Math.min(sub.purchasePrice, Math.floor((sub.purchasePrice / duration) * remainingDays))) 
        : 0;

      return {
        ...sub,
        expiryDate,
        remainingDays,
        refundValue
      };
    });
  }, [subscriptions]);

  // Apply search query and near-expiry filter
  const filteredSubList = useMemo(() => {
    let list = subListDecorated;

    // Filter near-expiry (ending in <= 7 days)
    if (filterType === 'near-expiry') {
      list = list.filter(sub => sub.remainingDays <= 7);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        s.email.toLowerCase().includes(q) || 
        s.productName.toLowerCase().includes(q) || 
        s.phone.toLowerCase().includes(q) ||
        (s.source || '').toLowerCase().includes(q)
      );
    }

    // Sort by remaining days: expired/soonest first
    return list.sort((a, b) => a.remainingDays - b.remainingDays);
  }, [subListDecorated, filterType, searchQuery]);

  // Statistics summaries
  const stats = useMemo(() => {
    const total = subListDecorated.length;
    const nearExpiry = subListDecorated.filter(s => s.remainingDays <= 7).length;
    const totalRevenue = subListDecorated.reduce((sum, s) => sum + s.purchasePrice, 0);
    return { total, nearExpiry, totalRevenue };
  }, [subListDecorated]);

  // Product breakdown for report overlay
  const productBreakdown = useMemo(() => {
    const itemsMap: Record<string, { count: number; revenue: number }> = {};
    subscriptions.forEach(sub => {
      const name = sub.productName;
      if (!itemsMap[name]) {
        itemsMap[name] = { count: 0, revenue: 0 };
      }
      itemsMap[name].count += 1;
      itemsMap[name].revenue += sub.purchasePrice;
    });
    return Object.entries(itemsMap).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [subscriptions]);

  // Handle open registration form
  const openAddForm = () => {
    const rawId = 'psub-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    setFormId(rawId);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormProductId(allProductsList[0] || 'Youtube Premium');
    setFormProductName(allProductsList[0] || 'Youtube Premium');
    setFormDurationDays(30);
    setFormPurchasePrice('0');
    setFormPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setFormBonusDays(0);
    setFormSource('');
    setFormNotes('');
    
    setSelectedSub(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const openEditForm = (sub: typeof subListDecorated[0]) => {
    setFormId(sub.id);
    setFormFullName(sub.fullName);
    setFormEmail(sub.email);
    setFormPhone(sub.phone);
    setFormProductId(sub.productId);
    setFormProductName(sub.productName);
    setFormDurationDays(sub.durationDays);
    setFormPurchasePrice(formatNumberWithCommas(sub.purchasePrice));
    setFormPurchaseDate(sub.purchaseDate);
    setFormBonusDays(sub.bonusDays || 0);
    setFormSource(sub.source || '');
    setFormNotes(sub.notes || '');

    setSelectedSub(sub);
    setIsFormOpen(true);
  };

  // Quick Action Adding dynamic custom product
  const handleAddNewProductCategory = async () => {
    if (!newProductName.trim()) {
      toast.error('Vui lòng điền tên dịch vụ/sản phẩm!');
      return;
    }
    try {
      const docId = await addPremiumProduct(newProductName.trim());
      if (docId) {
        toast.success(`Đã thêm dịch vụ: ${newProductName}`);
        setFormProductId(newProductName.trim());
        setFormProductName(newProductName.trim());
        setNewProductName('');
        setIsAddingProduct(false);
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    }
  };

  // Form submission handler
  const handleSaveFormSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formFullName.trim()) {
      toast.error('Vui lòng nhập họ tên khách hàng');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      toast.error('Vui lòng nhập email hợp lệ');
      return;
    }
    if (!formProductName.trim()) {
      toast.error('Vui lòng chọn dịch vụ sản phẩm');
      return;
    }

    try {
      const payloadSub = {
        fullName: formFullName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        productId: formProductId.trim() || formProductName.trim(),
        productName: formProductName.trim(),
        durationDays: Number(formDurationDays) || 30,
        purchasePrice: Number(String(formPurchasePrice).replace(/,/g, '')) || 0,
        purchaseDate: formPurchaseDate,
        bonusDays: Number(formBonusDays) || 0,
        source: formSource.trim(),
        notes: formNotes.trim(),
        userUid: '' // Optional reference matching users
      };

      await savePremiumSubscription(formId, payloadSub);
      toast.success(selectedSub ? 'Đã cập nhật dịch vụ thành công' : 'Đăng ký tài khoản Premium thành công!');
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Có lỗi lưu tài liệu: ' + err.message);
    }
  };

  // Delete subscription handler
  const handleDeleteSub = async (id: string, email: string) => {
    const confirmMsg = `Bạn có chắc muốn xóa vĩnh viễn Subscription của khách hàng ${email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deletePremiumSubscription(id);
      toast.success('Đã xóa dịch vụ premium.');
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Lỗi khi xóa: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col absolute inset-0 bg-slate-50 dark:bg-slate-950 z-45 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 shrink-0">
        <button 
          onClick={() => setActiveView('profile')} 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <DynamicIcon name="ChevronLeft" size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug uppercase">
            Nabe Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold uppercase tracking-wider">
            {isAdmin ? 'Where your collection begins' : 'TÀI KHOẢN PREMIUM CỦA TÔI'}
          </p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center">
          {loading && <DynamicIcon name="RefreshCw" size={18} className="animate-spin text-[#1DBF73]" />}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] space-y-6">
        
        {/* Info Area */}
        {!isAdmin && (
          <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-2xl flex gap-3.5 shadow-xs">
            <div className="text-[#1DBF73] shrink-0 mt-0.5">
              <DynamicIcon name="Sparkles" size={20} />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed font-semibold">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Dịch vụ đang liên kết</p>
              <p>Hệ thống tự động lọc và đồng bộ tất cả gói Premium mà bạn đã mua sử dụng email <span className="text-[#1DBF73] font-black select-all underline">{user?.email}</span>.</p>
            </div>
          </div>
        )}

        {/* Reports Trigger Button (Admins only) */}
        {isAdmin && (
          <button
            onClick={() => setIsReportOpen(true)}
            className="w-full p-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-2xl flex items-center justify-between transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1DBF73]/10 text-[#1DBF73] flex items-center justify-center font-bold border border-[#1DBF73]/20 shadow-xs">
                <DynamicIcon name="TrendingUp" size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">Báo cáo & Thống kê doanh thu</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Click để xem chi tiết tình trạng dịch vụ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
              <span className="text-sm font-mono font-black text-emerald-500">{formatCurrency(stats.totalRevenue)}</span>
              <DynamicIcon name="ChevronRight" size={16} />
            </div>
          </button>
        )}

        {/* Search Bar & Add Button */}
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <DynamicIcon name="Search" size={17} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="w-full bg-white dark:bg-slate-900 pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 dark:border-slate-800 outline-none text-sm font-semibold focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 text-slate-900 dark:text-white placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40 shadow-xs transition-all"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <DynamicIcon name="X" size={17} />
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={openAddForm}
              className="px-5 bg-[#1DBF73] hover:bg-[#19a964] text-white rounded-xl text-sm font-bold shrink-0 shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <DynamicIcon name="PlusCircle" size={17} />
              <span className="uppercase font-bold">Tạo đơn hàng</span>
            </button>
          )}
        </div>

        {/* Auto Filter Near Expiry <= 7 days Toggle */}
        <div className="flex bg-slate-200/60 dark:bg-slate-900 rounded-xl p-1.5 shadow-inner border border-slate-300/40 dark:border-slate-800/40">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all relative",
              filterType === 'all' 
                ? "bg-white dark:bg-slate-800 text-[#1DBF73] shadow-sm font-black" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
            )}
          >
            Tất cả ({subListDecorated.length})
          </button>
          <button
            onClick={() => setFilterType('near-expiry')}
            className={cn(
              "flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5",
              filterType === 'near-expiry' 
                ? "bg-rose-600 text-white shadow-sm font-black animate-pulse" 
                : "text-rose-600 bg-rose-500/5 dark:bg-rose-500/5 hover:bg-rose-500/10"
            )}
          >
            <DynamicIcon name="ShieldAlert" size={15} className={cn(filterType === 'near-expiry' && "animate-bounce")} />
            <span>Sắp hết hạn ({subListDecorated.filter(s => s.remainingDays <= 7).length})</span>
          </button>
        </div>

        {/* List subscriptions */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
            Danh sách dịch vụ ({filteredSubList.length})
          </h3>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 py-16 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-450 gap-3 shadow-xs">
              <DynamicIcon name="RefreshCw" size={24} className="animate-spin text-[#1DBF73]" />
              <p className="text-sm font-bold">Đang tìm dữ liệu hoạt động...</p>
            </div>
          ) : filteredSubList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 py-16 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-450 gap-2 shadow-xs">
              <DynamicIcon name="Inbox" size={32} className="text-slate-350" />
              <p className="text-sm font-bold">Chưa có bản ghi kết quả</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSubList.map((sub) => {
                const isEnding = sub.remainingDays <= 7;
                const isExpired = sub.remainingDays <= 0;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => isAdmin ? openEditForm(sub) : null}
                    disabled={!isAdmin}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] bg-white dark:bg-slate-900 transition-all cursor-pointer border-slate-250 dark:border-slate-800 border-solid",
                      isEnding 
                        ? "border-rose-400 bg-rose-500/[0.01] dark:border-rose-900/60" 
                        : "hover:border-[#1DBF73] dark:hover:border-[#1DBF73]"
                    )}
                  >
                    <div className="flex gap-3.5 items-center min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
                        isEnding 
                          ? "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50" 
                          : "bg-emerald-500/10 text-[#1DBF73] border-emerald-150 dark:border-emerald-950/20"
                      )}>
                        <DynamicIcon name={isEnding ? "ShieldAlert" : "Shield"} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                          {sub.productName}
                        </p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 truncate flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{sub.fullName}</span>
                          <span className="text-slate-350 dark:text-slate-650 font-normal select-none">•</span>
                          <span className="font-semibold text-slate-550 dark:text-slate-450 select-all truncate">{sub.email}</span>
                        </p>
                      </div>
                    </div>

                    {/* Remaining Days Badge */}
                    <div className="shrink-0 text-right">
                      <span className={cn(
                        "text-[11.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs",
                        isExpired 
                          ? "bg-rose-605 text-white" 
                          : isEnding 
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30 animate-pulse" 
                            : sub.remainingDays <= 15
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30 font-bold"
                              : "bg-emerald-500/10 text-[#1DBF73] border border-emerald-200/40 font-extrabold"
                      )}>
                        {isExpired ? 'Hết hạn' : `Còn ${sub.remainingDays} ngày`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-6"></div>
      </div>

      {/* Admin Subscription Input / Edit Form (Full Overlay Modal) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-bottom duration-300">
          <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/65 shrink-0">
            <button 
              type="button" 
              onClick={() => setIsFormOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <DynamicIcon name="X" size={20} />
            </button>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              {selectedSub ? 'CHỈNH SỬA ĐƠN HÀNG' : 'TẠO ĐƠN HÀNG'}
            </h2>
            <div className="w-10 h-10 flex items-center justify-center">
              {selectedSub && (
                <button
                  type="button"
                  onClick={() => handleDeleteSub(formId, formEmail)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-950/40"
                >
                  <DynamicIcon name="Trash2" size={16} />
                </button>
              )}
            </div>
          </header>

          <form onSubmit={handleSaveFormSubmission} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            
            {/* Live Calculation Alert bar */}
            <div className="bg-[#1DBF73]/5 dark:bg-[#1DBF73]/10 border border-[#1DBF73]/20 p-4 rounded-2xl shadow-xs">
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2 font-mono">Tính toán tự động thời gian:</h4>
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-semibold text-slate-850 dark:text-slate-250">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider">Ngày Hết Hạn</p>
                  <p className="font-extrabold text-[#1DBF73] mt-1.5">{computedFormValues.expiryDateStr}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider">Số Ngày Còn</p>
                  <p className={cn("font-extrabold mt-1.5 text-xs", computedFormValues.remainingDays <= 7 ? "text-rose-500 font-extrabold" : "text-[#1DBF73]")}>
                    {computedFormValues.remainingDays} ngày
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider">Phần Hoàn Lại</p>
                  <p className="font-extrabold text-blue-500 mt-1.5">
                    {formatCurrency(computedFormValues.refundValue).replace('₫', 'đ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Họ tên khách hàng</label>
                <input 
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>

              {/* Email & Phone */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Email đăng nhập</label>
                <input 
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Điện thoại</label>
                <input 
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0912xxxxxx"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>

              {/* Product select & Inline adder */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Sản phẩm / dịch vụ</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(!isAddingProduct)}
                    className="text-xs font-extrabold text-[#1DBF73] flex items-center gap-1 hover:underline select-none"
                  >
                    <DynamicIcon name={isAddingProduct ? "ChevronUp" : "Plus"} size={12} />
                    <span>{isAddingProduct ? "Đóng nhập" : "Tạo sản phẩm mới"}</span>
                  </button>
                </div>

                {isAddingProduct ? (
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border-2 border-slate-300 dark:border-slate-800 animate-in slide-in-from-top duration-200 shadow-xs">
                    <input 
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Nhập tên sản phẩm mới..."
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none focus:border-[#1DBF73] placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewProductCategory}
                      className="px-4 py-2.5 bg-[#1DBF73] text-white text-sm font-extrabold rounded-lg active:scale-95 shadow-sm"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <select
                    value={formProductName}
                    onChange={(e) => {
                      setFormProductName(e.target.value);
                      setFormProductId(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] cursor-pointer"
                  >
                    {allProductsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Duration select & Bonus Days */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Gói sản phẩm (ngày)</label>
                <select
                  value={formDurationDays}
                  onChange={(e) => setFormDurationDays(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] cursor-pointer"
                >
                  <option value={30}>Gói 30 ngày</option>
                  <option value={90}>Gói 90 ngày (3 tháng)</option>
                  <option value={180}>Gói 180 ngày (6 tháng)</option>
                  <option value={360}>Gói 360 ngày (1 năm)</option>
                </select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Cộng thêm ngày dùng</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formBonusDays === 0 ? '' : formBonusDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setFormBonusDays(0);
                    } else {
                      const cleanDigits = val.replace(/\D/g, '');
                      if (cleanDigits === '') {
                        setFormBonusDays(0);
                      } else {
                        const parsed = parseInt(cleanDigits, 10);
                        setFormBonusDays(isNaN(parsed) ? 0 : parsed);
                      }
                    }
                  }}
                  placeholder="0"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>

              {/* Price & Purchase date */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Giá mua (đối soát VND)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  required
                  value={formPurchasePrice === '0' || formPurchasePrice === '' ? '' : formPurchasePrice}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setFormPurchasePrice('0');
                    } else {
                      const cleanDigits = raw.replace(/\D/g, '');
                      if (cleanDigits === '') {
                        setFormPurchasePrice('0');
                      } else {
                        const parsed = parseInt(cleanDigits, 10);
                        setFormPurchasePrice(formatNumberWithCommas(parsed));
                      }
                    }
                  }}
                  placeholder="0"
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Ngày mua dịch vụ</label>
                <input 
                  type="date"
                  required
                  value={formPurchaseDate}
                  onChange={(e) => setFormPurchaseDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73]"
                />
              </div>

              {/* Supplier Source */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Nơi nhập sản phẩm</label>
                <input 
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="Ví dụ: Đại lý Thừa Đức, tự đăng ký..."
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>

              {/* Notes Area */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Ghi chú (Note)</label>
                <textarea 
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về tài khoản, slot family, tài khoản khôi phục..."
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:font-mono placeholder:text-xs placeholder:font-bold placeholder:tracking-wider placeholder:text-slate-500/60 dark:placeholder:text-slate-400/40"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full py-4 bg-[#1DBF73] hover:bg-[#19a964] text-white font-black text-sm uppercase tracking-widest rounded-xl hover:opacity-95 active:scale-95 shadow-md"
            >
              Lưu Thẻ Nabe Account
            </button>
          </form>
        </div>
      )}

      {/* Revenue / Service Report Overlay (Admins only) */}
      {isReportOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-bottom duration-300">
          <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/65 shrink-0">
            <button 
              type="button" 
              onClick={() => setIsReportOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <DynamicIcon name="ArrowLeft" size={20} />
            </button>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-sans uppercase">
              Báo Cáo Doanh Thu
            </h2>
            <div className="w-10 h-10"></div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            {/* Top Financial Dashboard style Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <DynamicIcon name="TrendingUp" size={140} />
              </div>
              <div className="space-y-1 z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">TỔNG DOANH THU ĐỒNG BỘ</p>
                <p className="text-3xl font-black text-[#1DBF73] tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-800/80 z-10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tổng dịch vụ</p>
                  <p className="text-base font-extrabold text-slate-100">{stats.total} gói hoạt động</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Cần gia hạn gấp</p>
                  <p className={cn("text-base font-extrabold", stats.nearExpiry > 0 ? "text-rose-450" : "text-[#1DBF73]")}>
                    {stats.nearExpiry} gói sắp hết hạn
                  </p>
                </div>
              </div>
            </div>

            {/* List breakdown by Products */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 font-mono">
                Cơ cấu dịch vụ & sản phẩm
              </h3>
              
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-150 dark:divide-slate-800/60 overflow-hidden">
                {productBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold">
                    Chưa có dữ liệu để tổng hợp
                  </div>
                ) : (
                  productBreakdown.map(([pName, metrics]) => (
                    <div key={pName} className="p-4 flex items-center justify-between gap-3 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {pName}
                        </p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                          Số lượng: {metrics.count} gói hoạt động
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-950 dark:text-white font-mono">
                          {formatCurrency(metrics.revenue)}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                          Chiếm {Math.round((metrics.revenue / (stats.totalRevenue || 1)) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expiring listing tracker within the report */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 font-mono">
                Trạng thái hoạt động và Rủi ro
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-[10px] font-black text-[#1DBF73] uppercase tracking-widest font-mono">AN TOÀN</p>
                  <p className="text-2xl font-black text-[#1DBF73]">
                    {subListDecorated.filter(s => s.remainingDays > 7).length} gói
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold">Còn trên 7 ngày sử dụng</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-mono font-mono">CẦN GIA HẠN GẤP</p>
                  <p className="text-2xl font-black text-rose-650">
                    {subListDecorated.filter(s => s.remainingDays <= 7).length} gói
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold">Thời hạn dưới 7 ngày</p>
                </div>
              </div>
            </div>

            {/* Policy Notes */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex gap-3 text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              <div className="mt-0.5 text-[#1DBF73] shrink-0"><DynamicIcon name="Sparkles" size={18} /></div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Luật Đồng Bộ Dữ Liệu</p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-medium">Báo cáo doanh thu đồng bộ trực tiếp từ cơ sở dữ liệu dựa trên giá trị thanh toán thực tế của tất cả các gói dịch vụ Premium đang được quản lý.</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
