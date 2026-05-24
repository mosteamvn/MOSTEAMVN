import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import * as icons from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  type: TransactionType;
  categories: Category[];
  onSuccess: () => void;
}

const COMMON_ICONS = [
  'Utensils', 'Coffee', 'ShoppingBag', 'ShoppingCart', 'Car', 'Bus', 'Train', 
  'Plane', 'Home', 'Smartphone', 'Monitor', 'Gamepad', 'Headphones', 'Book',
  'GraduationCap', 'Heart', 'Activity', 'Pill', 'Scissors', 'Shirt', 'Briefcase',
  'FileText', 'CreditCard', 'Coins', 'PiggyBank', 'Gift', 'Smile', 'Star'
];

const COMMON_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#78716c'
];

export default function CategoryModal({ isOpen, onClose, category, type, categories, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Circle');
  const [color, setColor] = useState('#64748b');
  const [parentId, setParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setParentId(category.parentId || '');
    } else {
      setName('');
      setIcon(COMMON_ICONS[0]);
      setColor(COMMON_COLORS[0]);
      setParentId('');
    }
  }, [category]);

  if (!isOpen) return null;

  const validParents = categories.filter(c => c.type === type && c.id !== category?.id && !c.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên nhóm');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        icon,
        color,
        parentId: parentId || null
      };

      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(category ? 'Lưu thay đổi thành công' : 'Thêm nhóm thành công');
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      toast.error('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-bottom-full duration-300">
      <header className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {category ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
        </h2>
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500">
          <X size={20} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Preview */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 w-full">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg transition-colors"
              style={{ backgroundColor: `${color}20`, color: color, boxShadow: `0 8px 20px -5px ${color}40` }}
            >
              <DynamicIcon name={icon} size={32} />
            </div>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tên nhóm..."
              className="text-xl font-bold bg-transparent text-center text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 w-full"
              autoFocus
            />
          </div>
        </div>

        {/* Parent Category */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Nhóm cha (Tuỳ chọn)</label>
          <select 
            value={parentId}
            onChange={e => setParentId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl outline-none font-medium appearance-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          >
            <option value="">-- Không có --</option>
            {validParents.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Màu sắc</label>
          <div className="flex flex-wrap gap-3">
            {COMMON_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                  color === c ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-200 dark:ring-slate-700 scale-110" : ""
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Icons */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Biểu tượng</label>
          <div className="grid grid-cols-7 gap-2">
            {COMMON_ICONS.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={cn(
                  "flex items-center justify-center p-2.5 rounded-xl transition-colors",
                  icon === i ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "bg-slate-50 text-slate-500 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <DynamicIcon name={i} size={22} />
              </button>
            ))}
          </div>
        </div>

        <div className="h-6"></div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-4 border-t border-slate-50 dark:border-slate-800 z-10 w-full mt-auto">
          <button 
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: color, boxShadow: `0 8px 20px -5px ${color}60` }}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] shadow-lg transition-transform active:scale-95 disabled:opacity-70"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu nhóm giao dịch'}
          </button>
        </div>
      </form>
    </div>
  );
}
