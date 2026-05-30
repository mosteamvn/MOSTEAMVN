import { useState, useEffect, useMemo } from 'react';
import * as LunarJS from 'lunar-javascript';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  Check, 
  Sparkles, 
  Info, 
  BookOpen, 
  X, 
  CalendarDays,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Safe extraction of CJS / ESM classes
const Solar = (LunarJS as any).Solar || (LunarJS as any).default?.Solar;
const Lunar = (LunarJS as any).Lunar || (LunarJS as any).default?.Lunar;

const VIETNAMESE_MAP: { [key: string]: string } = {
  // Celestial Stems (Thiên can)
  '甲': 'Giáp',
  '乙': 'Ất',
  '丙': 'Bính',
  '丁': 'Đinh',
  '戊': 'Mậu',
  '己': 'Kỷ',
  '庚': 'Canh',
  '辛': 'Tân',
  '壬': 'Nhâm',
  '癸': 'Quý',

  // Terrestrial Branches (Địa chi)
  '子': 'Tý',
  '丑': 'Sửu',
  '寅': 'Dần',
  '卯': 'Mão',
  '辰': 'Thìn',
  '巳': 'Tỵ',
  '午': 'Ngọ',
  '未': 'Mùi',
  '申': 'Thân',
  '酉': 'Dậu',
  '戌': 'Tuất',
  '亥': 'Hợi',

  // Solar Terms (Tiết khí)
  '立春': 'Lập Xuân',
  '雨水': 'Vũ Thủy',
  '惊蛰': 'Kinh Trập',
  '春分': 'Xuân Phân',
  '清明': 'Thanh Minh',
  '谷雨': 'Cốc Vũ',
  '立夏': 'Lập Hạ',
  '小满': 'Tiểu Mãn',
  '芒种': 'Mang Chủng',
  '夏至': 'Hạ Chí',
  '小暑': 'Tiểu Thử',
  '大暑': 'Đại Thử',
  '立秋': 'Lập Thu',
  '处暑': 'Xử Thử',
  '白露': 'Bạch Lộ',
  '秋分': 'Xuân Phân',
  '寒露': 'Hàn Lộ',
  '霜降': 'Sương Giáng',
  '立冬': 'Lập Đông',
  '小雪': 'Tiểu Tuyết',
  '大雪': 'Đại Tuyết',
  '冬至': 'Đông Chí',
  '小寒': 'Tiểu Hàn',
  '大寒': 'Đại Hàn'
};

const SHENG_XIAO_MAP: { [key: string]: string } = {
  '鼠': 'Tuổi Tý (Chuột)',
  '牛': 'Tuổi Sửu (Trâu)',
  '虎': 'Tuổi Dần (Hổ)',
  '兔': 'Tuổi Mão (Mèo)',
  '龙': 'Tuổi Thìn (Rồng)',
  '蛇': 'Tuổi Tỵ (Rắn)',
  '马': 'Tuổi Ngọ (Ngựa)',
  '羊': 'Tuổi Mùi (Dê)',
  '猴': 'Tuổi Thân (Khỉ)',
  '鸡': 'Tuổi Dậu (Gà)',
  '狗': 'Tuổi Tuất (Chó)',
  '猪': 'Tuổi Hợi (Heo)'
};

function translateToVietnamese(chStr: string): string {
  if (!chStr) return 'Không rõ';
  if (VIETNAMESE_MAP[chStr]) {
    return VIETNAMESE_MAP[chStr];
  }
  return Array.from(chStr)
    .map(char => VIETNAMESE_MAP[char] || char)
    .join(' ');
}

function translateShengXiao(chStr: string): string {
  if (!chStr) return 'Tuổi Thân';
  return SHENG_XIAO_MAP[chStr] || chStr;
}

interface CalendarViewProps {
  setActiveView: (view: any) => void;
  previousView?: any;
}

