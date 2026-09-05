import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Upload,
  Layers,
  Sparkles,
  Maximize2,
  X,
  MapPin,
  Camera,
  Flag,
  Navigation,
  CheckCircle2,
  Trash2,
  Compass,
} from 'lucide-react';
import { ParsedTrack, TrackPoint, TrackWaypoint } from '../../types/track';
import { trackParserService } from '../../services/trackParserService';
import { trackStorageService } from '../../services/trackStorageService';
import { wgs84ToGcj02 } from '../../services/coordTransform';
import { ElevationChart } from './ElevationChart';
import { ImageLightboxModal, LightboxImageInfo } from '../common/ImageLightboxModal';

interface RouteMapPanelProps {
  listId: string;
  listTitle?: string;
  destination?: string;
  onClose?: () => void;
}

type LayerType = 'satellite' | 'topo' | 'osm';

// Domestic high-speed AutoNavi (AMap) tiles (100% accessible, sub-10ms response in China)
const TILE_CONFIG: Record<
  LayerType,
  {
    base: string;
    annotation?: string;
    subdomains: string[];
    attribution: string;
  }
> = {
  satellite: {
    base: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    annotation: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '高德卫星影像 · 极速出图',
  },
  topo: {
    base: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '高德地形晕渲 · 等高线地貌',
  },
  osm: {
    base: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '高德标准地图 · 户外路网',
  },
};

