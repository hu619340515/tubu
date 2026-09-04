import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
} from 'lucide-react';
import { ParsedTrack, TrackPoint, TrackWaypoint } from '../../types/track';
import { trackParserService } from '../../services/trackParserService';
import { ElevationChart } from './ElevationChart';

interface RouteMapPanelProps {
  onClose?: () => void;
  onFocusNodeByTitle?: (title: string) => void;
  highlightedNodeTitle?: string | null;
}

type LayerType = 'satellite' | 'topo' | 'osm';

const TILE_SERVERS: Record<LayerType, { url: string; attribution: string; subdomains?: string[] }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'OpenTopoMap (CC-BY-SA)',
    subdomains: ['a', 'b', 'c'],
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
};

function createDivIcon(emoji: string, bgClass: string, isSmall = false): L.DivIcon {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${isSmall ? '24px' : '30px'};
        height: ${isSmall ? '24px' : '30px'};
        border-radius: 50%;
        background: ${bgClass};
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: ${isSmall ? '12px' : '15px'};
        cursor: pointer;
        transform: translate(-50%, -50%);
      ">
        ${emoji}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const RouteMapPanel: React.FC<RouteMapPanelProps> = ({
  onClose,
  onFocusNodeByTitle,
  highlightedNodeTitle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trackLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('satellite');
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<TrackWaypoint | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 18,
    }).setView([29.8, 99.6], 11);

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Attribution control at bottom right
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Add Base Tile Layer
    const { url, attribution, subdomains } = TILE_SERVERS[activeLayer];
    const tileLayer = L.tileLayer(url, {
      attribution,
      subdomains: subdomains || 'abc',
      maxZoom: 18,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer group for tracks and markers
    const lg = L.layerGroup().addTo(map);
    trackLayerGroupRef.current = lg;

    // Hover marker
    const hm = L.circleMarker([0, 0], {
      radius: 6,
      fillColor: '#D95D39',
      color: '#FFFFFF',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.9,
    });
    hoverMarkerRef.current = hm;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    // Auto-load built-in Genye demo track
    trackParserService
      .loadBuiltinGenyeTrack()
      .then((parsed) => {
        setTrack(parsed);
        setLoading(false);
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch((e) => {
        console.warn('Failed to load demo track:', e);
        setLoading(false);
      });

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Base Map Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const { url, attribution, subdomains } = TILE_SERVERS[activeLayer];
    tileLayerRef.current.setUrl(url);
    tileLayerRef.current.options.attribution = attribution;
    if (subdomains) tileLayerRef.current.options.subdomains = subdomains;
  }, [activeLayer]);

  // Render Track & Waypoints when track changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = trackLayerGroupRef.current;
    if (!map || !lg || !track) return;

    lg.clearLayers();

    // 1. Draw Full Polyline
    const latLngs: L.LatLngTuple[] = track.allPoints.map((p) => [p.lat, p.lng]);
    if (latLngs.length > 0) {
      // Glow background line
      L.polyline(latLngs, {
        color: '#000000',
        weight: 6,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // Main colored route line
      L.polyline(latLngs, {
        color: '#D95D39',
        weight: 3.8,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // Fit bounds
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // 2. Add Waypoints Markers
    track.waypoints.forEach((wpt) => {
      let icon: L.DivIcon;
      if (wpt.type === 'start') {
        icon = createDivIcon('🟢', '#10B981');
      } else if (wpt.type === 'end') {
        icon = createDivIcon('🏁', '#EF4444');
      } else if (wpt.type === 'camp') {
        icon = createDivIcon('⛺', '#3B82F6');
      } else if (wpt.type === 'pass') {
        icon = createDivIcon('🏔️', '#8B5CF6');
      } else if (wpt.type === 'photo') {
        icon = createDivIcon('📸', '#F59E0B', true);
      } else {
        icon = createDivIcon('📍', '#64748B', true);
      }

      const marker = L.marker([wpt.lat, wpt.lng], { icon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; max-width: 220px;">
          <div style="font-weight: bold; color: #2C2C2C; margin-bottom: 2px;">
            ${wpt.name}
          </div>
          ${
            wpt.ele
              ? `<div style="font-size: 11px; color: #5A5A40; margin-bottom: 4px;">海拔: <strong>${wpt.ele}m</strong></div>`
              : ''
          }
          ${
            wpt.imageUrl
              ? `<div style="margin: 6px 0;"><img src="${wpt.imageUrl}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px;" /></div>`
              : ''
          }
          ${
            wpt.description
              ? `<p style="font-size: 11px; color: #666; margin: 4px 0;">${wpt.description}</p>`
              : ''
          }
          <button
            id="popup-btn-${wpt.id}"
            style="
              display: block;
              width: 100%;
              margin-top: 6px;
              padding: 4px 8px;
              background: #5A5A40;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            "
          >
            在思维导图中聚焦 🎯
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        setSelectedWaypoint(wpt);
        const btn = document.getElementById(`popup-btn-${wpt.id}`);
        if (btn) {
          btn.onclick = () => {
            onFocusNodeByTitle?.(wpt.name);
          };
        }
      });

      marker.addTo(lg);
    });
  }, [track, onFocusNodeByTitle]);

  // Sync Hover Marker with Elevation Chart
  useEffect(() => {
    const map = mapInstanceRef.current;
    const hm = hoverMarkerRef.current;
    if (!map || !hm) return;

    if (hoveredPoint) {
      hm.setLatLng([hoveredPoint.lat, hoveredPoint.lng]);
      if (!map.hasLayer(hm)) {
        hm.addTo(map);
      }
    } else {
      if (map.hasLayer(hm)) {
        map.removeLayer(hm);
      }
    }
  }, [hoveredPoint]);

  // Handle highlighted node from mindmap
  useEffect(() => {
    if (!highlightedNodeTitle || !track || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Search matching waypoint
    const matched = track.waypoints.find(
      (w) =>
        w.name.includes(highlightedNodeTitle) ||
        highlightedNodeTitle.includes(w.name)
    );

    if (matched) {
      map.flyTo([matched.lat, matched.lng], 14, { duration: 1.2 });
    }
  }, [highlightedNodeTitle, track]);

  // File Upload / Drop Handler
  const handleFile = useCallback(async (file: File) => {
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

      setTrack(parsed);
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || '解析轨迹文件失败');
      setLoading(false);
    }
  }, []);

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
    const latLngs: L.LatLngTuple[] = track.allPoints.map((p) => [p.lat, p.lng]);
    mapInstanceRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
  };

  return (
    <div
      className="flex flex-col w-full h-full bg-[#FAF8F5] border-r border-[#D9D4C7] relative overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/95 backdrop-blur border-b border-[#D9D4C7] shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#5A5A40] flex items-center justify-center text-white shrink-0">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#2C2C2C] truncate">
                {track?.title || '两步路轨迹地图'}
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
          {/* Layer Selector */}
          <div className="flex items-center bg-[#FAF8F5] border border-[#D9D4C7] p-0.5 rounded-lg text-[10px] font-bold text-[#7A7465]">
            <button
              type="button"
              onClick={() => setActiveLayer('satellite')}
              className={`px-1.5 py-0.5 rounded transition ${
                activeLayer === 'satellite'
                  ? 'bg-[#5A5A40] text-white'
                  : 'hover:text-[#2C2C2C]'
              }`}
              title="卫星遥感实景"
            >
              卫星
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('topo')}
              className={`px-1.5 py-0.5 rounded transition ${
                activeLayer === 'topo'
                  ? 'bg-[#5A5A40] text-white'
                  : 'hover:text-[#2C2C2C]'
              }`}
              title="等高线地形图"
            >
              等高线
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('osm')}
              className={`px-1.5 py-0.5 rounded transition ${
                activeLayer === 'osm'
                  ? 'bg-[#5A5A40] text-white'
                  : 'hover:text-[#2C2C2C]'
              }`}
              title="标准户外地图"
            >
              地图
            </button>
          </div>

          {/* Fit Bounds */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="p-1 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-lg transition cursor-pointer"
            title="居中适应全景"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Upload Track File Button */}
          <label
            className="p-1 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#5A5A40] rounded-lg transition cursor-pointer flex items-center"
            title="导入两步路轨迹 (.kmz/.kml/.gpx)"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept=".kmz,.kml,.gpx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </label>

          {/* Close Panel Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D9D4C7] text-[#7A7465] hover:text-[#2C2C2C] rounded-lg transition cursor-pointer"
              title="收起路线地图"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Highlight Mask */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-[#5A5A40]/80 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
          <Upload className="w-10 h-10 mb-2 animate-bounce" />
          <p className="text-sm font-bold">释放鼠标，立即导入两步路轨迹文件！</p>
          <p className="text-xs text-[#DCD8CD] mt-1">支持 .kmz / .kml / .gpx</p>
        </div>
      )}

      {/* Error notification */}
      {errorMsg && (
        <div className="px-3 py-1.5 bg-[#FDF2F0] text-[#D27D59] text-xs font-medium border-b border-[#D27D59]/30 flex items-center justify-between shrink-0">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-xs font-bold">
            ×
          </button>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div className="flex-1 w-full h-full relative min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-2xs flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md border border-[#E5E1D8] text-xs font-bold text-[#5A5A40]">
              <span className="w-3.5 h-3.5 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
              <span>正在载入两步路轨迹...</span>
            </div>
          </div>
        )}

        {/* Floating Waypoint Info Card */}
        {selectedWaypoint && (
          <div className="absolute top-2 left-2 right-2 sm:right-auto sm:max-w-xs z-20 bg-white/95 backdrop-blur rounded-xl border border-[#D9D4C7] p-2.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base">
                  {selectedWaypoint.type === 'start'
                    ? '🟢'
                    : selectedWaypoint.type === 'end'
                    ? '🏁'
                    : selectedWaypoint.type === 'camp'
                    ? '⛺'
                    : selectedWaypoint.type === 'pass'
                    ? '🏔️'
                    : selectedWaypoint.type === 'photo'
                    ? '📸'
                    : '📍'}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#2C2C2C] truncate">
                    {selectedWaypoint.name}
                  </h4>
                  {selectedWaypoint.ele && (
                    <p className="text-[10px] text-[#5A5A40] font-mono">
                      海拔 {selectedWaypoint.ele}m
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWaypoint(null)}
                className="text-[#7A7465] hover:text-[#2C2C2C] p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedWaypoint.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden max-h-32 border border-[#E5E1D8]">
                <img
                  src={selectedWaypoint.imageUrl}
                  alt={selectedWaypoint.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => onFocusNodeByTitle?.(selectedWaypoint.name)}
              className="w-full mt-2 py-1 bg-[#5A5A40] hover:bg-[#484833] text-white text-[11px] font-bold rounded-lg transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>在思维导图中高亮</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Elevation Profile Chart */}
      {track && (
        <ElevationChart
          points={track.allPoints}
          totalDistanceKm={track.totalDistanceKm}
          elevationGain={track.elevationGain}
          elevationLoss={track.elevationLoss}
          maxElevation={track.maxElevation}
          minElevation={track.minElevation}
          hoveredPoint={hoveredPoint}
          onHoverPoint={setHoveredPoint}
        />
      )}
    </div>
  );
};
