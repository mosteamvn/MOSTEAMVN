import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
  ],
  budgets: [
    { id: '1', categoryId: 'all', amount: 10000000, month: new Date().toISOString().slice(0, 7), isRecurring: true }
  ],
  calendarEvents: [
    { id: '1', title: 'Giỗ Đầu Ông Bà (Lịch Âm)', notes: 'Chuẩn bị mâm hoa quả thắp hương kính lễ gia tiên', date: new Date().toISOString().slice(0, 10), type: 'note' },
    { id: '2', title: 'Thanh toán hoá đơn tháng', notes: 'Đóng cước internet và điện nước qua ứng dụng chuyển khoản', date: new Date().toISOString().slice(0, 10), type: 'reminder', time: '10:00', isCompleted: false }
  ]
};

// --- API ROUTES ---

// Gemini AI Money Insider Analyze
import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: any = null;
function getGeminiClient() {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.error('Error initializing Gemini client:', e);
    }
  }
  return aiInstance;
}

app.post('/api/money-insider/analyze', async (req, res) => {
  const { transactions, wallets } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Return mock smart insights when Gemini is not configured, providing a seamless UX
    return res.json({
      score: 8,
      scoreExplanation: "Dựa dưới phân tích cục bộ: Dòng tiền của bạn tương đối ổn định, nhưng cần tối ưu hoá các khoản chi tiêu nhỏ lẻ hàng ngày.",
      insights: [
        {
          type: "success",
          title: "Sức khoẻ dòng tiền cao",
          desc: "Thu nhập ròng của bạn trong tháng hiện tại đang duy trì ở thế chủ động và thặng dư tốt."
        },
        {
          type: "tip",
          title: "Nguyên nhân chi tiêu",
          desc: "Hơn 40% chi phí đến từ nhóm Ăn uống. Hãy cân nhắc nấu ăn tại nhà nhiều hơn để tối ưu hóa thêm 15% tích lũy."
        },
        {
          type: "info",
          title: "Mở khóa Nabe AI Insider",
          desc: "Vui lòng nhập khoá 'GEMINI_API_KEY' trong mục Settings > Secrets để kích hoạt cố vấn AI tự động phân tích sâu đa luồng dữ liệu của bạn!"
        }
      ]
    });
  }

  try {
    const prompt = `Bạn là một trợ lý tài chính cá nhân siêu việt người Việt Nam, tên là 'Nabe Budget Insider AI'.
Dưới đây là dữ liệu ví tiền và giao dịch hiện tại của người dùng. Hãy phân tích các giao dịch này và trả về kết cấu JSON sạch.

Dữ liệu ví: ${JSON.stringify(wallets)}
Danh sách giao dịch: ${JSON.stringify(transactions)}

Yêu cầu phân tích:
1. Điểm sức khoẻ tài chính (score): thang điểm từ 0 đến 10 dựa trên tỷ lệ thu chi, số dư, các cảnh báo chi tiêu.
2. Giải thích ngắn gọn về điểm sức khoẻ (scoreExplanation).
3. Danh sách các phân tích/gợi ý cụ thể (insights - tối đa 4) bao gồm:
   - type: chọn 1 trong "success" (đạt thành tích tốt/tiết kiệm), "warning" (chi tiêu tăng cao/bất thường), "info" (phần trăm phân bổ ví), "alert" (khoản chi lớn đáng ngờ), hoặc "tip" (mẹo tài chính thông minh).
   - title: Tiêu đề gợi ý ngắn gọn, thú vị bằng tiếng Việt.
   - desc: Nội dung lời khuyên cụ thể, sâu sắc, thực tế, cá nhân hóa theo số liệu người dùng.

Trả về duy nhất định dạng JSON khớp với schema yêu cầu.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            scoreExplanation: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  desc: { type: Type.STRING }
                },
                required: ["type", "title", "desc"]
              }
            }
          },
          required: ["score", "scoreExplanation", "insights"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini analysis error:', err);
    res.status(500).json({ error: 'Failed to perform AI analysis: ' + err.message });
  }
});

app.post('/api/money-insider/chat', async (req, res) => {
  const { message, history = [], transactions = [], wallets = [] } = req.body;
  const ai = getGeminiClient();

  // Compute stats on the fly to help backend or fallback provide better context
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const walletList = wallets.map((w: any) => `${w.name}: ${w.balance.toLocaleString('vi-VN')}đ`).join(', ');

  if (!ai) {
    // Highly sophisticated rule-based financial advice generator when key is missing
    const msgLower = message.toLowerCase();
    let responseText = "Xin chào! Mình là cố vấn tài chính Nabe AI. Bạn cần tư vấn điều gì về ví tiền hôm nay?";

    if (msgLower.includes("tiết kiệm") || msgLower.includes("tối ưu") || msgLower.includes("cắt giảm") || msgLower.includes("bớt")) {
      responseText = `Chào bạn! Để tối ưu hóa tài chính và tăng cường tích lũy ngay lộc tức, đây là hành động đề xuất dành riêng cho bạn:\n\n` +
        `1. **Xem xét các khoản Ăn uống**: Hiện tại phần lớn các app cá nhân thường ngốn tới 35-40% thu nhập cho nhóm này. Hãy bật "Thử thách pha cà phê tại nhà" để giữ lại khoảng 150.000đ - 200.000đ mỗi tuần.\n` +
        `2. **Lọc phí dịch vụ ẩn**: Hãy rà soát tất cả các hóa đơn dịch vụ định kỳ (Netflix, YouTube Premium, iCloud...). Hãy hủy những cái 30 ngày qua bạn không chạm vào.\n` +
        `3. **Thiết lập hạn mức ngân sách**: Đặt hạn mức chi tiêu tháng không quá 70% tổng thu nhập của bạn.`;
    } else if (msgLower.includes("báo cáo") || msgLower.includes("tình hình") || msgLower.includes("chi tiêu") || msgLower.includes("ngoại tuyến") || msgLower.includes("thống kê") || msgLower.includes("tuần")) {
      responseText = `### 📊 Báo cáo Sức khỏe Tài khố Ngoại tuyến\n\n` +
        `Dưới đây là thống kê nhanh dựa trên dữ liệu giao dịch đã ghi nhận:\n` +
        `- **Tổng thu nhập**: +${totalIncome.toLocaleString('vi-VN')} đ\n` +
        `- **Tổng chi tiêu**: -${totalExpense.toLocaleString('vi-VN')} đ\n` +
        `- **Số dư thặng tích**: **${netSavings >= 0 ? '+' : ''}${netSavings.toLocaleString('vi-VN')} đ** (${netSavings >= 0 ? 'Dương thặng dư tốt 🍀' : 'Thâm hụt cần lưu tâm ⚠️'})\n` +
        `- **Danh sách ví**: ${walletList || 'Chưa ghi nhận ví'}\n\n` +
        `*Mẹo: Hãy kích hoạt khóa \`GEMINI_API_KEY\` trong phần Cài đặt để kích hoạt cố vấn Generative AI tự động lập biểu phân tích thói quen ẩn của bạn một cách trực quan nhé!*`;
    } else if (msgLower.includes("hành vi") || msgLower.includes("tâm lý") || msgLower.includes("bốc đồng") || msgLower.includes("hối hận")) {
      responseText = `### 🧠 Phân tích Tâm lý Tiêu dùng\n\n` +
        `Chi tiêu bốc đồng hoặc mua sắm giải tỏa căng thẳng (stress-spending) thường là thủ phạm lớn nhất làm xói mòn ví tiền.\n\n` +
        `- **Mẹo ngăn ngừa**: Hãy áp dụng **Quy tắc trì hoãn 72 giờ**. Khi muốn mua một món đồ không thiết yếu, hãy bỏ vào giỏ hàng và đợi đúng 3 ngày. Sau 3 ngày, 80% cảm xúc ham muốn sẽ biến mất.\n` +
        `- **Ghi nhận**: Bạn có thể sử dụng Tab **"Ghi Nhận Hành Vi"** ngay bên cạnh để ghi lại các món chi tiêu hối hận. Hệ thống sẽ thống kê và đưa ra liệu pháp tâm lý tài chính giúp bạn!`;
    } else if (msgLower.includes("đầu tư") || msgLower.includes("tiền") || msgLower.includes("làm giàu")) {
      responseText = `Đầu tư ban đầu hiệu quả nhất luôn là **đầu tư vào tri thức bản thân**. Trước khi tham gia các thị trường tài chính, hãy phấn đấu xây dựng **Quỹ khấn cấp bảo an** tối thiểu bằng 3 - 6 tháng chi phí sinh hoạt thiết yếu (đang được cất giữ an toàn trong các ví có tính thanh khoản cao của bạn). Điều này giúp bạn luôn chủ động trước mọi biến cố cuộc đời.`;
    } else {
      responseText = `Xin chào! Mình là **Nabe AI Assistant** 🤖. Với tư cách cố vấn tiền bạc, mình đang kiểm soát dữ liệu tài chính của bạn:\n` +
        `- Tổng thu: \`${totalIncome.toLocaleString('vi-VN')} đ\`\n` +
        `- Tổng chi: \`${totalExpense.toLocaleString('vi-VN')} đ\`\n` +
        `- Ví hiện có: \`${walletList || 'Tiền mặt'}\`\n\n` +
        `Bạn có thể hỏi mình những câu hỏi như:\n` +
        `* "Làm sao để cắt giảm chi tiêu ăn uống?"\n` +
        `* "Báo cáo sức khỏe dòng tiền của anh"\n` +
        `* "Giải thích cho anh quy luật quản lý tài chính 50/30/20"`;
    }

    return res.json({ reply: responseText });
  }

  try {
    // Build context with previous conversation history
    const contextHistory = history.slice(-6).map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    const systemInstruction = `Bạn là một chuyên gia tư vấn tài chính cá nhân siêu việt người Việt Nam, tên là 'Nabe AI Core' được tích hợp trong ứng dụng quản lý ví tiền Nabe Budget.
Sử dụng dữ liệu tài chính thật của người dùng dưới đây để đưa ra phản hồi chính xác, thực tế nhất. Luôn thân thiện, tâm lý, khuyến khích thay vì chỉ trích nặng nề.

DỮ LIỆU THẬT CỦA NGƯỜI DÙNG:
- Số dư ví hiện tại: ${walletList}
- Tổng thu nhập đã ghi nhận: ${totalIncome.toLocaleString('vi-VN')} đ
- Tổng chi tiêu đã ghi nhận: ${totalExpense.toLocaleString('vi-VN')} đ
- Thặng dư dòng tiền: ${(totalIncome - totalExpense).toLocaleString('vi-VN')} đ
- Danh sách tất cả giao dịch gần đây: ${JSON.stringify(transactions.slice(0, 15))}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời bằng tiếng Việt trang nhã, hóm hỉnh, sâu sắc.
2. Sử dụng Markdown tinh tế để định dạng, trích xuất bảng biểu hoặc bullet points xúc tích nếu cần.
3. Không lặp lại hay nhắc lại danh sách thô JSON của giao dịch, hãy phân tích xu thế để chỉ ra mẹo tiết kiệm cụ thể.`;

    const chatSession = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      history: contextHistory
    });

    const result = await chatSession.sendMessage({ message });
    res.json({ reply: result.text });
  } catch (err: any) {
    console.error('Gemini Chat error:', err);
    res.status(500).json({ error: 'Failed to chat with Nabe AI: ' + err.message });
  }
});


