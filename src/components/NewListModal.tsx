import React, { useState } from 'react';
import {
  X,
  Plus,
  Compass,
  FilePlus,
  Layers,
  Sparkles,
  Mountain,
  Download,
  Check,
} from 'lucide-react';
import { HikingList, TrailType } from '../types';
import { TEMPLATE_LISTS, DEFAULT_CATEGORIES, POPULAR_MOUNTAINS } from '../data/defaultTemplates';
import { shareService } from '../services/shareService';
import { mindMapStorageService } from '../services/mindMapStorageService';
import {
  GENYE_2026_MINDMAP,
  WUGONGSHAN_MINDMAP,
  DEFAULT_TRIP_MINDMAP,
} from '../data/presetMindMaps';

interface NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAddList: (list: HikingList) => void;
}

export const NewListModal: React.FC<NewListModalProps> = ({
  isOpen,
  onClose,
  userId,
  onAddList,
}) => {
  const [tab, setTab] = useState<'template' | 'custom' | 'import'>('template');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [trailType, setTrailType] = useState<TrailType>('overnight_camp');
  const [durationDays, setDurationDays] = useState(2);
  const [importCodeOrLink, setImportCodeOrLink] = useState('');
  const [importError, setImportError] = useState('');

  const handleCreateFromTemplate = (templateIdx: number) => {
    const tpl = TEMPLATE_LISTS[templateIdx];
    const newList: HikingList = {
      id: 'list-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      userId,
      title: tpl.title,
      description: tpl.description,
      destination: tpl.destination,
      destinationCoords: tpl.destinationCoords,
      trailType: tpl.trailType,
      durationDays: tpl.durationDays,
      customCategories: JSON.parse(JSON.stringify(tpl.customCategories || DEFAULT_CATEGORIES)),
      items: JSON.parse(JSON.stringify(tpl.items)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    // Initialize mind map for template
    if (tpl.title.includes('格聂') || tpl.destination.includes('格聂')) {
      mindMapStorageService.saveMindMap(newList.id, JSON.parse(JSON.stringify(GENYE_2026_MINDMAP)), []);
    } else if (tpl.title.includes('武功山') || tpl.destination.includes('武功山')) {
      mindMapStorageService.saveMindMap(newList.id, JSON.parse(JSON.stringify(WUGONGSHAN_MINDMAP)), []);
    } else {
      const defaultMap = JSON.parse(JSON.stringify(DEFAULT_TRIP_MINDMAP));
      defaultMap.title = `${tpl.title} · 行程导图`;
      mindMapStorageService.saveMindMap(newList.id, defaultMap, []);
    }

    onAddList(newList);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Match destination coords if preset
    const matchedPreset = POPULAR_MOUNTAINS.find(
      (m) => destination.includes(m.name.split('·')[1] || m.name) || m.name.includes(destination)
    );

    const newList: HikingList = {
      id: 'list-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      userId,
      title: title.trim(),
      destination: destination.trim() || '未设定山野目的地',
      destinationCoords: matchedPreset ? { lat: matchedPreset.lat, lng: matchedPreset.lng } : undefined,
      trailType,
      durationDays: Math.max(1, durationDays),
      customCategories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    // Explicitly initialize with an EMPTY mind map (only root node, children is empty [])
    const emptyMindMap = {
      id: `root-${newList.id}`,
      title: newList.title,
      description: destination.trim() ? `目的地：${destination.trim()} · ${newList.durationDays}日` : '点击编辑或添加行程节点',
      tag: '规划',
      color: '#5A5A40',
      children: [],
    };
    mindMapStorageService.saveMindMap(newList.id, emptyMindMap, [], 'timeline-flow');

    onAddList(newList);
    onClose();
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    if (!importCodeOrLink.trim()) return;

    const decoded = shareService.decodeShareLink(importCodeOrLink.trim());
    if (!decoded || !decoded.title || !decoded.items) {
      setImportError('无法解析该分享链接或口令，请确认链接完整有效');
      return;
    }

    const newList: HikingList = {
      id: 'list-' + Date.now().toString(36) + '-imported',
      userId,
      title: `${decoded.title} (来自${decoded.creatorName || '队友'})`,
      destination: decoded.destination || '徒步目的地',
      trailType: decoded.trailType || 'day_hike',
      durationDays: decoded.durationDays || 1,
      customCategories: decoded.categories || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      items: decoded.items.map((it) => ({ ...it, id: 'item-' + Math.random().toString(36).substring(2, 8) })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    onAddList(newList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">新建行程规划</h2>
              <p className="text-xs text-[#DCD8CD]">模版预设、从零自建或导入队友分享</p>
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

        {/* Tab switcher */}
        <div className="flex border-b border-[#E5E1D8] bg-[#F5F5F0] px-4 text-xs font-medium text-[#7A7465] shrink-0">
          <button
            type="button"
            onClick={() => setTab('template')}
            className={`py-3 px-3 border-b-2 transition ${
              tab === 'template'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            经典模版一键套用
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`py-3 px-3 border-b-2 transition ${
              tab === 'custom'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            空白自建
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`py-3 px-3 border-b-2 transition ${
              tab === 'import'
                ? 'border-[#5A5A40] text-[#5A5A40] font-bold'
                : 'border-transparent hover:text-[#2C2C2C]'
            }`}
          >
            导入队友分享
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAF9F5]">
          {/* Tab 1: Template Presets */}
          {tab === 'template' && (
            <div className="space-y-3">
              <p className="text-xs text-[#7A7465]">
                由资深户外驴友团队严选校对的专业行程规划模版，一键载入：
              </p>
              {TEMPLATE_LISTS.map((tpl, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white hover:bg-[#F0EEE8] border border-[#E5E1D8] hover:border-[#5A5A40] rounded-2xl transition space-y-2 group shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[#2C2C2C] group-hover:text-[#5A5A40] transition">
                        {tpl.title}
                      </h4>
                      <p className="text-xs text-[#7A7465] mt-0.5">{tpl.description}</p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#D9D4C7] text-[#5A5A40] shrink-0">
                      {tpl.items.length} 件装备
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#D27D59] font-bold">
                      📍 {tpl.destination} · {tpl.durationDays}日
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateFromTemplate(idx)}
                      className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      套用此模版
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Custom List */}
          {tab === 'custom' && (
            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">行程规划标题</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：长坪沟穿越两日、香山周末拉练"
                  className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">徒步目的地 / 山峰</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="例如：江西·武功山、四姑娘山大峰"
                  className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">路线类型</label>
                  <select
                    value={trailType}
                    onChange={(e) => setTrailType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="day_hike">单日轻装徒步</option>
                    <option value="overnight_camp">重装露营徒步</option>
                    <option value="high_altitude">高海拔雪山徒步</option>
                    <option value="thru_hike">长距离长线穿越</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">预计徒步天数</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition mt-3"
              >
                创建空白行程规划
              </button>
            </form>
          )}

          {/* Tab 3: Import */}
          {tab === 'import' && (
            <form onSubmit={handleImport} className="space-y-3">
              <p className="text-xs text-[#6B6555]">
                粘贴同行队友发送给您的专属分享链接（含 #share=...）或口令码：
              </p>

              <div>
                <textarea
                  rows={4}
                  required
                  value={importCodeOrLink}
                  onChange={(e) => setImportCodeOrLink(e.target.value)}
                  placeholder="在此粘贴队友的分享链接..."
                  className="w-full p-3 bg-white border border-[#D9D4C7] rounded-xl text-xs font-mono text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              {importError && (
                <p className="text-xs text-[#D27D59] font-bold">{importError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                解析并导入为我的行程规划
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
