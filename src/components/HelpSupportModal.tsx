import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { DynamicIcon } from './DynamicIcon';
import toast from 'react-hot-toast';

interface HelpSupportModalProps {
  onClose: () => void;
}

interface FaqItem {
  q: string;
  a: string;
}

export default function HelpSupportModal({ onClose }: HelpSupportModalProps) {
  const { user } = useAuth();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Support Ticketing Feed simulation state
  const [supportMessage, setSupportMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [ticketHistory, setTicketHistory] = useState<{ sender: 'user' | 'agent', text: string, time: string }[]>([]);

  const faqs: FaqItem[] = [
    {
      q: 'Làm thế nào để xuất dữ liệu giao dịch ra tệp CSV?',
      a: 'Bạn chỉ cần truy cập vào mục "Giao dịch" (biểu tượng danh sách ở thanh menu dưới), nhấp vào biểu tượng "Tải xuống" ở góc trên cùng bên phải. Hệ thống sẽ tự động tổng hợp toàn bộ giao dịch đang được lọc và lưu về máy bạn dưới dạng tệp .csv (hỗ trợ hiển thị tiếng Việt có dấu chuẩn).'
    },
    {
      q: 'Mã PIN bảo mật hoạt động thế nào? Có an toàn không?',
      a: 'Khi bạn kích hoạt mã PIN, ứng dụng sẽ lưu mã băm an toàn trên phân vùng bảo mật thiết bị của bạn. Mỗi khi ứng dụng chuyển sang nền hoặc khởi động lại, bạn bắt buộc phải nhập đúng mã PIN 4 số này để tiếp tục truy cập dữ liệu.'
    },
    {
      q: 'Tôi bị quên mã PIN đăng nhập thì làm thế nào?',
      a: 'Nếu vô tình quên mã PIN bảo mật, bạn có thể nhấn nút "Đăng xuất" (Log Out) trực tiếp ở góc trái bên dưới màn hình Nhập PIN. Sau đó, đăng nhập lại bằng Email/Google để xóa tạm thời cấu hình mã PIN rồi tạo lại mã mới.'
    },
    {
      q: 'Dữ liệu giao dịch của tôi được lưu trữ ở đâu?',
      a: 'Hệ thống lưu trữ dữ liệu tập trung trên nền tảng Firebase Firestore của Google Cloud, đảm bảo dữ liệu luôn được sao lưu trực tuyến 24/7 và đồng bộ ngay lập tức khi bạn đăng nhập tài khoản trên các thiết bị khác nhau.'
    },
    {
      q: 'Làm thế nào để đổi tháng hiển thị báo cáo ngân sách?',
      a: 'Tại màn hình "Dashboard" hoặc "Thống kê", bạn có thể nhấp chọn mốc thời gian hiển thị hoặc tạo mới ngân sách tại mục "Ngân sách tháng". Ngân sách định kỳ cũng sẽ tự động chuyển tiếp sang những tháng kế tiếp.'
    }
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSubmitting(true);
    const textSend = supportMessage;
    setSupportMessage('');

    // Simulate sending progress representation
    setTimeout(() => {
      setIsSubmitting(false);
      const currentTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      
      const newHistory = [
        ...ticketHistory,
        { sender: 'user' as const, text: textSend, time: currentTimeStr },
        { 
          sender: 'agent' as const, 
          text: `Cảm ơn bạn đã gửi tin nhắn! Tư vấn viên Finance AI đã nhận được yêu cầu hỗ trợ: "${textSend.slice(0, 30)}...". Chúng tôi sẽ kiểm tra và phản hồi lại qua hòm thư ${user?.email || 'email đăng ký'} của bạn trong vòng ít phút.`, 
          time: currentTimeStr 
        }
      ];
      setTicketHistory(newHistory);
      toast.success('Yêu cầu hỗ trợ đã được gửi thành công!');
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end p-0"
    >
      <div className="absolute inset-0" onClick={onClose}></div>

      <motion.div 
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="relative bg-slate-50 dark:bg-slate-950 w-full h-[85vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-900"
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-500/10 text-[#1DBF73] flex items-center justify-center rounded-xl">
              <DynamicIcon name="HelpCircle" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">Trợ giúp & Hỗ trợ</h2>
              <p className="text-slate-400 text-xs font-medium">Tìm giải pháp hoặc gửi thắc mắc hỗ trợ</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-755 transition-colors"
          >
            <DynamicIcon name="X" size={16} />
          </button>
        </div>

        {/* Support Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
          
          {/* FAQ Accordion Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-450 uppercase pl-1 tracking-wider">Câu hỏi thường gặp (FAQs)</h4>
            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div 
                    key={index} 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm transition-all duration-200"
                  >
                    <button 
                      onClick={() => toggleFaq(index)}
                      className="w-full p-4 flex justify-between items-center text-left gap-3 relative"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{faq.q}</span>
                      <div className={`w-5 h-5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#1DBF73]' : ''}`}>
                        <DynamicIcon name="ChevronDown" size={14} />
                      </div>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-50 dark:border-slate-850/50"
                        >
                          <p className="p-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium bg-slate-50/20 dark:bg-slate-900/10">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Live Message helper ticketing section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pl-1">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Hỗ trợ trực tuyến & Góp ý</h4>
              <span className="text-[9px] font-bold text-[#1DBF73] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF73] animate-ping"></span>
                Trực tuyến
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 shadow-sm space-y-4">
              
              {/* Chat timeline simulation */}
              {ticketHistory.length > 0 && (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 text-xs border-b border-slate-50 dark:border-slate-850/50 pb-4 hide-scrollbar">
                  {ticketHistory.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                          isUser 
                            ? 'bg-[#1DBF73] text-white rounded-tr-none' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                        }`}>
                          <p className="text-[11px] font-medium">{msg.text}</p>
                        </div>
                        <span className="text-[8px] text-slate-400 font-bold mt-1 px-1">
                          {msg.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Feed input form */}
              <form onSubmit={handleSendTicket} className="space-y-2">
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi phản hồi, lỗi hoặc tính năng bạn muốn tích hợp..."
                  rows={3}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1DBF73] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  maxLength={500}
                ></textarea>
                
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-450 font-medium">
                    {supportMessage.length}/500 ký tự
                  </span>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !supportMessage.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      supportMessage.trim() && !isSubmitting
                        ? 'bg-[#1DBF73] hover:bg-emerald-600 text-white shadow-md shadow-[#1DBF73]/10 cursor-pointer' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-850 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin"></div>
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <DynamicIcon name="Send" size={13} />
                        Gửi hỗ trợ
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