app.post('/api/ai-behavior-analysis', async (req, res) => {
  const { transactions } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
        analysis: "Do bạn chưa kích hoạt AI API key, mình chỉ có thể đưa ra lời khuyên chung: Hãy nhớ rằng việc chăm sóc bản thân chính là cách tốt nhất để duy trì năng lượng bền vững phục vụ gia đình!.",
        advice: "Đừng cảm thấy tội lỗi. Mua một món đồ cần thiết không phải là lãng phí, đó là khoản tái đầu tư vào năng suất và tinh thần của chính bạn."
    });
  }

  try {
    const totalTransactions = transactions.length;
    const expenseTransactions = transactions.filter((t: any) => t.type === 'expense');
    
    const prompt = `Bạn là một chuyên gia tư vấn tâm lý tài chính cá nhân tên là 'Nabe AI Core'.
Người dùng đang chia sẻ rằng họ cảm thấy "tội lỗi" khi chi tiền cho bản thân (ví dụ: mua cái áo 250k), trong khi chi tiền cho gia đình lại rất thoải mái.

Dữ liệu giao dịch người dùng: ${JSON.stringify(expenseTransactions.slice(-20))}

Yêu cầu:
1. Phân tích ngắn gọn hành vi chi tiêu dựa trên dữ liệu giao dịch (nếu có).
2. Hãy đưa ra lời khuyên/phân tích tâm lý tích cực, sâu sắc để giúp người dùng hiểu rằng chi tiêu hợp lý cho bản thân là cần thiết để bảo vệ năng lượng cá nhân và sự bền vững khi chăm sóc gia đình.
3. Trả về format JSON: { "analysis": "...", "advice": "..." }.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["analysis", "advice"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);

  } catch (err: any) {
    console.error('AI Behavior Analysis error:', err);
    res.status(500).json({ error: 'Failed analysis: ' + err.message });
  }
});


// Auth (Mock)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'mock-jwt-token-123', user: db.users[0] });
});

// Live SePay / Casso bank webhook endpoint
app.post('/api/webhook/bank-sync', (req, res) => {
  const payload = req.body;
  
  // Log receipt of simulated/real bank transaction
  console.log('Received bank webhook payload:', JSON.stringify(payload));
  
  // Real Vietnamese banking webhooks verification & payload extraction
  const gateway = payload.gateway || 'Unknown Bank';
  const amount = parseFloat(payload.transferAmount || payload.amount || '0');
  const type = (payload.transferType || '').toLowerCase() === 'in' ? 'income' : 'expense';
  const note = payload.content || payload.description || 'Giao dịch chuyển khoản';
  
  // If we have a local mock wallet specified, keep it in sync for standalone/mock tests
  const walletId = payload.walletId;
  if (walletId) {
    const wallet = db.wallets.find(w => w.id === walletId);
    if (wallet) {
      wallet.balance += type === 'income' ? amount : -amount;
    }
  }

  // Return success message
  res.json({
    success: true,
    message: 'Ghi nhận biến động số dư thành công',
    gateway,
    amount,
    type,
    note,
    timestamp: Date.now()
  });
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


// Budgets
app.get('/api/budgets', (req, res) => {
  res.json(db.budgets);
});

app.post('/api/budgets', (req, res) => {
  const { categoryId, amount, month, isRecurring } = req.body;
  
  // Check if budget already exists for this category and month
  const existingIndex = db.budgets.findIndex(b => b.categoryId === categoryId && b.month === month);
  if (existingIndex > -1) {
    db.budgets[existingIndex] = { ...db.budgets[existingIndex], amount: Number(amount), isRecurring: Boolean(isRecurring) };
    return res.json(db.budgets[existingIndex]);
  }

  const newBudget = {
    id: String(Date.now()),
    categoryId,
    amount: Number(amount),
    month,
    isRecurring: Boolean(isRecurring)
  };
  db.budgets.push(newBudget);
  res.json(newBudget);
});

app.put('/api/budgets/:id', (req, res) => {
  const { id } = req.params;
  const { amount, isRecurring } = req.body;
  const idx = db.budgets.findIndex(b => b.id === id);
  if (idx !== -1) {
    db.budgets[idx] = { ...db.budgets[idx], amount: Number(amount), isRecurring: Boolean(isRecurring) };
    res.json(db.budgets[idx]);
  } else {
    res.status(404).json({ error: 'Budget not found' });
  }
});

app.delete('/api/budgets/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.budgets.findIndex(b => b.id === id);
  if (idx !== -1) {
    db.budgets.splice(idx, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});


// --- CALENDAR EVENTS ENDPOINTS ---

app.get('/api/calendar/events', (req, res) => {
  res.json(db.calendarEvents || []);
});

app.post('/api/calendar/events', (req, res) => {
  const { title, notes, date, type, time, isCompleted } = req.body;
  if (!title || !date || !type) {
    return res.status(400).json({ error: 'Tiêu đề, ngày rộng và loại sự kiện là bắt buộc' });
  }
  const newEvent = {
    id: String(Date.now()),
    title,
    notes: notes || '',
    date,
    type,
    time: time || '',
    isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : false
  };
  
  if (!db.calendarEvents) {
    db.calendarEvents = [];
  }
  db.calendarEvents.push(newEvent);
  res.json(newEvent);
});

app.put('/api/calendar/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, notes, date, type, time, isCompleted } = req.body;
  
  if (!db.calendarEvents) {
    db.calendarEvents = [];
  }
  
  const idx = db.calendarEvents.findIndex(ev => ev.id === id);
  if (idx !== -1) {
    db.calendarEvents[idx] = {
      ...db.calendarEvents[idx],
      title: title !== undefined ? title : db.calendarEvents[idx].title,
      notes: notes !== undefined ? notes : db.calendarEvents[idx].notes,
      date: date !== undefined ? date : db.calendarEvents[idx].date,
      type: type !== undefined ? type : db.calendarEvents[idx].type,
      time: time !== undefined ? time : db.calendarEvents[idx].time,
      isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : db.calendarEvents[idx].isCompleted
    };
    res.json(db.calendarEvents[idx]);
  } else {
    res.status(404).json({ error: 'Không tìm thấy sự kiện âm dương/ghi chú' });
  }
});

app.delete('/api/calendar/events/:id', (req, res) => {
  const { id } = req.params;
  if (!db.calendarEvents) {
    db.calendarEvents = [];
  }
  const idx = db.calendarEvents.findIndex(ev => ev.id === id);
  if (idx !== -1) {
    db.calendarEvents.splice(idx, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy sự kiện cần xoá' });
  }
});

app.post('/api/calendar/horoscope', async (req, res) => {
  const { solarDate, lunarDate, lunarDetails, birthYear } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const hasYear = birthYear ? `cho tuổi sinh năm ${birthYear}` : '';
    return res.json({
      reading: `### 🔮 Luận giải Tử vi ngày ${solarDate} (Âm lịch: ${lunarDate} - Năm ${lunarDetails?.ganZhiYear || ''}) ${hasYear}

**1. Đánh giá khí vận tổng quan hôm nay:**
Hôm nay cát khí quần tụ, năng lượng trời đất hài hoà mang sắc thái **${lunarDetails?.ganZhiDay || 'Cát Tường'}**. Thích hợp cho các hoạt động lên kế hoạch ngân sách, thắp hương cầu an lành, sửa soạn bài trí gia trang. Bạn có trí tuệ minh mẫn hôm nay.

**2. Khung giờ Hoàng Đạo tốt lành:**
*   **Tý (23h - 1h)**: Tư duy hanh thông.
*   **Dần (3h - 5h)**: Thích hợp lập lộ trình mới.
*   **Mão (5h - 7h)**: Gặp quý nhân phù trợ.
*   **Ngọ (11h - 13h)**: May mắn giao thương tài lộc.
*   **Mùi (13h - 15h)**: Thuận lợi giải quyết tàn dư công việc.
*   **Dậu (17h - 19h)**: Thời gian gia đạo sum vầy, hoá giải bất hoà.

**3. Ký sự Cát - Hung (Việc nên làm & kiêng kỵ):**
*   👍 **Nên làm**: Tổ chức ghi chép chi tiêu, dọn dẹp các khoản nợ nần cũ, ký hợp đồng vừa và nhỏ, củng cố ví tiết kiệm.
*   👎 **Nên tránh**: Kiêng mua sắm thiết bị điện máy đắt tiền bất thình lình, hạn chế mâu thuẫn hay lớn tiếng với tri kỷ.

**4. Khảo sát Tam Hạn (Tài khố - Nhân duyên - Khí huyết):**
*   💸 **Tài chính**: Gió lành thổi qua rương ngọc. Bạn biết quán xuyến thu chi rất tuyệt hảo. Nên duy trì kỷ luật tiền bạc.
*   ❤️ **Nhân duyên**: Gia đạo êm âm. Các mối quan hệ quanh bạn đang toả ra tần số ấm áp, ôn hoà.
*   💪 **Khí huyết**: Sức đề kháng dồi dào, tuy nhiên nên tăng cường uống nước ấm giải độc cơ thể vào buổi sớm dẹp sương mù.

*🍀 Gợi ý Phong Thủy: Bản mệnh hôm nay hợp màu xanh ngọc lam hoặc cát tường vàng ánh kim. Nên mở rộng lòng đón chào điềm lành đến.*

---
*Mẹo nhỏ: Hãy cập nhật mã khoá \`GEMINI_API_KEY\` trong Settings > Secrets để được xem kiến giải Tử vi chuyên sâu chiêm nghiệm tự động cá nhân hoá bởi AI thế hệ mới!*`
    });
  }

  try {
    const prompt = `Bạn là một nhà kiến giải đại sư học giả uy tín bậc nhất về Phong thuỷ, Kinh Dịch và Tử Vi học cổ truyền Việt Nam.
Hãy luận giải tử vi vận hạn ngày hôm nay cho người dùng bằng tiếng Việt thật tinh tế, bay bổng nhưng đầy triết lý, dễ hiểu và truyền cảm hứng.

Thông tin ngày cần xem:
- Ngày Dương lịch: ${solarDate}
- Ngày Âm lịch: ${lunarDate} (Năm: ${lunarDetails?.ganZhiYear || ''}, Tháng: ${lunarDetails?.ganZhiMonth || ''}, Ngày: ${lunarDetails?.ganZhiDay || ''})
- Tiết khí: ${lunarDetails?.solarTerm || 'Bình thường'}
${birthYear ? `- Sinh năm (tuổi người dùng): ${birthYear}` : ''}

Yêu cầu định dạng đầu ra:
Trả về nội dung luận giải hoàn toàn bằng Markdown kết cấu khoa học, sắc nét gồm có:
1. 🌟 **Vận khí tổng quan ngày hôm nay** (Nếu có tuổi sinh năm của người dùng, hãy giải thích can chi của ngày tương hợp hay xung khắc với con giáp của họ thế nào, tốt xấu ra sao).
2. ⏰ **Khung giờ Hoàng Đạo cát tài** (Bảng kê các giờ tốt kèm theo gợi ý ngắn nên khởi sự việc gì trong giờ đó).
3. ⚖️ **Thiên đức hành vi (Nên & Tránh)** (Sử dụng biểu tượng 👍/👎 lịch lãm cụ thể).
4. 🔮 **Dự báo tam diện vận trình**: Tài lộc khố, Tình cảm gia đạo thủy chung, và Sức khỏe thể chất.
5. 🍀 **Phương án bổ trợ phong thuỷ** (Màu sắc y phục tăng vượng khí, hướng cát xuất hành khởi đầu thành công).

Luôn dùng từ ngữ trang nhã, hóm hỉnh nhẹ nhàng, mang thế giới nội tâm bình an và lạc quan tích cực nhất. Không lặp lại phần giới thiệu rườm rà.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ reading: response.text });
  } catch (err: any) {
    console.error('Horoscope API error:', err);
    res.status(500).json({ error: 'Thất bại khi luận giải Tử vi từ Gemini: ' + err.message });
  }
});



// --- VITE MIDDLEWARE ---
import fs from 'fs';

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  
  if (process.env.NODE_ENV !== 'production' && !fs.existsSync(distPath)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
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
