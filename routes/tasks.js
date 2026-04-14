const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  res.json(db.prepare(`
    SELECT t.*, CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END as completed, tc.status as completion_status
    FROM tasks t
    LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.user_id=?
    WHERE t.is_active=1 AND t.completions < t.max_completions ORDER BY t.reward DESC
  `).all(req.user.id));
});

router.post('/:id/complete', authMiddleware, (req, res) => {
  const uid = req.user.id;
  const taskId = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND is_active=1').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const already = db.prepare('SELECT id FROM task_completions WHERE user_id=? AND task_id=?').get(uid, taskId);
  if (already) return res.status(409).json({ error: 'Task already completed' });

  db.transaction(() => {
    db.prepare('INSERT INTO task_completions (user_id,task_id,reward,status) VALUES (?,?,?,?)').run(uid, taskId, task.reward, 'approved');
    db.prepare('UPDATE tasks SET completions=completions+1 WHERE id=?').run(taskId);
    db.prepare('UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE id=?').run(task.reward, task.reward, uid);
    db.prepare('INSERT INTO transactions (user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?)').run(uid, 'task', task.reward, `Task: ${task.title}`, taskId);
  })();

  const newBal = db.prepare('SELECT balance FROM users WHERE id=?').get(uid).balance;
  res.json({ success: true, reward: task.reward, new_balance: newBal });
});

router.get('/completed', authMiddleware, (req, res) => {
  res.json(db.prepare(`SELECT tc.*,t.title,t.category FROM task_completions tc JOIN tasks t ON t.id=tc.task_id WHERE tc.user_id=? ORDER BY tc.completed_at DESC`).all(req.user.id));
});

module.exports = router;
