import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CloudRain,
  Wind,
  Sun,
  Thermometer,
  Mountain,
  AlertTriangle,
  Compass,
  Check,
  RefreshCw,
} from 'lucide-react';
import { WeatherData } from '../types';
import { weatherService } from '../services/weatherService';
import { POPULAR_MOUNTAINS, MountainPreset } from '../data/defaultTemplates';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  initialCoords?: { lat: number; lng: number };
  onApplyDestination?: (name: string, coords: { lat: number; lng: number }) => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  destination,
  initialCoords,
  onApplyDestination,
}) => {
  const [currentDestination, setCurrentDestination] = useState(destination);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: 27.46, lng: 114.18 }
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load weather when modal opens or coordinates change
  useEffect(() => {
    if (!isOpen) return;

    // Check if destination matches any popular mountains
    const matchedPreset = POPULAR_MOUNTAINS.find(
      (m) =>
        destination.includes(m.name.split('·')[1] || m.name) ||
        m.name.includes(destination)
    );

    const targetCoords = initialCoords || (matchedPreset ? { lat: matchedPreset.lat, lng: matchedPreset.lng } : { lat: 29.81, lng: 99.63 });
    setCoords(targetCoords);
    setCurrentDestination(matchedPreset ? matchedPreset.name : destination || '四川·格聂神山大环线');

    loadWeather(targetCoords.lat, targetCoords.lng, matchedPreset ? matchedPreset.name : destination || '格聂神山');
  }, [isOpen, destination, initialCoords]);

  const loadWeather = async (lat: number, lng: number, name: string) => {
    setIsLoading(true);
    try {
      // 纯粹直接读取该经纬度地面气象观测与地貌实况，绝不做任何人工多余的高程递减折算
      const data = await weatherService.fetchWeather(lat, lng, name);
      setWeather(data);
    } catch (e) {
      console.error('Failed to load weather:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: MountainPreset) => {
    setCoords({ lat: preset.lat, lng: preset.lng });
    setCurrentDestination(preset.name);
    loadWeather(preset.lat, preset.lng, preset.name);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await weatherService.searchLocations(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (res: any) => {
    const fullName = `${res.name} (${res.country}${res.admin1 ? '·' + res.admin1 : ''})`;
    setCoords({ lat: res.lat, lng: res.lng });
    setCurrentDestination(res.name);
    loadWeather(res.lat, res.lng, fullName);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleApplyToCurrentList = () => {
    if (onApplyDestination) {
      onApplyDestination(currentDestination, coords);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-[#E5E1D8] overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5A5A40] text-white shrink-0 border-b border-[#484833]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">徒步目的地天气预报与装备指南</h2>
              <p className="text-xs text-[#DCD8CD]">
                地面观测站与高精数值模型 · 真实地表气象 · 智能装备提醒
              </p>
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#FAF9F5]">
          {/* Search bar & Popular tags */}
          <div className="space-y-2">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8A8475] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索任何徒步路线、城市或山峰（如：武功山、雨崩、富士山）"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9D4C7] rounded-xl text-xs sm:text-sm text-[#2C2C2C] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs sm:text-sm font-bold rounded-xl transition shrink-0"
              >
                {isSearching ? '查询中...' : '搜索'}
              </button>
            </form>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="p-2 bg-white border border-[#D9D4C7] rounded-xl shadow-lg space-y-1">
                <p className="text-[11px] text-[#7A7465] px-2 py-0.5 font-medium">找到以下位置：</p>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-[#F0EEE8] text-[#2C2C2C] flex items-center justify-between"
                  >
                    <span className="font-semibold">{res.name}</span>
                    <span className="text-[#8A8475] text-[11px]">
                      {res.admin1 ? `${res.admin1}, ` : ''}{res.country}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Hiking Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-[#7A7465] shrink-0 font-medium">快捷打卡点：</span>
              {POPULAR_MOUNTAINS.slice(0, 10).map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleSelectPreset(m)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    currentDestination.includes(m.name.split('·')[1] || m.name)
                      ? 'bg-[#FDF2F0] text-[#D27D59] border-[#D27D59]/50 font-bold'
                      : 'bg-white text-[#7A7465] border-[#D9D4C7] hover:bg-[#F0EEE8]'
                  }`}
                >
                  {m.name.split('·')[1] || m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Weather Content */}
          {isLoading ? (
            <div className="py-16 text-center text-[#7A7465] text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#5A5A40]" />
              <span>正在获取山野气象与高程数据...</span>
            </div>
          ) : weather ? (
            <div className="space-y-4">
              {/* Primary Current Condition Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#5A5A40] to-[#3B3B2B] text-white shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-serif font-bold tracking-tight">{weather.locationName}</h3>
                      <span className="text-[11px] bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-full font-mono font-medium">
                        海拔 ~{weather.elevation}m
                      </span>
                    </div>
                    <p className="text-[#DCD8CD] text-xs mt-1">
                      经纬度: {weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°E
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-4xl font-extrabold tracking-tighter">
                      {weather.currentTemp}°
                    </span>
                    <span className="text-lg">C</span>
                    <p className="text-[#DCD8CD] text-xs font-semibold mt-0.5">
                      {weather.currentWeatherText}
                    </p>
                  </div>
                </div>

                {/* Micro metrics grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/15 relative z-10 text-center">
                  <div className="bg-black/15 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-[#EAE7DF] text-xs">
                      <CloudRain className="w-3.5 h-3.5" />
                      <span>降水概率</span>
                    </div>
                    <p className="text-base font-bold mt-0.5">{weather.currentRainProb}%</p>
                  </div>
                  <div className="bg-black/15 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-[#EAE7DF] text-xs">
                      <Wind className="w-3.5 h-3.5" />
                      <span>风速</span>
                    </div>
                    <p className="text-base font-bold mt-0.5">{weather.currentWindSpeed} km/h</p>
                  </div>
                  <div className="bg-black/15 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-[#EAE7DF] text-xs">
                      <Sun className="w-3.5 h-3.5" />
                      <span>紫外线</span>
                    </div>
                    <p className="text-base font-bold mt-0.5">UV {weather.currentUvIndex}</p>
                  </div>
                </div>
              </div>

              {/* Data Source & Surface Elevation Note */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#7A7465] px-1 gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                  <span>数据源：<strong>Open-Meteo 高清地表气象</strong>（集成 ECMWF IFS 与 CMA 中国气象局模式）</span>
                </div>
                <span>当前站点真实地表海拔：~{weather.elevation}m</span>
              </div>

              {/* Smart Weather Gear Recommendations */}
              <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#D27D59]/30 text-[#2C2C2C] space-y-2">
                <div className="flex items-center gap-1.5 text-[#D27D59] font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-[#D27D59]" />
                  <span>依据当前徒步天气的针对性装备提醒</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#2C2C2C]">
                  {weather.gearRecommendations.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#D27D59] font-bold shrink-0">•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7-Day Forecast */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-2.5">
                  未来 7 日天气趋势
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {weather.daily.map((day, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#E5E1D8] rounded-xl text-center space-y-1 hover:border-[#5A5A40] transition shadow-2xs"
                    >
                      <p className="text-[11px] font-semibold text-[#7A7465]">
                        {idx === 0 ? '今天' : idx === 1 ? '明天' : day.date.slice(5)}
                      </p>
                      <p className="text-xs font-bold text-[#2C2C2C]">{day.weatherText}</p>
                      <p className="text-xs font-mono font-medium text-[#7A7465]">
                        {day.tempMin}° ~ {day.tempMax}°C
                      </p>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#D27D59] font-semibold">
                        <CloudRain className="w-3 h-3" />
                        <span>{day.rainProb}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E5E1D8] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => loadWeather(coords.lat, coords.lng, currentDestination)}
            className="text-xs text-[#7A7465] hover:text-[#2C2C2C] flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>刷新数据</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7A7465] hover:bg-[#EAE7DF] rounded-xl transition"
            >
              关闭
            </button>
            {onApplyDestination && (
              <button
                type="button"
                onClick={handleApplyToCurrentList}
                className="px-4 py-2 text-xs font-bold bg-[#5A5A40] hover:bg-[#484833] text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>设为当前清单目的地</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
