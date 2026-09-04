import React, { useState } from 'react';
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
} from 'lucide-react';
import { User } from '../types';
import { storageService } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User) => void;
  isMandatory?: boolean;
}

const AVATAR_OPTIONS = ['👑', '🏔️', '🌲', '⛺', '🧗', '🦅', '🐺', '🦊', '🧭', '🎒'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  isMandatory = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'switch'>(
    currentUser ? 'switch' : 'login'
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [experience, setExperience] = useState<'rookie' | 'intermediate' | 'expert'>('expert');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const users = storageService.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = storageService.login(email.trim(), password);
    if (!res.success) {
      setErrorMsg(res.error || '登录失败');
      return;
    }
    if (res.user) {
      onUserChanged(res.user);
      setSuccessMsg('登录成功！已载入您的专属徒步清单');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 800);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('请完整填写所有注册信息');
      return;
    }
    const res = storageService.register(
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
      setSuccessMsg('注册成功！已为您初始化专属徒步装备库');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 800);
    }
  };

  const handleSwitchToUser = (u: User) => {
    storageService.setActiveUser(u);
    onUserChanged(u);
    setSuccessMsg(`已切换至专属账户：${u.username}`);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white text-base">
              {currentUser?.avatar || '🥾'}
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">
                {isMandatory ? '溜个弯 · 账号登录验证' : '专属账号与清单中心'}
              </h2>
              <p className="text-xs text-[#DCD8CD]">
                {isMandatory ? '首次使用或登录后载入您的专属行程与装备库' : '一人一库 · 独立清单与打包进度'}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-[#E5E1D8] bg-[#F5F5F0] px-4 text-xs font-medium text-[#7A7465] shrink-0">
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                setMode('switch');
                setErrorMsg('');
              }}
              className={`py-3 px-3 border-b-2 transition ${
                mode === 'switch'
                  ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                  : 'border-transparent hover:text-[#2C2C2C]'
              }`}
            >
              专属用户切换
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-3 px-3 border-b-2 transition ${
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
            className={`py-3 px-3 border-b-2 transition ${
              mode === 'register'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            注册新账号
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAF9F5]">
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

          {/* Mode 1: Quick Switch & Current User (Only when logged in) */}
          {mode === 'switch' && currentUser && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#F0EEE8] border border-[#D9D4C7] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-white rounded-xl shadow-2xs border border-[#E5E1D8]">
                    {currentUser.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#2C2C2C]">{currentUser.username}</span>
                      <span className="text-[10px] bg-[#5A5A40] text-white px-1.5 py-0.2 rounded font-medium">
                        当前活跃
                      </span>
                      {currentUser.isAdmin && (
                        <span className="text-[10px] bg-[#D27D59] text-white px-1.5 py-0.2 rounded font-bold">
                          管理员
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7A7465]">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-2">
                  快速切换至其他专属账户：
                </h4>
                <div className="space-y-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchToUser(u)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                        u.id === currentUser.id
                          ? 'border-[#5A5A40] bg-white shadow-2xs font-bold'
                          : 'border-[#E5E1D8] bg-white hover:border-[#5A5A40] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{u.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#2C2C2C]">{u.username}</p>
                            {u.isAdmin && (
                              <span className="text-[9px] bg-[#D27D59] text-white px-1 py-0.1 rounded font-bold">
                                管理员
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A7465]">{u.email}</p>
                        </div>
                      </div>
                      {u.id === currentUser.id && (
                        <Check className="w-4 h-4 text-[#5A5A40]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E5E1D8] text-[11px] text-[#7A7465] space-y-1">
                <p className="font-bold text-[#5A5A40]">💡 专属清单机制：</p>
                <p>每位用户的徒步清单独立隔离，切换账户后将即刻加载对应账户的专属路线、自定义装备与进度。</p>
              </div>
            </div>
          )}

          {/* Mode 2: Login */}
          {mode === 'login' && (
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
                    placeholder="请输入注册邮箱或账号昵称"
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
                    placeholder="请输入登录密码"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition mt-2"
              >
                立即登录专属账号
              </button>
            </form>
          )}

          {/* Mode 3: Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">驴友昵称</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="例如：山野行者·阿杰"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">注册邮箱</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A7465] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your_name@trail.cn"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
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
                    placeholder="至少6位密码"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">选择驴友个性徽章</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVATAR_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setSelectedAvatar(a)}
                      className={`text-lg p-1.5 rounded-lg border transition ${
                        selectedAvatar === a ? 'bg-[#FDF2F0] border-[#D27D59] scale-110' : 'bg-white border-[#D9D4C7] hover:bg-[#F0EEE8]'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition mt-2"
              >
                创建我的专属徒步账号
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isMandatory && (
          <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
