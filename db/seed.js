require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

console.log('🌱 Seeding database...');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskvault.com';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@Secure123';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync(adminPass, 12);
  const code = uuidv4().slice(0, 8).toUpperCase();
  db.prepare(`INSERT INTO users (name, email, password, role, balance, referral_code) VALUES (?, ?, ?, 'admin', 0, ?)`)
    .run('Admin', adminEmail, hash, code);
  console.log(`✅ Admin created: ${adminEmail}`);
} else {
  console.log('ℹ️  Admin already exists, skipping.');
}

const tasks = [
  { title: 'Complete a Short Survey', description: 'Share your opinion on consumer habits in a quick 5-minute survey. All responses are anonymous.', category: 'Survey', reward: 0.75, time_minutes: 5, url: null },
  { title: 'Watch a 2-Minute Product Video', description: 'Watch a short product demo video and answer 2 quick questions about what you saw.', category: 'Video', reward: 0.50, time_minutes: 3, url: null },
  { title: 'Test a Mobile App', description: 'Download a free app, explore its features for 10 minutes, and rate your experience.', category: 'App Testing', reward: 2.00, time_minutes: 12, url: null },
  { title: 'Sign Up for a Free Newsletter', description: 'Subscribe to a partner newsletter. You can unsubscribe anytime after completing the task.', category: 'Sign Up', reward: 1.00, time_minutes: 2, url: null },
  { title: 'Product Feedback Form', description: 'Try a free online tool and fill in a short feedback form. No purchase required.', category: 'Feedback', reward: 1.25, time_minutes: 8, url: null },
  { title: 'Website Usability Test', description: 'Visit a partner website and answer 5 questions about its layout, speed, and ease of use.', category: 'App Testing', reward: 2.50, time_minutes: 10, url: null },
  { title: 'Brand Awareness Survey', description: 'Answer a quick 10-question survey about brand recognition. Easy and fast.', category: 'Survey', reward: 1.00, time_minutes: 6, url: null },
  { title: 'Image Labelling Task', description: 'Label 20 images to help train an AI model. Clear instructions provided. No experience needed.', category: 'Data Task', reward: 3.00, time_minutes: 15, url: null },
  { title: 'Write a Short Review', description: 'Try a free product or service and write at least 50 words about your experience.', category: 'Review', reward: 2.00, time_minutes: 10, url: null },
  { title: 'Social Media Poll', description: 'Vote in a simple one-question poll on a partner platform. No account creation needed.', category: 'Social', reward: 0.50, time_minutes: 1, url: null },
  { title: 'Listen & Rate Podcast Clip', description: 'Listen to a 3-minute audio clip and share your thoughts in a short text box.', category: 'Audio', reward: 0.75, time_minutes: 5, url: null },
  { title: 'Daily Check-In Bonus', description: 'Log in and click Claim to receive your daily bonus. Available once every 24 hours.', category: 'Bonus', reward: 0.25, time_minutes: 1, url: null },
];

const insert = db.prepare(`INSERT OR IGNORE INTO tasks (title, description, category, reward, time_minutes, url) VALUES (@title, @description, @category, @reward, @time_minutes, @url)`);
const insertMany = db.transaction(items => { for (const t of items) insert.run(t); });
insertMany(tasks);

console.log(`✅ ${tasks.length} tasks seeded`);
console.log('🎉 Done! You can now start the server.');