function createDivIcon(emoji: string, bgClass: string, label?: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${bgClass};
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          font-size: 14px;
        ">
          ${emoji}
        </div>
        ${
          label
            ? `<div style="
                margin-top: 2px;
                padding: 1px 6px;
                background: rgba(255,255,255,0.92);
                border: 1px solid #D9D4C7;
                border-radius: 6px;
                font-size: 10px;
                font-weight: bold;
                color: #2C2C2C;
                white-space: nowrap;
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
              ">${label}</div>`
            : ''
        }
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const RouteMapPanelComponent: React.FC<RouteMapPanelProps> = ({
  listId,
  listTitle,
  destination,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const annoTileLayerRef = useRef<L.TileLayer | null>(null);
  const trackLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);

  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('satellite');
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<TrackWaypoint | null>(null);
  const [lightboxImage, setLightboxImage] = useState<LightboxImageInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load track specific to current listId
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    hasFittedBoundsRef.current = false;

    trackStorageService
      .getTrack(listId, listTitle, destination)
      .then((loadedTrack) => {
        if (!active) return;
        setTrack(loadedTrack);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        console.warn('[RouteMap] Failed to load track:', e);
        setTrack(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listId, listTitle, destination]);

  // Initialize or cleanup Leaflet Map based on track existence
  useEffect(() => {
    if (!track) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        baseTileLayerRef.current = null;
        annoTileLayerRef.current = null;
        trackLayerGroupRef.current = null;
        hoverMarkerRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 18,
    }).setView([29.8, 99.6], 11);

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Attribution control at bottom right
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Base tile layer
    const cfg = TILE_CONFIG[activeLayer];
    const baseLayer = L.tileLayer(cfg.base, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains,
      maxZoom: 18,
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Annotation overlay layer (for satellite layer)
    if (cfg.annotation) {
      const annoLayer = L.tileLayer(cfg.annotation, {
        subdomains: cfg.subdomains,
        maxZoom: 18,
      }).addTo(map);
      annoTileLayerRef.current = annoLayer;
    }

    // Layer group for tracks and markers
    const lg = L.layerGroup().addTo(map);
    trackLayerGroupRef.current = lg;

    // Hover marker on track
    const hm = L.circleMarker([0, 0], {
      radius: 6.5,
      fillColor: '#2563EB',
      color: '#FFFFFF',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    });
    hoverMarkerRef.current = hm;

    mapInstanceRef.current = map;

    // Auto resize observer
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      baseTileLayerRef.current = null;
      annoTileLayerRef.current = null;
      trackLayerGroupRef.current = null;
      hoverMarkerRef.current = null;
    };
  }, [track]);

  // Global bulletproof click listener for popup photo lightbox (Capture phase)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement)?.closest('.popup-lightbox-trigger') as HTMLElement | null;
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        const url = trigger.getAttribute('data-img-url');
        if (url) {
          const descRaw = trigger.getAttribute('data-img-desc');
          let desc = '';
          if (descRaw) {
            try {
              desc = decodeURIComponent(descRaw);
            } catch {
              desc = descRaw;
            }
          }
          setLightboxImage({
            url,
            title: trigger.getAttribute('data-img-title') || '',
            time: trigger.getAttribute('data-img-time') || undefined,
            ele: trigger.getAttribute('data-img-ele') ? Number(trigger.getAttribute('data-img-ele')) : undefined,
            distFromStartKm: trigger.getAttribute('data-img-start') ? Number(trigger.getAttribute('data-img-start')) : undefined,
            distToEndKm: trigger.getAttribute('data-img-end') ? Number(trigger.getAttribute('data-img-end')) : undefined,
            description: desc || undefined,
          });
        }
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  // Switch Base Map Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTileLayerRef.current) return;

    const cfg = TILE_CONFIG[activeLayer];
    baseTileLayerRef.current.setUrl(cfg.base);
    baseTileLayerRef.current.options.attribution = cfg.attribution;
    baseTileLayerRef.current.options.subdomains = cfg.subdomains;

    if (cfg.annotation) {
      if (!annoTileLayerRef.current) {
        const annoLayer = L.tileLayer(cfg.annotation, {
          subdomains: cfg.subdomains,
          maxZoom: 18,
        }).addTo(map);
        annoTileLayerRef.current = annoLayer;
      } else {
        annoTileLayerRef.current.setUrl(cfg.annotation);
        if (!map.hasLayer(annoTileLayerRef.current)) {
          annoTileLayerRef.current.addTo(map);
        }
      }
    } else {
      if (annoTileLayerRef.current && map.hasLayer(annoTileLayerRef.current)) {
        map.removeLayer(annoTileLayerRef.current);
      }
    }
  }, [activeLayer]);

  // Render Track & Waypoints whenever track changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = trackLayerGroupRef.current;
    if (!map || !lg || !track) return;

    lg.clearLayers();

    // Convert WGS84 GPS track coordinates to GCJ02 for seamless alignment on domestic tiles
    const latLngs: L.LatLngTuple[] = track.allPoints.map((p) => {
      const [gcjLat, gcjLng] = wgs84ToGcj02(p.lat, p.lng);
      return [gcjLat, gcjLng];
    });

    if (latLngs.length > 0) {
      // 1. White border casing line for contrast
      L.polyline(latLngs, {
        color: '#FFFFFF',
        weight: 6.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // 2. Main vibrant outdoor trail line
      L.polyline(latLngs, {
        color: '#E63946',
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // Fit map bounds to track ONLY ONCE on initial load
      if (!hasFittedBoundsRef.current) {
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
          hasFittedBoundsRef.current = true;
        }
      }
    }

    // Filter meaningful waypoints to keep map clean and prevent DOM overload
    const meaningfulWaypoints = track.waypoints.filter((wpt) => {
      if (wpt.type === 'start' || wpt.type === 'end' || wpt.type === 'camp' || wpt.type === 'pass') {
        return true;
      }
      const cleanName = wpt.name.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      return (
        cleanName &&
        cleanName !== '实景打卡' &&
        !cleanName.startsWith('标点') &&
        cleanName !== 'Point' &&
        cleanName !== 'Waypoint'
      );
    });

    // 3. Add prominent waypoint markers
    meaningfulWaypoints.forEach((wpt) => {
      const cleanName = wpt.name.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      let icon: L.DivIcon;
      if (wpt.type === 'start') {
        icon = createDivIcon('🟢', '#10B981', '起点 · 然日卡');
      } else if (wpt.type === 'end') {
        icon = createDivIcon('🏁', '#EF4444', '终点 · 惹迪');
      } else if (wpt.type === 'camp') {
        icon = createDivIcon('⛺', '#3B82F6', cleanName || '营地');
      } else if (wpt.type === 'pass') {
        icon = createDivIcon('🏔️', '#8B5CF6', cleanName || '垭口');
      } else if (wpt.imageUrl || cleanName.includes('眼') || cleanName.includes('湖')) {
        icon = createDivIcon('📸', '#F59E0B', cleanName);
      } else {
        icon = createDivIcon('📍', '#64748B', cleanName);
      }

      const [gcjLat, gcjLng] = wgs84ToGcj02(wpt.lat, wpt.lng);
      const marker = L.marker([gcjLat, gcjLng], { icon });

      const imgId = `popup-img-${wpt.id}`;

      // Popup Content matching Two-Step Outdoor design (media_1788502214246.png)
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 210px; max-width: 260px; padding: 2px;">
          ${
            wpt.imageUrl
              ? `
                <div
                  id="${imgId}"
                  class="popup-lightbox-trigger cursor-pointer"
                  data-wpt-id="${wpt.id}"
                  data-img-url="${wpt.imageUrl}"
                  data-img-title="${cleanName || wpt.name}"
                  data-img-time="${wpt.time || ''}"
                  data-img-ele="${wpt.ele || ''}"
                  data-img-start="${wpt.distFromStartKm ?? ''}"
                  data-img-end="${wpt.distToEndKm ?? ''}"
                  data-img-desc="${wpt.description ? encodeURIComponent(wpt.description) : ''}"
                  style="
                    margin-bottom: 8px;
                    position: relative;
                    cursor: pointer;
                    overflow: hidden;
                    border-radius: 8px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.18);
                  "
                  title="点击查看高清大图"
                >
                  <img
                    src="${wpt.imageUrl}"
                    alt="${cleanName || wpt.name}"
                    style="
                      width: 100%;
                      height: 135px;
                      object-fit: cover;
                      display: block;
                    "
                  />
                  <div style="
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                    background: rgba(0,0,0,0.7);
                    color: #FFFFFF;
                    padding: 2px 7px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    pointer-events: none;
                  ">
                    🔍 点击放大
                  </div>
                </div>
              `
              : ''
          }

          <div style="font-size: 13.5px; font-weight: bold; color: #2C2C2C; margin-bottom: 2px;">
            ${cleanName || wpt.name}
          </div>

          ${
            wpt.time
              ? `<div style="font-size: 11px; color: #7A7465; font-family: monospace; margin-bottom: 4px;">
                  ${wpt.time}
                </div>`
              : ''
          }

          <div style="display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #5A5A40; margin-top: 4px; border-top: 1px solid #EAE7DF; padding-top: 4px;">
            ${
              wpt.ele
                ? `<div>海拔: <strong style="color: #2C2C2C; font-family: monospace;">${wpt.ele}m</strong></div>`
                : ''
            }
            ${
              wpt.distFromStartKm !== undefined || wpt.distToEndKm !== undefined
                ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 10.5px; color: #64748B; margin-top: 1px;">
                    ${wpt.distFromStartKm !== undefined ? `<span>🟢 距起点 <strong style="color: #2563EB; font-family: monospace;">${wpt.distFromStartKm}km</strong></span>` : ''}
                    ${wpt.distToEndKm !== undefined ? `<span>🏁 距终点 <strong style="color: #D95D39; font-family: monospace;">${wpt.distToEndKm}km</strong></span>` : ''}
                  </div>`
                : ''
            }
          </div>

          ${
            wpt.description
              ? `<p style="font-size: 10.5px; color: #666; margin-top: 4px; line-height: 1.3;">${wpt.description}</p>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', (ev: any) => {
        setSelectedWaypoint(wpt);
        const popupNode = ev.popup?.getElement?.() || document.getElementById(imgId);
        if (popupNode && wpt.imageUrl) {
          const trigger = (popupNode.classList?.contains('popup-lightbox-trigger')
            ? popupNode
            : popupNode.querySelector?.('.popup-lightbox-trigger')) as HTMLElement | null;
          if (trigger) {
            const openModal = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              setLightboxImage({
                url: wpt.imageUrl!,
                title: cleanName || wpt.name,
                time: wpt.time,
                ele: wpt.ele,
                distFromStartKm: wpt.distFromStartKm,
                distToEndKm: wpt.distToEndKm,
                description: wpt.description,
              });
            };
            trigger.onclick = openModal;
            L.DomEvent.on(trigger, 'click', openModal);
          }
        }
      });

      marker.addTo(lg);
    });
  }, [track]);

  // Sync Hover Marker with Elevation Chart
  useEffect(() => {
    const map = mapInstanceRef.current;
    const hm = hoverMarkerRef.current;
    if (!map || !hm) return;

    if (hoveredPoint) {
      const [gcjLat, gcjLng] = wgs84ToGcj02(hoveredPoint.lat, hoveredPoint.lng);
      hm.setLatLng([gcjLat, gcjLng]);
      if (!map.hasLayer(hm)) {
        hm.addTo(map);
      }
    } else {
      if (map.hasLayer(hm)) {
        map.removeLayer(hm);
      }
    }
  }, [hoveredPoint]);

  // File Upload / Drop Handler
  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const name = file.name.toLowerCase();
        let parsed: ParsedTrack;
        if (name.endsWith('.kmz')) {
          const buf = await file.arrayBuffer();
          parsed = await trackParserService.parseKmz(buf);
        } else if (name.endsWith('.kml')) {
          const text = await file.text();
          parsed = trackParserService.parseKml(text);
        } else if (name.endsWith('.gpx')) {
          const text = await file.text();
          parsed = trackParserService.parseGpx(text);
        } else {
          throw new Error('仅支持 .kmz、.kml 或 .gpx 格式的轨迹文件');
        }

        hasFittedBoundsRef.current = false;
        await trackStorageService.saveTrack(listId, parsed);
        setTrack(parsed);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || '解析轨迹文件失败');
        setLoading(false);
      }
    },
    [listId]
  );

  const handleLoadGenyePreset = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      hasFittedBoundsRef.current = false;
      const genyeTrack = await trackParserService.loadBuiltinGenyeTrack();
      await trackStorageService.saveTrack(listId, genyeTrack);
      setTrack(genyeTrack);
      setLoading(false);
    } catch (e: any) {
      setErrorMsg('载入格聂经典轨迹失败，请检查网络');
      setLoading(false);
    }
  }, [listId]);

  const handleDeleteTrack = useCallback(async () => {
    if (!window.confirm('确定要移除当前规划的轨迹地图数据吗？移除后可随时重新导入。')) {
      return;
    }
    setLoading(true);
    try {
      await trackStorageService.deleteTrack(listId);
      setTrack(null);
      hasFittedBoundsRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !track || track.allPoints.length === 0) return;
    const latLngs: L.LatLngTuple[] = track.allPoints.map((p) => {
      const [gcjLat, gcjLng] = wgs84ToGcj02(p.lat, p.lng);
      return [gcjLat, gcjLng];
    });
    mapInstanceRef.current.invalidateSize();
    mapInstanceRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
  };

  const isGenyeRoute = (listTitle || '').includes('格聂') || (destination || '').includes('格聂');

  return (
    <div
      className="flex flex-col w-full h-full bg-[#FAF8F5] border-r border-[#D9D4C7] relative overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white/95 backdrop-blur border-b border-[#D9D4C7] shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#5A5A40] flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#2C2C2C] truncate">
                {track ? track.title || `${listTitle || '路线'} · 轨迹地图` : '路线轨迹地图'}
              </h3>
              {track && (
                <span className="text-[10px] bg-[#FAF3E0] text-[#B87A28] px-1.5 py-0.2 rounded font-bold shrink-0">
                  {track.totalDistanceKm}km
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {track && (
            <>
              {/* Layer Selector */}
              <div className="flex items-center bg-[#FAF8F5] border border-[#D9D4C7] p-0.5 rounded-lg text-[10px] font-bold text-[#7A7465]">
                <button
                  type="button"
                  onClick={() => setActiveLayer('satellite')}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    activeLayer === 'satellite'
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'hover:text-[#2C2C2C]'
                  }`}
                  title="高德卫星影像（实景地貌）"
                >
                  卫星
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLayer('topo')}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    activeLayer === 'topo'
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'hover:text-[#2C2C2C]'
                  }`}
                  title="高德地形晕渲（等高线）"
                >
                  等高线
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLayer('osm')}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    activeLayer === 'osm'
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'hover:text-[#2C2C2C]'
                  }`}
                  title="高德标准地图（路网地名）"
                >
                  地图
                </button>
              </div>

              {/* Fit Bounds */}
              <button
                type="button"
                onClick={handleFitBounds}
                className="p-1 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-lg transition cursor-pointer"
                title="居中全屏适应"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Replace Track Button */}
              <label
                className="p-1 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-lg transition cursor-pointer flex items-center"
                title="重新导入/更换轨迹 (.kmz/.kml/.gpx)"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".kmz,.kml,.gpx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* Delete Track Button */}
              <button
                type="button"
                onClick={handleDeleteTrack}
                className="p-1 hover:bg-[#FDE8E8] text-[#7A7465] hover:text-[#B33A3A] rounded-lg transition cursor-pointer"
                title="移除当前轨迹"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Close Panel Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[#FDE8E8] text-[#7A7465] hover:text-[#B33A3A] rounded-lg transition cursor-pointer"
              title="关闭地图分屏"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Area: Track Map or Add Track Button Placeholder */}
      <div className="flex-1 w-full min-h-0 relative">
        {track ? (
          <div ref={mapContainerRef} className="w-full h-full relative" />
        ) : (
          /* Empty Track Placeholder: "添加轨迹" Button View */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="max-w-sm w-full p-6 sm:p-8 bg-white rounded-3xl border-2 border-dashed border-[#D9D4C7] hover:border-[#5A5A40] transition shadow-xs flex flex-col items-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EEE8] text-[#5A5A40] flex items-center justify-center shadow-2xs">
                <Compass className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#2C2C2C]">
                  暂未导入轨迹数据
                </h4>
                <p className="text-[11px] text-[#7A7465] leading-relaxed">
                  当前规划尚未绑定 GPS 路线轨迹。导入后将自动生成卫星实景地图、沿途打卡点与海拔高程剖面图。
                </p>
              </div>

              {/* Primary "Add Track" Button */}
              <label className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>添加轨迹 (KMZ / KML / GPX)</span>
                <input
                  type="file"
                  accept=".kmz,.kml,.gpx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-1.5 text-[10px] text-[#A39E93]">
                <span>支持拖拽两步路、六只脚、Google Earth 导出的轨迹文件到此处</span>
              </div>

              {isGenyeRoute && (
                <button
                  type="button"
                  onClick={handleLoadGenyePreset}
                  className="text-[11px] font-semibold text-[#D27D59] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>快速载入格聂经典全景轨迹预设</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-[#5A5A40]/85 backdrop-blur-xs flex flex-col items-center justify-center text-white border-2 border-dashed border-white m-3 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 mb-2 animate-bounce" />
            <p className="text-sm font-bold">释放鼠标导入轨迹文件</p>
            <p className="text-xs text-white/80">支持两步路 KMZ、KML、GPX 文件</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#5A5A40] border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-[#5A5A40] font-medium">
              正在处理两步路轨迹数据...
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="absolute top-3 left-3 right-3 z-30 bg-[#FDE8E8] text-[#B33A3A] p-2.5 rounded-xl border border-[#F8B4B4] text-xs flex items-center justify-between shadow-md">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="font-bold text-[#B33A3A] px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. Elevation Profile Chart (Only shown when track is present) */}
      {track && track.allPoints.length > 0 && (
        <ElevationChart
          points={track.allPoints}
          totalDistanceKm={track.totalDistanceKm}
          elevationGain={track.elevationGain}
          elevationLoss={track.elevationLoss}
          maxElevation={track.maxElevation}
          minElevation={track.minElevation}
          onHoverPoint={setHoveredPoint}
          hoveredPoint={hoveredPoint}
        />
      )}

      {/* 4. Full-Screen Photo Lightbox Modal */}
      <ImageLightboxModal
        imageInfo={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};

export const RouteMapPanel = React.memo(RouteMapPanelComponent);
