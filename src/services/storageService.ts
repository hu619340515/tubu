import { User, HikingList, Category } from '../types';
import { TEMPLATE_LISTS, DEFAULT_CATEGORIES } from '../data/defaultTemplates';

const USERS_KEY = 'hike_users_v1';
const ACTIVE_USER_KEY = 'hike_active_user_v1';
const LISTS_PREFIX = 'hike_lists_v1_';
const SHARED_STORAGE_PREFIX = 'hike_shared_v1_';

const DEFAULT_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'user-rock',
    username: '岩石 (老驴)',
    email: 'rock@trailpack.cn',
    passwordHash: '123456',
    avatar: '🏔️',
    experienceLevel: 'expert',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
  },
  {
    id: 'user-deer',
    username: '小鹿 (徒步小白)',
    email: 'deer@trailpack.cn',
    passwordHash: '123456',
    avatar: '🦌',
    experienceLevel: 'rookie',
    createdAt: Date.now() - 5 * 24 * 3600 * 1000,
  },
];

export const storageService = {
  getUsers(): User[] {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS.map(({ passwordHash, ...u }) => u);
      }
      const parsed: (User & { passwordHash?: string })[] = JSON.parse(raw);
      return parsed.map(({ passwordHash, ...u }) => u);
    } catch (e) {
      console.error('Failed to get users:', e);
      return DEFAULT_USERS;
    }
  },

  getActiveUser(): User {
    try {
      const raw = localStorage.getItem(ACTIVE_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.error('Failed to get active user:', e);
    }
    // Default to first user
    const users = this.getUsers();
    const fallback = users[0] || DEFAULT_USERS[0];
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(fallback));
    return fallback;
  },

  setActiveUser(user: User): void {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  },

  register(username: string, email: string, password: string, avatar = '🎒', experienceLevel: 'rookie' | 'intermediate' | 'expert' = 'intermediate'): { success: boolean; error?: string; user?: User } {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const existing: (User & { passwordHash: string })[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

      if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: '该邮箱已被注册，请直接登录' };
      }
      if (existing.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, error: '该昵称已被使用，请换一个' };
      }

      const newUser: User & { passwordHash: string } = {
        id: 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        username,
        email,
        passwordHash: password,
        avatar,
        experienceLevel,
        createdAt: Date.now(),
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
    } catch (e) {
      return { success: false, error: '注册存储失败，请检查浏览器本地存储权限' };
    }
  },

  login(emailOrUsername: string, password: string): { success: boolean; error?: string; user?: User } {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const existing: (User & { passwordHash: string })[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

      const user = existing.find(
        (u) =>
          (u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
            u.username.toLowerCase() === emailOrUsername.toLowerCase()) &&
          u.passwordHash === password
      );

      if (!user) {
        return { success: false, error: '账号或密码不正确（体验账号密码均为 123456）' };
      }

      const { passwordHash, ...safeUser } = user;
      this.setActiveUser(safeUser);
      return { success: true, user: safeUser };
    } catch (e) {
      return { success: false, error: '登录发生异常' };
    }
  },

  logout(): void {
    const users = this.getUsers();
    // Default back to guest or first user
    if (users.length > 0) {
      this.setActiveUser(users[0]);
    }
  },

  getUserLists(userId: string): HikingList[] {
    try {
      const key = LISTS_PREFIX + userId;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // If empty for this user, populate based on templates
      const seeded: HikingList[] = TEMPLATE_LISTS.map((tpl, idx) => ({
        id: `list-${userId}-${idx + 1}`,
        userId,
        ...tpl,
        customCategories: tpl.customCategories || [...DEFAULT_CATEGORIES],
        createdAt: Date.now() - idx * 86400000,
        updatedAt: Date.now() - idx * 43200000,
        isFavorite: idx === 0,
      }));

      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    } catch (e) {
      console.error('Failed to get user lists:', e);
      return [];
    }
  },

  saveUserLists(userId: string, lists: HikingList[]): void {
    try {
      const key = LISTS_PREFIX + userId;
      localStorage.setItem(key, JSON.stringify(lists));
      // Trigger a storage sync event for multi-tab updates
      window.dispatchEvent(new CustomEvent('trailpack_sync', { detail: { userId, timestamp: Date.now() } }));
    } catch (e) {
      console.error('Failed to save user lists:', e);
    }
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
