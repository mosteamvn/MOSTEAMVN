import { useState, useEffect } from 'react';
import { Bot, RefreshCw, Heart } from 'lucide-react';
import { Transaction } from '../types';

export const PersonalAdvisory = ({ transactions }: { transactions: Transaction[] }) => {
    const [insights, setInsights] = useState<{ analysis: string; advice: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-behavior-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions })
            });
            const data = await res.json();
            setInsights(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInsights(); }, [transactions]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200 p-4">
            <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-sm">
                <h3 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-2 mb-3">
                    <Heart size={18} /> Phân tích Tâm lý Cá nhân
                </h3>
                {loading ? (
                    <div className="text-center py-6 text-slate-400 font-bold text-sm">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                        AI đang phân tích tâm lý tài chính của bạn...
                    </div>
                ) : insights ? (
                    <>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{insights.analysis}</p>
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{insights.advice}</p>
                        </div>
                    </>
                ) : (
                   <p className="text-sm text-slate-500">Chưa có đủ dữ liệu để phân tích.</p>
                )}
                <button onClick={fetchInsights} className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline">
                    <RefreshCw size={12} /> Làm mới phân tích
                </button>
            </section>
        </div>
    );
};
