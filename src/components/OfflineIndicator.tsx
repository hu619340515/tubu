import React from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#5A5A40] bg-white border border-[#D9D4C7] rounded-full shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse" />
        <span>本地同步就绪</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto z-50 flex items-center justify-between gap-3 px-4 py-3 bg-[#2C2C2C] text-[#FAF9F5] rounded-2xl shadow-2xl backdrop-blur border border-[#5A5A40]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#5A5A40] flex items-center justify-center shrink-0 text-white">
          <WifiOff className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-serif font-bold text-white">山野无网离线保护中</p>
          <p className="text-[11px] text-[#DCD8CD]">所有装备核验与清单操作均安全保存在本地缓存</p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1 text-[11px] text-white bg-[#5A5A40] px-2.5 py-1 rounded-lg font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#D27D59]" />
        <span>已离线缓存</span>
      </div>
    </div>
  );
};