export default function CalendarView({ setActiveView, previousView }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  // Custom event creation states
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventType, setEventType] = useState<'note' | 'reminder'>('note');
  const [eventTime, setEventTime] = useState('09:00');

  // Horoscope state
  const [birthYear, setBirthYear] = useState(() => {
    return localStorage.getItem('hb_user_birth_year') || '';
  });
  const [horoscopeReading, setHoroscopeReading] = useState('');
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);

  // Load events
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to loading calendar events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Save birthYear changes
  const handleBirthYearChange = (year: string) => {
    const cleaned = year.replace(/\D/g, '').slice(0, 4);
    setBirthYear(cleaned);
    localStorage.setItem('hb_user_birth_year', cleaned);
  };

  // Convert Gregorian selected date to Lunar details
  const lunarDetails = useMemo(() => {
    try {
      if (!Solar || !Lunar) {
        throw new Error('Solar/Lunar class not loaded');
      }
      const d = selectedDate;
      const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const lunar = solar.getLunar();
      
      const lMonth = lunar.getMonth();
      const isLeapMonth = lMonth < 0;
      const displayMonth = Math.abs(lMonth);
      
      return {
        day: lunar.getDay(),
        month: displayMonth,
        year: lunar.getYear(),
        isLeap: isLeapMonth,
        ganZhiYear: translateToVietnamese(lunar.getYearInGanZhi()),
        ganZhiMonth: translateToVietnamese(lunar.getMonthInGanZhi()),
        ganZhiDay: translateToVietnamese(lunar.getDayInGanZhi()),
        shengXiao: translateShengXiao(lunar.getYearShengXiao()),
        jieQi: translateToVietnamese(lunar.getJieQi() || lunar.getPrevJieQi(true)?.getName() || 'Không có'),
        lunarStr: `${lunar.getDay()}/${displayMonth}${isLeapMonth ? ' (Nhuận)' : ''}`
      };
    } catch (e) {
      console.error('lunar-javascript failure, using placeholder library fallback', e);
      return {
        day: selectedDate.getDate(),
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear(),
        isLeap: false,
        ganZhiYear: 'Không rõ',
        ganZhiMonth: 'Không rõ',
        ganZhiDay: 'Không rõ',
        shengXiao: '',
        jieQi: 'Không có',
        lunarStr: `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`
      };
    }
  }, [selectedDate]);

  // Handle horoscope call
  const generateHoroscope = async () => {
    setLoadingHoroscope(true);
    setHoroscopeReading('');
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const res = await fetch('/api/calendar/horoscope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          solarDate: dateStr,
          lunarDate: lunarDetails.lunarStr,
          lunarDetails: {
            ganZhiYear: lunarDetails.ganZhiYear,
            ganZhiMonth: lunarDetails.ganZhiMonth,
            ganZhiDay: lunarDetails.ganZhiDay,
            solarTerm: lunarDetails.jieQi
          },
          birthYear: birthYear || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setHoroscopeReading(data.reading || '');
      } else {
        toast.error('Không thể tải tử vi lúc này');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gặp lỗi khi tải dữ liệu tử vi');
    } finally {
      setLoadingHoroscope(false);
    }
  };

  // Re-run horoscope generation automatically on selectedDate change only if reading is shown
  useEffect(() => {
    if (horoscopeReading) {
      generateHoroscope();
    }
  }, [selectedDate]);

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1...
    const adjustedStart = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const arr = [];

    // Prev month days padding
    for (let i = adjustedStart - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const d = new Date(year, month - 1, prevD);
      arr.push({
        date: d,
        isCurrentMonth: false,
        solarNum: prevD,
        lunarDayStr: getSimpleLunarDayStr(d)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      arr.push({
        date: d,
        isCurrentMonth: true,
        solarNum: i,
        lunarDayStr: getSimpleLunarDayStr(d)
      });
    }

    // Next month padding to fill grid
    const totalSlots = 42;
    const remainingSlots = totalSlots - arr.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      arr.push({
        date: d,
        isCurrentMonth: false,
        solarNum: i,
        lunarDayStr: getSimpleLunarDayStr(d)
      });
    }

    return arr;
  }, [currentDate]);

  function getSimpleLunarDayStr(date: Date) {
    try {
      if (!Solar || !Lunar) return String(date.getDate());
      const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const lunar = solar.getLunar();
      const day = lunar.getDay();
      
      if (day === 1) {
        const m = lunar.getMonth();
        return `1/${Math.abs(m)}${m < 0 ? 'N' : ''}`;
      }
      return String(day);
    } catch {
      return String(date.getDate());
    }
  }

  // Handle Event Submit
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error('Nhập tiêu đề ghi chú');
      return;
    }

    try {
      const targetDateStr = selectedDate.toISOString().slice(0, 10);
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: eventTitle.trim(),
          notes: eventNotes.trim(),
          date: targetDateStr,
          type: eventType,
          time: eventType === 'reminder' ? eventTime : undefined
        })
      });

      if (res.ok) {
        toast.success(eventType === 'note' ? 'Đã lưu ghi chú thành công' : 'Đã tạo nhắc nhở');
        setEventTitle('');
        setEventNotes('');
        setShowAddModal(false);
        fetchEvents();
      } else {
        toast.error('Thất bại khi lưu sự kiện');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi gửi dữ liệu lên máy chủ');
    }
  };

  // Toggle event completion
  const handleToggleEvent = async (ev: CalendarEvent) => {
    try {
      const res = await fetch(`/api/calendar/events/${ev.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isCompleted: !ev.isCompleted
        })
      });

      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, isCompleted: !e.isCompleted } : e));
        toast.success(ev.isCompleted ? 'Đã đánh dấu chưa hoàn thành' : 'Đã hoàn thành nhắc nhở');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Bạn có thực sự muốn xoá mục này không?')) return;
    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        toast.success('Đã xoá ghi chú/nhắc nhở');
      } else {
        toast.error('Xoá thất bại');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Events of active date
  const activeDateEvents = useMemo(() => {
    const activeStr = selectedDate.toISOString().slice(0, 10);
    return events.filter(e => e.date === activeStr);
  }, [events, selectedDate]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  const isSelected = (d: Date) => {
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  };

  const monthLabel = () => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${months[currentDate.getMonth()]} / ${currentDate.getFullYear()}`;
  };

  return (
    <div className="flex flex-col absolute md:relative inset-0 md:inset-auto md:min-h-full md:w-full bg-[#FCFAF2] dark:bg-[#180A0B] animate-in slide-in-from-right duration-300 z-30 md:z-10 overflow-hidden">
      
      {/* HEADER - Traditional Red & Gold Banner */}
      <header className="sticky top-0 bg-[#B31E25] text-white z-30 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 px-5 flex items-center justify-between border-b border-[#DFAD16]/40 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveView(previousView || 'home')} 
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-black/10 text-white transition-colors flex items-center justify-center"
            id="btn-calendar-back"
          >
            <ArrowLeft size={20} className="text-[#FED871]" />
          </button>
          <h1 className="text-lg font-black tracking-wider text-[#FCFAF2] uppercase flex items-center gap-2">
            <CalendarDays className="text-[#FED871] w-5 h-5 fill-[#FED871]/15" />
            Lịch Vạn Niên
          </h1>
        </div>
        <div className="text-[10px] font-black uppercase text-[#FED871] bg-black/15 py-1 px-3 rounded-full border border-[#FED871]/20">
          Múi giờ GMT+7
        </div>
      </header>

      {/* SCROLL CONTAINER OPTIMIZED FOR MOBILE HEIGHT */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] space-y-4">
        
        {/* LUNAR & SOLAR HERO STATUS CARD */}
        <div className="bg-gradient-to-br from-[#A91D22] via-[#85161A] to-[#4C0608] rounded-2xl p-5 border border-[#DFAD16]/30 text-white relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#DFAD16]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-650/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-4">
              {/* Hộp ngày dương lịch to rõ ràng */}
              <div className="space-y-1 bg-black/15 px-4 py-2.5 rounded-xl border border-white/5 w-fit">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FED871]/90">Dương lịch</span>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedDate.getDate()} Tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
                </div>
              </div>
              
              {/* Hộp ngày âm lịch */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FED871]/90 block">Âm lịch</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#FCFAF2] flex items-baseline gap-2">
                  {lunarDetails.day <= 10 ? 'Mùng ' : 'Ngày '}{lunarDetails.day}
                  <span className="text-lg font-extrabold text-[#FED871]">Tháng {lunarDetails.month} {lunarDetails.isLeap ? '(Nhuận)' : ''}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-rose-200 mt-1.5 font-bold">
                  <span className="bg-black/25 px-2.5 py-0.5 rounded-md border border-white/10 text-rose-100">Năm {lunarDetails.ganZhiYear}</span>
                  <span className="text-[#DFAD16] font-light">•</span>
                  <span className="bg-black/25 px-2.5 py-0.5 rounded-md border border-white/10 text-rose-100">Tháng {lunarDetails.ganZhiMonth}</span>
                  <span className="text-[#DFAD16] font-light">•</span>
                  <span className="bg-black/25 px-2.5 py-0.5 rounded-md border border-white/10 text-rose-100">Ngày {lunarDetails.ganZhiDay}</span>
                </div>
              </div>
            </div>

            <div className="bg-black/25 backdrop-blur-md rounded-xl p-3.5 border border-[#DFAD16]/20 space-y-2 min-w-[130px] text-xs shrink-0">
              <div className="flex justify-between items-center text-[#FED871] font-bold gap-4">
                <span className="text-rose-200/80">Tiết khí:</span>
                <span className="text-white font-extrabold text-right">{lunarDetails.jieQi}</span>
              </div>
              <div className="flex justify-between items-center text-[#FED871] font-bold gap-4">
                <span className="text-rose-200/80">Cầm tinh:</span>
                <span className="text-white font-extrabold text-right">{lunarDetails.shengXiao || 'Tuổi Thân'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MONTHLY CALENDAR GRID BOX */}
        <div className="bg-white dark:bg-[#251213] rounded-2xl p-4 shadow-sm border border-[#EBE3D3] dark:border-[#4B1A1C]">
          
          {/* Navigation Selector */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-[#381618]">
            <h3 className="text-base font-black text-[#A91D22] dark:text-[#E9454E] tracking-wider uppercase">
              {monthLabel()}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth} 
                className="p-1.5 rounded-lg border border-[#EBE3D3] dark:border-[#421A1C] text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-[#1C0D0E]/50 hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F] transition-colors"
                id="btn-calendar-prev"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDate(now);
                }} 
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#EBE3D3] dark:border-[#421A1C] text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#1C0D0E]/50 hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F]"
              >
                Hôm nay
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1.5 rounded-lg border border-[#EBE3D3] dark:border-[#421A1C] text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-[#1C0D0E]/50 hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F] transition-colors"
                id="btn-calendar-next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days Name Header - Bold high contrast Red for Sunday */}
          <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div className="text-[#B31E25] dark:text-[#E9454E]">CN</div>
          </div>

          {/* Grid Slots */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, index) => {
              const hasEventOnDay = events.some(e => e.date === item.date.toISOString().slice(0, 10));
              const isCN = item.date.getDay() === 0;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(item.date)}
                  className={cn(
                    "relative aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition-all select-none duration-150 outline-none",
                    item.isCurrentMonth 
                      ? "bg-[#FAF7EE]/60 dark:bg-[#200F10]/40 text-slate-800 dark:text-slate-100" 
                      : "bg-transparent text-slate-350 dark:text-slate-700",
                    isToday(item.date) && "border-2 border-[#DFAD16]",
                    isSelected(item.date) 
                      ? "bg-[#B31E25]! text-white! shadow-md shadow-[#B31E25]/30 border border-[#DFAD16]/50" 
                      : "hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F]",
                  )}
                >
                  {/* Solar Main big number */}
                  <span className={cn(
                    "text-sm font-black tracking-tight mt-0.5",
                    !item.isCurrentMonth && "text-slate-300 dark:text-slate-700",
                    isCN && !isSelected(item.date) && "text-[#B31E25] dark:text-[#E9454E]"
                  )}>
                    {item.solarNum}
                  </span>

                  {/* Lunar small number */}
                  <span className={cn(
                    "text-[9px] font-bold pb-0.5",
                    isSelected(item.date) 
                      ? "text-[#FED871] font-black" 
                      : item.lunarDayStr.includes('/') 
                        ? "text-[#B31E25] dark:text-red-400 font-extrabold text-[8px]" 
                        : "text-slate-400 dark:text-slate-500"
                  )}>
                    {item.lunarDayStr}
                  </span>

                  {/* Red/Gold Event Indicator Dot */}
                  {hasEventOnDay && (
                    <span className={cn(
                      "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                      isSelected(item.date) ? "bg-[#FED871]" : "bg-[#B31E25] dark:bg-rose-500 shadow-xs"
                    )}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* REMINDERS & EVENT NOTES PANEL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pr-1">
            <h3 className="text-xs font-black text-[#A91D22] dark:text-[#E9454E] uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={14} /> Ghi chú & Nhắc nhở ({activeDateEvents.length})
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-white bg-[#B31E25] hover:bg-[#9E1B24] font-bold text-xs flex items-center gap-1 border border-[#DFAD16]/30 py-1.5 px-3 rounded-lg shadow-sm active:scale-95 transition-all outline-none"
            >
              <Plus size={14} /> Thêm ghi chú
            </button>
          </div>

          {loadingEvents ? (
            <div className="py-4 text-center text-xs text-slate-405 font-bold">Đang đồng bộ ghi chú...</div>
          ) : activeDateEvents.length === 0 ? (
            <div className="bg-[#FAF7EE] dark:bg-[#1E0D0E]/40 rounded-2xl p-5 border border-dashed border-[#EBE3D3] dark:border-[#4B1A1C] text-center text-xs text-slate-400 font-semibold">
              Không có ghi chú hay nhắc nhở nào cho ngày này. Hãy ấn thêm để tạo mới.
            </div>
          ) : (
            <div className="space-y-2">
              {activeDateEvents.map(ev => (
                <div 
                  key={ev.id} 
                  className="bg-white dark:bg-[#251213] p-3.5 rounded-xl shadow-xs border border-[#EBE3D3] dark:border-[#4A1A1C] flex items-start justify-between gap-3 group hover:border-[#DFAD16]/40 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {ev.type === 'reminder' ? (
                      <button 
                        onClick={() => handleToggleEvent(ev)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                          ev.isCompleted 
                            ? "bg-[#B31E25] border-[#B31E25] text-white" 
                            : "border-slate-205 border-[#EBE3D3] dark:border-[#4A1A1C] hover:border-[#B31E25]"
                        )}
                      >
                        {ev.isCompleted && <Check size={12} />}
                      </button>
                    ) : (
                      <div className="w-5 h-5 bg-[#FED871]/15 text-[#B31E25] dark:text-[#FED871] rounded-md border border-[#DFAD16]/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-extrabold font-serif">
                        📝
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className={cn(
                        "text-xs font-bold leading-normal truncate",
                        ev.isCompleted ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                      )}>
                        {ev.title}
                      </h4>
                      {ev.notes && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium break-words leading-relaxed line-clamp-3">
                          {ev.notes}
                        </p>
                      )}
                      {ev.type === 'reminder' && ev.time && (
                        <span className="text-[9px] bg-[#FAF7EE] dark:bg-[#1E0E10] text-[#B31E25] dark:text-[#FED871] border border-[#EBE3D3]/60 dark:border-[#421A1C] font-bold px-1.5 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1">
                          <Clock size={10} />
                          {ev.time}
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="p-1.5 bg-[#FAF7EE] dark:bg-[#1E0E10] hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg shrink-0 transition-colors border border-[#EBE3D3] dark:border-transparent"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI HOROSCOPE (TỬ VI HOÀNG ĐẠO AI) */}
        <div className="bg-gradient-to-br from-[#B31E25]/10 via-[#FAF7EE] to-[#DFAD16]/5 dark:from-[#3E1012]/40 dark:via-[#1A0A0C]/80 dark:to-[#382008]/20 rounded-2xl p-5 border border-[#DFAD16]/35 shadow-xs relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#DFAD16]/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-[#B31E25]/10 dark:border-[#DFAD16]/10">
            <div className="flex items-center gap-3">
              <div className="bg-[#B31E25]/15 p-2 rounded-xl border border-[#B31E25]/25 flex items-center justify-center text-[#B31E25] dark:text-[#FED871] shrink-0">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#A91D22] dark:text-[#E9454E] uppercase tracking-wider leading-tight">
                  Luận Giải Tử Vi AI
                </h3>
                <p className="text-[10px] text-[#DFAD16] font-extrabold uppercase tracking-widest mt-0.5 whitespace-nowrap">Học thuật Hoàng Lịch Cổ Truyền</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-start gap-3 bg-[#B31E25]/5 dark:bg-[#DFAD16]/5 px-3 py-1.5 rounded-xl border border-[#B31E25]/10 dark:border-[#DFAD16]/15 w-full sm:w-auto">
              <label className="text-[11px] text-[#A91D22] dark:text-[#FED871] font-black uppercase tracking-wider whitespace-nowrap">Năm sinh:</label>
              <input 
                type="text"
                placeholder="Vd: 1995"
                value={birthYear}
                onChange={(e) => handleBirthYearChange(e.target.value)}
                className="w-20 px-2 py-1 text-center font-black text-xs sm:text-sm bg-white dark:bg-[#1C0D0E]/80 rounded-lg border border-[#B31E25]/15 dark:border-[#4B1A1C] text-slate-800 dark:text-white focus:outline-none focus:border-[#B31E25] shadow-xs"
              />
            </div>
          </div>

          <div className="bg-white/90 dark:bg-[#1E0D0E]/80 rounded-xl p-4 border border-[#EBE3D3] dark:border-[#4E1C1F]/40 text-xs text-slate-600 dark:text-slate-300 space-y-3 font-medium">
            {horoscopeReading ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-semibold divide-y divide-slate-100 dark:divide-slate-850 space-y-4">
                {horoscopeReading.split('\n\n').map((para, pIdx) => {
                  if (para.startsWith('###')) {
                    return <h4 key={pIdx} className="text-[13px] font-black text-[#B31E25] dark:text-[#FED871] pt-3 flex items-center gap-1.5">{para.replace('###', '')}</h4>;
                  }
                  if (para.startsWith('**') || para.startsWith('*')) {
                    return (
                      <div key={pIdx} className="pt-2">
                        <p className="text-xs font-bold text-[#B31E25] dark:text-[#FF7675]">{para.split(':')[0]}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 ml-1 mt-0.5 leading-relaxed">{para.split(':').slice(1).join(':')}</p>
                      </div>
                    );
                  }
                  return <p key={pIdx} className="pt-2 leading-relaxed">{para}</p>;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center text-slate-400 gap-2 font-semibold text-[11px] leading-normal">
                <BookOpen size={24} className="text-[#DFAD16] animate-bounce" />
                Xem Cát - Hung nhật trình, Hỷ sự hanh cát & quái quẻ vận khí ngày hôm nay của bạn.
              </div>
            )}

            {loadingHoroscope && (
              <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400 text-[11px] font-bold gap-2 animate-pulse">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#B31E25]"></div>
                Cố vấn AI học gia đang luận quẻ chi tiết hoàng lịch...
              </div>
            )}
          </div>

          {!loadingHoroscope && (
            <button 
              onClick={generateHoroscope}
              className="w-full py-2.5 bg-gradient-to-r from-[#B31E25] to-[#DFAD16] hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 border border-[#DFAD16]/20"
            >
              <Sparkles size={14} className="text-[#FED871]" /> Luận Quẻ Đại Sư AI
            </button>
          )}
        </div>

        {/* FOOTNOTE */}
        <div className="bg-[#FAF7EE] dark:bg-[#1E0E10] border border-[#EBE3D3] dark:border-[#4A1A1C] rounded-xl p-3 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold flex items-start gap-1.5">
          <Info size={11} className="text-[#DFAD16] mt-0.5 shrink-0" />
          <p>Màu can chi, Tiết khí hoàng đạo và Tử vi AI được kết quái theo múi giờ GMT+7 (Việt Nam). Hãy nhấp vào một ngày dương lịch bất kỳ trên bảng lưới để xem can chi và lập ghi tạc ngày lành đó nhé.</p>
        </div>
        
      </div> {/* Scrollable Container Content End */}

      {/* ADD/CREATE MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#251213] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-[#EBE3D3] dark:border-[#4B1A1C]">
            <div className="p-4 bg-[#FAF7EE] dark:bg-[#1E0D0E] border-b border-[#EBE3D3] dark:border-[#4B1A1C] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#A91D22] dark:text-[#E9454E] flex items-center gap-1.5">
                <CalendarDays size={16} className="text-[#DFAD16]" /> Lập Ghi Chú - {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 dark:text-slate-550 font-extrabold uppercase tracking-wider">Phân loại</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventType('note')}
                    className={cn(
                      "py-2 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all outline-none",
                      eventType === 'note' 
                        ? "bg-[#B31E25]/10 border-[#B31E25] text-[#B31E25]" 
                        : "border-slate-200 dark:border-[#4B1A1C] text-slate-500 hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F]"
                    )}
                  >
                    📝 Đơn ghi chú
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventType('reminder')}
                    className={cn(
                      "py-2 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all outline-none",
                      eventType === 'reminder' 
                        ? "bg-[#DFAD16]/10 border-[#DFAD16] text-[#DFAD16]" 
                        : "border-slate-200 dark:border-[#4B1A1C] text-slate-500 hover:bg-[#F3EFE3] dark:hover:bg-[#3D1D1F]"
                    )}
                  >
                    🔔 Nhắc nhở
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 dark:text-slate-550 font-extrabold uppercase tracking-wider">Tiêu đề ghi nhớ</label>
                <input
                  type="text"
                  placeholder="Vd: Giỗ tổ gia tiên, thanh lý hóa đơn..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#FAF7EE] dark:bg-[#1E0D0E] rounded-xl border border-[#EBE3D3] dark:border-[#4B1A1C] text-slate-800 dark:text-white focus:outline-none focus:border-[#B31E25]"
                />
              </div>

              {eventType === 'reminder' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 dark:text-slate-550 font-extrabold uppercase tracking-wider">Hẹn giờ báo thức</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#FAF7EE] dark:bg-[#1E0D0E] rounded-xl border border-[#EBE3D3] dark:border-[#4B1A1C] text-slate-800 dark:text-white focus:outline-none focus:border-[#DFAD16]"
                  />
                </div>
              )}

              <div className="space-y-1 block">
                <label className="text-[10px] text-slate-450 dark:text-slate-550 font-extrabold uppercase tracking-wider">Mô tả hành sự</label>
                <textarea
                  placeholder="Mô tả công việc, sắm lễ hoặc ghi nhớ khác..."
                  rows={3}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#FAF7EE] dark:bg-[#1E0D0E] rounded-xl border border-[#EBE3D3] dark:border-[#4B1A1C] text-slate-800 dark:text-white focus:outline-none focus:border-[#B31E25] resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#B31E25] hover:opacity-95 text-[#FCFAF2] rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Ghi tạc vào ngày lành
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
