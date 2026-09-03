import React, { useState } from 'react';
import { Check, Trash2, Edit2, Star, MessageSquare, Scale, Tag } from 'lucide-react';
import { GearItem } from '../types';

interface GearItemRowProps {
  item: GearItem;
  categoryColor: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<GearItem>) => void;
}

export const GearItemRow: React.FC<GearItemRowProps> = ({
  item,
  categoryColor,
  onToggle,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [weight, setWeight] = useState(item.weightGrams.toString());
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [notes, setNotes] = useState(item.notes || '');
  const [isEssential, setIsEssential] = useState(item.isEssential);
  const [packLocation, setPackLocation] = useState<'backpack' | 'worn' | 'pocket'>(item.packLocation || 'backpack');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdate(item.id, {
      name: name.trim(),
      weightGrams: Math.max(0, parseInt(weight, 10) || 0),
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      notes: notes.trim() || undefined,
      isEssential,
      packLocation,
    });
    setIsEditing(false);
  };

  const totalItemWeight = item.weightGrams * item.quantity;

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="p-4 my-2 rounded-2xl border-2 border-[#5A5A40]/40 bg-[#FDFBF7] text-[#2C2C2C] text-sm space-y-3 transition shadow-xs"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="物品名称（如：三层防水冲锋衣）"
            required
            className="flex-1 px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsEssential(!isEssential)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isEssential
                ? 'bg-[#D27D59] text-white border-[#D27D59]'
                : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isEssential ? 'fill-white' : ''}`} />
            <span>必带</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="text-[11px] text-[#7A7465] block mb-0.5 font-medium">单件克重 (g)</label>
            <input
              type="number"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#7A7465] block mb-0.5 font-medium">数量</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40]"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] text-[#7A7465] block mb-0.5 font-medium">打包位置</label>
            <select
              value={packLocation}
              onChange={(e) => setPackLocation(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40]"
            >
              <option value="backpack">🎒 背包内</option>
              <option value="worn">🧥 身上穿戴</option>
              <option value="pocket">👖 随身口袋/胸包</option>
            </select>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注说明（如：附防风钉、备用电池2节等）"
            className="w-full px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3.5 py-1.5 text-xs text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold bg-[#5A5A40] text-white hover:bg-[#484833] rounded-xl shadow-xs transition"
          >
            保存修改
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-150 ${
        item.packed
          ? 'bg-[#F5F5F0]/70 border-[#E5E1D8] text-[#8A8475]'
          : 'bg-white border-[#E5E1D8] text-[#2C2C2C] hover:border-[#D9D4C7] hover:shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox in Natural Tones */}
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          aria-label={item.packed ? '取消已打包状态' : '标记为已打包'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
            item.packed
              ? 'bg-[#5A5A40] border-[#5A5A40] text-white shadow-2xs'
              : 'border-[#D9D4C7] bg-white hover:border-[#5A5A40]'
          }`}
        >
          {item.packed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Item details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={() => onToggle(item.id)}
              className={`cursor-pointer text-sm font-semibold tracking-tight select-none truncate ${
                item.packed ? 'line-through text-[#8A8475]' : 'text-[#2C2C2C]'
              }`}
            >
              {item.name}
            </span>

            {/* Essential Star Tag in Natural Terracotta */}
            {item.isEssential && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#D27D59] bg-[#FDF2F0] border border-[#D27D59]/20 rounded-full shrink-0">
                <Star className="w-2.5 h-2.5 fill-[#D27D59] text-[#D27D59]" />
                必带
              </span>
            )}

            {/* Location Tag */}
            {item.packLocation === 'worn' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F0EEE8] text-[#7A7465] shrink-0">
                穿戴
              </span>
            )}
            {item.packLocation === 'pocket' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F0EEE8] text-[#7A7465] shrink-0">
                随身
              </span>
            )}
          </div>

          {/* Notes and Weight */}
          <div className="flex items-center gap-3 text-[11px] text-[#7A7465] mt-1">
            {totalItemWeight > 0 && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Scale className="w-3 h-3 text-[#8A8475]" />
                <span>
                  {totalItemWeight >= 1000
                    ? `${(totalItemWeight / 1000).toFixed(2)}kg`
                    : `${totalItemWeight}g`}
                  {item.quantity > 1 && ` (${item.weightGrams}g×${item.quantity})`}
                </span>
              </span>
            )}
            {item.notes && (
              <span className="inline-flex items-center gap-1 text-[#7A7465] truncate max-w-xs">
                <MessageSquare className="w-2.5 h-2.5 shrink-0 text-[#8A8475]" />
                <span className="truncate">{item.notes}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-[#8A8475] hover:text-[#2C2C2C] hover:bg-[#F0EEE8] rounded-lg transition"
          title="编辑装备"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-[#8A8475] hover:text-rose-700 hover:bg-[#FDF2F0] rounded-lg transition"
          title="删除物品"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
