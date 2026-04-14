require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Auto-seed on first run ───────────────────────────────────────────────────
const db = require('./db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskvault.com';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@Secure123';

if (!db.prepare('SELECT id FROM users WHERE email=?').get(adminEmail)) {
  const hash = bcrypt.hashSync(adminPass, 12);
  const code = uuidv4().slice(0, 8).toUpperCase();
  db.prepare(`INSERT INTO users (name,email,password,role,balance,referral_code) VALUES (?,?,?,'admin',0,?)`)
    .run('Admin', adminEmail, hash, code);
  console.log(`✅ Admin account created: ${adminEmail}`);
}

const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
if (taskCount === 0) {
  require('./db/seed');
}

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/user',        require('./routes/user'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/admin',       require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── SERVE FRONTEND ───────────────────────────────────────────────────────────
// Express serves all HTML pages from the /public folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: send index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TaskVault running on port ${PORT}`);
  console.log(`   Your Replit URL is shown in the browser preview above\n`);
});
