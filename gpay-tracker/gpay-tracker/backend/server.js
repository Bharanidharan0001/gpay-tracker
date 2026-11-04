const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const DEVICE_KEY = process.env.DEVICE_KEY;
const VIEW_KEY = process.env.VIEW_KEY;
if (!DEVICE_KEY || !VIEW_KEY) throw new Error('Set DEVICE_KEY and VIEW_KEY env vars');

const db = new Database(process.env.DB_PATH || 'transactions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    party TEXT,
    raw TEXT NOT NULL,
    hash TEXT UNIQUE,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_day ON transactions(day);
`);

function parseNotification(text) {
  const amt = text.match(/(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (!amt) return null;
  const isCredit = /received|credited|got/i.test(text);
  const isDebit = /paid|sent|debited/i.test(text);
  if (!isCredit && !isDebit) return null;
  const party = text.match(/(?:to|from)\s+(.+?)(?:\s+(?:on|via|using|successfully)\b|[.!]|$)/i);
  return {
    type: isCredit ? 'credit' : 'debit',
    amount: parseFloat(amt[1].replace(/,/g, '')),
    party: party ? party[1].trim() : null,
  };
}

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Called by the Android app on the father's phone
app.post('/api/ingest', (req, res) => {
  if (req.get('x-device-key') !== DEVICE_KEY) return res.sendStatus(401);
  const { text, postedAt } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const parsed = parseNotification(text);
  if (!parsed) return res.json({ ignored: true });

  const hash = crypto.createHash('sha256').update(text + (postedAt || '')).digest('hex');
  db.prepare(`
    INSERT OR IGNORE INTO transactions (day, type, amount, party, raw, hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(todayIST(), parsed.type, parsed.amount, parsed.party, text, hash, new Date().toISOString());

  res.json({ saved: true });
});

function requireView(req, res, next) {
  if (req.get('x-view-key') !== VIEW_KEY) return res.sendStatus(401);
  next();
}

app.get('/api/transactions', requireView, (req, res) => {
  const day = req.query.date || todayIST();
  const rows = db.prepare(`
    SELECT id, type, amount, party, created_at FROM transactions
    WHERE day = ? ORDER BY created_at DESC
  `).all(day);
  res.json(rows);
});

app.get('/api/daily', requireView, (req, res) => {
  const rows = db.prepare(`
    SELECT day,
      COALESCE(SUM(CASE WHEN type='debit' THEN amount END), 0) AS spent,
      COALESCE(SUM(CASE WHEN type='credit' THEN amount END), 0) AS received,
      COUNT(*) AS count
    FROM transactions
    GROUP BY day ORDER BY day DESC LIMIT 60
  `).all();
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on port', PORT));
