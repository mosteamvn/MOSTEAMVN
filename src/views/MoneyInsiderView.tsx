import { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, Wallet } from '../types';
import { 
  ChevronLeft, Sparkles, AlertTriangle, TrendingUp, TrendingDown, 
  Target, Lightbulb, RefreshCw, Bot, Loader2, Send, Heart, Brain, 
  CheckCircle2, Plus, Zap, MessageSquare, History, Trophy, Clock, ArrowLeft
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { subDays, isAfter } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface MoneyInsiderViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  setActiveView: (view: any) => void;
  previousView?: any;
}

// Interfaces for new features
interface BehaviorLog {
  id: string;
  type: 'impulsive' | 'stress' | 'regret' | 'victory';
  note: string;
  amount: number;
  date: string;
  aiTitle?: string;
  aiFeedback?: string;
}

interface SavingChallenge {
  id: string;
  title: string;
  category: string;
  potentialSaving: number;
  difficulty: 'Dễ' | 'Vừa' | 'Khó';
  description: string;
  days: number;
  status: 'not-started' | 'active' | 'completed';
  joinedAt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function MoneyInsiderView({ transactions, wallets, setActiveView, previousView }: MoneyInsiderViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analysis' | 'optimize' | 'behavior' | 'assistant'>('analysis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Storage keys based on user
  const userPrefix = user?.uid ? `${user.uid}_` : '';
  const behaviorsKey = `nabe_behaviors_${userPrefix}`;
  const challengesKey = `nabe_challenges_${userPrefix}`;
  const chatKey = `nabe_chat_${userPrefix}`;

  // ---------------- STATE: COMPONENT-LEVEL ----------------
  const [aiData, setAiData] = useState<{
    score: number;
    scoreExplanation: string;
    insights: Array<{ type: string; title: string; desc: string }>;
  } | null>(null);

  // Behavior state
  const [behaviors, setBehaviors] = useState<BehaviorLog[]>([]);
  const [beFormType, setBeFormType] = useState<'impulsive' | 'stress' | 'regret' | 'victory'>('impulsive');
  const [beFormNote, setBeFormNote] = useState('');
  const [beFormAmount, setBeFormAmount] = useState('');
  const [beAnalyzing, setBeAnalyzing] = useState(false);

  // Challenges state
  const [challenges, setChallenges] = useState<SavingChallenge[]>([]);

  // Messenger Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatWriting, setChatWriting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quick prompt templates
  const chatSuggestions = [
    "Dòng tiền tuần này",
    "Cách bớt ăn uống",
    "Quy tắc 50/30/20",
    "Lập quỹ dự phòng"
  ];

  // ---------------- INITIAL LOADER EFFECT ----------------
  useEffect(() => {
    // Load local behaviors
    const savedBehaviors = localStorage.getItem(behaviorsKey);
    if (savedBehaviors) {
      try { setBehaviors(JSON.parse(savedBehaviors)); } catch (e) { console.error(e); }
    } else {
      setBehaviors([]);
    }

    // Load local challenges or boot defaults
    const savedChallenges = localStorage.getItem(challengesKey);
    if (savedChallenges) {
      try { 
        setChallenges(JSON.parse(savedChallenges)); 
      } catch (e) { 
        console.error(e); 
      }
    } else {
      const defaultChallenges: SavingChallenge[] = [
        {
          id: '1',
          title: '🥛 Bớt ăn vặt, trà sữa',
          category: 'Ăn uống',
          potentialSaving: 150000,
          difficulty: 'Dễ',
          description: 'Trà sữa và ăn vặt là nguồn chi tiêu âm thầm tốn kém nhất. Thử nhịn 5 ngày và thấy sự khác biệt!',
          days: 5,
          status: 'not-started'
        },
        {
          id: '2',
          title: '☕ Tự pha cafe tại nhà',
          category: 'Ăn uống',
          potentialSaving: 210000,
          difficulty: 'Dễ',
          description: 'Thưởng thức cafe gói hoặc tự pha phin tại gia thay vì ngồi quán đắt đỏ mỗi sớm.',
          days: 7,
          status: 'not-started'
        },
        {
          id: '3',
          title: '🛒 Hoãn Shopee 72 giờ',
          category: 'Mua sắm',
          potentialSaving: 500000,
          difficulty: 'Vừa',
          description: 'Đặt món đồ bạn thích vào giỏ hàng và đợi đúng 3 ngày trước khi quyết định mua.',
          days: 10,
          status: 'not-started'
        },
        {
          id: '4',
          title: '🚌 Đi phương tiện công cộng',
          category: 'Di chuyển',
          potentialSaving: 120000,
          difficulty: 'Khó',
          description: 'Đi bộ hoặc xe buýt cho các lộ trình ngắn để hạn chế gọi xe công nghệ đắt đỏ.',
          days: 5,
          status: 'not-started'
        }
      ];
      setChallenges(defaultChallenges);
      localStorage.setItem(challengesKey, JSON.stringify(defaultChallenges));
    }

    // Load local chat history
    const savedChat = localStorage.getItem(chatKey);
    if (savedChat) {
      try { 
        const parsed = JSON.parse(savedChat);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error(e);
      }
    } else {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: 'Chào bạn! Mình là cố vấn tài chính thông minh Nabe AI 🤖. Mình đã sáp nhập thành công ví tiền và lịch sử giao dịch của bạn để sẵn sàng giải mật mọi bài toán chi tiêu, xây dựng kế hoạch tiết kiệm vượt bậc. Hôm nay bạn muốn mình tham tuần giúp gì?',
          timestamp: new Date()
        }
      ]);
    }
  }, [user]);

  // Autoscroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatWriting]);

  // Save Behaviors Helper
  const saveBehaviors = (list: BehaviorLog[]) => {
    setBehaviors(list);
    localStorage.setItem(behaviorsKey, JSON.stringify(list));
  };

  // Save Challenges Helper
  const saveChallenges = (list: SavingChallenge[]) => {
    setChallenges(list);
    localStorage.setItem(challengesKey, JSON.stringify(list));
  };

  // Save Chat Helper
  const saveChatHistory = (list: ChatMessage[]) => {
    localStorage.setItem(chatKey, JSON.stringify(list));
  };

  // ---------------- FETCH AI GENERAL DIAGNOSTIC ----------------
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
      setError('Đang sử dụng phân tích chi tiết cục bộ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiAnalysis();
  }, [transactions, wallets]);

  // Offline computed diagnostic stats for Tab 1
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

    // Comparisons
    if (expensePrev30 > 0) {
      if (expenseLast30 > expensePrev30) {
        generated.push({
          type: 'warning',
          title: 'Chi tiêu có xu hướng gia tăng!',
          desc: `Bạn đã chi phí ${formatCurrency(expenseLast30)} trong 30 ngày qua, tăng khoảng ${Math.round(((expenseLast30 - expensePrev30)/expensePrev30)*100)}% so với chu kỳ trước. Hãy quản chặt ví tiền hơn nhé!`,
        });
      } else {
        generated.push({
          type: 'success',
          title: 'Chúc mừng! Thắng lợi tiết kiệm',
          desc: `Chi tiêu 30 ngày qua giảm đáng kể ${Math.round(((expensePrev30 - expenseLast30)/expensePrev30)*100)}% so với tháng trước. Sự kỷ luật tạo thặng dư tuyệt diệu cho tương lai!`,
        });
      }
    }

    // Top Cat
    if (topCat && expenseLast30 > 0 && (topCat.val / expenseLast30) > 0.4) {
      generated.push({
        type: 'info',
        title: `Phân bổ tập trung: ${topCat.name}`,
        desc: `Khoản chi "${topCat.name}" bành trướng ${Math.round((topCat.val / expenseLast30)*100)}% tổng chi của bạn (${formatCurrency(topCat.val)}). Tối ưu hóa phân nửa ví này sẽ giúp dòng tiền thặng dư ngay.`,
      });
    }

    // Largest transaction
    if (largestTx && expenseLast30 > 0 && (largestTx.amount / expenseLast30) > 0.3) {
      generated.push({
        type: 'alert',
        title: 'Món mua sắm chiếm tỷ trọng khủng',
        desc: `Giao dịch lẻ giá trị nhất là "${largestTx.note || largestTx.category?.name}" với giá trị lớn ${formatCurrency(largestTx.amount)}. Cân nhắc phân nhỏ tiến trình mua sắm lần sau.`,
      });
    }

    // Standard fallback tip
    if (generated.length < 3) {
      generated.push({
        type: 'tip',
        title: 'Bảo bối tiền vàng 50/30/20',
        desc: 'Cân bằng nguồn lực: 50% cho nhu cầu thiết yếu gia bản, 30% cho ý thích thưởng thức cá nhân và cất dự 20% vào tài khố thặng dư!',
      });
    }

    return {
      score: expenseLast30 > 0 ? (expensePrev30 && expenseLast30 < expensePrev30 ? 9 : 7) : 8,
      scoreExplanation: "Dòng tiền chung của bạn nhìn chung an ổn. Để có bức tranh rực rỡ hơn nữa, hãy tiếp tục tối ưu hóa các thói quen tiêu dùng lặp lại nhé.",
      insights: generated
    };
  }, [transactions]);

  const activeData = aiData || localInsights;

  // ---------------- ACTION HANDLERS ----------------

  // Log behavior and get Gemini feedback
  const handleLogBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beFormNote.trim()) return;

    setBeAnalyzing(true);
    const amountNum = parseFloat(beFormAmount) || 0;
    
    try {
      const response = await fetch('/api/money-insider/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: beFormType,
          note: beFormNote.trim(),
          amount: amountNum
        }),
      });

      const feedbackData = await response.json();
      
      const newLog: BehaviorLog = {
        id: String(Date.now()),
        type: beFormType,
        note: beFormNote.trim(),
        amount: amountNum,
        date: new Date().toISOString(),
        aiTitle: feedbackData?.title || 'Phân tích từ Nabe AI',
        aiFeedback: feedbackData?.feedback || 'Ghi nhận thành công hành vi.'
      };

      const updated = [newLog, ...behaviors];
      saveBehaviors(updated);
      setBeFormNote('');
      setBeFormAmount('');
    } catch (e) {
      console.error(e);
      // Fallback
      const genericTitle = beFormType === 'victory' ? '🏆 Chiến tích dòng tiền' : '🧠 Tiết chế Dopamine';
      const genericFeedback = 'Hành vi chi dùng của bạn đã được ghi nhận. Hãy tự trì hoãn các nhu cầu ngắn hạn để bảo vệ dòng tiền dài hạn vững bền.';
      
      const newLog: BehaviorLog = {
        id: String(Date.now()),
        type: beFormType,
        note: beFormNote.trim(),
        amount: amountNum,
        date: new Date().toISOString(),
        aiTitle: genericTitle,
        aiFeedback: genericFeedback
      };
      
      const updated = [newLog, ...behaviors];
      saveBehaviors(updated);
      setBeFormNote('');
      setBeFormAmount('');
    } finally {
      setBeAnalyzing(false);
    }
  };

  const handleDeleteBehavior = (id: string) => {
    const filtered = behaviors.filter(b => b.id !== id);
    saveBehaviors(filtered);
  };

  // Toggle saving challenges
  const handleStartChallenge = (id: string) => {
    const updated = challenges.map(c => {
      if (c.id === id) {
        return { ...c, status: 'active' as const, joinedAt: new Date().toISOString() };
      }
      return c;
    });
    saveChallenges(updated);
  };

  const handleCompleteChallenge = (id: string) => {
    const updated = challenges.map(c => {
      if (c.id === id) {
        return { ...c, status: 'completed' as const };
      }
      return c;
    });
    saveChallenges(updated);
  };

  const handleResetChallenge = (id: string) => {
    const updated = challenges.map(c => {
      if (c.id === id) {
        return { ...c, status: 'not-started' as const, joinedAt: undefined };
      }
      return c;
    });
    saveChallenges(updated);
  };

  // Send message to Gemini chat
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || chatWriting) return;

    const userMsg: ChatMessage = {
      id: String(Date.now() + '-user'),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setChatInput('');
    setChatWriting(true);

    try {
      const response = await fetch('/api/money-insider/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: newMsgs.map(m => ({ sender: m.sender, text: m.text })),
          transactions,
          wallets
        }),
      });

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: String(Date.now() + '-ai'),
        sender: 'ai',
        text: data?.reply || 'Xin lỗi bạn, Nabe AI đang cấu cấu lại đầu ra, hãy thử lại câu hỏi nhé.',
        timestamp: new Date()
      };

      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      saveChatHistory(finalMsgs);
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: String(Date.now() + '-ai'),
        sender: 'ai',
        text: 'Nabe AI gặp khó khăn kết nối mạng. Nhưng dựa dẫm dữ liệu ngoại tuyến: Bạn hãy cân đối đặt hạn mức tiêu dùng tháng tầm 75% thu nhập và siết chặt các món cà phê, ăn ngoài nhé!',
        timestamp: new Date()
      };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      saveChatHistory(finalMsgs);
    } finally {
      setChatWriting(false);
    }
  };

  // Chat text simple regex formatter
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-[#181140] px-1.5 py-0.5 rounded text-[#1DBF73] text-[11px] font-mono border border-white/5">$1</code>');
      
      if (formatted.trim().startsWith('- ') || formatted.trim().startsWith('* ')) {
        return (
          <li key={i} className="ml-4 list-disc text-slate-300 py-1" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-\*]\s+/, '') }} />
        );
      }
      return (
        <p key={i} className="text-slate-300 leading-relaxed text-sm py-1" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  // Helper arrays for dynamic layout
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return TrendingDown;
      case 'warning': return TrendingUp;
      case 'alert': return AlertTriangle;
      case 'info': return Target;
      default: return Lightbulb;
    }
  };

  const getInsightColorClasses = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      case 'alert': return 'bg-rose-500/20 text-rose-400 border-rose-500/20';
      case 'info': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20';
      default: return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-[#07051a] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-6 z-30 md:z-10 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="flex items-center justify-between pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 px-5 bg-[#07051a]/95 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView(previousView || 'home')} className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5 uppercase">
            <Sparkles size={16} className="text-[#1DBF73] animate-pulse" />
            Nabe AI Advisor
          </h2>
        </div>
        <button 
          onClick={fetchAiAnalysis} 
          disabled={loading && activeTab === 'analysis'}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#1DBF73] disabled:opacity-55"
        >
          <RefreshCw size={18} className={cn(loading && activeTab === 'analysis' && "animate-spin")} />
        </button>
      </header>

      {/* Tabs Menu Slider */}
      <div className="bg-[#100c30]/50 border-b border-white/5 p-1 px-4 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none select-none shrink-0">
        <button 
          onClick={() => setActiveTab('analysis')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl transition-all border",
            activeTab === 'analysis' 
              ? "bg-gradient-to-r from-[#1DBF73] to-emerald-500 text-white border-transparent shadow-lg shadow-[#1DBF73]/20" 
              : "border-transparent text-slate-400 hover:text-white"
          )}
        >
          <Bot size={13} />
          Phân Tích
        </button>
        <button 
          onClick={() => setActiveTab('optimize')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl transition-all border",
            activeTab === 'optimize' 
              ? "bg-gradient-to-r from-[#1DBF73] to-emerald-500 text-white border-transparent shadow-lg shadow-[#1DBF73]/20" 
              : "border-transparent text-slate-400 hover:text-white"
          )}
        >
          <Zap size={13} />
          Thử Thách
        </button>
        <button 
          onClick={() => setActiveTab('behavior')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl transition-all border",
            activeTab === 'behavior' 
              ? "bg-gradient-to-r from-[#1DBF73] to-emerald-500 text-white border-transparent shadow-lg shadow-[#1DBF73]/20" 
              : "border-transparent text-slate-400 hover:text-white"
          )}
        >
          <Brain size={13} />
          Hành Vi
        </button>
        <button 
          onClick={() => setActiveTab('assistant')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl transition-all border",
            activeTab === 'assistant' 
              ? "bg-gradient-to-r from-[#1DBF73] to-emerald-500 text-white border-transparent shadow-lg shadow-[#1DBF73]/20" 
              : "border-transparent text-slate-400 hover:text-white"
          )}
        >
          <MessageSquare size={13} />
          Trợ Lý AI
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ----------------TAB 1: ANALYSIS---------------- */}
        {activeTab === 'analysis' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Health Meter Dashboard */}
            <div className="relative py-8 px-5 overflow-hidden rounded-3xl bg-gradient-to-b from-[#181140]/60 to-[#07051a] border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#1DBF73]/10 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-8 right-0 w-32 h-32 bg-indigo-505/10 blur-3xl rounded-full"></div>

              <div className="bg-[#1DBF73]/10 p-2.5 px-3.5 rounded-full mb-4 border border-[#1DBF73]/15 flex items-center gap-2 text-[#1DBF73] text-[12px] font-black tracking-wider uppercase">
                <Bot size={14} className="animate-pulse" />
                <span>Nabe Gemini Core Intel</span>
              </div>

              <h1 className="text-xl font-extrabold text-white mb-1.5 leading-tight">Sức Khỏe Tài Chính</h1>
              <p className="text-slate-400 text-xs max-w-xs">
                Mô hình AI đánh giá mức độ tiêu dùng và cảnh báo dựa trên dữ liệu thu chi thực tế.
              </p>
              
              <div className="mt-7 relative inline-block">
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#1DBF73] via-emerald-500 to-indigo-500 p-0.5">
                  <div className="w-full h-full bg-[#07051a] rounded-full flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white drop-shadow-md flex items-baseline">
                      {loading ? <Loader2 className="animate-spin text-[#1DBF73]" size={32} /> : activeData.score}
                      {!loading && <span className="text-xs font-bold text-slate-500 ml-0.5">/10</span>}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">Sức khỏe ví</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 max-w-sm px-4">
                <p className="text-indigo-200 text-xs italic leading-relaxed font-semibold">
                  "{loading ? 'Đang giải mã số liệu...' : activeData.scoreExplanation}"
                </p>
              </div>
            </div>

            {/* Insights Board */}
            <div className="space-y-3.5">
              <h3 className="text-white font-extrabold text-[15px] flex items-center gap-2 px-1">
                <Lightbulb size={16} className="text-[#1DBF73]" />
                Thói quen & Rủi ro
              </h3>

              {activeData.insights.map((insight, idx) => {
                const IconComponent = getInsightIcon(insight.type);
                const colorClasses = getInsightColorClasses(insight.type);
                return (
                  <div 
                    key={idx} 
                    className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-start gap-4"
                  >
                    <div className={cn("p-2.5 rounded-xl shrink-0 border", colorClasses)}>
                      <IconComponent size={18} />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <h4 className="text-white font-bold text-sm">{insight.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed font-medium">{insight.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------TAB 2: OPTIMIZATION CHALLENGES---------------- */}
        {activeTab === 'optimize' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="relative py-6 px-5 overflow-hidden rounded-3xl bg-gradient-to-b from-[#181140]/40 to-[#07051a] border border-white/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
              <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                <Trophy className="text-amber-400" size={18} />
                Thử Thách Tiết Kiệm
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Rèn luyện kỷ luật tài chính cùng các thử thách hạn ngắt dòng chảy chi tiêu lãng phí.
              </p>
            </div>

            <div className="space-y-4">
              {challenges.map((challenge) => {
                const isNotStarted = challenge.status === 'not-started';
                const isActive = challenge.status === 'active';
                const isCompleted = challenge.status === 'completed';

                return (
                  <div 
                    key={challenge.id}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border transition-all p-4 space-y-3",
                      isCompleted 
                        ? "bg-emerald-500/[0.03] border-emerald-500/25" 
                        : isActive 
                        ? "bg-[#181140]/30 border-[#1DBF73]/30" 
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    {/* Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                          {challenge.category}
                        </span>
                        <h4 className="text-sm font-extrabold text-white mt-1.5">{challenge.title}</h4>
                      </div>

                      {/* Hardness */}
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded",
                        challenge.difficulty === 'Dễ' 
                          ? "bg-emerald-400/10 text-emerald-400" 
                          : challenge.difficulty === 'Vừa' 
                          ? "bg-amber-400/10 text-amber-400" 
                          : "bg-rose-400/10 text-rose-400"
                      )}>
                        Độ Khó: {challenge.difficulty}
                      </span>
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed">{challenge.description}</p>

                    {/* Stats & Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between border-t border-white/5 text-[11px] text-slate-400 gap-2 font-semibold">
                      <div className="flex items-center gap-1.5 text-[#1DBF73]">
                        <TrendingDown size={14} />
                        <span>Tiết kiệm: <strong>{formatCurrency(challenge.potentialSaving)}</strong></span>
                      </div>

                      {isNotStarted && (
                        <button 
                          onClick={() => handleStartChallenge(challenge.id)}
                          className="flex items-center gap-1 bg-[#1DBF73] text-slate-900 px-3 py-1.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <Zap size={11} />
                          Kích hoạt ({challenge.days} ngày)
                        </button>
                      )}

                      {isActive && (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleResetChallenge(challenge.id)}
                            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button 
                            onClick={() => handleCompleteChallenge(challenge.id)}
                            className="flex items-center gap-1 bg-amber-400 text-slate-900 px-3 py-1.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                          >
                            <CheckCircle2 size={11} />
                            Xong
                          </button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-full select-none">
                          <CheckCircle2 size={13} />
                          Đã hoàn thành!
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-bold">
                        <Clock size={11} />
                        <span>Bắt đầu từ: {new Date(challenge.joinedAt!).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------TAB 3: BEHAVIOR RECORD LEDGER---------------- */}
        {activeTab === 'behavior' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Psychology Form */}
            <div className="bg-gradient-to-b from-[#181140]/30 to-[#07051a] border border-white/5 rounded-3xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-500/20 text-indigo-400 p-2.5 rounded-2xl border border-indigo-500/15">
                  <Brain size={20} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-white font-extrabold text-sm">Thói Quen Tâm Lý</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Đánh giá hành vi tiêu dùng và tác động cảm xúc của bạn dưới góc nhìn tâm lý học tài chính.
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogBehavior} className="space-y-4 pt-1">
                {/* Form Buttons Selector */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <button 
                    type="button"
                    onClick={() => setBeFormType('impulsive')}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all",
                      beFormType === 'impulsive' 
                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" 
                        : "bg-white/[0.01] border-white/5 text-slate-400"
                    )}
                  >
                    ⚡ Bốc đồng
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBeFormType('stress')}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all",
                      beFormType === 'stress' 
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40" 
                        : "bg-white/[0.01] border-white/5 text-slate-400"
                    )}
                  >
                    🧘 Tiêu stress
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBeFormType('regret')}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all",
                      beFormType === 'regret' 
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/40" 
                        : "bg-white/[0.01] border-white/5 text-slate-400"
                    )}
                  >
                    🥀 Tiếc nuối
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBeFormType('victory')}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all",
                      beFormType === 'victory' 
                        ? "bg-emerald-500/20 text-[#1DBF73] border-emerald-500/40" 
                        : "bg-white/[0.01] border-white/5 text-slate-400"
                    )}
                  >
                    🏆 Nhịn chi
                  </button>
                </div>

                {/* Amount and Note inputs */}
                <div className="space-y-2">
                  <input 
                    type="number" 
                    placeholder="Số tiền liên quan (đ) - Ví dụ: 150000"
                    value={beFormAmount}
                    onChange={(e) => setBeFormAmount(e.target.value)}
                    className="w-full bg-[#0d0a25] border border-white/5 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#1DBF73]/30"
                  />
                  <textarea 
                    placeholder="Viết ghi chú ví dụ: Quẹt Shopee lúc 2h sáng mua sắm đồ mĩ phẩm ít xài / Thèm trà sữa lúc đang bực sếp..."
                    value={beFormNote}
                    onChange={(e) => setBeFormNote(e.target.value)}
                    rows={2}
                    className="w-full bg-[#0d0a25] border border-white/5 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#1DBF73]/30 resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={beAnalyzing || !beFormNote.trim()}
                  className="w-full bg-[#1DBF73] text-slate-900 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {beAnalyzing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      AI đang phân tích...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Lưu & Phân Tích AI
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Past list */}
            <div className="space-y-4">
              <h4 className="text-white font-extrabold text-[14px] flex items-center gap-2 px-1">
                <History size={16} className="text-indigo-400" />
                Lịch sử hành vi
              </h4>

              {behaviors.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-slate-500 text-xs font-semibold">Chưa có hành vi nào được lưu.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {behaviors.map((log) => {
                    const tagInfo = log.type === 'impulsive' 
                      ? { label: '⚡ Bốc Đồng', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' }
                      : log.type === 'stress'
                      ? { label: '🧘 Tiêu Stress', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/10' }
                      : log.type === 'regret'
                      ? { label: '🥀 Tiếc Nuối', bg: 'bg-amber-400/10 text-amber-400 border-amber-400/10' }
                      : { label: '🏆 Nhịn Chi', bg: 'bg-emerald-500/10 text-[#1DBF73] border-emerald-500/10' };

                    return (
                      <div 
                        key={log.id}
                        className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <span className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full border w-fit uppercase tracking-wider", tagInfo.bg)}>
                              {tagInfo.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold mt-1">
                              {new Date(log.date).toLocaleString('vi-VN')}
                            </span>
                          </div>

                          <button 
                            onClick={() => handleDeleteBehavior(log.id)}
                            className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="space-y-1">
                          <p className="text-white text-xs font-bold leading-relaxed">"{log.note}"</p>
                          {log.amount > 0 && (
                            <p className="text-[#1DBF73] text-[11px] font-bold font-mono">
                              Số tiền: {formatCurrency(log.amount)}
                            </p>
                          )}
                        </div>

                        {log.aiFeedback && (
                          <div className="mt-3.5 pt-3.5 border-t border-white/5 bg-white/[0.01] p-3 rounded-xl border border-white/5/20 flex gap-2 items-start">
                            <Bot size={15} className="text-[#1DBF73] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-black text-rose-400">{log.aiTitle || 'Phản hồi Nabe AI'}</h5>
                              <p className="text-slate-300 text-[11px] leading-relaxed font-semibold">{log.aiFeedback}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------TAB 4: DYNAMIC CHAT MESSENGER---------------- */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-16rem)] justify-between space-y-4 animate-in fade-in duration-200">
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div 
                    key={m.id}
                    className={cn(
                      "flex items-start gap-2.5 max-w-[88%] animate-in fade-in slide-in-from-bottom-2",
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-[#1DBF73]/15 border border-[#1DBF73]/25 flex items-center justify-center shrink-0">
                        <Bot size={16} className="text-[#1DBF73]" />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div 
                        className={cn(
                          "p-3.5 rounded-2xl text-xs",
                          isUser 
                            ? "bg-[#1DBF73] text-slate-900 font-extrabold rounded-tr-none" 
                            : "bg-white/[0.03] border border-white/5 rounded-tl-none space-y-1 shadow-sm"
                        )}
                      >
                        {isUser ? <p>{m.text}</p> : formatText(m.text)}
                      </div>
                      <p className={cn("text-[9px] text-slate-500 font-bold", isUser ? "text-right" : "text-left")}>
                        {m.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {chatWriting && (
                <div className="flex items-start gap-2.5 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-[#1DBF73]/15 border border-[#1DBF73]/25 flex items-center justify-center shrink-0 animate-bounce">
                    <Bot size={16} className="text-[#1DBF73]" />
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-[#1DBF73]" />
                    <span className="text-[11px] text-slate-400 font-semibold">Nabe AI đang luận bàn ví tiền...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggetions Chips */}
            {messages.length === 1 && !chatWriting && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider px-1">Chủ đề gợi ý:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {chatSuggestions.map((sug, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSendMessage(sug)}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-[11px] px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="pt-2 border-t border-white/5">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(chatInput);
                }} 
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hỏi Nabe AI: Phân tích tuần này / Cách tiết kiệm..."
                  disabled={chatWriting}
                  className="flex-1 bg-[#0d0a25] border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#1DBF73]/40"
                  required
                />
                <button 
                  type="submit"
                  disabled={chatWriting || !chatInput.trim()}
                  className="bg-[#1DBF73] text-slate-900 p-3 rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
