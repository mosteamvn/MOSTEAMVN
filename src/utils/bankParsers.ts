/**
 * Nabe Budget - Bank Statement and Message Parsers
 * Dedicated parser helpers for Vietcombank and Vietinbank SMS/Notif text & CSV statements
 */

export interface ParsedBankTx {
  bank: 'VCB' | 'CTG' | 'Unknown';
  type: 'income' | 'expense';
  amount: number;
  date: string; // ISO String
  note: string;
}

/**
 * Clean up Vietnamese currency notation e.g., "1,500,000VND" or "+ 20.000,50 đ" to a float number
 */
export function cleanAmount(text: string): number {
  // Remove commas, periods, spaces, letters, đ, VND
  // Handle Vietnamese dot thousands separators vs standard commas
  let clean = text.replace(/(VND|đ|VND|VND|d|Vnd|vnd|Vnd|VND)/gi, '').trim();
  
  // Decide if decimals are dot or comma
  // Standard format in VN banks usually is: +1,500,000 or -50.000
  // Let's strip spaces first
  clean = clean.replace(/\s/g, '');
  
  // Is it using dots for thousands? e.g. 100.000 or commas 100,000
  // If we have both . and , like 1,000.50, replace , with empty and parse
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/,/g, '');
  } else if (clean.includes('.')) {
    // If there is only dot, e.g. 50.000, it's typically thousands in VN
    // But check if it's less than 3 digits after dot, e.g. 50.5 mean fifty point five
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace(/\./g, '');
    } else if (parts.length > 2) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',')) {
    // Single comma, usually represents thousands e.g. 50,050
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace(/,/g, '');
    } else if (parts.length > 2) {
      clean = clean.replace(/,/g, '');
    } else {
      // decimal separator? E.g. 50,5
      clean = clean.replace(/,/g, '.');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Helper to parse diverse Vietnamese datetime strings
 * Matches formats like: "29/05/2026 09:54", "28-05-2026 11:55:08", "29-05-2026", "29/05/2026"
 */
export function parseVietnameseDateTime(dateStr: string): Date | null {
  const dateTimeRegex = /(\d{1,2})[-/](\d{1,2})[-/](\d{4}|\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i;
  const match = dateStr.match(dateTimeRegex);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);
  if (year < 100) year += 2000;
  
  const hour = match[4] ? parseInt(match[4], 10) : 12;
  const min = match[5] ? parseInt(match[5], 10) : 0;
  const sec = match[6] ? parseInt(match[6], 10) : 0;
  try {
    const d = new Date(year, month, day, hour, min, sec);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
}

/**
 * Parses bank notification message or SMS alerts
 */
export function parseBankNotification(text: string): ParsedBankTx | null {
  if (!text) return null;

  // Enhance detection for VietinBank (CTG) and Vietcombank (VCB)
  // iPay copy-paste has fields like "Thời gian:", "Giao dịch:", "Số dư hiện tại:", "Nội dung:" and the word "iPay"
  const isVCB = /VCB|Vietcombank/i.test(text);
  const isVietin = /Vietinbank|Vietin|iPay|Tài khoản:.*Giao dịch:.*Số dư/i.test(text);

  if (!isVCB && !isVietin) {
    return null;
  }

  // 1. Specialized Structure for VietinBank (Copy-paste pipe format from iPay notification)
  // Example: Thời gian: 29/05/2026 09:54|Tài khoản: 106882458063|Giao dịch: -15,000VND|Số dư hiện tại: 3,493,488VND|Nội dung: CT DI:614909659678 PHAN TUAN PHONG chuyen tien; tai iPay
  if (text.includes('|')) {
    const parts = text.split('|').map(p => p.trim());
    let dateVal = new Date().toISOString();
    let typeVal: 'income' | 'expense' = 'expense';
    let amountVal = 0;
    let noteVal = 'Giao dịch Vietinbank';
    let hasMatchingFields = false;

    for (const part of parts) {
      if (/Thời gian/i.test(part)) {
        const rawDate = part.replace(/^[^\s:]*:\s*/i, '').trim();
        const parsed = parseVietnameseDateTime(rawDate);
        if (parsed) dateVal = parsed.toISOString();
        hasMatchingFields = true;
      } else if (/Giao dịch/i.test(part)) {
        const rawGiaoDich = part.replace(/^[^\s:]*:\s*/i, '').trim(); // e.g. "-15,000VND"
        if (rawGiaoDich.startsWith('+')) {
          typeVal = 'income';
        } else if (rawGiaoDich.startsWith('-')) {
          typeVal = 'expense';
        }
        amountVal = cleanAmount(rawGiaoDich);
        hasMatchingFields = true;
      } else if (/Nội dung/i.test(part)) {
        noteVal = part.replace(/^[^\s:]*:\s*/i, '').trim();
        hasMatchingFields = true;
      }
    }

    if (hasMatchingFields && amountVal > 0) {
      return {
        bank: 'CTG',
        type: typeVal,
        amount: amountVal,
        date: dateVal,
        note: noteVal
      };
    }
  }

  // 2. Generic and specialized regex parsing for VCB & typical VietinBank/VCB SMS
  let type: 'income' | 'expense' = 'expense';
  let amount = 0;
  let dateStr = new Date().toISOString();
  let note = isVCB ? 'Giao dịch Vietcombank' : 'Giao dịch Vietinbank';

  // Extract VCB specific transaction amount if possible to prevent remaining balance conflict
  // Example: "Số dư TK VCB 0251002542060 -3,700,000 VND lúc 28-05-2026 11:55:08..."
  const vcbTxRegex = /(?:TK VCB|Số dư TK VCB|SD TK VCB)\s+\d+\s+([+-]\s*[0-9.,]+)\s*(?:VND|đ|d|Vnd|vnd|Vnd|VND)/i;
  const matchTx = text.match(vcbTxRegex);

  if (matchTx) {
    const rawAmt = matchTx[1].replace(/\s/g, '');
    if (rawAmt.startsWith('+')) {
      type = 'income';
    } else if (rawAmt.startsWith('-')) {
      type = 'expense';
    }
    amount = cleanAmount(rawAmt);
  } else {
    // General fallback: first look for signed changes (+ or -)
    const signedRegex = /([+-]\s*[0-9.,]+)\s*(?:VND|đ|Vnd|vnd|d|Vnd|VND)/gi;
    const signedMatches = [...text.matchAll(signedRegex)];
    
    if (signedMatches.length > 0) {
      const rawAmt = signedMatches[0][1].replace(/\s/g, '');
      if (rawAmt.startsWith('+')) {
        type = 'income';
      } else if (rawAmt.startsWith('-')) {
        type = 'expense';
      }
      amount = cleanAmount(rawAmt);
    } else {
      // Unsigned change fallback
      const valueRegex = /([0-9.,]+)\s*(?:VND|đ|Vnd|vnd|d|Vnd|VND)/i;
      const unsignedMatch = text.match(valueRegex);
      if (unsignedMatch) {
        amount = cleanAmount(unsignedMatch[1]);
        const lowerText = text.toLowerCase();
        if (lowerText.includes('cong') || lowerText.includes('vao') || lowerText.includes('nhan') || lowerText.includes('+')) {
          type = 'income';
        } else {
          type = 'expense';
        }
      }
    }
  }

  // Extract date/time of the transaction
  const parsedDate = parseVietnameseDateTime(text);
  if (parsedDate) {
    dateStr = parsedDate.toISOString();
  }

  // Extract Note/Content
  // Standard labels first: "ND:", "Noi dung:", "Nội dung:", "Content:"
  const ndRegex = /(?:ND:|Noi\s+dung:|Nội\s+dung:|Content:)\s*(.*)$/i;
  const ndMatch = text.match(ndRegex);
  
  if (ndMatch && ndMatch[1]) {
    note = ndMatch[1].trim();
    // clean up trailing balance info if captured
    const balanceIndex = note.toLowerCase().indexOf('. so du');
    if (balanceIndex > -1) {
      note = note.substring(0, balanceIndex).trim();
    }
  } else {
    // VCB specific "Ref ..." matching or generic sentence extraction
    const refIndex = text.toLowerCase().indexOf('ref');
    if (refIndex > -1) {
      note = text.substring(refIndex).trim();
      
      // Smart cleaner for Ref prefixes to render a beautiful user-friendly description
      // e.g. "Ref MBVCB.14416861459.913094.PHAN TUAN PHONG..." -> "PHAN TUAN PHONG..."
      note = note.replace(/^Ref\s+[A-Z0-9.-]+\. (?=[A-Z])/i, ''); 
      note = note.replace(/^Ref\s+[A-Z0-9.-]+\.([A-Z])/i, '$1'); 
      note = note.replace(/^Ref\s+[A-Z0-9.-]+/i, ''); 
      note = note.replace(/^[.\s:-]+/g, '').trim();
    } else {
      // Split text and find informative part after datetime
      const sentences = text.split(/\.\s+/);
      if (sentences.length >= 3) {
        const filtered = sentences.filter(s => !/Số dư TK|SD TK|TK VCB|lúc|lúc|Số dư/i.test(s));
        if (filtered.length > 0) {
          note = filtered.join('. ');
        }
      } else {
        const timeIndex = text.search(/\d{1,2}:\d{2}/);
        if (timeIndex > -1) {
          const remainder = text.substring(timeIndex + 5).trim();
          const dotIndex = remainder.indexOf('.');
          // Ensure we bypass direct decimal suffixes (like the remainder of seconds in time, e.g. ":08.")
          const cleanRemainder = remainder.replace(/^:\d{2}/, '').replace(/^[-\s.:,]+/g, '').trim();
          const nextDot = cleanRemainder.indexOf('.');
          
          if (nextDot > 1) {
            note = cleanRemainder.substring(0, nextDot).trim();
          } else {
            note = cleanRemainder;
          }
        }
      }
    }
  }

  // Truncate cleanly
  if (note.length > 150) {
    note = note.substring(0, 147) + '...';
  }

  return {
    bank: isVCB ? 'VCB' : 'CTG',
    type,
    amount,
    date: dateStr,
    note: note || (type === 'income' ? 'Nạp tiền ngân hàng' : 'Chi tiêu ngân hàng')
  };
}

/**
 * Parses Vietcombank & Vietinbank CSV state records into arrays of transactions
 */
export function parseBankCSV(csvText: string): ParsedBankTx[] {
  const transactions: ParsedBankTx[] = [];
  if (!csvText) return transactions;

  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return transactions;

  // Find header line index
  let headerIndex = -1;
  let separator = ',';

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (line.includes(';') && (line.toLowerCase().includes('ngày') || line.toLowerCase().includes('date') || line.toLowerCase().includes('mô tả') || line.toLowerCase().includes('sốcó'))) {
      headerIndex = i;
      separator = ';';
      break;
    }
    if (line.includes(',') && (line.toLowerCase().includes('ngày') || line.toLowerCase().includes('date') || line.toLowerCase().includes('mô tả') || line.toLowerCase().includes('sốcó'))) {
      headerIndex = i;
      separator = ',';
      break;
    }
    if (line.includes('\t') && (line.toLowerCase().includes('ngày') || line.toLowerCase().includes('date') || line.toLowerCase().includes('mô tả'))) {
      headerIndex = i;
      separator = '\t';
      break;
    }
    // generic backup header check
    if (line.toLowerCase().includes('date') || line.toLowerCase().includes('amount') || line.toLowerCase().includes('nội dung') || line.toLowerCase().includes('so tien')) {
      headerIndex = i;
      separator = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
      break;
    }
  }

  if (headerIndex === -1) {
    // assume first line is header, comma separated
    headerIndex = 0;
    separator = csvText.includes(';') ? ';' : ',';
  }

  // Parse header columns
  const rawHeaders = lines[headerIndex].split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  // Map standard Vietnamese and English headers
  const dateCol = rawHeaders.findIndex(h => h.includes('ngày') || h.includes('date') || h.includes('time'));
  const noteCol = rawHeaders.findIndex(h => h.includes('nội dung') || h.includes('noi dung') || h.includes('mô tả') || h.includes('mo ta') || h.includes('note') || h.includes('details') || h.includes('description') || h.includes('chi tiết'));
  const amountCol = rawHeaders.findIndex(h => h === 'số tiền' || h === 'so tien' || h === 'amount' || h === 'no_tien' || h === 'value');
  const creditCol = rawHeaders.findIndex(h => h.includes('có') || h.includes('credit') || h.includes('nhận') || h.includes('thu'));
  const debitCol = rawHeaders.findIndex(h => h.includes('nợ') || h.includes('debit') || h.includes('chi') || h.includes('trừ'));

  // parse records
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // handle comma/semicolon separation inside double quotes correctly
    let cols: string[] = [];
    if (separator === ',') {
      const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (match) cols = match.map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    
    if (cols.length === 0) {
      cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
    }

    if (cols.length < Math.max(2, rawHeaders.length / 2)) continue;

    let dateVal = new Date().toISOString();
    if (dateCol > -1 && cols[dateCol]) {
      // try parsing banking dates like 29/05/2026 or 2026-05-29
      const rawDate = cols[dateCol];
      const match = rawDate.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (match) {
        const d = parseInt(match[1]);
        const m = parseInt(match[2]) - 1;
        const y = parseInt(match[3]);
        const parsed = new Date(y, m, d, 12, 0, 0);
        if (!isNaN(parsed.getTime())) dateVal = parsed.toISOString();
      } else {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) dateVal = parsed.toISOString();
      }
    }

    let noteVal = 'Nhập sao kê ngân hàng';
    if (noteCol > -1 && cols[noteCol]) {
      noteVal = cols[noteCol];
    }

    let amountVal = 0;
    let typeVal: 'income' | 'expense' = 'expense';

    if (creditCol > -1 && cols[creditCol] && cleanAmount(cols[creditCol]) > 0) {
      amountVal = cleanAmount(cols[creditCol]);
      typeVal = 'income';
    } else if (debitCol > -1 && cols[debitCol] && cleanAmount(cols[debitCol]) > 0) {
      amountVal = cleanAmount(cols[debitCol]);
      typeVal = 'expense';
    } else if (amountCol > -1 && cols[amountCol]) {
      const rawAmt = cols[amountCol];
      // if starts with minus or is negative, it's an expense
      if (rawAmt.startsWith('-')) {
        typeVal = 'expense';
      } else if (rawAmt.startsWith('+')) {
        typeVal = 'income';
      } else {
        // generic
        typeVal = 'expense';
      }
      amountVal = cleanAmount(rawAmt);
    }

    if (amountVal > 0) {
      transactions.push({
        bank: csvText.toLowerCase().includes('vietcombank') ? 'VCB' : csvText.toLowerCase().includes('vietinbank') ? 'CTG' : 'Unknown',
        type: typeVal,
        amount: amountVal,
        date: dateVal,
        note: noteVal
      });
    }
  }

  return transactions;
}
