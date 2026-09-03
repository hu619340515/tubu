import React, { useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  FolderPlus,
  Palette,
  Clock,
  Calendar,
  Link,
  Maximize2,
  Sparkles,
  Scissors,
} from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';

interface ContextMenuProps {
  x: number;
  y: number;
  canvasX?: number;
  canvasY?: number;
  node?: MindMapNode;
  isRoot?: boolean;
  onClose: () => void;
  // Node actions
  onAddChildItinerary?: (node: MindMapNode) => void;
  onAddChild?: (id: string) => void;
  onAddSibling?: (id: string) => void;
  onStartConnect?: (node: MindMapNode) => void;
  onDisconnectParent?: (id: string) => void;
  onEdit?: (node: MindMapNode) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onChangeColor?: (id: string, color: string) => void;
  // Canvas actions
  onAddDayNode?: (x: number, y: number) => void;
  onAddTimeNode?: (x: number, y: number) => void;
  onAddCategoryBranch?: (x: number, y: number) => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
}

const QUICK_COLORS = ['#183153', '#5A5A40', '#D95D39', '#2E7D5B', '#B7791F', '#B33A3A', '#2563EB'];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  canvasX = 0,
  canvasY = 0,
  node,
  isRoot = false,
  onClose,
  onAddChildItinerary,
  onAddChild,
  onAddSibling,
  onStartConnect,
  onDisconnectParent,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onChangeColor,
  onAddDayNode,
  onAddTimeNode,
  onAddCategoryBranch,
  onFitView,
  onAutoLayout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust positioning to avoid screen edge clipping
  const adjustedX = Math.min(x, window.innerWidth - 230);
  const adjustedY = Math.min(y, window.innerHeight - 380);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-white/95 backdrop-blur-md border border-[#D9D4C7] rounded-2xl shadow-xl p-1.5 text-xs text-[#2C2C2C] select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {node ? (
        /* Node Context Menu */
        <>
          <div className="px-2.5 py-1 text-[10px] font-bold text-[#7A7465] truncate border-b border-[#EAE7DF] mb-1">
            卡片: {node.title}
          </div>

          {/* 1. Connect Itinerary Node Below (当天行程) */}
          <button
            type="button"
            onClick={() => {
              onAddChildItinerary?.(node);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition group text-left"
          >
            <div className="flex items-center gap-2 text-[#2C2C2C] group-hover:text-[#5A5A40]">
              <Clock className="w-3.5 h-3.5 text-[#D95D39]" />
              <span className="font-bold">在下方连接当天行程</span>
            </div>
            <span className="text-[10px] text-[#D95D39] bg-[#FFF1EC] px-1.5 py-0.5 rounded font-bold">
              子时段
            </span>
          </button>

          {/* 2. Add Child (子分支) */}
          <button
            type="button"
            onClick={() => {
              onAddChild?.(node.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition group"
          >
            <div className="flex items-center gap-2 text-[#2C2C2C] group-hover:text-[#5A5A40]">
              <Plus className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>添加子分支</span>
            </div>
            <kbd className="text-[10px] text-[#7A7465] bg-[#EAE7DF] px-1.5 py-0.5 rounded-md font-mono">
              Tab
            </kbd>
          </button>

          {/* 3. Add Sibling (同级分支) */}
          {!isRoot && (
            <button
              type="button"
              onClick={() => {
                onAddSibling?.(node.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition group"
            >
              <div className="flex items-center gap-2 text-[#2C2C2C] group-hover:text-[#5A5A40]">
                <FolderPlus className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>添加同级分支</span>
              </div>
              <kbd className="text-[10px] text-[#7A7465] bg-[#EAE7DF] px-1.5 py-0.5 rounded-md font-mono">
                Enter
              </kbd>
            </button>
          )}

          {/* Start Free Connect / Re-parent Mode */}
          <button
            type="button"
            onClick={() => {
              onStartConnect?.(node);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-[#2563EB] text-left"
          >
            <div className="flex items-center gap-2">
              <Link className="w-3.5 h-3.5" />
              <span className="font-bold">重新连线 / 更改父级...</span>
            </div>
            <span className="text-[10px] text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded font-bold">
              拉线改接
            </span>
          </button>

          {!isRoot && (
            <button
              type="button"
              onClick={() => {
                onDisconnectParent?.(node.id);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-[#7A7465] text-left"
            >
              <Scissors className="w-3.5 h-3.5 text-[#7A7465]" />
              <span>断开当前父级连线</span>
            </button>
          )}

          {/* Edit Details (Space) */}
          <button
            type="button"
            onClick={() => {
              onEdit?.(node);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition group"
          >
            <div className="flex items-center gap-2 text-[#2C2C2C] group-hover:text-[#5A5A40]">
              <Edit2 className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>编辑详情与时段</span>
            </div>
            <kbd className="text-[10px] text-[#7A7465] bg-[#EAE7DF] px-1.5 py-0.5 rounded-md font-mono">
              Space
            </kbd>
          </button>

          {!isRoot && (
            <>
              <div className="h-px bg-[#EAE7DF] my-1" />

              <button
                type="button"
                onClick={() => {
                  onMoveUp?.(node.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-[#2C2C2C]"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#7A7465]" />
                <span>同级前移</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onMoveDown?.(node.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-[#2C2C2C]"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#7A7465]" />
                <span>同级后移</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicate?.(node.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-[#2C2C2C]"
              >
                <Copy className="w-3.5 h-3.5 text-[#7A7465]" />
                <span>复制节点分支</span>
              </button>
            </>
          )}

          <div className="h-px bg-[#EAE7DF] my-1" />

          {/* Quick Color Swatch */}
          <div className="px-2.5 py-1">
            <div className="text-[10px] text-[#7A7465] mb-1 flex items-center gap-1">
              <Palette className="w-3 h-3" />
              <span>快速标记色彩</span>
            </div>
            <div className="flex items-center gap-1.5">
              {QUICK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChangeColor?.(node.id, c);
                    onClose();
                  }}
                  style={{ backgroundColor: c }}
                  className="w-4 h-4 rounded-full hover:scale-125 transition shadow-2xs"
                />
              ))}
            </div>
          </div>

          {/* Direct Delete - Zero Confirmation! */}
          {!isRoot && (
            <>
              <div className="h-px bg-[#EAE7DF] my-1" />
              <button
                type="button"
                onClick={() => {
                  onDelete?.(node.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[#B33A3A] hover:bg-[#FDE8E8] rounded-xl transition"
              >
                <div className="flex items-center gap-2 font-bold">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>直接删除节点</span>
                </div>
                <kbd className="text-[10px] bg-white text-[#B33A3A] border border-[#B33A3A]/30 px-1.5 py-0.5 rounded-md font-mono">
                  Del
                </kbd>
              </button>
            </>
          )}
        </>
      ) : (
        /* Empty Canvas Context Menu */
        <>
          <div className="px-2.5 py-1 text-[10px] font-bold text-[#7A7465] border-b border-[#EAE7DF] mb-1">
            空白处快捷添加
          </div>

          {/* Add Day Node */}
          <button
            type="button"
            onClick={() => {
              onAddDayNode?.(canvasX, canvasY);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-left"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D95D39]" />
            <div className="flex flex-col">
              <span className="font-bold text-[#2C2C2C]">新建日程节点 (Day)</span>
              <span className="text-[10px] text-[#7A7465]">加入横向推进时间轴</span>
            </div>
          </button>

          {/* Add Time/Event Node */}
          <button
            type="button"
            onClick={() => {
              onAddTimeNode?.(canvasX, canvasY);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-left"
          >
            <Clock className="w-3.5 h-3.5 text-[#2E7D5B]" />
            <div className="flex flex-col">
              <span className="font-bold text-[#2C2C2C]">新建时段行程节点</span>
              <span className="text-[10px] text-[#7A7465]">具体时刻与路况事项</span>
            </div>
          </button>

          {/* Add Category Branch */}
          <button
            type="button"
            onClick={() => {
              onAddCategoryBranch?.(canvasX, canvasY);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-left"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="text-[#2C2C2C]">新建主题分类分支</span>
          </button>

          <div className="h-px bg-[#EAE7DF] my-1" />

          {/* Fit View */}
          <button
            type="button"
            onClick={() => {
              onFitView?.();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-left text-[#7A7465]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>自适应居中全览</span>
          </button>

          {/* Auto Layout */}
          <button
            type="button"
            onClick={() => {
              onAutoLayout?.();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-xl transition text-left text-[#7A7465]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D95D39]" />
            <span>恢复整齐规整排版</span>
          </button>
        </>
      )}
    </div>
  );
};
