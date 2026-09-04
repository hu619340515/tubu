import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, AlertTriangle, Check, Layers, ChevronRight } from 'lucide-react';
import { MindMapPreset, MindMapNode } from '../../types/mindmap';

interface MindMapPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: MindMapPreset[];
  onSelectPreset: (presetId: string) => void;
}

function countNodes(node: MindMapNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function getPresetDays(node: MindMapNode): string[] {
  const days: string[] = [];
  const walk = (n: MindMapNode) => {
    if (
      n.tag?.startsWith('徒步D') ||
      n.tag?.startsWith('D') ||
      /^D\d+/i.test(n.title.trim()) ||
      (n.title.includes('第') && n.title.includes('天'))
    ) {
      days.push(n.title);
    }
    n.children?.forEach(walk);
  };
  walk(node);
  return days;
}

export const MindMapPresetsModal: React.FC<MindMapPresetsModalProps> = ({
  isOpen,
  onClose,
  presets,
  onSelectPreset,
}) => {
  const [confirmPresetId, setConfirmPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleApply = (presetId: string) => {
    onSelectPreset(presetId);
    setConfirmPresetId(null);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-[#F7D070]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">
                行程导图模版库
              </h2>
              <p className="text-xs text-[#DCD8CD]">
                精选经典山野长线规划，一键载入专业时间轴与装备关联
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip Banner */}
        <div className="px-6 py-2.5 bg-[#FAF8F5] border-b border-[#E5E1D8] flex items-center gap-2 text-xs text-[#7A7465]">
          <AlertTriangle className="w-4 h-4 text-[#D95D39] shrink-0" />
          <span>
            提示：套用新模版将覆盖当前导图的所有自定义节点与拖拽排版，适合在规划新行程时使用。
          </span>
        </div>

        {/* Body: Presets List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F5F5F0]">
          {presets.map((preset) => {
            const nodeCount = countNodes(preset.root);
            const days = getPresetDays(preset.root);
            const isConfirming = confirmPresetId === preset.id;

            return (
              <div
                key={preset.id}
                className="bg-white border border-[#E5E1D8] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#5A5A40] transition duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-serif font-bold text-[#2C2C2C]">
                        {preset.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0EEE8] text-[#5A5A40] text-[11px] font-bold rounded-full">
                        <Layers className="w-3 h-3" />
                        {nodeCount} 个规划节点
                      </span>
                      {days.length > 0 && (
                        <span className="px-2 py-0.5 bg-[#FAF3E0] text-[#B87A28] text-[11px] font-bold rounded-full">
                          {days.length} 日行程
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A7465] leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Timeline Highlights */}
                    {days.length > 0 && (
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-[#5A5A40]">主要阶段：</span>
                        {days.map((d, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] text-[#2C2C2C] bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#E5E1D8]"
                          >
                            <span>{d}</span>
                            {i < days.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-[#B0AAA0]" />
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 pt-2 sm:pt-0">
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmPresetId(preset.id)}
                        className="w-full sm:w-auto px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>套用此模版</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => handleApply(preset.id)}
                          className="px-3.5 py-2 bg-[#D95D39] hover:bg-[#C04D2B] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>确认覆盖载入</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPresetId(null)}
                          className="px-3 py-2 bg-[#FAF8F5] hover:bg-[#EAE7DF] border border-[#D9D4C7] text-xs text-[#7A7465] font-semibold rounded-xl transition cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
