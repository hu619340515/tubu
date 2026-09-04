/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Mountain,
  Plus,
  Compass,
  CheckCircle2,
  FolderPlus,
  Share2,
  CloudSun,
  AlertCircle,
  ExternalLink,
  Edit3,
  Check,
  X,
} from 'lucide-react';

import { User, HikingList, GearItem, Category, TrailType, SiteAnnouncement } from './types';
import { storageService } from './services/storageService';
import { shareService } from './services/shareService';
import { Navbar, ActiveViewMode } from './components/Navbar';
import { ListHeader } from './components/ListHeader';
import { CategorySection } from './components/CategorySection';
import { WeatherModal } from './components/WeatherModal';
import { ShareModal } from './components/ShareModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { WeightStatsModal } from './components/WeightStatsModal';
import { NewListModal } from './components/NewListModal';
import { AuthModal } from './components/AuthModal';
import { AdminModal } from './components/AdminModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MindMapCanvas } from './components/mindmap/MindMapCanvas';
import { GitFork, Radio } from 'lucide-react';

export default function App() {
  // 1. User Account State (null means not logged in)
  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.getActiveUser());

  // 1.1 Active View Mode ('mindmap' | 'checklist')
  const [activeView, setActiveView] = useState<ActiveViewMode>('mindmap');

  // 2. User's Personal Lists
  const [lists, setLists] = useState<HikingList[]>(() =>
    currentUser ? storageService.getUserLists(currentUser.id) : []
  );

  // 3. Active List ID
  const [activeListId, setActiveListId] = useState<string>(() => {
    if (!currentUser) return '';
    const userLists = storageService.getUserLists(currentUser.id);
    return userLists.length > 0 ? userLists[0].id : '';
  });

  // 4. Modals State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [isNewListOpen, setIsNewListOpen] = useState(false);

  // 4.1 Site Announcement State
  const [announcement, setAnnouncement] = useState<SiteAnnouncement>(() =>
    storageService.getSiteAnnouncement()
  );

  useEffect(() => {
    const handleAnnouncementUpdate = () => {
      setAnnouncement(storageService.getSiteAnnouncement());
    };
    window.addEventListener('trailpack_announcement_update', handleAnnouncementUpdate);
    return () => window.removeEventListener('trailpack_announcement_update', handleAnnouncementUpdate);
  }, []);

  // 5. In-List Filters
  const [filterMode, setFilterMode] = useState<'all' | 'unpacked' | 'essential'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingMindMapTitle, setIsEditingMindMapTitle] = useState(false);
  const [mindMapEditTitle, setMindMapEditTitle] = useState('');

  // 6. Shared Banner (when opened via #share=...)
  const [sharedBanner, setSharedBanner] = useState<{
    creatorName: string;
    title: string;
    payload: any;
  } | null>(null);

  // Sync user lists to localStorage whenever lists change
  const saveLists = useCallback(
    (newLists: HikingList[]) => {
      setLists(newLists);
      if (currentUser) {
        storageService.saveUserLists(currentUser.id, newLists);
      }
    },
    [currentUser]
  );

  // Handle URL hash sharing when page loads
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('share=')) {
      const decoded = shareService.decodeShareLink(hash);
      if (decoded && decoded.title && decoded.items) {
        setSharedBanner({
          creatorName: decoded.creatorName || '同行驴友',
          title: decoded.title,
          payload: decoded,
        });
      }
    }
  }, []);

  // When active user changes, reload their personal exclusive lists and sync with server
  const handleUserChanged = (newUser: User) => {
    setCurrentUser(newUser);
    const cachedLists = storageService.getUserLists(newUser.id);
    setLists(cachedLists);
    if (cachedLists.length > 0) {
      setActiveListId(cachedLists[0].id);
    } else {
      setActiveListId('');
    }
    setIsAuthOpen(false);

    // Sync from server database across devices
    storageService
      .fetchUserListsFromServer(newUser.id)
      .then((serverLists) => {
        if (serverLists && serverLists.length > 0) {
          setLists(serverLists);
          setActiveListId((prev) =>
            serverLists.some((l) => l.id === prev) ? prev : serverLists[0].id
          );
        }
      })
      .catch((e) => console.warn('[App] Server lists sync failed:', e));
  };

  // Sync server lists for current user on mount
  useEffect(() => {
    if (currentUser?.id) {
      storageService
        .fetchUserListsFromServer(currentUser.id)
        .then((serverLists) => {
          if (serverLists && serverLists.length > 0) {
            setLists(serverLists);
            setActiveListId((prev) =>
              serverLists.some((l) => l.id === prev) ? prev : serverLists[0].id
            );
          }
        })
        .catch((e) => console.warn('[App] Initial server lists sync failed:', e));
    }
  }, [currentUser?.id]);

  // Safe logout handler
  const handleLogout = useCallback(() => {
    if (confirm('确定要退出当前登录账号吗？')) {
      storageService.logout();
      setCurrentUser(null);
      setLists([]);
      setActiveListId('');
    }
  }, []);

  // Find active list
  const activeList = useMemo(() => {
    return lists.find((l) => l.id === activeListId) || lists[0] || null;
  }, [lists, activeListId]);

  // Handle importing list from shared banner
  const handleImportShared = () => {
    if (!sharedBanner) return;
    const payload = sharedBanner.payload;
    const newList: HikingList = {
      id: 'list-' + Date.now().toString(36) + '-shared',
      userId: currentUser.id,
      title: `${payload.title} (来自${sharedBanner.creatorName})`,
      destination: payload.destination || '徒步目的地',
      trailType: payload.trailType || 'day_hike',
      durationDays: payload.durationDays || 1,
      customCategories: payload.categories || activeList?.customCategories || [],
      items: payload.items.map((i: GearItem) => ({
        ...i,
        id: 'item-' + Math.random().toString(36).substring(2, 8),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    const updatedLists = [newList, ...lists];
    saveLists(updatedLists);
    setActiveListId(newList.id);
    setSharedBanner(null);
    window.location.hash = '';
  };

  // Item Operations
  const handleToggleItem = (itemId: string) => {
    if (!activeList) return;

    let allNowPacked = false;

    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;

      const updatedItems = l.items.map((item) => {
        if (item.id === itemId) {
          return { ...item, packed: !item.packed };
        }
        return item;
      });

      const total = updatedItems.length;
      const packed = updatedItems.filter((i) => i.packed).length;
      if (total > 0 && packed === total) {
        allNowPacked = true;
      }

      return {
        ...l,
        items: updatedItems,
        updatedAt: Date.now(),
      };
    });

    saveLists(updatedLists);

    // If all items packed, trigger celebratory confetti
    if (allNowPacked) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#38bdf8'],
        });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        items: l.items.filter((item) => item.id !== itemId),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<GearItem>) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        items: l.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleAddItem = (
    categoryId: string,
    name: string,
    weightGrams: number,
    isEssential: boolean
  ) => {
    if (!activeList) return;
    const newItem: GearItem = {
      id: 'item-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name,
      categoryId,
      weightGrams,
      quantity: 1,
      packed: false,
      isEssential,
      packLocation: 'backpack',
    };

    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        items: [...l.items, newItem],
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleBatchToggleCategory = (categoryId: string, packAll: boolean) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        items: l.items.map((item) =>
          item.categoryId === categoryId ? { ...item, packed: packAll } : item
        ),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleBatchToggleAll = (packAll: boolean) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        items: l.items.map((item) => ({ ...item, packed: packAll })),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);

    if (packAll) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // Custom Category Operations
  const handleAddCategory = (category: Category) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        customCategories: [...l.customCategories, category],
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleUpdateCategory = (categoryId: string, updates: Partial<Category>) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        customCategories: l.customCategories.map((cat) =>
          cat.id === categoryId ? { ...cat, ...updates } : cat
        ),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        customCategories: l.customCategories.filter((cat) => cat.id !== categoryId),
        // reassign orphan items to first remaining category
        items: l.items.filter((item) => item.categoryId !== categoryId),
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  // List Operations
  const handleAddList = (newList: HikingList) => {
    const updatedLists = [newList, ...lists];
    saveLists(updatedLists);
    setActiveListId(newList.id);
  };

  const handleDeleteList = (id: string) => {
    const remaining = lists.filter((l) => l.id !== id);
    saveLists(remaining);
    if (remaining.length > 0) {
      setActiveListId(remaining[0].id);
    } else {
      setActiveListId('');
    }
  };

  const handleUpdateListDetails = (
    id: string,
    updates: {
      title?: string;
      destination?: string;
      durationDays?: number;
      trailType?: TrailType;
    }
  ) => {
    const updatedLists = lists.map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        ...updates,
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  const handleApplyDestination = (name: string, coords: { lat: number; lng: number }) => {
    if (!activeList) return;
    const updatedLists = lists.map((l) => {
      if (l.id !== activeList.id) return l;
      return {
        ...l,
        destination: name,
        destinationCoords: coords,
        updatedAt: Date.now(),
      };
    });
    saveLists(updatedLists);
  };

  // Filter and search items
  const filteredItems = useMemo(() => {
    if (!activeList) return [];

    return activeList.items.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchName && !matchNotes) return false;
      }

      // 2. Filter Mode
      if (filterMode === 'unpacked' && item.packed) return false;
      if (filterMode === 'essential' && !item.isEssential) return false;

      return true;
    });
  }, [activeList, searchQuery, filterMode]);

  // Mandatory Login Barrier: If not logged in on first open, require login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex flex-col justify-between selection:bg-[#5A5A40] selection:text-white">
        <Navbar
          currentUser={null}
          lists={[]}
          activeListId=""
          activeView="mindmap"
          onSelectView={() => {}}
          onSelectList={() => {}}
          onOpenNewList={() => {}}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenWeather={() => setIsWeatherOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthModal
            isOpen={true}
            onClose={() => {}}
            currentUser={null}
            onUserChanged={handleUserChanged}
            isMandatory={true}
          />
        </div>
        {/* Weather Forecast Modal (Can still be previewed) */}
        <WeatherModal
          isOpen={isWeatherOpen}
          onClose={() => setIsWeatherOpen(false)}
          destination="四川·格聂神山大环线"
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#F5F5F0] text-[#2C2C2C] flex flex-col font-sans selection:bg-[#5A5A40] selection:text-white ${
        activeView === 'mindmap' ? 'h-screen overflow-hidden' : 'pb-16'
      }`}
    >
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        lists={lists}
        activeListId={activeListId}
        activeView={activeView}
        onSelectView={setActiveView}
        onSelectList={setActiveListId}
        onOpenNewList={() => setIsNewListOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Site Announcement Banner */}
      {announcement.enabled && (
        <div
          className={`w-full px-4 py-2 sm:px-6 flex items-center justify-between text-xs transition border-b ${
            announcement.type === 'alert'
              ? 'bg-[#FDF2F0] text-[#D27D59] border-[#D27D59]/30'
              : announcement.type === 'warning'
              ? 'bg-[#FEF7EA] text-[#B7791F] border-[#B7791F]/30'
              : 'bg-[#EBF3E8] text-[#3D6B35] border-[#3D6B35]/30'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1">
            <Radio className="w-4 h-4 shrink-0 animate-pulse text-[#D27D59]" />
            <span className="font-bold shrink-0">【{announcement.title}】</span>
            <span className="truncate">{announcement.content}</span>
          </div>
        </div>
      )}

      {/* 2.1 Shared Link Imported Banner (if opened from social share URL) */}
      {sharedBanner && (
        <div className="bg-[#5A5A40] text-white px-4 py-3 border-b border-[#484833] shadow-md">
          <div className="w-full px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="p-1 bg-[#484833] rounded-lg text-white">
                <Share2 className="w-4 h-4" />
              </span>
              <span>
                正在浏览由 <strong>{sharedBanner.creatorName}</strong> 分享的徒步清单：
                <span className="text-[#EAE7DF] ml-1 font-semibold">
                  “{sharedBanner.title}”
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportShared}
                className="px-3.5 py-1.5 bg-[#D27D59] hover:bg-[#be6e4c] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>一键导入为我的专属清单</span>
              </button>
              <button
                type="button"
                onClick={() => setSharedBanner(null)}
                className="text-xs text-[#DCD8CD] hover:text-white px-2 py-1"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Container (Adaptive across all screen resolutions) */}
      <main
        className={
          activeView === 'mindmap'
            ? 'w-full px-2 sm:px-4 lg:px-6 pt-2 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden'
            : 'max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex-1 w-full space-y-6'
        }
      >
        {activeList ? (
          activeView === 'mindmap' ? (
            /* Mind Map View (Adaptive Full-Width and Full-Height Canvas for Any Screen Resolution) */
            <div className="bg-white border border-[#D9D4C7] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs flex-1 flex flex-col min-h-0 h-full">
              <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#FAF8F5] border-b border-[#D9D4C7] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="p-1 sm:p-1.5 bg-[#5A5A40] text-white rounded-xl shadow-2xs shrink-0">
                    <GitFork className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                  <div className="min-w-0">
                    {isEditingMindMapTitle ? (
                      <form
                        className="flex items-center gap-1.5 py-0.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = mindMapEditTitle.trim();
                          if (val && activeList) {
                            handleUpdateListDetails(activeList.id, { title: val });
                          }
                          setIsEditingMindMapTitle(false);
                        }}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={mindMapEditTitle}
                          onChange={(e) => setMindMapEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setIsEditingMindMapTitle(false);
                          }}
                          className="px-2.5 py-1 text-xs sm:text-sm font-bold text-[#2C2C2C] bg-white border border-[#5A5A40] rounded-lg shadow-inner outline-none focus:ring-2 focus:ring-[#5A5A40]/30 min-w-[200px] sm:min-w-[280px]"
                          placeholder="输入行程全案标题..."
                        />
                        <button
                          type="submit"
                          title="保存标题"
                          className="p-1 sm:p-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg transition cursor-pointer shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="取消"
                          onClick={() => setIsEditingMindMapTitle(false)}
                          className="p-1 sm:p-1.5 bg-[#EAE7DF] hover:bg-[#D9D4C7] text-[#7A7465] rounded-lg transition cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <h2
                          className="text-xs sm:text-sm md:text-base font-bold text-[#2C2C2C] truncate cursor-pointer hover:text-[#5A5A40] transition flex items-center gap-1.5"
                          title="点击编辑标题"
                          onClick={() => {
                            setMindMapEditTitle(activeList.title);
                            setIsEditingMindMapTitle(true);
                          }}
                        >
                          <span>{activeList.title} · 行程规划思维导图</span>
                          <Edit3 className="w-3.5 h-3.5 text-[#7A7465] opacity-60 group-hover/title:opacity-100 transition shrink-0" />
                        </h2>
                        {activeList.durationDays && (
                          <span className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-[#EAE7DF] text-[#5A5A40] rounded-full shrink-0">
                            {activeList.durationDays} 天行程
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] sm:text-[11px] text-[#7A7465] hidden md:block">
                      横向日期线性推进 · 当日事项纵向串联 · 支持卡片自由拖拽平移、框选多选、拉线连接与防重叠自动整理
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full h-full min-h-0 relative">
                <MindMapCanvas
                  listId={activeList.id}
                  listTitle={activeList.title}
                  destination={activeList.destination}
                />
              </div>
            </div>
          ) : (
            /* Checklist View */
            <>
              {/* List Header & Progress Dashboard */}
            <ListHeader
              list={activeList}
              onOpenWeather={() => setIsWeatherOpen(true)}
              onOpenShare={() => setIsShareOpen(true)}
              onOpenCategoryManager={() => setIsCategoryOpen(true)}
              onOpenWeightStats={() => setIsWeightOpen(true)}
              onBatchToggleAll={handleBatchToggleAll}
              onDeleteList={handleDeleteList}
              onUpdateListDetails={handleUpdateListDetails}
              filterMode={filterMode}
              onFilterChange={setFilterMode}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Category Sections Grid / List */}
            <div className="space-y-4">
              {activeList.customCategories.map((category) => {
                const categoryItems = filteredItems.filter(
                  (item) => item.categoryId === category.id
                );

                // If filtering/searching and category has 0 matching items, we can still show or hide
                if ((searchQuery || filterMode !== 'all') && categoryItems.length === 0) {
                  return null;
                }

                return (
                  <CategorySection
                    key={category.id}
                    category={category}
                    items={categoryItems}
                    onToggleItem={handleToggleItem}
                    onDeleteItem={handleDeleteItem}
                    onUpdateItem={handleUpdateItem}
                    onAddItem={handleAddItem}
                    onBatchToggleCategory={handleBatchToggleCategory}
                  />
                );
              })}

              {/* No search results fallback */}
              {filteredItems.length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E1D8] shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0EEE8] flex items-center justify-center mx-auto text-[#7A7465]">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#2C2C2C]">
                      未找到符合条件的装备
                    </h3>
                    <p className="text-xs text-[#7A7465] mt-1">
                      请尝试清空搜索关键词或切换过滤条件
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterMode('all');
                    }}
                    className="px-4 py-2 bg-[#EAE7DF] hover:bg-[#E2DDD0] text-[#2C2C2C] text-xs font-semibold rounded-xl transition"
                  >
                    重置筛选条件
                  </button>
                </div>
              )}
            </div>

            {/* Natural Tones Signature Bottom Readiness Bar */}
            <div className="bg-[#5A5A40] text-white p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#DCD8CD] font-bold block">
                    待打包件数
                  </span>
                  <span className="text-2xl font-bold font-mono">
                    {activeList.items.filter((i) => !i.packed).length}{' '}
                    <span className="text-xs font-normal text-[#DCD8CD]">件</span>
                  </span>
                </div>
                <div className="w-[1px] h-9 bg-white/20" />
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#DCD8CD] font-bold block">
                    行囊预估总重
                  </span>
                  <span className="text-2xl font-bold font-mono">
                    {(
                      activeList.items.reduce(
                        (sum, i) => sum + (i.weightGrams || 0) * (i.quantity || 1),
                        0
                      ) / 1000
                    ).toFixed(2)}{' '}
                    <span className="text-xs font-normal text-[#DCD8CD]">kg</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-medium transition text-center"
                >
                  导出分享卡
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchToggleAll(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#D27D59] hover:bg-[#be6e4c] text-white rounded-2xl text-xs font-bold transition shadow-xs text-center"
                >
                  一键全部装包
                </button>
              </div>
            </div>
          </>
        )
      ) : (
          /* Empty state if user has no lists */
          <div className="p-16 text-center bg-white rounded-3xl border border-[#E5E1D8] shadow-sm max-w-lg mx-auto my-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EEE8] text-[#5A5A40] flex items-center justify-center mx-auto">
              <Mountain className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#2C2C2C]">
                专属清单库为空
              </h2>
              <p className="text-xs text-[#7A7465] mt-1 max-w-sm mx-auto">
                欢迎来到【溜个弯】！您可以立即从经典路线模版创建，或自由从零规划您的下一趟山野行囊。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewListOpen(true)}
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>创建第一张徒步专属清单</span>
            </button>
          </div>
        )}
      </main>

      {/* 4. Modals */}
      {/* Weather Forecast Modal */}
      {activeList && (
        <WeatherModal
          isOpen={isWeatherOpen}
          onClose={() => setIsWeatherOpen(false)}
          destination={activeList.destination}
          initialCoords={activeList.destinationCoords}
          onApplyDestination={handleApplyDestination}
        />
      )}

      {/* Social Sharing Modal */}
      {activeList && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          list={activeList}
          creatorName={currentUser.username}
        />
      )}

      {/* Category Manager Modal */}
      {activeList && (
        <CategoryManagerModal
          isOpen={isCategoryOpen}
          onClose={() => setIsCategoryOpen(false)}
          categories={activeList.customCategories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Weight Stats Modal */}
      {activeList && (
        <WeightStatsModal
          isOpen={isWeightOpen}
          onClose={() => setIsWeightOpen(false)}
          list={activeList}
        />
      )}

      {/* New List Modal */}
      <NewListModal
        isOpen={isNewListOpen}
        onClose={() => setIsNewListOpen(false)}
        userId={currentUser.id}
        onAddList={handleAddList}
      />

      {/* User Auth & Personal Profile Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        onLogout={handleLogout}
        isMandatory={!currentUser}
      />

      {/* Admin Management Console Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
        onUserListsChanged={() => {
          if (currentUser) {
            setLists(storageService.getUserLists(currentUser.id));
          }
        }}
      />

      {/* 5. Persistent Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
