import React from 'react';
import {
  Mountain,
  Plus,
  CloudSun,
  User as UserIcon,
  Download,
  Share2,
  ChevronDown,
  ListTodo,
  WifiOff,
  GitFork,
} from 'lucide-react';
import { User, HikingList } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type ActiveViewMode = 'checklist' | 'mindmap';

import { ShieldCheck, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  lists: HikingList[];
  activeListId: string;
  activeView: ActiveViewMode;
  onSelectView: (view: ActiveViewMode) => void;
  onSelectList: (id: string) => void;
  onOpenNewList: () => void;
  onOpenAuth: () => void;
  onOpenWeather: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  lists,
  activeListId,
  activeView,
  onSelectView,
  onSelectList,
  onOpenNewList,
  onOpenAuth,
  onOpenWeather,
  onOpenAdmin,
  onLogout,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, install } = usePWAInstall();

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <header className="sticky top-0 z-40 bg-[#EAE7DF]/95 text-[#2C2C2C] backdrop-blur border-b border-[#D9D4C7] shadow-xs">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#5A5A40] flex items-center justify-center text-white shadow-xs">
            <Mountain className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#2C2C2C]">
                溜个弯
              </h1>
              {!isOnline && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#FDF2F0] text-[#D27D59] border border-[#D27D59]/30 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-3 h-3" />
                  <span>离线</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7A7465] hidden sm:block font-medium">
              山野装备无痕打包 · 离线打卡 · 天气预警
            </p>
          </div>
        </div>

        {/* Center: View Switcher (Checklist vs Mind Map) & Trip Selector */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle (行程导图在前，装备清单在后) */}
          <div className="flex items-center bg-white/80 border border-[#D9D4C7] p-0.5 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => onSelectView('mindmap')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeView === 'mindmap'
                  ? 'bg-[#5A5A40] text-white shadow-2xs'
                  : 'text-[#7A7465] hover:text-[#2C2C2C]'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>行程导图</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectView('checklist')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeView === 'checklist'
                  ? 'bg-[#5A5A40] text-white shadow-2xs'
                  : 'text-[#7A7465] hover:text-[#2C2C2C]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>装备清单</span>
            </button>
          </div>

          {/* Active Trip Selector (on tablets & desktop) */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className="relative w-44">
              <select
                value={activeListId}
                onChange={(e) => onSelectList(e.target.value)}
                className="w-full pl-2.5 pr-7 py-1 bg-white border border-[#D9D4C7] hover:border-[#5A5A40] text-xs font-medium text-[#2C2C2C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5A5A40] appearance-none cursor-pointer truncate shadow-2xs"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#7A7465] absolute right-2 top-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onOpenNewList}
              className="p-1 bg-[#5A5A40] text-white hover:bg-[#484833] rounded-xl transition shadow-2xs"
              title="新建行程清单"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Weather Button */}
          <button
            type="button"
            onClick={onOpenWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0EEE8] border border-[#D9D4C7] text-xs font-medium text-[#2C2C2C] transition shadow-2xs"
            title="查询目的地山野天气"
          >
            <CloudSun className="w-4 h-4 text-[#D27D59] shrink-0" />
            <span className="hidden sm:inline">天气预报</span>
          </button>

          {/* In-App PWA Install Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D27D59] hover:bg-[#be6e4c] text-white text-xs font-bold transition shadow-xs"
              title="安装为离线手机桌面应用"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">安装离线App</span>
            </button>
          )}

          {/* Admin Dashboard Button (Only for admin) */}
          {currentUser?.isAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D27D59] hover:bg-[#be6e4c] text-white text-xs font-bold transition shadow-xs"
              title="打开网站管理控制台"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">管理后台</span>
            </button>
          )}

          {/* User Account Button or Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white hover:bg-[#F0EEE8] border border-[#D9D4C7] rounded-xl transition group shadow-2xs"
                title="切换或管理专属账户"
              >
                <span className="text-base leading-none p-1 bg-[#EAE7DF] rounded-lg group-hover:scale-105 transition">
                  {currentUser.avatar || '🏔️'}
                </span>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-[#2C2C2C] truncate max-w-[85px]">
                      {currentUser.username}
                    </p>
                    {currentUser.isAdmin && (
                      <span className="text-[9px] bg-[#D27D59] text-white px-1 py-0.1 rounded font-bold">
                        管
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#5A5A40] font-semibold">专属空间</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-[#7A7465] hover:text-red-600 hover:bg-[#FAF8F5] rounded-xl transition border border-[#D9D4C7] bg-white shadow-2xs"
                title="退出当前登录"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <span>登录账号</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
