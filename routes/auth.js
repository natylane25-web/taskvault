const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db/database');

const router = express.Router();
const WELCOME_BONUS  = 5.00;
const REFERRAL_BONUS = 3.00;

router.post('/register', (req, res) => {
  const { name, email, password, referral_code } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  let referrer = null;
  if (referral_code)
    referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code.toUpperCase());

  const hash = bcrypt.hashSync(password, 12);
  const code = uuidv4().slice(0, 8).toUpperCase();

  const userId = db.transaction(() => {
    const r = db.prepare(`INSERT INTO users (name,email,password,balance,total_earned,referral_code,referred_by) VALUES (?,?,?,?,?,?,?)`)
      .run(name.trim(), email.toLowerCase(), hash, WELCOME_BONUS, WELCOME_BONUS, code, referrer?.id || null);
    db.prepare(`INSERT INTO transactions (user_id,type,amount,description) VALUES (?,?,?,?)`)
      .run(r.lastInsertRowid, 'bonus', WELCOME_BONUS, 'Welcome bonus');
    if (referrer) {
      db.prepare('UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE id=?')
        .run(REFERRAL_BONUS, REFERRAL_BONUS, referrer.id);
      db.prepare('INSERT INTO referrals (referrer_id,referred_id,reward,paid) VALUES (?,?,?,1)')
        .run(referrer.id, r.lastInsertRowid, REFERRAL_BONUS);
      db.prepare(`INSERT INTO transactions (user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?)`)
        .run(referrer.id, 'referral', REFERRAL_BONUS, 'Referral bonus', r.lastInsertRowid);
    }
    return r.lastInsertRowid;
  })();

  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const user  = db.prepare('SELECT id,name,email,balance,total_earned,referral_code,role FROM users WHERE id=?').get(userId);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email=? AND is_active=1').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

module.exports = router;
