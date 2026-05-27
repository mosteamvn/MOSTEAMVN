import { useMemo } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Target, Lightbulb } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { subDays, isAfter, startOfMonth } from 'date-fns';

interface MoneyInsiderViewProps {
  transactions: Transaction[];
  setActiveView: (view: any) => void;
}

export default function MoneyInsiderView({ transactions, setActiveView }: MoneyInsiderViewProps) {
  
  const insights = useMemo(() => {
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
          icon: TrendingUp,
          title: 'Chi tiêu đang tăng!',
          desc: `Bạn đã chi tiêu ${formatCurrency(expenseLast30)} trong 30 ngày qua, tăng ${Math.round(((expenseLast30 - expensePrev30)/expensePrev30)*100)}% so với tháng trước. Hãy chú ý nhé!`,
          color: 'text-amber-500',
          bg: 'bg-amber-100',
          darkBg: 'dark:bg-amber-500/20'
        });
      } else {
        generated.push({
          type: 'success',
          icon: TrendingDown,
          title: 'Tuyệt vời! Bạn đang tiết kiệm hiệu quả.',
          desc: `Chi tiêu 30 ngày qua giảm ${Math.round(((expensePrev30 - expenseLast30)/expensePrev30)*100)}% so với tháng trước. Tiếp tục phát huy nhé!`,
          color: 'text-emerald-500',
          bg: 'bg-emerald-100',
          darkBg: 'dark:bg-emerald-500/20'
        });
      }
    }

    // Top Category Warning
    if (topCat && expenseLast30 > 0 && (topCat.val / expenseLast30) > 0.4) {
      generated.push({
        type: 'info',
        icon: Target,
        title: `Phân bổ chi tiêu: ${topCat.name}`,
        desc: `Nhóm ${topCat.name} chiếm tới ${Math.round((topCat.val / expenseLast30)*100)}% tổng chi phí của bạn (${formatCurrency(topCat.val)}). Đặt ngân sách cho nhóm này có thể giúp bạn kiểm soát dòng tiền tốt hơn.`,
        color: 'text-violet-500',
        bg: 'bg-violet-100',
        darkBg: 'dark:bg-violet-500/20'
      });
    }

    // Largest transaction
    if (largestTx && expenseLast30 > 0 && (largestTx.amount / expenseLast30) > 0.3) {
      generated.push({
        type: 'alert',
        icon: AlertTriangle,
        title: 'Món đồ cần cân nhắc',
        desc: `Khoản chi lớn nhất gần đây của bạn là "${largestTx.note || largestTx.category?.name}" (${formatCurrency(largestTx.amount)}). Lần tới, hãy tự hỏi: Đây là khoản CẦN thiết hay khoản MUỐN?`,
        color: 'text-rose-500',
        bg: 'bg-rose-100',
        darkBg: 'dark:bg-rose-500/20'
      });
    }

    // Fallback/Generic tips
    if (generated.length < 3) {
      generated.push({
        type: 'tip',
        icon: Lightbulb,
        title: 'Mẹo quy tắc 50/30/20',
        desc: 'Hãy thử phân bổ thu nhập của bạn: 50% cho nhu cầu thiết yếu, 30% cho sở thích, và 20% cho tiết kiệm hoặc trả nợ.',
        color: 'text-blue-500',
        bg: 'bg-blue-100',
        darkBg: 'dark:bg-blue-500/20'
      });
    }

    return generated;
  }, [transactions]);

  // Overall financial score out of 10
  const score = useMemo(() => {
    // simplified mock score calculation
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const txLast30 = transactions.filter(t => isAfter(new Date(t.date), thirtyDaysAgo));
    const income = txLast30.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txLast30.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    if (income === 0 && expense === 0) return 5;
    if (expense > income) return 4;
    if (expense <= income * 0.5) return 9;
    if (expense <= income * 0.8) return 7;
    return 6;
  }, [transactions]);

  return (
    <div className="flex flex-col absolute inset-0 bg-[#1e1b4b] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 bg-[#1e1b4b]/95 backdrop-blur-md sticky top-0 z-30 border-b border-indigo-950/40 shadow-sm">
        <button onClick={() => setActiveView('statistics')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-white relative top-0.5 flex items-center gap-2 uppercase">
           <Sparkles size={18} className="text-indigo-400" />
           Money Insider
        </h2>
        <div className="w-8"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
         {/* Welcome / Health Score */}
         <div className="text-center py-6 px-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h1 className="text-3xl font-bold text-white mb-2">Xin chào!</h1>
            <p className="text-indigo-200">Dưới đây là các phân tích và mẹo tài chính thông minh dành riêng cho bạn.</p>
            
            <div className="mt-8 relative inline-block">
               <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-1">
                 <div className="w-full h-full bg-[#1e1b4b] rounded-full flex flex-col items-center justify-center">
                   <span className="text-4xl font-black text-white">{score}<span className="text-xl text-indigo-400">/10</span></span>
                 </div>
               </div>
               <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-indigo-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                  Điểm sức khoẻ
               </div>
            </div>
         </div>

         {/* Insights List */}
         <div className="space-y-4">
           <h3 className="text-white font-bold px-1 text-lg">💡 Phân tích & Gợi ý</h3>
           {insights.map((insight, idx) => {
             const Icon = insight.icon;
             return (
                <div 
                  key={idx} 
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/5 animate-in slide-in-from-bottom-8 fade-in"
                  style={{ animationDelay: `${(idx+1) * 150}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2.5 rounded-xl shrink-0 text-white shadow-lg", insight.bg.replace('100', '500'), insight.type === 'alert' ? 'bg-rose-500' : insight.type === 'success' ? 'bg-emerald-500' : insight.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500')}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">{insight.title}</h4>
                      <p className="text-indigo-200 text-sm leading-relaxed">{insight.desc}</p>
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
