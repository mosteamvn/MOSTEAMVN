import { useState, useRef, useMemo } from 'react';
import { 
  Landmark, X, UploadCloud, Clipboard, Globe, AlertCircle, CheckCircle2, 
  HelpCircle, RefreshCw, Smartphone, Sparkles, ChevronRight, Play, Check, Trash2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Wallet, Category, Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { parseBankNotification, parseBankCSV, ParsedBankTx } from '../utils/bankParsers';
import { addTransaction } from '../lib/api';
import { DynamicIcon } from './DynamicIcon';

interface BankSyncProps {
  wallets: Wallet[];
  categories: Category[];
  activeWalletId?: string;
  onClose: () => void;
}

export default function BankSyncComponent({ wallets, categories, activeWalletId, onClose }: BankSyncProps) {
  const [selectedWalletId, setSelectedWalletId] = useState<string>(activeWalletId || wallets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'notif' | 'csv' | 'webhook'>('notif');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'expense' | 'income' | 'debt'>('expense');
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);

  const selectedWallet = useMemo(() => {
    return wallets.find(w => w.id === selectedWalletId);
  }, [wallets, selectedWalletId]);

  // Tab 1: SMS / Notif manual paste
  const [notifText, setNotifText] = useState('');
  const [parsedNotifTx, setParsedNotifTx] = useState<ParsedBankTx | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [parsedNote, setParsedNote] = useState<string>('');
  const [parsedAmount, setParsedAmount] = useState<number>(0);

  // Tab 2: CSV Upload
  const [csvContent, setCsvContent] = useState('');
  const [parsedCsvTxs, setParsedCsvTxs] = useState<ParsedBankTx[]>([]);
  const [selectedCsvIndices, setSelectedCsvIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Webhook details & Simulator
  const [cassoApiKey, setCassoApiKey] = useState(() => localStorage.getItem('hb_casso_api_key') || '');
  const [webhookUrl, setWebhookUrl] = useState(() => {
    // Elegant mock server URL for Casso / SePay matching the run environment
    return `https://${window.location.host}/api/webhook/bank-sync?walletId=${selectedWalletId}`;
  });

  // Simulator payload
  const [simBank, setSimBank] = useState<'VCB' | 'Vietin'>('VCB');
  const [simType, setSimType] = useState<'income' | 'expense'>('income');
  const [simAmount, setSimAmount] = useState('500000');
  const [simContent, setSimContent] = useState('Chuyen khoan ung dung Nabe Budget');
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto update Webhook URL when selected wallet changes
  const updateWebhookUrl = (wId: string) => {
    setWebhookUrl(`https://${window.location.host}/api/webhook/bank-sync?walletId=${wId}`);
  };

  const handleWalletChange = (wId: string) => {
    setSelectedWalletId(wId);
    updateWebhookUrl(wId);
  };

  // Logic: Paste Notif text
  const handleParseText = () => {
    if (!notifText.trim()) {
      toast.error('Vui lòng nhập nội dung tin nhắn hoặc thông báo biến động số dư');
      return;
    }

    const result = parseBankNotification(notifText);
    if (!result) {
      toast.error('Không tìm thấy dữ liệu giao dịch Vietcombank hoặc Vietinbank hợp lệ. Hãy kiểm tra lại cú pháp tin nhắn!');
      return;
    }

    setParsedNotifTx(result);
    setParsedNote(result.note);
    setParsedAmount(result.amount);

    // Auto-detect category and set it in state
    const noteLower = result.note.toLowerCase();
    
    // Find all categories matching the transaction type
    const typedCats = categories.filter(c => c.type === result.type);
    let bestCatId = typedCats[0]?.id || categories.find(c => c.type === result.type)?.id || categories[0]?.id;

    const findCatByKeyword = (keywords: string[]) => {
      return typedCats.find(c => {
        const nameLower = c.name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
      });
    };

    if (noteLower.includes('luong') || noteLower.includes('lương') || noteLower.includes('salary') || noteLower.includes('pay') || noteLower.includes('commission')) {
      const found = findCatByKeyword(['lương', 'thu nhập', 'salary']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('thuong') || noteLower.includes('thưởng') || noteLower.includes('bonus')) {
      const found = findCatByKeyword(['thưởng', 'bonus']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('an') || noteLower.includes('uong') || noteLower.includes('ăn') || noteLower.includes('uống') || noteLower.includes('cafe') || noteLower.includes('food') || noteLower.includes('noodle') || noteLower.includes('quán') || noteLower.includes('bánh') || noteLower.includes('cơm') || noteLower.includes('lẩu')) {
      const found = findCatByKeyword(['ăn', 'uống', 'ẩm thực', 'nhà hàng', 'food']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('xang') || noteLower.includes('xăng') || noteLower.includes('xe') || noteLower.includes('grab') || noteLower.includes('be') || noteLower.includes('taxi') || noteLower.includes('di chuyen') || noteLower.includes('di chuyển') || noteLower.includes('phương tiện')) {
      const found = findCatByKeyword(['di chuyển', 'xăng', 'xe', 'đi lại', 'travel']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('mua') || noteLower.includes('sam') || noteLower.includes('sắm') || noteLower.includes('shopee') || noteLower.includes('lazada') || noteLower.includes('tiki') || noteLower.includes('tiktok') || noteLower.includes('shop') || noteLower.includes('siêu thị') || noteLower.includes('sieu thi') || noteLower.includes('winmart') || noteLower.includes('coop')) {
      const found = findCatByKeyword(['mua', 'sắm', 'bách hóa', 'siêu thị', 'shopping']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('dien') || noteLower.includes('điện') || noteLower.includes('evn') || noteLower.includes('nước') || noteLower.includes('nuoc') || noteLower.includes('internet') || noteLower.includes('fpt') || noteLower.includes('viettel') || noteLower.includes('vnpt') || noteLower.includes('hoa don') || noteLower.includes('hóa đơn') || noteLower.includes('tiện ích') || noteLower.includes('tien ich')) {
      const found = findCatByKeyword(['điện', 'nước', 'hóa đơn', 'tiện ích', 'internet', 'bill']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('hoc') || noteLower.includes('học') || noteLower.includes('truong') || noteLower.includes('trường') || noteLower.includes('sach') || noteLower.includes('sách') || noteLower.includes('tuition')) {
      const found = findCatByKeyword(['học', 'giáo dục', 'sách', 'education']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('y te') || noteLower.includes('y tế') || noteLower.includes('thuoc') || noteLower.includes('thuốc') || noteLower.includes('khám') || noteLower.includes('benh vien') || noteLower.includes('bệnh viện') || noteLower.includes('bác sĩ') || noteLower.includes('pharmacy')) {
      const found = findCatByKeyword(['sức khỏe', 'y tế', 'thuốc', 'health']);
      if (found) bestCatId = found.id;
    } else if (noteLower.includes('nha') || noteLower.includes('nhà') || noteLower.includes('phong') || noteLower.includes('phòng') || noteLower.includes('thue') || noteLower.includes('thuê') || noteLower.includes('rent')) {
      const found = findCatByKeyword(['nhà', 'phòng', 'thuê', 'housing']);
      if (found) bestCatId = found.id;
    }

    setSelectedCategoryId(bestCatId);
    toast.success('Đã phân tích cú pháp giao dịch thành công!');
  };

  // Logic: Save Single Parsed Tx
  const handleSaveNotifTx = async () => {
    if (!parsedNotifTx || !selectedWallet) return;
    if (!selectedCategoryId) {
      toast.error('Vui lòng chọn nhóm giao dịch!');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Số tiền giao dịch phải lớn hơn 0!');
      return;
    }

    try {
      await addTransaction({
        walletId: selectedWallet.id,
        categoryId: selectedCategoryId,
        amount: parsedAmount,
        type: parsedNotifTx.type,
        note: parsedNote,
        date: parsedNotifTx.date
      }, selectedWallet.balance);

      toast.success('Đồng bộ giao dịch vào ví thành công!');
      setNotifText('');
      setParsedNotifTx(null);
      setSelectedCategoryId('');
      setParsedNote('');
      setParsedAmount(0);
    } catch (e: any) {
      toast.error('Lỗi lưu giao dịch: ' + e.message);
    }
  };

  // CSV Drag and Drop / File select logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      const parsed = parseBankCSV(text);
      if (parsed.length === 0) {
        toast.error('Không tìm thấy bất kỳ dòng giao dịch nào. Hãy đảm bảo bạn đã tải lên tệp sao kê ngân hàng CSV/Excel chuẩn!');
        return;
      }
      setParsedCsvTxs(parsed);
      setSelectedCsvIndices(parsed.map((_, i) => i)); // select all by default
      toast.success(`Tìm thấy ${parsed.length} giao dịch từ sao kê!`);
    };
    reader.readAsText(file);
  };

  const toggleSelectCsvTx = (index: number) => {
    if (selectedCsvIndices.includes(index)) {
      setSelectedCsvIndices(prev => prev.filter(i => i !== index));
    } else {
      setSelectedCsvIndices(prev => [...prev, index]);
    }
  };

  const handleSaveSelectedCsvTxs = async () => {
    if (selectedCsvIndices.length === 0 || !selectedWallet) {
      toast.error('Vui lòng chọn ít nhất một giao dịch để đồng bộ');
      return;
    }

    let savedCount = 0;
    let currentBalance = selectedWallet.balance;

    try {
      for (const idx of selectedCsvIndices) {
        const tx = parsedCsvTxs[idx];
        const noteLower = tx.note.toLowerCase();
        let defaultCatId = categories.find(c => c.type === tx.type)?.id || categories[0]?.id;

        // Categorize
        if (noteLower.includes('luong') || noteLower.includes('salary')) {
          const found = categories.find(c => c.name.toLowerCase().includes('lương') || c.name.toLowerCase().includes('thu nhập'));
          if (found) defaultCatId = found.id;
        } else if (noteLower.includes('an') || noteLower.includes('uong') || noteLower.includes('cafe') || noteLower.includes('food')) {
          const found = categories.find(c => c.name.toLowerCase().includes('ăn') || c.name.toLowerCase().includes('uống') || c.name.toLowerCase().includes('ẩm thực'));
          if (found) defaultCatId = found.id;
        } else if (noteLower.includes('mua') || noteLower.includes('shopee') || noteLower.includes('lazada') || noteLower.includes('shop')) {
          const found = categories.find(c => c.name.toLowerCase().includes('mua') || c.name.toLowerCase().includes('sắm'));
          if (found) defaultCatId = found.id;
        }

        await addTransaction({
          walletId: selectedWallet.id,
          categoryId: defaultCatId,
          amount: tx.amount,
          type: tx.type,
          note: tx.note,
          date: tx.date
        }, currentBalance);

        // Update balance locally for next iteration in batch
        const change = tx.type === 'income' ? tx.amount : -tx.amount;
        currentBalance += change;
        savedCount++;
      }

      toast.success(`Đã đồng bộ thành công ${savedCount} giao dịch vào ví!`);
      setParsedCsvTxs([]);
      setSelectedCsvIndices([]);
    } catch (e: any) {
      toast.error(`Lỗi trong quá trình đồng bộ: ${e.message}`);
    }
  };

  // Simulating Casso/SePay Post webhook call directly to server
  const handleSaveCassoApiKey = () => {
    localStorage.setItem('hb_casso_api_key', cassoApiKey);
    toast.success('Đã lưu khoá kết nối SePay/Casso');
  };

  const runWebhookSimulation = async () => {
    if (!selectedWallet) return;
    setIsSimulating(true);

    const amountNum = parseFloat(simAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Số tiền mô phỏng không hợp lệ');
      setIsSimulating(false);
      return;
    }

    // Prepare SePay payload layout
    const payload = {
      gateway: simBank === 'VCB' ? 'Vietcombank' : 'VietinBank',
      transactionDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      accountNumber: simBank === 'VCB' ? '007100123456' : '101888999111',
      transferType: simType === 'income' ? 'in' : 'out',
      transferAmount: amountNum,
      accumulatedBalance: selectedWallet.balance + (simType === 'income' ? amountNum : -amountNum),
      code: `NBSC_${Date.now().toString().substring(8)}`,
      content: simContent,
      referenceCode: `FT${Date.now().toString().substring(5)}`,
      walletId: selectedWallet.id
    };

    try {
      // Direct webhook api implementation on development server
      const res = await fetch('/api/webhook/bank-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.custom((t) => (
          <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 border border-emerald-500 max-w-sm">
            <Sparkles size={24} className="shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-sm">Giao dịch đã kết nối và đồng bộ!</p>
              <p className="text-xs text-white/95 mt-0.5">Nhận biến động số dư qua Webhook từ {simBank === 'VCB' ? 'Vietcombank' : 'Vietinbank'}: {simType === 'income' ? '+' : '-'}{formatCurrency(amountNum)}</p>
            </div>
          </div>
        ));
      } else {
        const err = await res.json();
        toast.error(`Mô phỏng webhook thất bại: ${err.error || 'Server error'}`);
      }
    } catch (e: any) {
      toast.error('Gửi biến động số dư thất bại: ' + e.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col w-full">
        <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 -ml-1 text-slate-500 hover:text-slate-800">
              <X size={22} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Đồng bộ ngân hàng</h2>
          </div>
        </header>
        
        <div className="px-5 py-6 flex-1 overflow-y-auto">
          {/* Wallet Selection */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-0.5">Ví đích thụ hưởng</label>
            <div className="relative">
              <select
                value={selectedWalletId}
                onChange={(e) => handleWalletChange(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1DBF73]/20 focus:border-[#1DBF73] appearance-none"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {formatCurrency(w.balance)}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={16} className="text-slate-400 rotate-90" />
              </div>
            </div>
          </div>

          {/* Methods Navigation */}
          <div className="space-y-3 mb-8">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-0.5">Phương thức kết nối</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setActiveTab('notif')} 
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all", 
                  activeTab === 'notif' 
                    ? "bg-[#1DBF73]/10 border-[#1DBF73] text-[#1DBF73]" 
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850"
                )}
              >
                <Clipboard size={22} />
                <span className="text-[10px] font-bold">Dán giao dịch</span>
              </button>
              <button 
                onClick={() => setActiveTab('csv')} 
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all", 
                  activeTab === 'csv' 
                    ? "bg-[#1DBF73]/10 border-[#1DBF73] text-[#1DBF73]" 
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850"
                )}
              >
                <UploadCloud size={22} />
                <span className="text-[10px] font-bold">Tải CSV</span>
              </button>
              <button 
                onClick={() => setActiveTab('webhook')} 
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all", 
                  activeTab === 'webhook' 
                    ? "bg-[#1DBF73]/10 border-[#1DBF73] text-[#1DBF73]" 
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850"
                )}
              >
                <Globe size={22} />
                <span className="text-[10px] font-bold">Webhook</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="pb-10">
              {activeTab === 'notif' && (
                <div className="space-y-4 animate-in fade-in duration-250">
                  <textarea
                    value={notifText}
                    onChange={(e) => setNotifText(e.target.value)}
                    placeholder="Dán tin nhắn tại đây..."
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#1DBF73]/20 focus:border-[#1DBF73] font-mono min-h-[150px]"
                  />
                  <button onClick={handleParseText} className="w-full bg-[#1DBF73] hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-[#1DBF73]/20">Phân tích</button>
                  {parsedNotifTx && (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 mt-4 border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Kết quả phân tích</p>
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{parsedNotifTx.note}</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(parsedAmount)}</p>
                            
                            <div>
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-0.5 mb-2 block">Nhóm giao dịch</label>
                                <button 
                                  onClick={() => setIsCategorySelectorOpen(true)}
                                  className="w-full flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1DBF73]/20 focus:border-[#1DBF73]"
                                >
                                  {categories.find(c => c.id === selectedCategoryId)?.name || '-- Chọn nhóm --'}
                                  <ChevronRight size={16} className="text-slate-400 rotate-90" />
                                </button>
                            </div>
                            
                            <button onClick={handleSaveNotifTx} className="w-full bg-[#1DBF73] text-white font-black py-4 mt-2 rounded-2xl text-sm shadow-lg shadow-[#1DBF73]/20 hover:bg-emerald-600">Lưu giao dịch</button>
                          </div>
                      </div>
                  )}
                </div>
              )}
              {activeTab === 'csv' && (
                <div className="space-y-4 animate-in fade-in duration-250">
                  <p className="text-sm text-slate-500">Chức năng tải CSV đang được cập nhật...</p>
                </div>
              )}
              {activeTab === 'webhook' && (
                <div className="space-y-4 animate-in fade-in duration-250">
                   <p className="text-sm text-slate-500">Chức năng Webhook đang được cập nhật...</p>
                </div>
              )}
          </div>
        </div>

        {/* Category Selector Modal */}
        {isCategorySelectorOpen && (
          <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[150] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <header className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">NHÓM GIAO DỊCH</h2>
              <button onClick={() => setIsCategorySelectorOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
            </header>
            
            <div className="flex p-4 gap-2 border-b border-slate-100 dark:border-slate-800">
              {(['expense', 'income', 'debt'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setActiveCategoryTab(t)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                    activeCategoryTab === t ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  {t === 'expense' ? 'Chi tiêu' : t === 'income' ? 'Thu nhập' : 'Vay/Nợ'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-1">
                {categories.filter(c => c.type === activeCategoryTab && !c.parentId).map(root => (
                  <div key={root.id} className="space-y-1">
                    <button 
                      onClick={() => { setSelectedCategoryId(root.id); setIsCategorySelectorOpen(false); }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600">
                            <DynamicIcon name={root.icon} size={20} color={root.color} />
                         </div>
                         <span className="font-bold text-slate-900 dark:text-white">{root.name}</span>
                       </div>
                       {selectedCategoryId === root.id && <Check size={20} className="text-[#1DBF73]" />}
                    </button>
                    {categories.filter(c => c.parentId === root.id && c.type === activeCategoryTab).map(child => (
                      <button 
                        key={child.id} 
                        onClick={() => { setSelectedCategoryId(child.id); setIsCategorySelectorOpen(false); }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors pl-12"
                      >
                          <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-850 text-slate-500">
                              <DynamicIcon name={child.icon} size={16} color={child.color} />
                           </div>
                           <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{child.name}</span>
                         </div>
                         {selectedCategoryId === child.id && <Check size={16} className="text-[#1DBF73]" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
