import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Tent,
  Shirt,
  Utensils,
  Compass,
  Zap,
  ShieldCheck,
  Briefcase,
  Folder,
  Palette,
} from 'lucide-react';
import { Category } from '../types';

const PRESET_COLORS = [
  '#5A5A40', // Olive Primary
  '#D27D59', // Clay / Terracotta
  '#C89D52', // Warm Ochre
  '#7C8B6B', // Sage Green
  '#8C6547', // Earth Warm Brown
  '#3F5E4D', // Forest Pine
  '#B56B6F', // Dusty Rose
  '#A04838', // Warm Rust
  '#606C78', // Mountain Slate
  '#483A33', // Deep Espresso
];

const AVAILABLE_ICONS = [
  { id: 'Tent', label: '露营' },
  { id: 'Shirt', label: '衣物' },
  { id: 'Utensils', label: '饮食' },
  { id: 'Compass', label: '导航' },
  { id: 'Zap', label: '电子' },
  { id: 'ShieldCheck', label: '安全' },
  { id: 'Briefcase', label: '装备' },
  { id: 'Folder', label: '综合' },
];

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCategory: Category = {
      id: 'cat-custom-' + Date.now().toString(36),
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
      isDefault: false,
    };

    onAddCategory(newCategory);
    setName('');
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateCategory(id, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">自定义装备分类标签</h2>
              <p className="text-xs text-[#DCD8CD]">个性化定制您的徒步装备体系</p>
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#FAF9F5]">
          {/* Add New Category Form */}
          <form onSubmit={handleCreate} className="p-4 bg-white border border-[#E5E1D8] rounded-2xl space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#D27D59]" />
              <span>新建自定义分类</span>
            </h3>

            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="分类名称（如：摄影器械、应急药物、极轻露营）"
                required
                className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
              />
            </div>

            {/* Color Swatches */}
            <div>
              <label className="text-[11px] text-[#7A7465] block mb-1.5 font-medium">标签主色调</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      selectedColor === c ? 'border-[#2C2C2C] scale-110 shadow-xs' : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-[11px] text-[#7A7465] block mb-1.5 font-medium">分类图标</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AVAILABLE_ICONS.map((ico) => (
                  <button
                    key={ico.id}
                    type="button"
                    onClick={() => setSelectedIcon(ico.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                      selectedIcon === ico.id
                        ? 'bg-[#FDF2F0] border-[#D27D59] text-[#D27D59] font-bold'
                        : 'bg-white border-[#D9D4C7] text-[#7A7465] hover:bg-[#F0EEE8]'
                    }`}
                  >
                    {ico.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              确认添加分类
            </button>
          </form>

          {/* Existing Categories List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-2.5">
              已启用分类 ({categories.length})
            </h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 bg-white border border-[#E5E1D8] rounded-xl hover:border-[#5A5A40] transition"
                >
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 border border-[#D9D4C7] rounded text-xs flex-1 text-[#2C2C2C]"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {PRESET_COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => saveEdit(cat.id)}
                        className="p-1 bg-[#5A5A40] text-white rounded hover:bg-[#484833]"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-semibold text-[#2C2C2C]">{cat.name}</span>
                      {cat.isDefault && (
                        <span className="text-[10px] text-[#7A7465] bg-[#EAE7DF] px-1.5 py-0.5 rounded font-medium">
                          基础
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-[#7A7465] hover:text-[#2C2C2C] rounded-lg transition"
                      title="编辑分类"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1.5 text-[#7A7465] hover:text-[#D27D59] rounded-lg transition"
                      title="删除分类"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-[#5A5A40] text-white hover:bg-[#484833] rounded-xl transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
