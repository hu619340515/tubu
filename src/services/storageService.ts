import { User, HikingList, Category, SiteAnnouncement } from '../types';
import { TEMPLATE_LISTS, DEFAULT_CATEGORIES } from '../data/defaultTemplates';

const USERS_KEY = 'hike_users_v1';
const ACTIVE_USER_KEY = 'hike_active_user_v1';
const LISTS_PREFIX = 'hike_lists_v1_';
const SHARED_STORAGE_PREFIX = 'hike_shared_v1_';
const ANNOUNCEMENT_KEY = 'hike_site_announcement_v1';

const DEFAULT_USERS: (User & { passwordHash: string })[] = [
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
];

const DEFAULT_ANNOUNCEMENT: SiteAnnouncement = {
  id: 'announcement-default',
  enabled: true,
  title: '格聂高海拔徒步风控通知',
  content: '格聂大环线全程海拔多在 3800m~4980m，近期垭口阵风较大且夜间逼近冰点，请全员务必备齐温标零下羽绒睡袋、硬壳冲锋衣与高反急救药品！',
  type: 'warning',
  updatedAt: Date.now(),
};

// Ensure data migration, Rock to Wangzai sync, and Rock removal
function ensureDataMigrated(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const rawUsers = localStorage.getItem(USERS_KEY);
    let users: (User & { passwordHash: string })[] = rawUsers ? JSON.parse(rawUsers) : [];

    // 1. Filter out deleted mock users
    users = users.filter(
      (u) =>
        u.id !== 'user-deer' &&
        u.email !== 'deer@trailpack.cn' &&
        u.id !== 'user-rock' &&
        u.email !== 'rock@trailpack.cn' &&
        u.id !== 'user-juanjuan' &&
        u.email !== 'juanjuan@trailpack.cn'
    );

    // 2. Ensure administrator "旺仔" exists with admin privileges and correct credentials
    const wangzaiIdx = users.findIndex((u) => u?.email?.toLowerCase() === '619340515@qq.com');
    if (wangzaiIdx === -1) {
      users.unshift(DEFAULT_USERS[0]);
    } else {
      users[wangzaiIdx].isAdmin = true;
      users[wangzaiIdx].role = 'admin';
      users[wangzaiIdx].username = '旺仔';
      users[wangzaiIdx].passwordHash = '619340515';
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // 3. Final synchronization of Rock's data to Wangzai before clearing Rock
    const wangzaiListsKey = LISTS_PREFIX + 'user-wangzai';
    const rockListsKey = LISTS_PREFIX + 'user-rock';
    const rawWangzaiLists = localStorage.getItem(wangzaiListsKey);
    const rawRockLists = localStorage.getItem(rockListsKey);

    let rockLists: HikingList[] = [];
    if (rawRockLists) {
      try {
        rockLists = JSON.parse(rawRockLists);
      } catch (e) {}
    }

    if (rockLists && rockLists.length > 0) {
      const clonedLists: HikingList[] = rockLists.map((list, idx) => {
        const oldId = list.id;
        const newId = `list-user-wangzai-${idx + 1}`;

        // Clone mindmap storage & edges from rock to wangzai
        try {
          const oldMindMap = localStorage.getItem('hike_mindmap_v1_' + oldId);
          if (oldMindMap) localStorage.setItem('hike_mindmap_v1_' + newId, oldMindMap);

          const oldEdges = localStorage.getItem('hike_edges_' + oldId);
          if (oldEdges) localStorage.setItem('hike_edges_' + newId, oldEdges);

          const oldLayout = localStorage.getItem('hike_mindmap_layoutmode_' + oldId);
          if (oldLayout) localStorage.setItem('hike_mindmap_layoutmode_' + newId, oldLayout);

          const oldViewport = localStorage.getItem('hike_mindmap_viewport_' + oldId);
          if (oldViewport) localStorage.setItem('hike_mindmap_viewport_' + newId, oldViewport);
        } catch (e) {}

        return {
          ...JSON.parse(JSON.stringify(list)),
          id: newId,
          userId: 'user-wangzai',
          updatedAt: Date.now(),
        };
      });

      localStorage.setItem(wangzaiListsKey, JSON.stringify(clonedLists));
    } else if (!rawWangzaiLists) {
      const wangzaiLists: HikingList[] = TEMPLATE_LISTS.map((tpl, idx) => ({
        id: `list-user-wangzai-${idx + 1}`,
        userId: 'user-wangzai',
        ...tpl,
        customCategories: tpl.customCategories || [...DEFAULT_CATEGORIES],
        createdAt: Date.now() - idx * 86400000,
        updatedAt: Date.now() - idx * 43200000,
        isFavorite: idx === 0,
      }));
      localStorage.setItem(wangzaiListsKey, JSON.stringify(wangzaiLists));
    }

    // 4. Delete Rock's lists and clear active user session if it was Rock
    localStorage.removeItem(rockListsKey);
    const rawActive = localStorage.getItem(ACTIVE_USER_KEY);
    if (rawActive) {
      try {
        const active = JSON.parse(rawActive);
        if (active.id === 'user-rock' || active.email === 'rock@trailpack.cn') {
          localStorage.removeItem(ACTIVE_USER_KEY);
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error('Data migration failed:', e);
  }
}

// Run migration immediately on module load
ensureDataMigrated();

export const storageService = {
  getUsers(): User[] {
    try {
      ensureDataMigrated();
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS.map(({ passwordHash, ...u }) => u);
      }
      const parsed: (User & { passwordHash?: string })[] = JSON.parse(raw);
      return parsed.map(({ passwordHash, ...u }) => u);
    } catch (e) {
      console.error('Failed to get users:', e);
      return DEFAULT_USERS.map(({ passwordHash, ...u }) => u);
    }
  },

  getAllUsersWithPasswords(): (User & { passwordHash: string })[] {
    try {
      ensureDataMigrated();
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_USERS;
    } catch (e) {
      return DEFAULT_USERS;
    }
  },

  async fetchUsersFromServer(): Promise<(User & { passwordHash: string })[]> {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const serverUsers: (User & { passwordHash: string })[] = await res.json();
          if (Array.isArray(serverUsers)) {
            // Server is single source of truth: write directly to local cache
            localStorage.setItem(USERS_KEY, JSON.stringify(serverUsers));
            return serverUsers;
          }
        }
      }
    } catch (e) {
      console.warn('[Storage] Fetch users from server failed, using local fallback:', e);
    }
    return this.getAllUsersWithPasswords();
  },

  getActiveUser(): User | null {
    try {
      ensureDataMigrated();
      const raw = localStorage.getItem(ACTIVE_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          // Verify user exists
          const users = this.getUsers();
          const found = users.find((u) => u.id === parsed.id);
          if (found) return found;
        }
      }
    } catch (e) {
      console.error('Failed to get active user:', e);
    }
    // "首次打开需要登录": return null if not logged in
    return null;
  },

  setActiveUser(user: User): void {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  },

  async register(
    username: string,
    email: string,
    password: string,
    avatar = '🎒',
    experienceLevel: 'rookie' | 'intermediate' | 'expert' = 'intermediate'
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const lowerEmail = email.trim().toLowerCase();
      const trimUsername = username.trim();

      // 1. Primary: register to cloud server
      let serverUser: User | null = null;
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: trimUsername,
              email: lowerEmail,
              password,
              avatar,
              experienceLevel,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return { success: false, error: data.error || '注册失败' };
          }
          serverUser = data.user;
        } catch (netErr) {
          console.warn('[Storage] Server offline during registration, fallback to local:', netErr);
        }
      }

      ensureDataMigrated();
      const raw = localStorage.getItem(USERS_KEY);
      const existing: (User & { passwordHash: string })[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

      if (existing.some((u) => u.email.toLowerCase() === lowerEmail)) {
        return { success: false, error: '该邮箱已被注册，请直接登录' };
      }
      if (existing.some((u) => u.username.toLowerCase() === trimUsername.toLowerCase())) {
        return { success: false, error: '该昵称已被使用，请换一个' };
      }

      const isFirstUser = existing.length === 0;
      const newUser: User & { passwordHash: string } = {
        id: serverUser?.id || ('user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
        username: trimUsername,
        email: lowerEmail,
        passwordHash: password,
        avatar,
        experienceLevel,
        role: serverUser?.role || (isFirstUser ? 'admin' : 'user'),
        isAdmin: serverUser?.isAdmin ?? isFirstUser,
        createdAt: serverUser?.createdAt || Date.now(),
      };

      existing.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(existing));

      const { passwordHash, ...safeUser } = newUser;
      this.setActiveUser(safeUser);

      // Seed initial hiking list for new user
      const initialLists: HikingList[] = [
        {
          id: 'list-' + Date.now().toString(36) + '-1',
          userId: safeUser.id,
          ...TEMPLATE_LISTS[0],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: true,
        },
      ];
      this.saveUserLists(safeUser.id, initialLists);

      return { success: true, user: safeUser };
    } catch (e: any) {
      return { success: false, error: e?.message || '注册发生异常' };
    }
  },

  async login(emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const query = emailOrUsername.trim().toLowerCase();

      // 1. Primary: login against central server
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: emailOrUsername.trim(), password }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            this.setActiveUser(data.user);
            // Cache user in local store for rapid offline support
            const users = this.getAllUsersWithPasswords();
            const idx = users.findIndex(
              (u) => u.id === data.user.id || u.email.toLowerCase() === data.user.email.toLowerCase()
            );
            const fullUser = { ...data.user, passwordHash: password };
            if (idx === -1) {
              users.push(fullUser);
            } else {
              users[idx] = fullUser;
            }
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            return { success: true, user: data.user };
          } else if (res.status === 401 || res.status === 400) {
            return { success: false, error: data.error || '账号或密码不正确' };
          }
        } catch (netErr) {
          console.warn('[Storage] Server offline during login, checking local fallback:', netErr);
        }
      }

      // 2. Offline fallback to local storage
      ensureDataMigrated();
      const raw = localStorage.getItem(USERS_KEY);
      const existing: (User & { passwordHash: string })[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

      const user = existing.find(
        (u) =>
          (u.email.toLowerCase() === query || u.username.toLowerCase() === query) &&
          u.passwordHash === password
      );

      if (!user) {
        return { success: false, error: '账号或密码不正确' };
      }

      const { passwordHash, ...safeUser } = user;
      this.setActiveUser(safeUser);
      return { success: true, user: safeUser };
    } catch (e: any) {
      return { success: false, error: e?.message || '登录发生异常' };
    }
  },

  logout(): void {
    localStorage.removeItem(ACTIVE_USER_KEY);
  },

  getUserLists(userId: string): HikingList[] {
    try {
      ensureDataMigrated();
      const key = LISTS_PREFIX + userId;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalItems = parsed.reduce(
            (sum: number, l: any) => sum + (Array.isArray(l.items) ? l.items.length : 0),
            0
          );
          if (totalItems > 0) {
            return this.normalizeLists(parsed, userId);
          }
        }
      }

      // If empty for this user or all cached lists have 0 items, populate based on full templates
      const seeded: HikingList[] = TEMPLATE_LISTS.map((tpl, idx) => ({
        id: `list-${userId}-${idx + 1}`,
        userId,
        ...tpl,
        customCategories: tpl.customCategories || [...DEFAULT_CATEGORIES],
        createdAt: Date.now() - idx * 86400000,
        updatedAt: Date.now() - idx * 43200000,
        isFavorite: idx === 0,
      }));

      const normalized = this.normalizeLists(seeded, userId);
      localStorage.setItem(key, JSON.stringify(normalized));
      // Save to server
      this.saveUserLists(userId, normalized);
      return normalized;
    } catch (e) {
      console.error('Failed to get user lists:', e);
      return [];
    }
  },

  normalizeLists(lists: any[], userId: string): HikingList[] {
    if (!Array.isArray(lists)) return [];
    return lists.map((l, idx) => ({
      id: l.id || `list-${userId}-${idx + 1}`,
      userId: l.userId || userId,
      title: l.title || '我的徒步清单',
      destination: l.destination || '徒步路线',
      trailType: l.trailType || 'multi_day',
      durationDays: typeof l.durationDays === 'number' ? l.durationDays : 3,
      customCategories:
        Array.isArray(l.customCategories) && l.customCategories.length > 0
          ? l.customCategories
          : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      items: Array.isArray(l.items) ? l.items : [],
      createdAt: l.createdAt || Date.now(),
      updatedAt: l.updatedAt || Date.now(),
      isFavorite: !!l.isFavorite,
    }));
  },

  async fetchUserListsFromServer(userId: string): Promise<HikingList[]> {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const res = await fetch(`/api/lists/${encodeURIComponent(userId)}`);
        if (res.ok) {
          const serverLists: any[] = await res.json();
          if (Array.isArray(serverLists) && serverLists.length > 0) {
            const totalItems = serverLists.reduce(
              (sum: number, l: any) => sum + (Array.isArray(l.items) ? l.items.length : 0),
              0
            );
            if (totalItems > 0) {
              const normalized = this.normalizeLists(serverLists, userId);
              const key = LISTS_PREFIX + userId;
              localStorage.setItem(key, JSON.stringify(normalized));
              return normalized;
            }
          }

          // If server lists are empty or have 0 items, check if local has items
          const key = LISTS_PREFIX + userId;
          const localRaw = localStorage.getItem(key);
          if (localRaw) {
            const localLists = JSON.parse(localRaw);
            if (Array.isArray(localLists) && localLists.length > 0) {
              const totalItems = localLists.reduce(
                (sum: number, l: any) => sum + (Array.isArray(l.items) ? l.items.length : 0),
                0
              );
              if (totalItems > 0) {
                const normalized = this.normalizeLists(localLists, userId);
                this.saveUserLists(userId, normalized);
                return normalized;
              }
            }
          }

          // If neither has gear items, seed defaults from TEMPLATE_LISTS and push to server
          const defaultLists = this.getUserLists(userId);
          this.saveUserLists(userId, defaultLists);
          return defaultLists;
        }
      }
    } catch (e) {
      console.warn('[Storage] Fetch user lists from server failed, using local cache:', e);
    }
    return this.getUserLists(userId);
  },

  saveUserLists(userId: string, lists: HikingList[]): void {
    try {
      const key = LISTS_PREFIX + userId;
      localStorage.setItem(key, JSON.stringify(lists));
      window.dispatchEvent(new CustomEvent('trailpack_sync', { detail: { userId, timestamp: Date.now() } }));

      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        fetch(`/api/lists/${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lists }),
        }).catch((e) => console.warn('[Storage] Lists sync warning:', e));
      }
    } catch (e) {
      console.error('Failed to save user lists:', e);
    }
  },

  // ================= ADMIN MANAGEMENT APIS =================

  async updateUserPassword(userId: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    try {
      const users = this.getAllUsersWithPasswords();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx === -1) return { success: false, error: '用户不存在' };

      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, newPassword: newPass }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return { success: false, error: data.error || '修改密码失败' };
          }
        } catch (e) {
          console.warn('[Storage] Server reset password failed:', e);
        }
      }

      users[idx].passwordHash = newPass;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '修改密码失败' };
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      let users = this.getAllUsersWithPasswords();
      const target = users.find((u) => u.id === userId);
      if (!target) return { success: false, error: '用户不存在' };
      if (target.email === '619340515@qq.com') {
        return { success: false, error: '超级管理员账号不可删除' };
      }

      // 1. Delete on server first
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return { success: false, error: data.error || '删除失败' };
          }
        } catch (e) {
          console.warn('[Storage] Server delete user failed:', e);
        }
      }

      // 2. Remove from local store
      users = users.filter((u) => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Remove user's lists
      localStorage.removeItem(LISTS_PREFIX + userId);

      // If active user is this deleted user, logout
      const active = this.getActiveUser();
      if (active && active.id === userId) {
        this.logout();
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '删除用户失败' };
    }
  },

  toggleAdminRole(userId: string): { success: boolean; error?: string } {
    try {
      const users = this.getAllUsersWithPasswords();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx === -1) return { success: false, error: '用户不存在' };
      if (users[idx].email === '619340515@qq.com') {
        return { success: false, error: '主超级管理员权限不可更改' };
      }

      const nextState = !users[idx].isAdmin;
      users[idx].isAdmin = nextState;
      users[idx].role = nextState ? 'admin' : 'user';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      return { success: true };
    } catch (e) {
      return { success: false, error: '切换权限失败' };
    }
  },

  async adminCreateUser(
    username: string,
    email: string,
    password: string,
    avatar: string,
    role: 'admin' | 'user'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const trimUsername = username.trim();
      const lowerEmail = email.trim().toLowerCase();

      // 1. Register on server
      let serverUser: User | null = null;
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: trimUsername,
              email: lowerEmail,
              password,
              avatar: avatar || '🎒',
              experienceLevel: 'intermediate',
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return { success: false, error: data.error || '创建用户失败' };
          }
          serverUser = data.user;
        } catch (e) {
          console.warn('[Storage] Server create user failed:', e);
        }
      }

      const users = this.getAllUsersWithPasswords();
      if (users.some((u) => u.email.toLowerCase() === lowerEmail)) {
        return { success: false, error: '邮箱已被注册' };
      }
      const newUser: User & { passwordHash: string } = {
        id: serverUser?.id || ('user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
        username: trimUsername,
        email: lowerEmail,
        passwordHash: password,
        avatar: avatar || '🎒',
        experienceLevel: 'intermediate',
        role,
        isAdmin: role === 'admin',
        createdAt: serverUser?.createdAt || Date.now(),
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Seed initial list
      this.getUserLists(newUser.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '创建用户失败' };
    }
  },

  getAllSystemLists(): { list: HikingList; ownerName: string; ownerEmail: string }[] {
    try {
      const users = this.getUsers();
      const result: { list: HikingList; ownerName: string; ownerEmail: string }[] = [];

      for (const u of users) {
        const lists = this.getUserLists(u.id);
        for (const l of lists) {
          result.push({
            list: l,
            ownerName: u.username,
            ownerEmail: u.email,
          });
        }
      }

      return result;
    } catch (e) {
      console.error('Failed to get system lists:', e);
      return [];
    }
  },

  deleteSystemList(listId: string, userId: string): boolean {
    try {
      const lists = this.getUserLists(userId);
      const filtered = lists.filter((l) => l.id !== listId);
      this.saveUserLists(userId, filtered);
      return true;
    } catch (e) {
      return false;
    }
  },

  getSiteAnnouncement(): SiteAnnouncement {
    try {
      const raw = localStorage.getItem(ANNOUNCEMENT_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return DEFAULT_ANNOUNCEMENT;
  },

  saveSiteAnnouncement(announcement: SiteAnnouncement): void {
    try {
      localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify(announcement));
      window.dispatchEvent(new CustomEvent('trailpack_announcement_update'));
    } catch (e) {
      console.error('Failed to save announcement:', e);
    }
  },

  exportAllSystemData(): string {
    const backup: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hike_')) {
        backup[k] = localStorage.getItem(k);
      }
    }
    return JSON.stringify(backup, null, 2);
  },

  importAllSystemData(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== 'object' || parsed === null) {
        return { success: false, error: '备份文件格式不正确' };
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          localStorage.setItem(k, v);
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: '解析并导入数据失败' };
    }
  },

  getStorageUsage(): { usedKb: number; count: number } {
    let totalLen = 0;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        totalLen += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
        count++;
      }
    }
    return {
      usedKb: +(totalLen / 1024).toFixed(1),
      count,
    };
  },

  saveSharedSnapshot(shareKey: string, payload: unknown): void {
    try {
      localStorage.setItem(SHARED_STORAGE_PREFIX + shareKey, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to cache shared list locally:', e);
    }
  },

  getSharedSnapshot(shareKey: string): unknown | null {
    try {
      const raw = localStorage.getItem(SHARED_STORAGE_PREFIX + shareKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
};
