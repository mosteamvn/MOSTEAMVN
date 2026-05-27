import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-tr from-[#1DBF73] to-[#0D9488] rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-[#1DBF73]/20">
        <div className="-rotate-12 font-black text-4xl text-white">N'</div>
      </div>
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Nabe’s all-in-one</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xs mx-auto">
          Quản lý tài chính cá nhân thông minh, minh bạch và an toàn.
        </p>
      </div>
      <button 
        onClick={login}
        className="flex items-center gap-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-full font-bold shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        Đăng nhập với Google
      </button>
    </div>
  );
}
