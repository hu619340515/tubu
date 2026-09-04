import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, ExternalLink, Calendar, Mountain, Flag, Navigation } from 'lucide-react';

export interface LightboxImageInfo {
  url: string;
  title: string;
  time?: string;
  ele?: number;
  distFromStartKm?: number;
  distToEndKm?: number;
  description?: string;
}

interface ImageLightboxModalProps {
  imageInfo: LightboxImageInfo | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageInfo,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Keyboard navigation & ESC handler
  useEffect(() => {
    if (!imageInfo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageInfo, onClose]);

  if (!imageInfo) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-md flex flex-col select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header Controls Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/40 text-white shrink-0 border-b border-white/10 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-amber-400 shrink-0">
            <Mountain className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              {imageInfo.title || '实景照片'}
            </h3>
            {imageInfo.time && (
              <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{imageInfo.time}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition cursor-pointer"
            title={isZoomed ? '缩小适应屏幕' : '放大图片'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          <a
            href={imageInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition cursor-pointer"
            title="在新标签页查看高清原图"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-red-500/30 rounded-xl transition cursor-pointer ml-1"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Center Area */}
      <div
        className="flex-1 w-full min-h-0 flex items-center justify-center p-3 sm:p-6 overflow-auto"
        onClick={onClose}
      >
        <div
          className={`relative transition-transform duration-200 ${
            isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
        >
          <img
            src={imageInfo.url}
            alt={imageInfo.title}
            className="max-h-[72vh] sm:max-h-[80vh] max-w-[92vw] object-contain rounded-xl shadow-2xl ring-1 ring-white/15"
          />
        </div>
      </div>

      {/* Bottom Information Bar */}
      <div
        className="px-4 sm:px-6 py-3 bg-black/60 backdrop-blur-sm border-t border-white/10 shrink-0 text-white text-xs z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {imageInfo.time && (
              <span className="flex items-center gap-1.5 text-gray-300 font-mono text-[11.5px]">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>拍摄时间: <strong>{imageInfo.time}</strong></span>
              </span>
            )}

            {imageInfo.ele !== undefined && (
              <span className="flex items-center gap-1.5 text-gray-300 text-[11.5px]">
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>海拔: <strong className="font-mono text-emerald-400">{imageInfo.ele}m</strong></span>
              </span>
            )}

            {imageInfo.distFromStartKm !== undefined && (
              <span className="flex items-center gap-1 text-gray-300 text-[11.5px]">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>距起点: <strong className="font-mono text-blue-300">{imageInfo.distFromStartKm}km</strong></span>
              </span>
            )}

            {imageInfo.distToEndKm !== undefined && (
              <span className="flex items-center gap-1 text-gray-300 text-[11.5px]">
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>距终点: <strong className="font-mono text-rose-300">{imageInfo.distToEndKm}km</strong></span>
              </span>
            )}
          </div>

          {imageInfo.description && (
            <p className="text-[11px] text-gray-400 line-clamp-2 max-w-md">
              {imageInfo.description}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
