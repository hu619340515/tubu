import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Data directory and file path
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed database
const DEFAULT_DB = {
  users: [
    {
      id: 'user-wangzai',
      username: '旺仔',
      email: '619340515@qq.com',
      passwordHash: '619340515',
      avatar: '👑',
      experienceLevel: 'expert',
      role: 'admin',
      isAdmin: true,
      createdAt: Date.now() - 60 * 24 * 3600 * 1000,
    },
  ],
  lists: {},
  mindmaps: {},
  announcement: {
    id: 'announcement-default',
    enabled: true,
    title: '格聂高海拔徒步风控通知',
    content:
      '格聂大环线全程海拔多在 3800m~4980m，近期垭口阵风较大且夜间逼近冰点，请全员务必备齐温标零下羽绒睡袋、硬壳冲锋衣与高反急救药品！',
    type: 'warning',
    updatedAt: Date.now(),
  },
};

// Helper to read DB
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users)) {
        // Clean up any old mock juanjuan test accounts
        data.users = data.users.filter(
          (u) => u.id !== 'user-juanjuan' && u.email !== 'juanjuan@trailpack.cn'
        );
        // Make sure wangzai exists as super admin
        if (!data.users.some((u) => u.email?.toLowerCase() === '619340515@qq.com')) {
          data.users.unshift(DEFAULT_DB.users[0]);
        }
        if (!data.lists) data.lists = {};
        if (!data.mindmaps) data.mindmaps = {};
        if (!data.announcement) data.announcement = DEFAULT_DB.announcement;
        return data;
      }
    }
  } catch (e) {
    console.error('Error reading database file:', e);
  }
  // Initialize
  writeDB(DEFAULT_DB);
  return DEFAULT_DB;
}

// Helper to write DB atomically
function writeDB(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error('Error writing database file:', e);
  }
}

// Middleware: allow large payloads for mindmap nodes/coordinates
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS handler
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 1. User Registration (Public API)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, avatar, experienceLevel } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: '请填写完整的用户名、邮箱和密码' });
  }

  const db = readDB();
  const lowerEmail = email.trim().toLowerCase();
  const trimUsername = username.trim();

  if (db.users.some((u) => u.email.toLowerCase() === lowerEmail)) {
    return res.status(400).json({ success: false, error: '该邮箱已被注册，请直接登录' });
  }
  if (db.users.some((u) => u.username.toLowerCase() === trimUsername.toLowerCase())) {
    return res.status(400).json({ success: false, error: '该昵称已被使用，请换一个' });
  }

  const isFirst = db.users.length === 0;
  const newUser = {
    id: 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    username: trimUsername,
    email: lowerEmail,
    passwordHash: password,
    avatar: avatar || '🎒',
    experienceLevel: experienceLevel || 'intermediate',
    role: isFirst ? 'admin' : 'user',
    isAdmin: isFirst,
    createdAt: Date.now(),
  };

  db.users.push(newUser);
  writeDB(db);

  const { passwordHash, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// 2. User Login (Public API)
app.post('/api/auth/login', (req, res) => {
  const { account, password } = req.body;
  if (!account || !password) {
    return res.status(400).json({ success: false, error: '请输入账号与密码' });
  }

  const db = readDB();
  const query = account.trim().toLowerCase();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === query || u.username.toLowerCase() === query
  );

  if (!user) {
    return res.status(401).json({ success: false, error: '账号不存在，请先注册' });
  }

  if (user.passwordHash !== password) {
    return res.status(401).json({ success: false, error: '密码错误，请重新输入' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// 3. User Lists Persistence (GET & POST)
app.get('/api/lists/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const userLists = (db.lists && db.lists[userId]) || [];
  res.json(userLists);
});

app.post('/api/lists/:userId', (req, res) => {
  const { userId } = req.params;
  const { lists } = req.body;
  if (!Array.isArray(lists)) {
    return res.status(400).json({ success: false, error: '清单数据格式错误' });
  }

  const db = readDB();
  if (!db.lists) db.lists = {};
  db.lists[userId] = lists;
  writeDB(db);
  res.json({ success: true, count: lists.length });
});

// 4. Mind Map Persistence (GET & POST)
app.get('/api/mindmap/:listId', (req, res) => {
  const { listId } = req.params;
  const db = readDB();
  const mapData = (db.mindmaps && db.mindmaps[listId]) || null;
  res.json(mapData);
});

app.post('/api/mindmap/:listId', (req, res) => {
  const { listId } = req.params;
  const { root, edges, layoutMode, viewport } = req.body;

  const db = readDB();
  if (!db.mindmaps) db.mindmaps = {};
  const current = db.mindmaps[listId] || {};

  db.mindmaps[listId] = {
    ...current,
    ...(root !== undefined ? { root } : {}),
    ...(edges !== undefined ? { edges } : {}),
    ...(layoutMode !== undefined ? { layoutMode } : {}),
    ...(viewport !== undefined ? { viewport } : {}),
    updatedAt: Date.now(),
  };

  writeDB(db);
  res.json({ success: true, listId });
});

// 5. Site Announcement (GET & POST)
app.get('/api/announcement', (req, res) => {
  const db = readDB();
  res.json(db.announcement || DEFAULT_DB.announcement);
});

app.post('/api/announcement', (req, res) => {
  const { announcement } = req.body;
  if (!announcement) {
    return res.status(400).json({ success: false, error: '缺少公告数据' });
  }

  const db = readDB();
  db.announcement = {
    ...announcement,
    updatedAt: Date.now(),
  };
  writeDB(db);
  res.json({ success: true, announcement: db.announcement });
});

// 6. Admin: Get all users with password & details
app.get('/api/admin/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

// 7. Admin: Reset user password
app.post('/api/admin/reset-password', (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, error: '缺少参数' });
  }

  const db = readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  user.passwordHash = newPassword.trim();
  writeDB(db);
  res.json({ success: true, message: `已成功将用户【${user.username}】密码重置` });
});

// 8. Admin: Delete user
app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  if (user.email === '619340515@qq.com') {
    return res.status(403).json({ success: false, error: '超级管理员账号不可删除' });
  }

  db.users = db.users.filter((u) => u.id !== id);
  if (db.lists && db.lists[id]) {
    delete db.lists[id];
  }
  writeDB(db);
  res.json({ success: true, message: `已成功删除用户【${user.username}】` });
});

// 9. Admin: Stats summary
app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const totalUsers = db.users.length;
  const adminCount = db.users.filter((u) => u.isAdmin || u.role === 'admin').length;
  const userCount = totalUsers - adminCount;
  let totalLists = 0;
  if (db.lists) {
    Object.values(db.lists).forEach((arr) => {
      if (Array.isArray(arr)) totalLists += arr.length;
    });
  }

  res.json({
    totalUsers,
    adminCount,
    userCount,
    totalLists,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Tubu API] Server running on http://0.0.0.0:${PORT}`);
});
