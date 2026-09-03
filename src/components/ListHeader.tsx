import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Share2,
  Tag,
  Scale,
  CloudSun,
  CheckCircle2,
  Trash2,
  Sparkles,
  Search,
  Filter,
  CheckCheck,
  RotateCcw,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { HikingList, TrailType } from '../types';

interface ListHeaderProps {
  list: HikingList;
  onOpenWeather: () => void;
  onOpenShare: () => void;
  onOpenCategoryManager: () => void;
  onOpenWeightStats: () => void;
  onBatchToggleAll: (packAll: boolean) => void;
  onDeleteList: (id: string) => void;
  onUpdateListDetails: (
    id: string,
    updates: {
      title?: string;
      destination?: string;
      durationDays?: number;
      trailType?: TrailType;
    }
  ) => void;
  filterMode: 'all' | 'unpacked' | 'essential';
  onFilterChange: (mode: 'all' | 'unpacked' | 'essential') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  list,
  onOpenWeather,
  onOpenShare,
  onOpenCategoryManager,
  onOpenWeightStats,
  onBatchToggleAll,
  onDeleteList,
  onUpdateListDetails,
  filterMode,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [editDest, setEditDest] = useState(list.destination);
  const [editDurationDays, setEditDurationDays] = useState(list.durationDays);
  const [editTrailType, setEditTrailType] = useState<TrailType>(list.trailType);

  useEffect(() => {
    if (!isEditingTitle) {
      setEditTitle(list.title);
      setEditDest(list.destination);
      setEditDurationDays(list.durationDays);
      setEditTrailType(list.trailType);
    }
  }, [list, isEditingTitle]);

