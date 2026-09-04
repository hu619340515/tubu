import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Compass,
  Check,
  LogOut,
  Sparkles,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';
import { storageService } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User) => void;
  onLogout?: () => void;
  isMandatory?: boolean;
}

const AVATAR_OPTIONS = ['👑', '🏔️', '🌲', '⛺', '🧗', '🦅', '🐺', '🦊', '🧭', '🎒'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onLogout,
  isMandatory = false,
}) => {
  const [mode, setMode] = useState<'profile' | 'login' | 'register'>(
    currentUser ? 'profile' : 'login'
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎒');
  const [experience, setExperience] = useState<'rookie' | 'intermediate' | 'expert'>('intermediate');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Keep mode in sync with login status
  useEffect(() => {
    if (currentUser) {
      setMode('profile');
    } else {
      setMode('login');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [currentUser, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await storageService.login(email.trim(), password);
      if (!res.success) {
        setErrorMsg(res.error || '登录失败');
        return;
      }
      if (res.user) {
        onUserChanged(res.user);
        setSuccessMsg('登录成功！已载入您的专属徒步清单');
        setPassword('');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 700);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('请完整填写用户名、邮箱和密码');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('密码长度至少需要4位');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await storageService.register(
        username.trim(),
        email.trim(),
        password,
        selectedAvatar,
        experience
      );
      if (!res.success) {
        setErrorMsg(res.error || '注册失败');
        return;
      }
      if (res.user) {
        onUserChanged(res.user);
        setSuccessMsg('注册成功！已为您创建专属徒步空间');
        setPassword('');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 700);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePerformLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      storageService.logout();
    }
    setMode('login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white text-base">
              {currentUser?.avatar || '🥾'}
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">
                {currentUser
                  ? '个人专属中心'
                  : isMandatory
                  ? '溜个弯 · 账号登录'
                  : '账号登录与注册'}
              </h2>
              <p className="text-xs text-[#DCD8CD]">
                {currentUser
                  ? '一人一库 · 独立清单与装备隔离'
                  : '登录后即可载入或同步您的专属行程与装备'}
              </p>
            </div>
          </div>
          {(!isMandatory || currentUser) && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Tabs (Only when not logged in) */}
        {!currentUser && (
          <div className="flex border-b border-[#E5E1D8] bg-[#F5F5F0] px-4 text-xs font-medium text-[#7A7465] shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                mode === 'login'
                  ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                  : 'border-transparent hover:text-[#2C2C2C]'
              }`}
            >
              登录账号
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                mode === 'register'
                  ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                  : 'border-transparent hover:text-[#2C2C2C]'
              }`}
            >
              注册新账号
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#FAF9F5]">
          {errorMsg && (
            <div className="p-3 bg-[#FDF2F0] border border-[#D27D59]/30 rounded-xl text-xs text-[#D27D59] font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-white border border-[#5A5A40]/30 rounded-xl text-xs text-[#5A5A40] font-bold flex items-center gap-1.5 shadow-2xs">
              <Check className="w-4 h-4 text-[#5A5A40]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: Logged In - Current User Profile Only (No other users displayed!) */}
          {currentUser && mode === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-[#D9D4C7] rounded-2xl shadow-xs">
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl p-2.5 bg-[#FAF8F5] rounded-2xl shadow-inner border border-[#E5E1D8]">
                    {currentUser.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#2C2C2C] truncate">
                        {currentUser.username}
                      </span>
                      {currentUser.isAdmin ? (
                        <span className="text-[10px] bg-[#D27D59] text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>超级管理员</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#5A5A40] text-white px-2 py-0.5 rounded-full font-medium">
                          认证徒步者
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A7465] mt-0.5 truncate">{currentUser.email}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#7A7465] mt-1.5">
                      <span>
                        经验等级：
                        {currentUser.experienceLevel === 'expert'
                          ? '老驴 / 领队级'
                          : currentUser.experienceLevel === 'intermediate'
                          ? '进阶徒步者'
                          : '户外新人'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 bg-white rounded-xl border border-[#E5E1D8] text-[11.5px] text-[#7A7465] space-y-1">
                <p className="font-bold text-[#5A5A40] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>独立账号安全与隐私保护</span>
                </p>
                <p className="leading-relaxed">
                  您的徒步路线规划、装备清单与打包进度完全属于您的专属私有空间，受到密码严格保护，其他用户无法查看或切换进入。
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePerformLogout}
                  className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-red-50 border border-[#D9D4C7] hover:border-red-300 text-xs font-bold text-[#7A7465] hover:text-red-600 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出当前账号登录</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Login Form */}
          {!currentUser && mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">账号 / 邮箱</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册邮箱或用户名"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">登录密码</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入您的登录密码"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isSubmitting ? '正在安全登录...' : '立即登录'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-xs text-[#5A5A40] hover:underline cursor-pointer"
                >
                  还没有专属账号？立即免费注册 $\rightarrow$
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: Register Form */}
          {!currentUser && mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">用户昵称</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="例如：山野行者、卷卷卷"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">登录邮箱</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例如：yourname@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">设置密码</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="设置专属密码（至少4位）"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1.5">选择个性头像</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-xl p-2 rounded-xl border transition cursor-pointer ${
                        selectedAvatar === av
                          ? 'border-[#5A5A40] bg-[#FAF8F5] scale-105 shadow-2xs'
                          : 'border-[#E5E1D8] bg-white hover:bg-[#F0EEE8]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1.5">徒步经验段位</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'rookie', label: '户外新人' },
                    { id: 'intermediate', label: '进阶玩家' },
                    { id: 'expert', label: '老驴领队' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperience(lvl.id as any)}
                      className={`py-2 rounded-xl border font-semibold transition cursor-pointer ${
                        experience === lvl.id
                          ? 'border-[#5A5A40] bg-[#5A5A40] text-white shadow-2xs'
                          : 'border-[#E5E1D8] bg-white text-[#7A7465] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isSubmitting ? '正在创建账号...' : '创建专属账号并登录'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-xs text-[#5A5A40] hover:underline cursor-pointer"
                >
                  已有账号？返回登录 $\rightarrow$
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
