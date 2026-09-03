import React from 'react';
import { X, Scale, PieChart, Sparkles, Feather, ShieldAlert } from 'lucide-react';
import { HikingList } from '../types';

interface WeightStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: HikingList;
}

export const WeightStatsModal: React.FC<WeightStatsModalProps> = ({
  isOpen,
  onClose,
  list,
}) => {
  if (!isOpen) return null;

  const totalItems = list.items.length;
  const packedItems = list.items.filter((i) => i.packed);

  const totalWeightGrams = list.items.reduce((s, i) => s + i.weightGrams * i.quantity, 0);
  const packedWeightGrams = packedItems.reduce((s, i) => s + i.weightGrams * i.quantity, 0);

  // Worn weight vs Pack weight
  const wornWeightGrams = list.items
    .filter((i) => i.packLocation === 'worn')
    .reduce((s, i) => s + i.weightGrams * i.quantity, 0);

  const basePackWeightGrams = totalWeightGrams - wornWeightGrams;

  // Category weight breakdown
  const categoryStats = list.customCategories.map((cat) => {
    const items = list.items.filter((i) => i.categoryId === cat.id);
    const weight = items.reduce((s, i) => s + i.weightGrams * i.quantity, 0);
    const percent = totalWeightGrams > 0 ? (weight / totalWeightGrams) * 100 : 0;
    return {
      category: cat,
      count: items.length,
      weight,
      percent,
    };
  }).filter((s) => s.count > 0).sort((a, b) => b.weight - a.weight);

  // UL Weight evaluation
  const baseKg = basePackWeightGrams / 1000;
  let ulCategory = '传统重装装备';
  let ulDesc = '背负扎实，保障充足，建议审视非必需物品精简背负';
  let ulBadge = 'bg-[#F5F5F0] text-[#7A7465] border-[#D9D4C7]';

  if (baseKg < 4.5) {
    ulCategory = '极度轻量化 (SUL)';
    ulDesc = '极致超轻，身轻如燕，适合高阶快速穿越';
    ulBadge = 'bg-[#FAF9F5] text-[#5A5A40] border-[#5A5A40]';
  } else if (baseKg <= 9) {
    ulCategory = '舒适轻量化 (UL)';
    ulDesc = '重量与舒适性极佳平衡，适合大多数多日重装';
    ulBadge = 'bg-[#FAF9F5] text-[#5A5A40] border-[#5A5A40]';
  } else if (baseKg > 15) {
    ulCategory = '高负荷超重载';
    ulDesc = '负重偏大，徒步易引发膝关节疲劳，建议减重';
    ulBadge = 'bg-[#FDF2F0] text-[#D27D59] border-[#D27D59]';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">背负重量与轻量化分析</h2>
              <p className="text-xs text-[#DCD8CD]">优化行囊配比 · 科学减重无负担</p>
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#FAF9F5]">
          {/* Top 3 Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-white border border-[#E5E1D8] rounded-2xl text-center shadow-2xs">
              <p className="text-[11px] text-[#7A7465]">背负总重量</p>
              <p className="text-lg sm:text-xl font-bold font-mono text-[#2C2C2C] mt-0.5">
                {(totalWeightGrams / 1000).toFixed(2)}
                <span className="text-xs font-normal">kg</span>
              </p>
            </div>
            <div className="p-3 bg-[#F0EEE8] border border-[#D9D4C7] rounded-2xl text-center shadow-2xs">
              <p className="text-[11px] text-[#5A5A40] font-medium">已打包重量</p>
              <p className="text-lg sm:text-xl font-bold font-mono text-[#5A5A40] mt-0.5">
                {(packedWeightGrams / 1000).toFixed(2)}
                <span className="text-xs font-normal">kg</span>
              </p>
            </div>
            <div className="p-3 bg-white border border-[#E5E1D8] rounded-2xl text-center shadow-2xs">
              <p className="text-[11px] text-[#D27D59] font-medium">身上穿戴重</p>
              <p className="text-lg sm:text-xl font-bold font-mono text-[#D27D59] mt-0.5">
                {(wornWeightGrams / 1000).toFixed(2)}
                <span className="text-xs font-normal">kg</span>
              </p>
            </div>
          </div>

          {/* UL Evaluation Card */}
          <div className="p-4 bg-white border border-[#E5E1D8] rounded-2xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Feather className="w-4 h-4 text-[#5A5A40]" />
                <span className="text-xs font-bold text-[#2C2C2C]">背包基础重量评估 (Base Weight)</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${ulBadge}`}>
                {ulCategory}
              </span>
            </div>
            <p className="text-xs text-[#6B6555]">{ulDesc}</p>
            <p className="text-[11px] text-[#7A7465] font-mono">
              （注：基础重量不含消耗品水粮及身着穿戴鞋袜，当前为 {(basePackWeightGrams / 1000).toFixed(2)} kg）
            </p>
          </div>

          {/* Category Distribution Bars */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-2.5 flex items-center justify-between">
              <span>装备分类重量占比</span>
              <span className="text-[11px] font-normal text-[#7A7465]">共 {totalItems} 件装备</span>
            </h3>

            <div className="space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stat.category.color }}
                      />
                      <span className="font-medium text-[#2C2C2C]">{stat.category.name}</span>
                      <span className="text-[#7A7465] text-[11px]">({stat.count}件)</span>
                    </div>
                    <div className="font-mono text-[#2C2C2C]">
                      <span>{(stat.weight / 1000).toFixed(2)} kg</span>
                      <span className="text-[#7A7465] ml-1.5 font-normal">
                        ({stat.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Percentage Bar */}
                  <div className="h-2 w-full bg-[#EAE7DF] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.percent}%`,
                        backgroundColor: stat.category.color || '#5A5A40',
                      }}
                    />
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
