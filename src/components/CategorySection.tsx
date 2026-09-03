import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Tent,
  Shirt,
  Utensils,
  Compass,
  Zap,
  ShieldCheck,
  Briefcase,
  CheckCheck,
  Folder,
} from 'lucide-react';
import { Category, GearItem } from '../types';
import { GearItemRow } from './GearItemRow';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Tent,
  Shirt,
  Utensils,
  Compass,
  Zap,
  ShieldCheck,
  Briefcase,
  Folder,
};

interface CategorySectionProps {
  category: Category;
  items: GearItem[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<GearItem>) => void;
  onAddItem: (categoryId: string, name: string, weightGrams: number, isEssential: boolean) => void;
  onBatchToggleCategory: (categoryId: string, packAll: boolean) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onAddItem,
  onBatchToggleCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');
  const [newIsEssential, setNewIsEssential] = useState(false);

  const IconComponent = ICON_MAP[category.icon] || Folder;

  const totalItems = items.length;
  const packedItems = items.filter((i) => i.packed).length;
  const totalWeightGrams = items.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);
  const isAllPacked = totalItems > 0 && packedItems === totalItems;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    onAddItem(
      category.id,
      newItemName.trim(),
      parseInt(newItemWeight, 10) || 0,
      newIsEssential
    );

    setNewItemName('');
    setNewItemWeight('');
    setNewIsEssential(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-2xs overflow-hidden transition hover:border-[#D9D4C7]">
      {/* Category Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#F5F5F0]/70 border-b border-[#E5E1D8]">
        <div
          className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Category Color Dot & Icon */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: category.color || '#5A5A40' }}
          >
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-[#2C2C2C] tracking-tight truncate">
                {category.name}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAE7DF] text-[#5A5A40]">
                {packedItems}/{totalItems}
              </span>
            </div>
            <p className="text-[11px] text-[#7A7465] font-mono">
              分类重量: {(totalWeightGrams / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {totalItems > 0 && (
            <button
              type="button"
              onClick={() => onBatchToggleCategory(category.id, !isAllPacked)}
              className="px-2.5 py-1 text-xs text-[#5A5A40] hover:bg-[#EAE7DF] rounded-xl transition flex items-center gap-1 font-medium"
              title={isAllPacked ? '此分类全部取消已打包' : '此分类一键全部打包'}
            >
              <CheckCheck className={`w-3.5 h-3.5 ${isAllPacked ? 'text-[#5A5A40]' : ''}`} />
              <span className="hidden sm:inline">{isAllPacked ? '重置' : '全选'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 text-[#5A5A40] hover:bg-[#EAE7DF] rounded-xl transition"
            title="添加新物品"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#7A7465] hover:text-[#2C2C2C] rounded-xl transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Item List Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2 bg-[#FAF9F5]">
          {/* Quick Add Form inside Category */}
          {isAdding && (
            <form
              onSubmit={handleQuickAdd}
              className="p-3.5 mb-2 rounded-2xl bg-[#FDFBF7] border border-dashed border-[#5A5A40]/50 flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs shadow-2xs"
            >
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="输入装备名称（如：应急头灯）"
                className="flex-1 px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                autoFocus
              />
              <div className="w-24 shrink-0">
                <input
                  type="number"
                  min="0"
                  value={newItemWeight}
                  onChange={(e) => setNewItemWeight(e.target.value)}
                  placeholder="重量(g)"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <label className="flex items-center gap-1 select-none cursor-pointer text-[#5A5A40] font-semibold shrink-0 px-1">
                <input
                  type="checkbox"
                  checked={newIsEssential}
                  onChange={(e) => setNewIsEssential(e.target.checked)}
                  className="rounded text-[#5A5A40] focus:ring-[#5A5A40] w-3.5 h-3.5"
                />
                <span>必带</span>
              </label>
              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#5A5A40] text-white hover:bg-[#484833] font-bold rounded-xl shadow-xs transition"
                >
                  添加
                </button>
              </div>
            </form>
          )}

          {/* Render Items */}
          {items.length === 0 ? (
            <div className="text-center py-6 text-[#8A8475] text-xs">
              <p>暂无装备物品</p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-1.5 text-[#5A5A40] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>点击添加此分类装备</span>
              </button>
            </div>
          ) : (
            items.map((item) => (
              <GearItemRow
                key={item.id}
                item={item}
                categoryColor={category.color}
                onToggle={onToggleItem}
                onDelete={onDeleteItem}
                onUpdate={onUpdateItem}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
