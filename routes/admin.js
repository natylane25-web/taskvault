const express = require('express');
const db = require('../db/database');
const { adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', adminMiddleware, (req, res) => {
  res.json({
    totalUsers:   db.prepare(`SELECT COUNT(*) as c FROM users WHERE role!='admin'`).get().c,
    totalPaid:    db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE status='paid'`).get().t,
    pendingPayouts: db.prepare(`SELECT COUNT(*) as c FROM withdrawals WHERE status='pending'`).get().c,
    totalTasks:   db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE is_active=1`).get().c,
    completions:  db.prepare(`SELECT COUNT(*) as c FROM task_completions`).get().c,
  });
});

router.get('/users', adminMiddleware, (req, res) => {
  res.json(db.prepare(`SELECT id,name,email,balance,total_earned,referral_code,is_active,created_at FROM users WHERE role!='admin' ORDER BY created_at DESC`).all());
});

router.patch('/users/:id/status', adminMiddleware, (req, res) => {
  db.prepare('UPDATE users SET is_active=? WHERE id=?').run(req.body.is_active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.get('/withdrawals', adminMiddleware, (req, res) => {
  res.json(db.prepare(`SELECT w.*,u.name,u.email FROM withdrawals w JOIN users u ON u.id=w.user_id ORDER BY w.requested_at DESC`).all());
});

router.patch('/withdrawals/:id', adminMiddleware, (req, res) => {
  const { status, notes } = req.body;
  if (!['paid','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const w = db.prepare('SELECT * FROM withdrawals WHERE id=?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });
  db.transaction(() => {
    db.prepare(`UPDATE withdrawals SET status=?,notes=?,processed_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, notes||null, w.id);
    if (status === 'rejected') {
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(w.amount, w.user_id);
      db.prepare('INSERT INTO transactions (user_id,type,amount,description) VALUES (?,?,?,?)').run(w.user_id, 'refund', w.amount, 'Withdrawal rejected – refund');
    }
  })();
  res.json({ success: true });
});

router.get('/tasks', adminMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all());
});

router.post('/tasks', adminMiddleware, (req, res) => {
  const { title, description, category, reward, time_minutes, url, max_completions } = req.body;
  if (!title || !description || !category || !reward || !time_minutes)
    return res.status(400).json({ error: 'Missing required fields' });
  const r = db.prepare(`INSERT INTO tasks (title,description,category,reward,time_minutes,url,max_completions) VALUES (?,?,?,?,?,?,?)`)
    .run(title, description, category, parseFloat(reward), parseInt(time_minutes), url||null, max_completions||9999);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.patch('/tasks/:id', adminMiddleware, (req, res) => {
  db.prepare('UPDATE tasks SET is_active=? WHERE id=?').run(req.body.is_active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

module.exports = router;
