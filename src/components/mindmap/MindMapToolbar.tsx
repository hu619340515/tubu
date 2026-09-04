import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderOpen,
  FolderClosed,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Undo2,
  Redo2,
  GitFork,
} from 'lucide-react';
import { MindMapPreset, MindMapLayoutMode } from '../../types/mindmap';

interface MindMapToolbarProps {
  zoom: number;
  layoutMode: MindMapLayoutMode;
  onToggleLayoutMode: (mode: MindMapLayoutMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExportPng: () => void;
  onSelectPreset: (presetId: string) => void;
  presets: MindMapPreset[];
  totalNodes: number;
  saveStatus?: 'saved' | 'saving';
}

export const MindMapToolbar: React.FC<MindMapToolbarProps> = ({
  zoom,
  layoutMode,
  onToggleLayoutMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  saveStatus = 'saved',
  onResetZoom,
  onFitView,
  onAutoLayout,
  onExpandAll,
  onCollapseAll,
  onExportPng,
  onSelectPreset,
  presets,
  totalNodes,
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/95 backdrop-blur-md border border-[#D9D4C7] rounded-xl sm:rounded-2xl shadow-sm text-[#2C2C2C] max-w-full overflow-x-auto">
      {/* Left: Layout Switcher & Presets */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Mind Map Layout Button */}
        <div className="flex items-center bg-[#FAF8F5] border border-[#D9D4C7] p-0.5 rounded-xl shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => onToggleLayoutMode('timeline-flow')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#5A5A40] text-white shadow-2xs transition"
            title="思维导图（横向日期推进与纵向节点规划）"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>思维导图</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 border border-[#D9D4C7] rounded-xl p-0.5 bg-[#FAF8F5]">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className={`p-1.5 rounded-lg transition ${
              canUndo
                ? 'text-[#2C2C2C] hover:bg-[#EAE7DF]'
                : 'text-[#D9D4C7] cursor-not-allowed'
            }`}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className={`p-1.5 rounded-lg transition ${
              canRedo
                ? 'text-[#2C2C2C] hover:bg-[#EAE7DF]'
                : 'text-[#D9D4C7] cursor-not-allowed'
            }`}
            title="重做 (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Presets Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EAE7DF] border border-[#D9D4C7] text-xs font-semibold text-[#2C2C2C] rounded-xl transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D95D39]" />
            <span className="hidden sm:inline">模版预置</span>
            <ChevronDown className="w-3 h-3 text-[#7A7465]" />
          </button>

          {showPresetsMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowPresetsMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-[#D9D4C7] rounded-xl shadow-lg z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[11px] font-bold text-[#7A7465]">
                  选择或重置行程导图
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `确定要加载模版「${preset.title}」吗？当前自定义导图将被覆盖。`
                        )
                      ) {
                        onSelectPreset(preset.id);
                        setShowPresetsMenu(false);
                      }
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-[#FAF8F5] rounded-lg transition group"
                  >
                    <div className="text-xs font-bold text-[#2C2C2C] group-hover:text-[#5A5A40]">
                      {preset.title}
                    </div>
                    <div className="text-[10px] text-[#7A7465] truncate">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Node stats badge */}
        <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF8F5] border border-[#D9D4C7] text-[11px] font-medium text-[#7A7465] rounded-xl">
          <Layers className="w-3 h-3 text-[#5A5A40]" />
          <span>共 {totalNodes} 个规划点</span>
        </span>
      </div>

      {/* Right: Zoom & View Controls */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* Collapse / Expand all */}
        <button
          type="button"
          onClick={onExpandAll}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-xl transition"
          title="全部展开"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-xl transition"
          title="全部折叠"
        >
          <FolderClosed className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#D9D4C7] mx-1" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#2C2C2C] rounded-xl transition"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom percentage button */}
        <button
          type="button"
          onClick={onResetZoom}
          className="px-2 py-1 text-xs font-mono font-medium text-[#5A5A40] hover:bg-[#FAF8F5] rounded-xl transition"
          title="点击重置为 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#2C2C2C] rounded-xl transition"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Fit View */}
        <button
          type="button"
          onClick={onFitView}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#2C2C2C] rounded-xl transition"
          title="自适应居中"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Auto Layout */}
        <button
          type="button"
          onClick={onAutoLayout}
          className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-xl transition flex items-center gap-1"
          title="自动规整排版（重置自定义拖拽位置）"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden xl:inline text-[11px] font-bold">自动规整</span>
        </button>

        <div className="w-px h-4 bg-[#D9D4C7] mx-1" />

        {/* Real-time Auto-Save Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-[#E5E1D8] rounded-xl text-[11px] text-[#5A5A40] font-medium shadow-2xs">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              saveStatus === 'saving' ? 'bg-amber-500 scale-125 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="font-semibold text-[#2C2C2C]">
            {saveStatus === 'saving' ? '正在保存...' : '已自动保存'}
          </span>
        </div>

        {/* Export PNG */}
        <button
          type="button"
          onClick={onExportPng}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl transition shadow-2xs"
          title="导出清晰 PNG 导图图片"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出图片</span>
        </button>
      </div>
    </div>
  );
};
