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

const DEFAULT_CATEGORIES = [
  { id: 'cat-shelter', name: '睡眠露营', color: '#0d9488', icon: 'Tent', isDefault: true },
  { id: 'cat-clothing', name: '服装穿戴', color: '#0284c7', icon: 'Shirt', isDefault: true },
  { id: 'cat-food', name: '饮食炊具', color: '#ea580c', icon: 'Utensils', isDefault: true },
  { id: 'cat-safety', name: '导航急救', color: '#dc2626', icon: 'Compass', isDefault: true },
  { id: 'cat-electronic', name: '电子照明', color: '#7c3aed', icon: 'Zap', isDefault: true },
  { id: 'cat-hygiene', name: '卫生防晒', color: '#059669', icon: 'ShieldCheck', isDefault: true },
  { id: 'cat-misc', name: '杂项证件', color: '#64748b', icon: 'Briefcase', isDefault: true },
];

function getDefaultTemplateLists(userId) {
  return [
    {
      id: `list-1`,
      userId,
      title: '2026 格聂四日高海拔徒步全案',
      description: '下则通至惹迪村四日经典合规线，平均海拔4000m+，抗寒防高反与全套装备。',
      destination: '四川·格聂神山大环线',
      destinationCoords: { lat: 29.81, lng: 99.63 },
      trailType: 'high_altitude',
      durationDays: 4,
      customCategories: DEFAULT_CATEGORIES,
      items: [
        { id: 'gn-1', name: '舒适温标-10℃高蓬松羽绒睡袋', categoryId: 'cat-shelter', weightGrams: 1150, quantity: 1, packed: false, isEssential: true, notes: '高海拔夜间零下，保暖核心' },
        { id: 'gn-2', name: '高R值防潮充气垫 (R值≥4.5)', categoryId: 'cat-shelter', weightGrams: 520, quantity: 1, packed: false, isEssential: true },
        { id: 'gn-3', name: '高抗风双人高山四季帐', categoryId: 'cat-shelter', weightGrams: 1950, quantity: 1, packed: false, isEssential: true, notes: '配加长防风地钉' },
        { id: 'gn-4', name: '三层暴雨级GTX硬壳冲锋衣裤', categoryId: 'cat-clothing', weightGrams: 680, quantity: 1, packed: false, isEssential: true },
        { id: 'gn-5', name: '高蓬松加厚保暖羽绒服 (充绒200g+)', categoryId: 'cat-clothing', weightGrams: 580, quantity: 1, packed: false, isEssential: true },
        { id: 'gn-6', name: '重装中高帮防水徒步鞋', categoryId: 'cat-clothing', weightGrams: 1350, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'gn-7', name: '高原防高反药盒 (乙酰唑胺/布洛芬/散利痛)', categoryId: 'cat-safety', weightGrams: 150, quantity: 1, packed: false, isEssential: true },
        { id: 'gn-8', name: '分体式高山抗风气炉 & 挡风板', categoryId: 'cat-food', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
        { id: 'gn-9', name: '重载双登山杖 (外锁碳纤维/铝合金)', categoryId: 'cat-safety', weightGrams: 460, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'gn-10', name: '双离线轨迹手机 + 3C移动电源', categoryId: 'cat-electronic', weightGrams: 560, quantity: 1, packed: false, isEssential: true, notes: '两步路离线等高线卫星图已就绪' },
        { id: 'gn-11', name: 'UV400偏光防雪盲太阳镜 & 高倍防晒霜', categoryId: 'cat-hygiene', weightGrams: 120, quantity: 1, packed: false, isEssential: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: true,
    },
    {
      id: `list-2`,
      userId,
      title: '武功山两日重装露营清单',
      description: '经典的草甸云海重装徒步路线，包含帐篷、炊具及保暖层。',
      destination: '江西·武功山',
      destinationCoords: { lat: 27.46, lng: 114.18 },
      trailType: 'overnight_camp',
      durationDays: 2,
      customCategories: DEFAULT_CATEGORIES,
      items: [
        { id: 'wgs-1', name: '双人双层抗风帐篷', categoryId: 'cat-shelter', weightGrams: 1850, quantity: 1, packed: false, isEssential: true, notes: '附防风绳和地钉8根' },
        { id: 'wgs-2', name: '充气防潮垫 (R值>3.0)', categoryId: 'cat-shelter', weightGrams: 480, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-3', name: '舒适温标0°C羽绒睡袋', categoryId: 'cat-shelter', weightGrams: 900, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-4', name: '充气露营小枕头', categoryId: 'cat-shelter', weightGrams: 90, quantity: 1, packed: false, isEssential: false },
        { id: 'wgs-5', name: '高帮防水徒步鞋', categoryId: 'cat-clothing', weightGrams: 1100, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'wgs-6', name: '三层硬壳冲锋衣 (防暴雨)', categoryId: 'cat-clothing', weightGrams: 420, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-7', name: '排汗速干长袖T恤', categoryId: 'cat-clothing', weightGrams: 160, quantity: 2, packed: false, isEssential: true },
        { id: 'wgs-8', name: '轻量抓绒保暖层', categoryId: 'cat-clothing', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-9', name: '速干徒步长裤', categoryId: 'cat-clothing', weightGrams: 290, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'wgs-10', name: '美利奴羊毛徒步袜', categoryId: 'cat-clothing', weightGrams: 80, quantity: 2, packed: false, isEssential: true },
        { id: 'wgs-11', name: '登山遮阳帽 & 抓绒帽', categoryId: 'cat-clothing', weightGrams: 110, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-12', name: '分体式防风户外气炉', categoryId: 'cat-food', weightGrams: 230, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-13', name: '高山扁气罐 G2 (230g)', categoryId: 'cat-food', weightGrams: 370, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-14', name: '阳极氧化铝便携套锅', categoryId: 'cat-food', weightGrams: 310, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-15', name: '折叠钛勺叉', categoryId: 'cat-food', weightGrams: 18, quantity: 1, packed: false, isEssential: false },
        { id: 'wgs-16', name: '户外便携滤水器/净水片', categoryId: 'cat-food', weightGrams: 75, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-17', name: '冻干主食米饭/脱水面', categoryId: 'cat-food', weightGrams: 400, quantity: 2, packed: false, isEssential: true },
        { id: 'wgs-18', name: '电解质冲剂 & 高能路粮坚果', categoryId: 'cat-food', weightGrams: 350, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-19', name: '折叠碳纤维登山杖一对', categoryId: 'cat-safety', weightGrams: 380, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-20', name: '离线轨迹手机/两步路已载轨迹', categoryId: 'cat-safety', weightGrams: 210, quantity: 1, packed: true, isEssential: true },
        { id: 'wgs-21', name: '户外急救包 (创可贴/绷带/云南白药)', categoryId: 'cat-safety', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-22', name: '高频求生口哨', categoryId: 'cat-safety', weightGrams: 15, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-23', name: '双面镀铝防风保温救生毯', categoryId: 'cat-safety', weightGrams: 60, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-24', name: '户外头灯 (300流明以上)', categoryId: 'cat-electronic', weightGrams: 90, quantity: 1, packed: false, isEssential: true, notes: '检查电量充足' },
        { id: 'wgs-25', name: '大容量防水充电宝 (20000mAh)', categoryId: 'cat-electronic', weightGrams: 390, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-26', name: '三合一快充数据线', categoryId: 'cat-electronic', weightGrams: 45, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-27', name: 'SPF50+防晒霜 & 唇膏', categoryId: 'cat-hygiene', weightGrams: 80, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-28', name: '偏光防紫外线太阳镜 (UV400)', categoryId: 'cat-hygiene', weightGrams: 35, quantity: 1, packed: false, isEssential: true },
        { id: 'wgs-29', name: '可降解加厚垃圾袋 (无痕山林LNT)', categoryId: 'cat-hygiene', weightGrams: 30, quantity: 3, packed: false, isEssential: true },
        { id: 'wgs-30', name: '免洗抑菌洗手凝胶', categoryId: 'cat-hygiene', weightGrams: 50, quantity: 1, packed: false, isEssential: false },
      ],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 43200000,
      isFavorite: false,
    },
    {
      id: `list-3`,
      userId,
      title: '单日经典轻装徒步清单 (15-25km)',
      description: '适合周末一日周边山野拉练，极简轻快，重视补给与安全。',
      destination: '浙江·莫干山',
      destinationCoords: { lat: 30.60, lng: 119.86 },
      trailType: 'day_hike',
      durationDays: 1,
      customCategories: DEFAULT_CATEGORIES,
      items: [
        { id: 'dh-1', name: '中低帮轻量徒步鞋/越野跑鞋', categoryId: 'cat-clothing', weightGrams: 750, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'dh-2', name: '轻量皮肤风衣/单层冲锋衣', categoryId: 'cat-clothing', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-3', name: '速干短袖/长袖', categoryId: 'cat-clothing', weightGrams: 140, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'dh-4', name: '排汗速干短裤/束脚裤', categoryId: 'cat-clothing', weightGrams: 200, quantity: 1, packed: true, isEssential: true, packLocation: 'worn' },
        { id: 'dh-5', name: '徒步速干帽/空顶帽', categoryId: 'cat-clothing', weightGrams: 60, quantity: 1, packed: false, isEssential: false },
        { id: 'dh-6', name: '双肩轻量徒步包 (15-20L)', categoryId: 'cat-misc', weightGrams: 450, quantity: 1, packed: true, isEssential: true },
        { id: 'dh-7', name: '水袋/运动水壶 (1.5L-2L)', categoryId: 'cat-food', weightGrams: 150, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-8', name: '路粮面包/能量胶/士力架', categoryId: 'cat-food', weightGrams: 250, quantity: 3, packed: false, isEssential: true },
        { id: 'dh-9', name: '电解质泡腾片/运动饮料', categoryId: 'cat-food', weightGrams: 60, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-10', name: '超轻折叠登山杖 (单根/双根)', categoryId: 'cat-safety', weightGrams: 280, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-11', name: '便携迷你充电宝 (10000mAh)', categoryId: 'cat-electronic', weightGrams: 190, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-12', name: '迷你急救创口贴 & 止痛片', categoryId: 'cat-safety', weightGrams: 40, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-13', name: '防晒喷雾/防晒霜', categoryId: 'cat-hygiene', weightGrams: 70, quantity: 1, packed: false, isEssential: true },
        { id: 'dh-14', name: '纸巾 & 密封垃圾袋', categoryId: 'cat-hygiene', weightGrams: 30, quantity: 1, packed: false, isEssential: true },
      ],
      createdAt: Date.now() - 2 * 86400000,
      updatedAt: Date.now() - 2 * 43200000,
      isFavorite: false,
    },
    {
      id: `list-4`,
      userId,
      title: '高原高海拔雪山徒步进阶清单',
      description: '针对海拔3000-5000米低温、强风、强紫外线环境设计，包含专业防护。',
      destination: '四川·四姑娘山大峰',
      destinationCoords: { lat: 31.11, lng: 102.90 },
      trailType: 'high_altitude',
      durationDays: 3,
      customCategories: DEFAULT_CATEGORIES,
      items: [
        { id: 'ha-1', name: '800蓬高蓬松度厚羽绒服 (充绒250g+)', categoryId: 'cat-clothing', weightGrams: 650, quantity: 1, packed: false, isEssential: true, notes: '营地与冲顶保暖关键' },
        { id: 'ha-2', name: '重装GORE-TEX专业冲锋衣裤', categoryId: 'cat-clothing', weightGrams: 780, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-3', name: '美利奴羊毛保暖内衣裤套件', categoryId: 'cat-clothing', weightGrams: 380, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-4', name: '防风防水厚手套 (分指+抓绒内胆)', categoryId: 'cat-clothing', weightGrams: 190, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-5', name: '防风护耳保暖羊毛帽 & 魔术头巾', categoryId: 'cat-clothing', weightGrams: 95, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-6', name: '简易轻量防滑冰爪 (6齿/10齿)', categoryId: 'cat-safety', weightGrams: 450, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-7', name: '专业雪套 (防雪防泥透气)', categoryId: 'cat-clothing', weightGrams: 180, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-8', name: '四类(Cat.4)高山雪盲防风太阳镜', categoryId: 'cat-hygiene', weightGrams: 45, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-9', name: '高原保温壶 (1000ml 保温24h)', categoryId: 'cat-food', weightGrams: 520, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-10', name: '便携指夹式血氧仪 (监测高反)', categoryId: 'cat-safety', weightGrams: 65, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-11', name: '高反应急药物 (乙酰唑胺/布洛芬/红景天)', categoryId: 'cat-safety', weightGrams: 80, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-12', name: '专业户外头灯 (低温抗冻锂电池)', categoryId: 'cat-electronic', weightGrams: 110, quantity: 1, packed: false, isEssential: true },
        { id: 'ha-13', name: '暖宝宝发热贴 (给手机与脚趾防冻)', categoryId: 'cat-misc', weightGrams: 200, quantity: 4, packed: false, isEssential: false },
      ],
      createdAt: Date.now() - 3 * 86400000,
      updatedAt: Date.now() - 3 * 43200000,
      isFavorite: false,
    },
  ];
}

// 3. User Lists Persistence (GET & POST)
app.get('/api/lists/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  if (!db.lists) db.lists = {};
  let userLists = db.lists[userId] || [];

  const totalItems = userLists.reduce(
    (sum, l) => sum + (Array.isArray(l.items) ? l.items.length : 0),
    0
  );

  // If user has no lists or all lists have 0 items, populate complete default lists
  if (userLists.length === 0 || totalItems === 0) {
    userLists = getDefaultTemplateLists(userId);
    db.lists[userId] = userLists;
    writeDB(db);
  }

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

  const existingLists = db.lists[userId] || [];
  const existingTotalItems = existingLists.reduce(
    (sum, l) => sum + (Array.isArray(l.items) ? l.items.length : 0),
    0
  );
  const incomingTotalItems = lists.reduce(
    (sum, l) => sum + (Array.isArray(l.items) ? l.items.length : 0),
    0
  );

  // Guard against accidental empty wipe
  if (existingTotalItems > 5 && incomingTotalItems === 0 && lists.length <= 1) {
    console.warn(`[Lists] Guarded against accidental wipe for user ${userId}`);
    return res.json({ success: true, count: existingLists.length, guarded: true });
  }

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
