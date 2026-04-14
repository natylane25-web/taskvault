const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/me', authMiddleware, (req, res) => {
  const u = db.prepare('SELECT id,name,email,balance,total_earned,referral_code,role,created_at FROM users WHERE id=?').get(req.user.id);
  res.json(u);
});

router.get('/stats', authMiddleware, (req, res) => {
  const uid = req.user.id;
  const tasks     = db.prepare(`SELECT COUNT(*) as c FROM task_completions WHERE user_id=? AND status='approved'`).get(uid).c;
  const refs      = db.prepare(`SELECT COUNT(*) as c FROM referrals WHERE referrer_id=?`).get(uid).c;
  const withdrawn = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE user_id=? AND status='paid'`).get(uid).t;
  const pending   = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE user_id=? AND status='pending'`).get(uid).t;
  const user      = db.prepare('SELECT balance,total_earned FROM users WHERE id=?').get(uid);
  res.json({ balance: user.balance, total_earned: user.total_earned, tasks_completed: tasks, referral_count: refs, withdrawn_total: withdrawn, pending_withdrawal: pending });
});

router.get('/transactions', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id));
});

router.get('/referrals', authMiddleware, (req, res) => {
  res.json(db.prepare(`SELECT r.*,u.name,u.email FROM referrals r JOIN users u ON u.id=r.referred_id WHERE r.referrer_id=? ORDER BY r.created_at DESC`).all(req.user.id));
});

module.exports = router;
