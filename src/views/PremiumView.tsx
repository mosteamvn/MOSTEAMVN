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
import NabeAccountInventoryView from './NabeAccountInventoryView';

interface PremiumViewProps {
  nabeAccounts?: any[];
  setActiveView: (view: any) => void;
  previousView?: any;
}

const DEFAULT_PRODUCTS = [
  'Youtube Premium',
  'Netflix 4K',
  'Capcut Pro',
  'Canva Pro',
  'Google Drive 2TB',
  'Google Drive 5TB'
];

const SOURCES = ['STK Khánh', 'Nabe', 'Tự đăng ký', 'Khác'];
const CONTACT_CHANNELS = ['Zalo', 'Facebook', 'Telegram', 'Email', 'Khác'];

const getProductIconAndStyles = (productName: string) => {
  const name = productName.toLowerCase();
  
  if (name.includes('youtube')) {
    return {
      iconName: 'Youtube',
      bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
      borderClass: 'border-red-200/50 dark:border-red-950/40'
    };
  }
  
  if (name.includes('netflix')) {
    return {
      iconName: 'Tv',
      bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      borderClass: 'border-rose-200/50 dark:border-rose-950/40'
    };
  }
  
  if (name.includes('capcut')) {
    return {
      iconName: 'Scissors',
      bgClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      borderClass: 'border-cyan-200/50 dark:border-cyan-950/40'
    };
  }
  
  if (name.includes('canva')) {
    return {
      iconName: 'Palette',
      bgClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      borderClass: 'border-violet-200/50 dark:border-violet-950/40'
    };
  }
  
  if (name.includes('drive') || name.includes('storage') || name.includes('google')) {
    return {
      iconName: 'Cloud',
      bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      borderClass: 'border-blue-200/50 dark:border-blue-950/40'
    };
  }
  
  if (name.includes('spotify') || name.includes('music')) {
    return {
      iconName: 'Music',
      bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-emerald-250 dark:border-[#1E293B]/60'
    };
  }

  if (name.includes('zoom') || name.includes('meet') || name.includes('team')) {
    return {
      iconName: 'Video',
      bgClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      borderClass: 'border-sky-200/50 dark:border-sky-950/40'
    };
  }

  if (name.includes('gpt') || name.includes('ai') || name.includes('gemini') || name.includes('claude') || name.includes('open-ai')) {
    return {
      iconName: 'Sparkles',
      bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-200/50 dark:border-amber-950/40'
    };
  }

  if (name.includes('zippo') || name.includes('fire')) {
    return {
      iconName: 'Flame',
      bgClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      borderClass: 'border-orange-200/50 dark:border-orange-950/40'
    };
  }

  return {
    iconName: 'Shield',
    bgClass: 'bg-emerald-500/10 text-[#1DBF73]',
    borderClass: 'border-emerald-150 dark:border-[#1E293B]/60'
  };
};

const formatNumberWithCommas = (value: string | number) => {
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('en-US');
};

export default function PremiumView({ nabeAccounts = [], setActiveView, previousView }: PremiumViewProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'mosteamvn@gmail.com';

  // Toggle between Subscriptions list and Account Inventory
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'inventory'>('subscriptions');

  // State arrays
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<PremiumSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'near-expiry' | 'refunded'>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('Tất cả');

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
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [formCustomDuration, setFormCustomDuration] = useState<number>(0);
  const [formPurchasePrice, setFormPurchasePrice] = useState<string>('0');
  const [formPurchaseDate, setFormPurchaseDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [formBonusDays, setFormBonusDays] = useState<number>(0);
  const [formSource, setFormSource] = useState('');
  const [formContactChannel, setFormContactChannel] = useState('');
  const [formRefundStatus, setFormRefundStatus] = useState<'none' | 'pending' | 'completed'>('none');
  const [formRefundAmount, setFormRefundAmount] = useState<string>('0');
  const [formRefundDate, setFormRefundDate] = useState<string>('');
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
      const duration = useCustomDuration ? Number(formCustomDuration) : Number(formDurationDays);
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

    // Filter type
    if (filterType === 'near-expiry') {
      list = list.filter(sub => sub.remainingDays <= 7 && sub.refundStatus !== 'completed');
    } else if (filterType === 'refunded') {
      list = list.filter(sub => sub.refundStatus === 'completed');
    } else {
      list = list.filter(sub => sub.refundStatus !== 'completed');
    }

    // Filter product type
    if (selectedProductType !== 'Tất cả') {
      list = list.filter(sub => sub.productName === selectedProductType);
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
  }, [subListDecorated, filterType, searchQuery, selectedProductType]);

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
    setFormSource(SOURCES[0]);
    setFormContactChannel(CONTACT_CHANNELS[0]);
    setFormRefundStatus('none');
    setFormRefundAmount('0');
    setFormRefundDate('');
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
    
    // Check if standard or custom
    if ([30, 90, 180, 360].includes(sub.durationDays)) {
      setFormDurationDays(sub.durationDays);
      setUseCustomDuration(false);
    } else {
      setFormDurationDays(30);
      setUseCustomDuration(true);
      setFormCustomDuration(sub.durationDays);
    }

    setFormPurchasePrice(formatNumberWithCommas(sub.purchasePrice));
    setFormPurchaseDate(sub.purchaseDate);
    setFormBonusDays(sub.bonusDays || 0);
    setFormSource(sub.source || SOURCES[0]);
    setFormContactChannel(sub.contactChannel || CONTACT_CHANNELS[0]);
    setFormRefundStatus(sub.refundStatus || 'none');
    setFormRefundAmount(formatNumberWithCommas(sub.refundAmount || 0));
    setFormRefundDate(sub.refundDate || '');
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
        durationDays: useCustomDuration ? Number(formCustomDuration) : Number(formDurationDays) || 30,
        purchasePrice: Number(String(formPurchasePrice).replace(/,/g, '')) || 0,
        purchaseDate: formPurchaseDate,
        bonusDays: Number(formBonusDays) || 0,
        source: formSource.trim(),
        contactChannel: formContactChannel.trim(),
        refundStatus: formRefundStatus,
        refundAmount: Number(String(formRefundAmount).replace(/,/g, '')) || 0,
        refundDate: formRefundDate,
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
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-slate-50 dark:bg-slate-950 z-45 md:z-10 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 shrink-0">
        <button 
          onClick={() => setActiveView(previousView || 'profile')} 
          className="md:hidden w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <DynamicIcon name="ArrowLeft" size={20} />
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
        
        {/* Segment Sub-tabs Switcher */}
        <div className="flex gap-1.5 bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-300/40 dark:border-slate-800/40 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5",
              activeTab === 'subscriptions'
                ? "bg-white dark:bg-slate-800 text-[#1DBF73] shadow-sm font-black"
                : "bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <DynamicIcon name="Sparkles" size={14} />
            Hạn Premium ({subListDecorated.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5",
              activeTab === 'inventory'
                ? "bg-white dark:bg-slate-800 text-[#1DBF73] shadow-sm font-black"
                : "bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <DynamicIcon name="Package" size={14} />
            Kho Account ({nabeAccounts.length})
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <NabeAccountInventoryView 
            nabeAccounts={nabeAccounts} 
            setActiveView={setActiveView} 
            isEmbedded={true} 
          />
        ) : (
          <>
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

        {/* Search Bar */}
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
        </div>

        {/* Product Filter */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => setSelectedProductType('Tất cả')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                selectedProductType === 'Tất cả'
                  ? "bg-[#1DBF73] text-white"
                  : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              Tất cả
            </button>
            {allProductsList.map(p => (
              <button
                key={p}
                onClick={() => setSelectedProductType(p)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedProductType === p
                    ? "bg-[#1DBF73] text-white"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Filter Near Expiry <= 7 days Toggle */}
        <div className="flex bg-slate-200/60 dark:bg-slate-900 rounded-xl p-1.5 shadow-inner border border-slate-300/40 dark:border-slate-800/40">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "flex-1 text-center py-2.5 rounded-lg text-[10px] font-bold transition-all relative",
              filterType === 'all' 
                ? "bg-white dark:bg-slate-800 text-[#1DBF73] shadow-sm font-black" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
            )}
          >
            Đang dùng ({subListDecorated.filter(s => s.refundStatus !== 'completed').length})
          </button>
          <button
            onClick={() => setFilterType('near-expiry')}
            className={cn(
              "flex-1 text-center py-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1",
              filterType === 'near-expiry' 
                ? "bg-rose-600 text-white shadow-sm font-black animate-pulse" 
                : "text-rose-600 bg-rose-500/5 dark:bg-rose-500/5 hover:bg-rose-500/10"
            )}
          >
            Sắp hết ({subListDecorated.filter(s => s.remainingDays <= 7 && s.refundStatus !== 'completed').length})
          </button>
          <button
            onClick={() => setFilterType('refunded')}
            className={cn(
              "flex-1 text-center py-2.5 rounded-lg text-[10px] font-bold transition-all",
              filterType === 'refunded' 
                ? "bg-slate-600 text-white shadow-sm font-black" 
                : "text-slate-600 bg-slate-500/5 dark:bg-slate-500/5 hover:bg-slate-500/10"
            )}
          >
            Đã Refund ({subListDecorated.filter(s => s.refundStatus === 'completed').length})
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
                const prodInfo = getProductIconAndStyles(sub.productName);

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
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all",
                        prodInfo.bgClass,
                        isEnding 
                          ? "border-rose-500/80 dark:border-rose-900/80 animate-pulse border-2" 
                          : prodInfo.borderClass
                      )}>
                        <DynamicIcon name={prodInfo.iconName} size={18} />
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

                    {/* Refund Badge & Days Remaining */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5 justify-center min-w-[90px]">
                      {sub.refundStatus && sub.refundStatus !== 'none' && (
                        <span className={cn(
                          "inline-flex items-center justify-center text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs border text-center h-5 leading-none",
                          sub.refundStatus === 'completed' 
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-amber-50 text-amber-500 border-amber-200"
                        )}>
                          {sub.refundStatus === 'completed' ? 'Đã Refund' : 'Chờ Refund'}
                        </span>
                      )}
                      <span className={cn(
                        "inline-flex items-center justify-center text-[10.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs text-center h-6 leading-none",
                        isExpired 
                          ? "bg-rose-600 text-white" 
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
          </>
        )}
      </div>

      {/* Fixed Bottom Navigation */}
      {isAdmin && activeTab === 'subscriptions' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3 z-50 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setActiveView('home')}
            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
          >
            <DynamicIcon name="LayoutGrid" size={17} />
            <span>Trang chủ</span>
          </button>
          
          <button
            onClick={openAddForm}
            className="flex-[2] py-3.5 bg-[#1DBF73] hover:bg-[#19a964] text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <DynamicIcon name="PlusCircle" size={17} />
            <span className="uppercase">Tạo đơn hàng</span>
          </button>
        </div>
      )}

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
                  <div className="relative">
                    <select
                      value={formProductName}
                      onChange={(e) => {
                        setFormProductName(e.target.value);
                        setFormProductId(e.target.value);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 pr-10 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all cursor-pointer appearance-none"
                    >
                      {allProductsList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                      <DynamicIcon name="ChevronsUpDown" size={16} />
                    </div>
                  </div>
                )}
              </div>

              {/* Duration select */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Gói sản phẩm (ngày)</label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#1DBF73] cursor-pointer">
                    <input type="checkbox" checked={useCustomDuration} onChange={(e) => setUseCustomDuration(e.target.checked)} className="accent-[#1DBF73]" />
                    Tùy chỉnh
                  </label>
                </div>
                {useCustomDuration ? (
                  <input
                    type="number"
                    value={formCustomDuration || ''}
                    placeholder="Nhập số ngày..."
                    onChange={(e) => setFormCustomDuration(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all placeholder:text-slate-400"
                  />
                ) : (
                  <div className="relative">
                    <select
                      value={formDurationDays}
                      onChange={(e) => setFormDurationDays(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 pr-10 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all cursor-pointer appearance-none"
                    >
                      <option value={30}>Gói 30 ngày</option>
                      <option value={90}>Gói 90 ngày (3 tháng)</option>
                      <option value={180}>Gói 180 ngày (6 tháng)</option>
                      <option value={360}>Gói 360 ngày (1 năm)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                      <DynamicIcon name="ChevronsUpDown" size={16} />
                    </div>
                  </div>
                )}
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
                <div className="relative">
                  <input 
                    type="date"
                    required
                    value={formPurchaseDate}
                    onChange={(e) => setFormPurchaseDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 h-[52px] py-0 pr-10 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all text-left flex items-center"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                    <DynamicIcon name="Calendar" size={16} />
                  </div>
                </div>
              </div>

              {/* Cộng thêm ngày dùng (MOVED) */}
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

              {/* Supplier Source & Contact Channel */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Nơi nhập</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="Tên đại lý, nguồn..."
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {SOURCES.map(source => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setFormSource(source)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border",
                          formSource === source
                            ? "bg-[#1DBF73]/15 text-[#1DBF73] border-[#1DBF73]/30"
                            : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-450 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider pl-1 font-mono">Nơi liên lạc</label>
                  <input
                    type="text"
                    value={formContactChannel}
                    onChange={(e) => setFormContactChannel(e.target.value)}
                    placeholder="Zalo, FB, Telegram..."
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-950 dark:text-white outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/10 shadow-xs transition-all"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CONTACT_CHANNELS.map(channel => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setFormContactChannel(channel)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border",
                          formContactChannel === channel
                            ? "bg-[#1DBF73]/15 text-[#1DBF73] border-[#1DBF73]/30"
                            : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-455 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refund Section */}
              <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Refund</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                        setFormRefundStatus('none');
                        setFormRefundAmount('0');
                        setFormRefundDate('');
                    }} className={cn("px-2 py-0.5 rounded-md", formRefundStatus === 'none' ? 'bg-[#1DBF73] text-white' : 'bg-slate-200 dark:bg-slate-800')}>None</button>
                    <button type="button" onClick={() => {
                        setFormRefundStatus('pending');
                        setFormRefundDate(format(new Date(), 'yyyy-MM-dd HH:mm'));
                        setFormRefundAmount(computedFormValues.refundValue.toString());
                    }} className={cn("px-2 py-0.5 rounded-md", formRefundStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800')}>Pending</button>
                    <button type="button" onClick={() => {
                        setFormRefundStatus('completed');
                        setFormRefundDate(format(new Date(), 'yyyy-MM-dd HH:mm'));
                        setFormRefundAmount(computedFormValues.refundValue.toString());
                    }} className={cn("px-2 py-0.5 rounded-md", formRefundStatus === 'completed' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800')}>Done</button>
                  </div>
                </label>
                {formRefundStatus !== 'none' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={formRefundAmount} onChange={(e) => setFormRefundAmount(e.target.value)} className="bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-sm" placeholder="Số tiền..." />
                    <input type="text" value={formRefundDate} readOnly className="bg-white/50 dark:bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-sm" />
                  </div>
                )}
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
