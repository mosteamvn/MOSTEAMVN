import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Delete, Lock, ShieldAlert, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';

interface PinLockViewProps {
  mode: 'unlock' | 'setup' | 'change' | 'disable';
  onUnlock?: () => void;
  onSuccess?: (pin?: string) => void;
  onCancel?: () => void;
}

export default function PinLockView({ mode, onUnlock, onSuccess, onCancel }: PinLockViewProps) {
  const { user, logout } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [step, setStep] = useState<number>(1); // For setup / change flows
  const [firstPin, setFirstPin] = useState<string>(''); // For setup / change confirmation
  const [oldPinVerified, setOldPinVerified] = useState<boolean>(false); // For change flow
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const storedPinKey = user ? `app_pin_${user.uid}` : 'app_pin_generic';
  const savedPin = localStorage.getItem(storedPinKey) || '';

  // Trigger error shake feedback
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Check PIN completion
  useEffect(() => {
    if (pin.length === 4) {
      const timer = setTimeout(() => {
        handlePinSubmit(pin);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const handlePinSubmit = async (enteredPin: string) => {
    if (mode === 'unlock') {
      if (enteredPin === savedPin) {
        toast.success('Mở khóa thành công!');
        if (onUnlock) onUnlock();
      } else {
        toast.error('Mã PIN không chính xác!');
        triggerShake();
      }
    } else if (mode === 'setup') {
      if (step === 1) {
        setFirstPin(enteredPin);
        setPin('');
        setStep(2);
      } else if (step === 2) {
        if (enteredPin === firstPin) {
          localStorage.setItem(storedPinKey, enteredPin);
          toast.success('Thiết lập mã PIN thành công!');
          if (onSuccess) onSuccess(enteredPin);
        } else {
          toast.error('Nhập lại mã PIN không trùng khớp!');
          triggerShake();
          setStep(1); // Reset back to step 1
        }
      }
    } else if (mode === 'change') {
      if (!oldPinVerified) {
        if (enteredPin === savedPin) {
          setOldPinVerified(true);
          setPin('');
          setStep(1); // Set to new PIN entering step
          toast.success('Xác minh PIN cũ thành công!');
        } else {
          toast.error('Mã PIN cũ không chính xác!');
          triggerShake();
        }
      } else {
        // Now entering and confirming new PIN
        if (step === 1) {
          setFirstPin(enteredPin);
          setPin('');
          setStep(2);
        } else if (step === 2) {
          if (enteredPin === firstPin) {
            localStorage.setItem(storedPinKey, enteredPin);
            toast.success('Đổi mã PIN thành công!');
            if (onSuccess) onSuccess(enteredPin);
          } else {
            toast.error('Nhập lại mã PIN không trùng khớp!');
            triggerShake();
            setStep(1);
          }
        }
      }
    } else if (mode === 'disable') {
      if (enteredPin === savedPin) {
        localStorage.removeItem(storedPinKey);
        toast.success('Đã tắt khóa mã PIN!');
        if (onSuccess) onSuccess();
      } else {
        toast.error('Mã PIN không chính xác!');
        triggerShake();
      }
    }
  };

  // Determine screen header labels dynamically
  let title = 'Mã PIN bảo mật';
  let subtitle = 'Nhập mã PIN để tiếp tục';

  if (mode === 'unlock') {
    title = 'Chào mừng quay trở lại';
    subtitle = 'Nhập mã PIN để mở khóa ứng dụng';
  } else if (mode === 'setup') {
    if (step === 1) {
      title = 'Thiết lập mã PIN';
      subtitle = 'Tạo mã PIN gồm 4 chữ số để bảo vệ dữ liệu';
    } else {
      title = 'Xác nhận mã PIN';
      subtitle = 'Nhập lại mã PIN để xác nhận';
    }
  } else if (mode === 'change') {
    if (!oldPinVerified) {
      title = 'Thay đổi mã PIN';
      subtitle = 'Nhập mã PIN hiện tại để tiếp tục';
    } else {
      if (step === 1) {
        title = 'Mã PIN mới';
        subtitle = 'Nhập mã PIN gồm 4 chữ số mới';
      } else {
        title = 'Xác nhận mã PIN mới';
        subtitle = 'Nhập lại mã PIN mới để xác nhận';
      }
    }
  } else if (mode === 'disable') {
    title = 'Tắt bảo mật mã PIN';
    subtitle = 'Nhập mã PIN hiện tại của bạn';
  }

  // Handle Cancel / Go Back
  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleLogoutClick = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
      try {
        await logout();
        toast.success('Đã đăng xuất!');
      } catch (err: any) {
        toast.error('Lỗi khi đăng xuất: ' + err.message);
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950 text-white flex flex-col items-center justify-between z-50 p-6 select-none font-sans">
      
      {/* Dynamic Header Actions */}
      <div className="w-full flex justify-between items-center h-12">
        {onCancel ? (
          <button 
            type="button"
            onClick={handleCancelClick}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Hủy
          </button>
        ) : (
          <div className="w-8"></div>
        )}

        <div className="flex items-center gap-1 text-[#1DBF73] bg-[#1DBF73]/10 px-3 py-1 rounded-full text-xs font-bold border border-[#1DBF73]/20">
          <ShieldCheck size={14} />
          Mã hóa thiết bị
        </div>

        <div className="w-8"></div>
      </div>

      {/* Main Lock Content */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-xs space-y-8">
        
        {/* Dynamic Display Lock/Key Indicator */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#1DBF73]/10 text-[#1DBF73] border border-[#1DBF73]/20 flex items-center justify-center shadow-lg shadow-[#1DBF73]/10">
            {mode === 'unlock' ? (
              <Lock size={28} className="animate-pulse" />
            ) : mode === 'setup' || mode === 'change' ? (
              <ShieldCheck size={28} />
            ) : (
              <ShieldAlert size={28} className="text-rose-500" />
            )}
          </div>
          <div className="text-center space-y-1 mt-2">
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">{title}</h1>
            <p className="text-slate-400 text-xs font-medium max-w-[240px] leading-relaxed mx-auto">
              {subtitle}
            </p>
          </div>
        </div>

        {/* PIN Entry Indicators with optional custom shaking animation */}
        <motion.div 
          animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center gap-5 my-6 py-2"
        >
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <div key={index} className="relative">
                <motion.div 
                  initial={false}
                  animate={{
                    scale: hasValue ? 1.2 : 1,
                  }}
                  className={`w-4-half h-4-half rounded-full border-2 transition-colors duration-200 ${
                    hasValue 
                      ? 'bg-[#1DBF73] border-[#1DBF73] shadow-lg shadow-[#1DBF73]/30' 
                      : 'border-slate-700 bg-slate-900'
                  }`}
                  style={{ width: '18px', height: '18px' }}
                />
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Numerical Custom Grid Numpad */}
      <div className="w-full max-w-xxs pb-8 space-y-4">
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center">
          {[
            { num: '1', letters: ' ' },
            { num: '2', letters: 'ABC' },
            { num: '3', letters: 'DEF' },
            { num: '4', letters: 'GHI' },
            { num: '5', letters: 'JKL' },
            { num: '6', letters: 'MNO' },
            { num: '7', letters: 'PQRS' },
            { num: '8', letters: 'TUV' },
            { num: '9', letters: 'WXYZ' }
          ].map((item) => (
            <motion.button
              key={item.num}
              onClick={() => handleKeyPress(item.num)}
              whileTap={{ scale: 0.92 }}
              className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex flex-col justify-center items-center hover:bg-slate-800 active:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="text-2xl font-bold tracking-tight text-white">{item.num}</span>
              <span className="text-[8px] tracking-wider text-slate-500 uppercase -mt-1 select-none font-bold">
                {item.letters}
              </span>
            </motion.button>
          ))}

          {/* Special Buttons Bottom Row */}
          {/* Bottom Left Button (e.g. Logout in unlock mode, otherwise blank) */}
          {mode === 'unlock' ? (
            <motion.button
              onClick={handleLogoutClick}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 flex flex-col justify-center items-center transition-colors cursor-pointer group"
              title="Đăng xuất"
            >
              <LogOut size={20} className="text-rose-400 group-hover:text-rose-300" />
              <span className="text-[8px] text-rose-400 uppercase font-bold mt-1 tracking-wide">Đăng xuất</span>
            </motion.button>
          ) : (
            <div className="w-16 h-16" />
          )}

          {/* Number 0 */}
          <motion.button
            onClick={() => handleKeyPress('0')}
            whileTap={{ scale: 0.92 }}
            className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex flex-col justify-center items-center hover:bg-slate-800 active:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="text-2xl font-bold tracking-tight text-white">0</span>
            <span className="text-[8px] tracking-wider text-slate-500 uppercase -mt-1 select-none font-bold">
              +
            </span>
          </motion.button>

          {/* Backspace Delete Button */}
          <motion.button
            onClick={handleDelete}
            whileTap={{ scale: 0.95 }}
            className={`w-16 h-16 rounded-full bg-slate-900/30 border border-slate-850/50 flex flex-col justify-center items-center transition-colors cursor-pointer hover:bg-slate-800 ${
              pin.length > 0 ? 'text-white' : 'text-slate-600'
            }`}
            disabled={pin.length === 0}
          >
            <Delete size={22} />
            <span className="text-[8px] text-slate-500 uppercase font-bold mt-1 tracking-wide">Xóa</span>
          </motion.button>
        </div>
      </div>

    </div>
  );
}
