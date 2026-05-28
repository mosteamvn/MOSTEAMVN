import { Transaction, TransactionType } from '../types';

export interface DetectedPattern {
  id: string; // unique visual matching id
  note: string;
  amount: number;
  categoryId: string;
  type: TransactionType;
  frequency: 'weekly' | 'monthly' | 'bi-weekly';
  confidence: 'high' | 'medium' | 'suggested';
  matchesCount: number;
  lastDate: string;
  nextDueDate: string;
  suggestedName: string;
}

export interface RecurringTemplate {
  id: string;
  note: string;
  amount: number;
  categoryId: string;
  walletId: string;
  type: TransactionType;
  frequency: 'weekly' | 'monthly' | 'bi-weekly';
  lastCreatedDate?: string;
  nextDueDate: string;
  isActive: boolean;
  confidence: 'high' | 'medium' | 'suggested';
  createdAt: number;
}

// Clean note helper
export function cleanNote(note: string): string {
  if (!note) return '';
  return note
    .toLowerCase()
    .trim()
    .replace(/[0-9]+/g, '') // remove numbers
    .replace(/(tháng|thg|t|year|month|day|năm|quý|lan|lần|ky|kỳ)\s*[0-9]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateNextDueDate(fromLocalStr: string, frequency: 'weekly' | 'monthly' | 'bi-weekly'): string {
  const date = new Date(fromLocalStr);
  if (isNaN(date.getTime())) return new Date().toISOString();
  
  const nextDate = new Date(date);
  if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'bi-weekly') {
    nextDate.setDate(nextDate.getDate() + 14);
  } else if (frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  return nextDate.toISOString();
}

const KNOWN_KEYWORDS = [
  { keyword: 'spotify', defaultFreq: 'monthly', title: 'Gói nghe nhạc Spotify' },
  { keyword: 'netflix', defaultFreq: 'monthly', title: 'Gói xem phim Netflix' },
  { keyword: 'youtube', defaultFreq: 'monthly', title: 'YouTube Premium' },
  { keyword: 'icloud', defaultFreq: 'monthly', title: 'Dung lượng Apple iCloud' },
  { keyword: 'adobe', defaultFreq: 'monthly', title: 'Bản quyền Adobe CC' },
  { keyword: 'canva', defaultFreq: 'monthly', title: 'Tài khoản Canva Pro' },
  { keyword: 'gym', defaultFreq: 'monthly', title: 'Thẻ tập Gym định kỳ' },
  { keyword: 'rent', defaultFreq: 'monthly', title: 'Tiền thuê nhà' },
  { keyword: 'tiền nhà', defaultFreq: 'monthly', title: 'Tiền thuê nhà' },
  { keyword: 'phòng', defaultFreq: 'monthly', title: 'Tiền thuê phòng' },
  { keyword: 'internet', defaultFreq: 'monthly', title: 'Tiền mạng Internet' },
  { keyword: 'wifi', defaultFreq: 'monthly', title: 'Cước mạng Wifi' },
  { keyword: 'tiền điện', defaultFreq: 'monthly', title: 'Hóa đơn tiền điện' },
  { keyword: 'tiền nước', defaultFreq: 'monthly', title: 'Hóa đơn tiền nước' },
  { keyword: 'lương', defaultFreq: 'monthly', title: 'Khoản lương định kỳ' },
  { keyword: 'salary', defaultFreq: 'monthly', title: 'Khoản lương định kỳ' },
  { keyword: 'chatgpt', defaultFreq: 'monthly', title: 'Gói ChatGPT Plus' },
  { keyword: 'gpt', defaultFreq: 'monthly', title: 'Gói dịch vụ AI GPT' },
  { keyword: 'capcut', defaultFreq: 'monthly', title: 'Tài khoản CapCut Pro' },
  { keyword: 'vps', defaultFreq: 'monthly', title: 'Hóa đơn Cloud VPS' },
  { keyword: 'hosting', defaultFreq: 'monthly', title: 'Dịch vụ Hosting' },
  { keyword: 'ms office', defaultFreq: 'monthly', title: 'Tài khoản Office 365' },
  { keyword: 'gym', defaultFreq: 'monthly', title: 'Thẻ hội viên Gym' },
  { keyword: 'california fitness', defaultFreq: 'monthly', title: 'Hội viên Gym California' },
  { keyword: 'elite', defaultFreq: 'monthly', title: 'Gói tập Gym Elite' },
];

export function detectRecurringPatterns(transactions: Transaction[]): DetectedPattern[] {
  if (!transactions || transactions.length === 0) return [];

  const patterns: DetectedPattern[] = [];
  const groups: { [key: string]: Transaction[] } = {};

  transactions.forEach(tx => {
    const cleaned = cleanNote(tx.note);
    let groupKey = '';
    if (cleaned) {
      groupKey = `${tx.type}_${tx.categoryId}_note_${cleaned}`;
    } else {
      groupKey = `${tx.type}_${tx.categoryId}_amount_${tx.amount}`;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(tx);
  });

  for (const key of Object.keys(groups)) {
    const txs = groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (txs.length === 0) continue;

    const first = txs[0];
    const cleanedNote = cleanNote(first.note);
    const displayNote = first.note || `Giao dịch ${first.category?.name || 'không tên'}`;
    const avgAmount = txs.reduce((sum, t) => sum + t.amount, 0) / txs.length;
    
    // Check if it matches any known recurring keyword (single transaction is enough)
    const keywordMatch = KNOWN_KEYWORDS.find(k => 
      cleanedNote.includes(k.keyword) || 
      (first.note && first.note.toLowerCase().includes(k.keyword))
    );

    if (keywordMatch && txs.length === 1) {
      const lastDate = txs[txs.length - 1].date;
      patterns.push({
        id: `sugg_${first.type}_${first.categoryId}_${first.amount}_${cleanedNote || 'none'}`,
        note: first.note || keywordMatch.title,
        amount: first.amount,
        categoryId: first.categoryId,
        type: first.type,
        frequency: keywordMatch.defaultFreq as any,
        confidence: 'suggested',
        matchesCount: 1,
        lastDate,
        nextDueDate: calculateNextDueDate(lastDate, keywordMatch.defaultFreq as any),
        suggestedName: keywordMatch.title,
      });
      continue;
    }

    if (txs.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < txs.length - 1; i++) {
        const d1 = new Date(txs[i].date);
        const d2 = new Date(txs[i + 1].date);
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
      }

      const avgInterval = intervals.reduce((s, val) => s + val, 0) / intervals.length;
      
      let freq: 'weekly' | 'monthly' | 'bi-weekly' | null = null;
      let confidence: 'high' | 'medium' = 'medium';

      if (avgInterval >= 5 && avgInterval <= 10) {
        freq = 'weekly';
      } else if (avgInterval >= 11 && avgInterval <= 18) {
        freq = 'bi-weekly';
      } else if (avgInterval >= 24 && avgInterval <= 35) {
        freq = 'monthly';
      }

      if (freq) {
        const isHighlyRegular = intervals.every(interval => {
          if (freq === 'weekly') return interval >= 5 && interval <= 10;
          if (freq === 'bi-weekly') return interval >= 10 && interval <= 18;
          if (freq === 'monthly') return interval >= 24 && interval <= 35;
          return false;
        });

        if (isHighlyRegular && txs.length >= 3) {
          confidence = 'high';
        }

        const lastDate = txs[txs.length - 1].date;
        const namePrefix = freq === 'weekly' ? 'Hàng tuần' : freq === 'bi-weekly' ? '2 tuần một lần' : 'Hàng tháng';
        const suggestedName = `${namePrefix}: ${displayNote}`;

        patterns.push({
          id: `pat_${first.type}_${first.categoryId}_${Math.round(avgAmount)}_${cleanedNote || 'none'}_${freq}`,
          note: first.note || `${first.category?.name || 'Chi tiêu'}`,
          amount: Math.round(avgAmount),
          categoryId: first.categoryId,
          type: first.type,
          frequency: freq,
          confidence,
          matchesCount: txs.length,
          lastDate,
          nextDueDate: calculateNextDueDate(lastDate, freq),
          suggestedName,
        });
      }
    }
  }

  // Filter and sort by confidence
  const uniquePatterns: { [id: string]: DetectedPattern } = {};
  patterns.forEach(p => {
    uniquePatterns[p.id] = p;
  });

  return Object.values(uniquePatterns).sort((a, b) => {
    const score = { high: 3, medium: 2, suggested: 1 };
    return score[b.confidence] - score[a.confidence];
  });
}