  const totalItems = list.items.length;
  const packedItems = list.items.filter((i) => i.packed).length;
  const progressPercent = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const totalGrams = list.items.reduce((s, i) => s + i.weightGrams * i.quantity, 0);
  const packedGrams = list.items.filter((i) => i.packed).reduce((s, i) => s + i.weightGrams * i.quantity, 0);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onUpdateListDetails(list.id, {
      title: editTitle.trim(),
      destination: editDest.trim() || list.destination,
      durationDays: Math.max(1, editDurationDays),
      trailType: editTrailType,
    });
    setIsEditingTitle(false);
  };

  const trailTypeLabel = {
    day_hike: '单日轻装',
    overnight_camp: '重装露营',
    high_altitude: '高海拔雪山',
    thru_hike: '长线穿越',
  }[list.trailType] || '徒步';

  return (
    <div className="bg-white rounded-[2rem] border border-[#E5E1D8] p-5 sm:p-7 shadow-sm space-y-6">
      {/* Title, Destination, and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Title area */}
        <div className="space-y-1.5 flex-1 min-w-0">
          {isEditingTitle ? (
            <form onSubmit={handleSaveDetails} className="p-4 bg-[#FAF9F5] border border-[#D9D4C7] rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
                <span className="text-xs font-serif font-bold text-[#5A5A40] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#D27D59]" />
                  <span>编辑清单与重装行程详情</span>
                </span>
                <span className="text-[11px] text-[#7A7465]">支持修改行程天数、路线模式与目的地</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#5A5A40] block mb-1">清单名称</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="例如：武功山绝望坡重装两日"
                    required
                    className="w-full px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm font-semibold text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    autoFocus
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="text-[11px] font-bold text-[#5A5A40] block mb-1">目的地 / 山峰</label>
                  <input
                    type="text"
                    value={editDest}
                    onChange={(e) => setEditDest(e.target.value)}
                    placeholder="例如：江西·武功山"
                    className="w-full px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>

                {/* Trail Type */}
                <div>
                  <label className="text-[11px] font-bold text-[#5A5A40] block mb-1">路线类型</label>
                  <select
                    value={editTrailType}
                    onChange={(e) => setEditTrailType(e.target.value as TrailType)}
                    className="w-full px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="overnight_camp">⛺ 重装露营</option>
                    <option value="day_hike">🎒 单日轻装</option>
                    <option value="thru_hike">🌲 长线穿越</option>
                    <option value="high_altitude">🏔️ 高海拔雪山</option>
                  </select>
                </div>
              </div>

              {/* Duration Days with Quick Adjust +/- */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-bold text-[#5A5A40] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#D27D59]" />
                    <span>重装/徒步天数：</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white border border-[#D9D4C7] rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setEditDurationDays((d) => Math.max(1, d - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEE8] text-[#5A5A40] font-bold text-sm transition"
                      title="减少一天"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={editDurationDays}
                      onChange={(e) => setEditDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 text-center text-xs font-bold font-mono text-[#2C2C2C] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditDurationDays((d) => Math.min(99, d + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEE8] text-[#5A5A40] font-bold text-sm transition"
                      title="增加一天"
                    >
                      +
                    </button>
                    <span className="text-xs text-[#7A7465] pr-2 font-medium">天</span>
                  </div>

                  {/* Preset Quick Day Buttons */}
                  <div className="flex items-center gap-1 ml-1">
                    {[1, 2, 3, 5, 7].map((presetDay) => (
                      <button
                        key={presetDay}
                        type="button"
                        onClick={() => setEditDurationDays(presetDay)}
                        className={`px-2 py-0.5 text-[11px] rounded-lg border transition ${
                          editDurationDays === presetDay
                            ? 'bg-[#5A5A40] text-white border-[#5A5A40] font-bold'
                            : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
                        }`}
                      >
                        {presetDay}天
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save and Cancel Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="px-3 py-1.5 bg-white border border-[#D9D4C7] hover:bg-[#F0EEE8] text-[#7A7465] text-xs font-medium rounded-xl transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存行程设置</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#2C2C2C]">
                  {list.title}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(list.title);
                    setEditDest(list.destination);
                    setEditDurationDays(list.durationDays);
                    setEditTrailType(list.trailType);
                    setIsEditingTitle(true);
                  }}
                  className="text-[#8A8475] hover:text-[#2C2C2C] p-1.5 rounded-lg hover:bg-[#F0EEE8] transition flex items-center gap-1 text-xs"
                  title="修改清单信息与重装天数"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">编辑</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(list.title);
                    setEditDest(list.destination);
                    setEditDurationDays(list.durationDays);
                    setEditTrailType(list.trailType);
                    setIsEditingTitle(true);
                  }}
                  className="group inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-[#F0EEE8] hover:bg-[#EAE7DF] text-[#5A5A40] border border-[#D9D4C7] font-semibold transition cursor-pointer shadow-2xs"
                  title="点击直接修改重装天数与路线类型"
                >
                  <Calendar className="w-3 h-3 text-[#D27D59]" />
                  <span>{trailTypeLabel} · {list.durationDays}天</span>
                  <Edit3 className="w-3 h-3 text-[#7A7465] group-hover:text-[#5A5A40] transition" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#7A7465] mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-[#5A5A40] bg-[#F5F5F0] border border-[#E5E1D8] px-2 py-0.5 rounded-md">
                  <MapPin className="w-3.5 h-3.5 text-[#D27D59]" />
                  <span>{list.destination}</span>
                </span>
                <span className="text-[#D9D4C7]">|</span>
                <span>创建于 {new Date(list.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Feature Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenWeather}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FDF2F0] text-[#D27D59] border border-[#E5E1D8] text-xs font-semibold rounded-xl transition shadow-2xs"
          >
            <CloudSun className="w-4 h-4 text-[#D27D59]" />
            <span>查当地天气</span>
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>社交分享</span>
          </button>

          <button
            type="button"
            onClick={onOpenCategoryManager}
            className="flex items-center gap-1 px-2.5 py-2 bg-[#EAE7DF] hover:bg-[#E2DDD0] text-[#2C2C2C] text-xs font-medium rounded-xl transition"
            title="管理自定义分类标签"
          >
            <Tag className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="hidden sm:inline">分类标签</span>
          </button>

          <button
            type="button"
            onClick={onOpenWeightStats}
            className="flex items-center gap-1 px-2.5 py-2 bg-[#EAE7DF] hover:bg-[#E2DDD0] text-[#2C2C2C] text-xs font-medium rounded-xl transition"
            title="查看装备背负重量分析"
          >
            <Scale className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="hidden sm:inline">重量统计</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`确定要删除清单【${list.title}】吗？此操作无法撤销。`)) {
                onDeleteList(list.id);
              }
            }}
            className="p-2 text-[#8A8475] hover:text-rose-700 hover:bg-[#FDF2F0] rounded-xl transition"
            title="删除此清单"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress & Weight Dashboard */}
      <div className="p-5 bg-[#FDFBF7] border border-[#E5E1D8] rounded-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">打包检查进度</span>
            <span className="text-xs font-extrabold text-[#5A5A40] bg-[#F0EEE8] px-2 py-0.5 rounded-full font-mono">
              {progressPercent}%
            </span>
            <span className="text-xs text-[#7A7465] font-mono">
              ({packedItems}/{totalItems} 件已核验)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#7A7465]">
              已装包: <strong className="text-[#5A5A40]">{(packedGrams / 1000).toFixed(2)}kg</strong>
            </span>
            <span className="text-[#D9D4C7]">/</span>
            <span className="text-[#7A7465]">
              预计总重: <strong className="text-[#2C2C2C]">{(totalGrams / 1000).toFixed(2)}kg</strong>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar in Natural Tones */}
        <div className="w-full h-3 bg-[#F0EEE8] rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#5A5A40]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Packing Quick Controls & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg border transition ${
                filterMode === 'all'
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40] font-medium'
                  : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
              }`}
            >
              全部装备 ({totalItems})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('unpacked')}
              className={`px-2.5 py-1 rounded-lg border transition ${
                filterMode === 'unpacked'
                  ? 'bg-[#D27D59] text-white border-[#D27D59] font-medium'
                  : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
              }`}
            >
              待打包 ({totalItems - packedItems})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('essential')}
              className={`px-2.5 py-1 rounded-lg border transition ${
                filterMode === 'essential'
                  ? 'bg-[#3B3B2B] text-white border-[#3B3B2B] font-medium'
                  : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
              }`}
            >
              ★ 必带核心
            </button>
          </div>

          {/* Quick Bulk Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {packedItems < totalItems ? (
              <button
                type="button"
                onClick={() => onBatchToggleAll(true)}
                className="text-xs text-[#5A5A40] hover:text-[#2C2C2C] flex items-center gap-1 font-semibold transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>全部一键勾选</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onBatchToggleAll(false)}
                className="text-xs text-[#7A7465] hover:text-[#2C2C2C] flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置已打包</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* In-List Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8A8475] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="在当前清单中搜索物品名称（如：冲锋衣、帐篷、头灯、睡袋...）"
          className="w-full pl-9 pr-3 py-2 bg-[#F5F5F0] border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] placeholder:text-[#8A8475] focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-2.5 text-xs text-[#7A7465] hover:text-[#2C2C2C]"
          >
            清空
          </button>
        )}
      </div>
    </div>
  );
};
