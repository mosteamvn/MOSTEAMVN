import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database
const db = {
  users: [{ id: '1', name: 'Demo User', email: 'demo@example.com' }],
  wallets: [
    { id: '1', name: 'Tiền mặt', balance: 5000000, color: '#1DBF73', icon: 'Wallet' },
    { id: '2', name: 'Chuyển khoản', balance: 15000000, color: '#3b82f6', icon: 'Landmark' },
  ],
  categories: [
    { id: '1', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#f59e0b', parentId: null },
    { id: '1-1', name: 'Cà phê', type: 'expense', icon: 'Coffee', color: '#f59e0b', parentId: '1' },
    { id: '2', name: 'Mua sắm', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', parentId: null },
    { id: '3', name: 'Di chuyển', type: 'expense', icon: 'Car', color: '#3b82f6', parentId: null },
    { id: '4', name: 'Lương', type: 'income', icon: 'Coins', color: '#10b981', parentId: null },
    { id: '5', name: 'Giải trí', type: 'expense', icon: 'Film', color: '#8b5cf6', parentId: null },
    { id: '6', name: 'Sức khoẻ', type: 'expense', icon: 'Heart', color: '#ef4444', parentId: null },
    { id: '7', name: 'Hoá đơn', type: 'expense', icon: 'FileText', color: '#6366f1', parentId: null },
    { id: '8', name: 'Cho vay', type: 'debt', icon: 'ArrowRightLeft', color: '#f59e0b', parentId: null },
    { id: '9', name: 'Đi vay', type: 'debt', icon: 'ArrowRightLeft', color: '#3b82f6', parentId: null },
    { id: '10', name: 'Thu nợ', type: 'debt', icon: 'Banknote', color: '#10b981', parentId: null },
    { id: '11', name: 'Trả nợ', type: 'debt', icon: 'Wallet', color: '#ef4444', parentId: null },
  ],
  transactions: [
    { id: '1', walletId: '1', categoryId: '1', amount: 50000, date: new Date().toISOString(), note: 'Ăn trưa', type: 'expense' },
    { id: '2', walletId: '2', categoryId: '4', amount: 20000000, date: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Lương tháng', type: 'income' },
    { id: '3', walletId: '1', categoryId: '3', amount: 15000, date: new Date(Date.now() - 86400000).toISOString(), note: 'Vé xe buýt', type: 'expense' },
  ]
};

// --- API ROUTES ---

// Auth (Mock)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'mock-jwt-token-123', user: db.users[0] });
});

// Wallets
app.get('/api/wallets', (req, res) => {
  res.json(db.wallets);
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json(db.categories);
});

app.post('/api/categories', (req, res) => {
  const { name, type, icon, color, parentId } = req.body;
  const newCategory = {
    id: String(Date.now()),
    name,
    type,
    icon,
    color,
    parentId: parentId || null
  };
  db.categories.push(newCategory);
  res.json(newCategory);
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, icon, color, parentId } = req.body;
  const idx = db.categories.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.categories[idx] = { ...db.categories[idx], name, icon, color, parentId: parentId !== undefined ? parentId : db.categories[idx].parentId };
    res.json(db.categories[idx]);
  } else {
    res.status(404).json({ error: 'Category not found' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const hasChildren = db.categories.some(c => c.parentId === id);
  if (hasChildren) {
    return res.status(400).json({ error: 'Không thể xoá nhóm đang có nhóm con' });
  }
  const hasTransactions = db.transactions.some(t => t.categoryId === id);
  if (hasTransactions) {
    return res.status(400).json({ error: 'Không thể xoá nhóm đang có giao dịch' });
  }
  const idx = db.categories.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.categories.splice(idx, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Category not found' });
  }
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const transactionsWithDetails = db.transactions.map(t => {
    const category = db.categories.find(c => c.id === t.categoryId);
    const wallet = db.wallets.find(w => w.id === t.walletId);
    return { ...t, category, wallet };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(transactionsWithDetails);
});

app.post('/api/transactions', (req, res) => {
  const { walletId, categoryId, amount, date, note, type } = req.body;
  const newTx = {
    id: String(Date.now()),
    walletId, categoryId, amount: Number(amount), date, note, type
  };
  db.transactions.push(newTx);
  
  // Update wallet balance
  const wallet = db.wallets.find(w => w.id === walletId);
  if (wallet) {
    let change = type === 'income' ? Number(amount) : -Number(amount);
    if (type === 'debt') {
       change = ['9', '10'].includes(categoryId) ? Number(amount) : -Number(amount);
    }
    wallet.balance += change;
  }
  
  res.json(newTx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const txIndex = db.transactions.findIndex(t => t.id === id);
  if (txIndex > -1) {
    const tx = db.transactions[txIndex];
    // Revert wallet balance
    const wallet = db.wallets.find(w => w.id === tx.walletId);
    if (wallet) {
      let change = tx.type === 'income' ? -tx.amount : tx.amount;
      if (tx.type === 'debt') {
         change = ['9', '10'].includes(tx.categoryId) ? -tx.amount : tx.amount;
      }
      wallet.balance += change;
    }
    db.transactions.splice(txIndex, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});


// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
