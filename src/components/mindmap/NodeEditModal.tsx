import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, Tag, Clock, Mountain } from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: MindMapNode | null;
  isRoot: boolean;
  onSave: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onDelete: (nodeId: string) => void;
}

const COLOR_PRESETS = [
  { name: '深海夜蓝', value: '#183153' },
  { name: '山野橄榄', value: '#5A5A40' },
  { name: '陶土红岩', value: '#D95D39' },
  { name: '高山云杉', value: '#2E7D5B' },
  { name: '高原赭黄', value: '#B7791F' },
  { name: '安全警戒', value: '#B33A3A' },
  { name: '晴空湛蓝', value: '#2563EB' },
  { name: '岩石冷灰', value: '#64748B' },
];

const TAG_PRESETS = ['日程', '营地', '交通', '海拔', '合规', '天气', '安全', '装备', '后勤', '备忘'];

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  onClose,
  node,
  isRoot,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [elevation, setElevation] = useState('');
  const [tag, setTag] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (node) {
      setTitle(node.title || '');
      setDescription(node.description || '');
      setTime(node.time || '');
      setElevation(node.elevation || '');
      setTag(node.tag || '');
      setColor(node.color || '#5A5A40');
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(node.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      time: time.trim() || undefined,
      elevation: elevation.trim() || undefined,
      tag: tag.trim() || undefined,
      color: color || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#D9D4C7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D5] bg-[#EAE7DF]/60">
          <div>
            <h3 className="text-base font-bold text-[#2C2C2C]">
              {isRoot ? '编辑导图主题' : '编辑节点内容'}
            </h3>
            <p className="text-[11px] text-[#7A7465]">规划每日节奏与关键提示</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-[#7A7465] hover:text-[#2C2C2C] hover:bg-[#D9D4C7]/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Node Title */}
          <div>
            <label className="block text-xs font-bold text-[#2C2C2C] mb-1">
              节点标题 <span className="text-[#D95D39]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：9/26 成都 → 康定"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9D4C7] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-xl outline-none"
              autoFocus
            />
          </div>

          {/* Time & Elevation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#2C2C2C] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>时刻/时段 (选填)</span>
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="例如：10:00、下午"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9D4C7] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#2C2C2C] mb-1 flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>海拔高度 (选填)</span>
              </label>
              <input
                type="text"
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                placeholder="例如：4350m"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9D4C7] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Tag & Quick Selection */}
          <div>
            <label className="block text-xs font-bold text-[#2C2C2C] mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>分类标签 (选填)</span>
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="自定义标签或从下方快选"
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9D4C7] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-xl outline-none mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {TAG_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-2 py-0.5 text-[11px] rounded-lg border transition ${
                    tag === t
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:border-[#5A5A40]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-[#2C2C2C] mb-1">
              详细描述 / 注意事项 / 备忘 (选填)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：海拔约3890m，累计爬升约800m，需备齐硬壳与防风抓绒..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#D9D4C7] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-xl outline-none resize-none"
            />
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-xs font-bold text-[#2C2C2C] mb-1.5">
              节点主色调
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs hover:scale-110 relative"
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {color === c.value && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E0D5]">
            {!isRoot ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(node.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#B33A3A] hover:bg-[#FDE8E8] rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除节点</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#484833] rounded-xl shadow-xs transition"
              >
                保存变更
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
