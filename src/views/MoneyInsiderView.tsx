import { useState, useEffect, useMemo } from 'react';
import { Transaction, Wallet } from '../types';
import { ChevronLeft, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Target, Lightbulb, RefreshCw, Bot, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { subDays, isAfter } from 'date-fns';

interface MoneyInsiderViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  setActiveView: (view: any) => void;
}

export default function MoneyInsiderView({ transactions, wallets, setActiveView }: MoneyInsiderViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<{
    score: number;
    scoreExplanation: string;
    insights: Array<{ type: string; title: string; desc: string }>;
  } | null>(null);

  const fetchAiAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/money-insider/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, wallets }),
      });
      if (!response.ok) {
        throw new Error('Không thể tải phân tích từ AI Nabe.');
      }
      const data = await response.json();
      setAiData(data);
    } catch (err: any) {
      console.error(err);
      setError('Đang sử dụng phân tích ngoại tuyến từ hệ thống cục bộ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiAnalysis();
  }, [transactions, wallets]);

  // Offline / Fallback computation in case AI is loading or fails
  const localInsights = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const sixtyDaysAgo = subDays(today, 60);

    const txLast30 = transactions.filter(t => isAfter(new Date(t.date), thirtyDaysAgo));
    const txPrev30 = transactions.filter(t => isAfter(new Date(t.date), sixtyDaysAgo) && !isAfter(new Date(t.date), thirtyDaysAgo));

    const expenseLast30 = txLast30.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expensePrev30 = txPrev30.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // Top category
    const catMap = new Map<string, {name: string, val: number, color: string}>();
    txLast30.filter(t => t.type === 'expense').forEach(t => {
      if (!t.category) return;
      const exist = catMap.get(t.categoryId);
      if (exist) exist.val += t.amount;
      else catMap.set(t.categoryId, { name: t.category.name, val: t.amount, color: t.category.color });
    });
    const sortedCats = Array.from(catMap.values()).sort((a, b) => b.val - a.val);
    const topCat = sortedCats[0];
    
    // Largest transaction
    const largestTx = [...txLast30.filter(t => t.type === 'expense')].sort((a, b) => b.amount - a.amount)[0];

    const generated = [];

    // Basic comparison
    if (expensePrev30 > 0) {
      if (expenseLast30 > expensePrev30) {
        generated.push({
          type: 'warning',
          title: 'Chi tiêu có xu hướng tăng!',
          desc: `Bạn đã chi tiêu ${formatCurrency(expenseLast30)} trong 30 ngày qua, tăng khoảng ${Math.round(((expenseLast30 - expensePrev30)/expensePrev30)*100)}% so với tháng trước. Hãy thắt chặt ví tiền nhé!`,
        });
      } else {
        generated.push({
          type: 'success',
          title: 'Tuyệt vời! Tiết kiệm hiệu quả',
          desc: `Chi tiêu 30 ngày qua giảm ${Math.round(((expensePrev30 - expenseLast30)/expensePrev30)*100)}% so với tháng trước. Một phong độ quản lý xuất sắc!`,
        });
      }
    }

    // Top Category Warning
    if (topCat && expenseLast30 > 0 && (topCat.val / expenseLast30) > 0.4) {
      generated.push({
        type: 'info',
        title: `Tập trung nhóm chính: ${topCat.name}`,
        desc: `Khoản chi "${topCat.name}" chiếm tới ${Math.round((topCat.val / expenseLast30)*100)}% tổng chi phí (${formatCurrency(topCat.val)}). Đặt mục tiêu hạn mức cho nhóm này sẽ đem lại tích luỹ thặng dư cao.`,
      });
    }

    // Largest transaction
    if (largestTx && expenseLast30 > 0 && (largestTx.amount / expenseLast30) > 0.3) {
      generated.push({
        type: 'alert',
        title: 'Món chi tiêu chiếm tỷ trọng lớn',
        desc: `Giao dịch giá trị lớn nhất của bạn là "${largestTx.note || largestTx.category?.name}" với giá trị lẻ ${formatCurrency(largestTx.amount)}. Cân nhắc tối ưu các hoá đơn này trong tương lai.`,
      });
    }

    // Fallback/Generic tips
    if (generated.length < 3) {
      generated.push({
        type: 'tip',
        title: 'Quy tắc vàng 50/30/20',
        desc: 'Hãy phân bổ dòng thu của bạn: 50% cho nhu cầu thiết yếu căn bản, 30% cho phong cách sống, sở thích cá nhân, và tích luỹ vững vàng 20% cho tương lai.',
      });
    }

    return {
      score: expenseLast30 > 0 ? (expensePrev30 && expenseLast30 < expensePrev30 ? 9 : 7) : 8,
      scoreExplanation: "Dòng tiền của bạn tương đối an toàn dưới các tính toán thuật toán cơ sở.",
      insights: generated
    };
  }, [transactions]);

  const activeData = aiData || localInsights;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return TrendingDown;
      case 'warning': return TrendingUp;
      case 'alert': return AlertTriangle;
      case 'info': return Target;
      default: return Lightbulb;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      case 'alert': return 'bg-rose-500/20 text-rose-400 border-rose-500/20';
      case 'info': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20';
      default: return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="flex flex-col absolute inset-0 bg-[#07051a] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 bg-[#07051a]/95 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 shadow-sm">
        <button onClick={() => setActiveView('home')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-white relative top-0.5 flex items-center gap-2 uppercase tracking-wide">
          <Sparkles size={18} className="text-[#1DBF73] animate-pulse" />
          Nabe AI Insider
        </h2>
        <button 
          onClick={fetchAiAnalysis} 
          disabled={loading}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#1DBF73] disabled:opacity-55"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Welcome / Health Score with AI Glow Card */}
        <div className="relative py-8 px-6 overflow-hidden rounded-3xl bg-gradient-to-b from-[#181140]/60 to-[#07051a] border border-white/5 flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#1DBF73]/10 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-8 right-0 w-32 h-32 bg-indigo-505/10 blur-3xl rounded-full"></div>

          <div className="bg-[#1DBF73]/10 p-3 rounded-2xl mb-4 border border-[#1DBF73]/20 flex items-center gap-2 text-[#1DBF73] text-[13px] font-bold">
            <Bot size={16} />
            <span>Nabe Generative Gemini AI</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">Phân tích chuyên sâu</h1>
          <p className="text-slate-400 text-sm max-w-sm">
            Học máy Gemini phân tích toàn bộ ví & chi tiêu để kiến tạo bản đồ tài chính thông minh của bạn.
          </p>
          
          <div className="mt-8 relative inline-block">
            <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#1DBF73] via-indigo-500 to-emerald-400 p-0.5 animate-spin-slow">
              <div className="w-full h-full bg-[#07051a] rounded-full flex flex-col items-center justify-center">
                {/* Visual rotation stopped inside */}
              </div>
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-rose-500 drop-shadow-md flex items-baseline">
                {loading ? <Loader2 className="animate-spin text-[#1DBF73]" size={36} /> : activeData.score}
                {!loading && <span className="text-sm font-bold text-slate-500 ml-0.5">/10</span>}
              </span>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-1">Sức khỏe ví</span>
            </div>
          </div>

          <div className="mt-6 max-w-sm px-4">
            <p className="text-indigo-200 text-[13px] italic leading-relaxed">
              "{loading ? 'Đang thẩm định số liệu qua AI...' : activeData.scoreExplanation}"
            </p>
          </div>
        </div>

        {/* Insights Title */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
              <Lightbulb size={18} className="text-[#1DBF73]" />
              Gợi ý từ trợ lý
            </h3>
            {loading && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin text-[#1DBF73]" /> Đang xử lý</span>}
          </div>

          {activeData.insights.map((insight, idx) => {
            const IconComponent = getIcon(insight.type);
            const colorClasses = getColorClasses(insight.type);
            return (
              <div 
                key={idx} 
                className={cn(
                  "relative overflow-hidden bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/5 animate-in slide-in-from-bottom-8 fade-in",
                  loading && "opacity-45"
                )}
                style={{ animationDelay: `${(idx + 1) * 100}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl shrink-0 border", colorClasses)}>
                    <IconComponent size={20} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-white font-bold text-[15px]">{insight.title}</h4>
                    <p className="text-slate-400 text-[13px] leading-relaxed font-medium">{insight.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
