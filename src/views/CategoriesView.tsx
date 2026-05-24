import { useState, useMemo } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { DynamicIcon } from '../components/DynamicIcon';
import { ViewState } from '../App';
import CategoryModal from '../components/CategoryModal';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { deleteCategory } from '../lib/api';

interface CategoriesViewProps {
  categories: Category[];
  onDataChange: () => void;
  setActiveView: (view: ViewState) => void;
}

export default function CategoriesView({ categories, onDataChange, setActiveView }: CategoriesViewProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === activeTab);
  }, [categories, activeTab]);

  const tree = useMemo(() => {
    const map = new Map<string, Category & { children: any[] }>();
    filteredCategories.forEach(c => map.set(c.id, { ...c, children: [] }));
    const roots: (Category & { children: any[] })[] = [];
    map.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(map.get(c.id)!);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [filteredCategories]);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xoá nhóm "${name}"?`)) return;
    
    try {
      await deleteCategory(id);
      toast.success('Đã xoá nhóm giao dịch');
    } catch (e: any) {
      toast.error(e.message || 'Xoá thất bại');
    }
  };

  const renderNode = (node: Category & { children: any[] }, level = 0) => {
    return (
      <div key={node.id} className="flex flex-col">
        <div className={cn(
          "flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800",
          level > 0 ? "pl-14" : ""
        )}>
          <div className="flex items-center gap-3">
            {level > 0 && <div className="w-4 h-px bg-slate-200 dark:bg-slate-700 -ml-8"></div>}
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${node.color}15`, color: node.color }}
            >
              <DynamicIcon name={node.icon} size={20} />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{node.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleEdit(node)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <DynamicIcon name="Pencil" size={16} />
            </button>
            <button 
              onClick={() => handleDelete(node.id, node.name)}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"
            >
              <DynamicIcon name="Trash2" size={16} />
            </button>
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 ml-8">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-5 space-y-5 flex flex-col h-full absolute inset-0 bg-slate-50 dark:bg-slate-950 z-50 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('profile')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Nhóm giao dịch</h1>
        </div>
        <button onClick={handleAdd} className="p-2 bg-[#1DBF73] text-white rounded-full shadow-md shadow-[#1DBF73]/30 hover:scale-105 transition-transform">
          <Plus size={18} />
        </button>
      </header>

      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
        <button
          onClick={() => setActiveTab('expense')}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === 'expense' ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
          )}
        >
          Chi tiêu
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === 'income' ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
          )}
        >
          Thu nhập
        </button>
        <button
          onClick={() => setActiveTab('debt')}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === 'debt' ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
          )}
        >
          Vay/Nợ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mx-5 px-5 pb-20">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {tree.length > 0 ? (
            tree.map(node => renderNode(node))
          ) : (
            <div className="p-8 text-center text-slate-400 font-medium text-sm">
              Chưa có nhóm {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'} nào
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CategoryModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          category={editingCategory}
          type={activeTab}
          categories={categories}
          onSuccess={() => {
            setIsModalOpen(false);
            onDataChange();
          }} 
        />
      )}
    </div>
  );
}
