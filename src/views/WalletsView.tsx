import { ArrowLeft, Plus } from 'lucide-react';
import { Wallet } from '../types';
import { formatCurrency } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';

interface WalletsViewProps {
  wallets: Wallet[];
  setActiveView: (view: any) => void;
}

export default function WalletsView({ wallets, setActiveView }: WalletsViewProps) {
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  return (
    <div className="p-5 space-y-5 flex flex-col h-full absolute inset-0 bg-slate-50 dark:bg-slate-950 z-50 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Ví của tôi</h1>
        </div>
        <button className="p-2 bg-[#1DBF73] text-white rounded-full shadow-md shadow-[#1DBF73]/30 hover:scale-105 transition-transform">
          <Plus size={18} />
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
        <p className="text-slate-400 text-sm font-medium tracking-wide">Tổng số dư</p>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          {formatCurrency(totalBalance)}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-4">
        {wallets.map(wallet => (
          <div 
            key={wallet.id} 
            className="rounded-xl p-4 text-white relative overflow-hidden shadow-md group cursor-pointer hover:shadow-lg transition-all"
            style={{ backgroundColor: wallet.color }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <DynamicIcon name={wallet.icon} size={80} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <DynamicIcon name={wallet.icon} size={20} />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">{wallet.name}</p>
                  <p className="font-bold text-lg leading-tight mt-0.5">{formatCurrency(wallet.balance)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
