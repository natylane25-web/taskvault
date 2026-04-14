const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const MIN = 25.00;

router.post('/', authMiddleware, (req, res) => {
  const { amount, method, account } = req.body;
  if (!amount || !method || !account) return res.status(400).json({ error: 'All fields required' });
  if (!['paypal','wise','bank_transfer'].includes(method)) return res.status(400).json({ error: 'Invalid method' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < MIN) return res.status(400).json({ error: `Minimum withdrawal is $${MIN}` });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (amt > user.balance) return res.status(400).json({ error: 'Insufficient balance' });
  const pending = db.prepare(`SELECT COUNT(*) as c FROM withdrawals WHERE user_id=? AND status='pending'`).get(req.user.id).c;
  if (pending > 0) return res.status(400).json({ error: 'You already have a pending withdrawal' });

  db.transaction(() => {
    db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(amt, req.user.id);
    db.prepare('INSERT INTO withdrawals (user_id,amount,method,account) VALUES (?,?,?,?)').run(req.user.id, amt, method, account);
    db.prepare('INSERT INTO transactions (user_id,type,amount,description) VALUES (?,?,?,?)').run(req.user.id, 'withdrawal', -amt, `Withdrawal via ${method}`);
  })();

  res.json({ success: true, message: 'Withdrawal submitted. Processing in 1–3 business days.' });
});

router.get('/', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM withdrawals WHERE user_id=? ORDER BY requested_at DESC').all(req.user.id));
});

module.exports = router;
