import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { NabeAccount, NabeAccountType, NabeMemberSlot } from '../types';
import { addNabeAccount } from '../lib/nabeApi';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export default function NabeAccountModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<NabeAccountType>('family');
  const [expiryDate, setExpiryDate] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addNabeAccount({
      name,
      type,
      expiryDate,
      ownerEmail,
      members: [],
      slotCapacity: type === 'family' ? 5 : type === 'regular' ? 1 : 0,
    });
    toast.success('Đã thêm sản phẩm');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Thêm sản phẩm mới</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-3 border rounded-lg" placeholder="Tên sản phẩm" value={name} onChange={e => setName(e.target.value)} required />
          <select className="w-full p-3 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={type} onChange={e => setType(e.target.value as NabeAccountType)}>
            <option value="family" className="text-slate-900">Family (5 slots)</option>
            <option value="regular" className="text-slate-900">Tài khoản thường (1 slot)</option>
            <option value="physical" className="text-slate-900">Sản phẩm vật chất</option>
          </select>
          <input className="w-full p-3 border rounded-lg" type="email" placeholder="Email chủ sở hữu" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required />
          <input className="w-full p-3 border rounded-lg" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#1DBF73] text-white py-3 rounded-lg font-bold hover:bg-emerald-600">
            <Save size={18} /> Lưu sản phẩm
          </button>
        </form>
      </div>
    </div>
  );
}
