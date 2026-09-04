import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { TrackPoint } from '../../types/track';
import { Mountain, TrendingUp, TrendingDown } from 'lucide-react';

interface ElevationChartProps {
  points: TrackPoint[];
  totalDistanceKm: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  onHoverPoint?: (point: TrackPoint | null) => void;
  hoveredPoint?: TrackPoint | null;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  points,
  totalDistanceKm,
  elevationGain,
  elevationLoss,
  maxElevation,
  minElevation,
  onHoverPoint,
  hoveredPoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [localHoverPoint, setLocalHoverPoint] = useState<TrackPoint | null>(null);

  const activePoint = hoveredPoint || localHoverPoint;

  // Responsive container width tracking via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!points || points.length === 0) {
    return (
      <div className="p-3 bg-[#FAF8F5] border-t border-[#D9D4C7] text-xs text-[#7A7465] text-center">
        暂无高程轨迹点数据
      </div>
    );
  }

  // Downsample points for smooth rendering if dense
  const sampledPoints: TrackPoint[] = useMemo(() => {
    const res: TrackPoint[] = [];
    const step = Math.max(1, Math.floor(points.length / 400));
    for (let i = 0; i < points.length; i += step) {
      res.push(points[i]);
    }
    if (res[res.length - 1] !== points[points.length - 1]) {
      res.push(points[points.length - 1]);
    }
    return res;
  }, [points]);

  // Layout parameters matching Two-Step Outdoor style (media_1788495771500.png)
  const height = 96;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 22;

  const chartW = Math.max(10, containerWidth - padLeft - padRight);
  const chartH = height - padTop - padBottom;

  // Elevation scale bounds (rounded nicely)
  const yMin = Math.max(0, Math.floor(minElevation / 500) * 500);
  const yMax = Math.ceil(maxElevation / 500) * 500;
  const yRange = yMax - yMin || 1;

  const xMax = totalDistanceKm || sampledPoints[sampledPoints.length - 1]?.distanceKm || 1;

  const getX = useCallback(
    (distKm: number) => padLeft + (distKm / xMax) * chartW,
    [chartW, xMax]
  );
  const getY = useCallback(
    (ele: number) => padTop + chartH - ((ele - yMin) / yRange) * chartH,
    [chartH, yMin, yRange]
  );

  const pathD = useMemo(() => {
    return sampledPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.distanceKm || 0).toFixed(1)} ${getY(p.ele).toFixed(1)}`)
      .join(' ');
  }, [sampledPoints, getX, getY]);

  const areaD = useMemo(() => {
    return `${pathD} L ${(padLeft + chartW).toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${padLeft} ${(padTop + chartH).toFixed(1)} Z`;
  }, [pathD, chartW]);

  // Mouse move handler with 1:1 pixel mapping
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;

      if (clientX < padLeft || clientX > padLeft + chartW) {
        setLocalHoverPoint(null);
        onHoverPoint?.(null);
        return;
      }

      const ratio = (clientX - padLeft) / chartW;
      const targetDist = ratio * xMax;

      // Binary search / find closest point
      let closest = points[0];
      let minDiff = 999999;
      for (let i = 0; i < points.length; i++) {
        const diff = Math.abs((points[i].distanceKm || 0) - targetDist);
        if (diff < minDiff) {
          minDiff = diff;
          closest = points[i];
        }
      }

      setLocalHoverPoint(closest);
      onHoverPoint?.(closest);
    },
    [chartW, xMax, points, onHoverPoint]
  );

  const handleMouseLeave = useCallback(() => {
    setLocalHoverPoint(null);
    onHoverPoint?.(null);
  }, [onHoverPoint]);

  // Active hover point coordinate calculations
  const activeX = activePoint ? getX(activePoint.distanceKm || 0) : 0;
  const activeY = activePoint ? getY(activePoint.ele) : 0;

  return (
    <div className="bg-[#FAF8F5] border-t border-[#D9D4C7] p-2 sm:p-2.5 shrink-0 select-none w-full">
      {/* Top statistics summary bar */}
      <div className="flex items-center justify-between gap-2 mb-1 px-1 text-[11px] text-[#7A7465]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#2C2C2C] flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>海拔剖面</span>
          </span>
          <span>
            最高 <strong className="text-[#2C2C2C]">{maxElevation}m</strong>
          </span>
          <span>
            最低 <strong className="text-[#2C2C2C]">{minElevation}m</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>+{elevationGain}m</span>
          </span>
          <span className="flex items-center gap-0.5 text-amber-700 font-medium">
            <TrendingDown className="w-3 h-3" />
            <span>-{elevationLoss}m</span>
          </span>
          <span className="font-mono font-bold text-[#5A5A40]">
            {totalDistanceKm}km
          </span>
        </div>
      </div>

      {/* Two-Step Outdoor Style Full-Width SVG Canvas (media_1788495771500.png) */}
      <div
        ref={containerRef}
        className="relative w-full h-[96px] cursor-crosshair overflow-hidden rounded-lg bg-white/70 border border-[#E5E1D8]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          width={containerWidth}
          height={height}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id="twoBuluGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4A90E2" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background horizontal grid lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft + chartW}
            y2={padTop}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={padLeft + chartW}
            y2={padTop + chartH / 2}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={padLeft + chartW}
            y2={padTop + chartH}
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Left Vertical Axis Title: 海拔(m) */}
          <text
            x={10}
            y={height / 2}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#4A709C"
            transform={`rotate(-90 10 ${height / 2})`}
          >
            海拔(m)
          </text>

          {/* Two-Step Outdoor Style Red Elevation Y-Axis Labels */}
          <text
            x={padLeft - 6}
            y={padTop + 3}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#EF4444"
            fontFamily="monospace"
          >
            {yMax}
          </text>
          <text
            x={padLeft - 6}
            y={padTop + chartH + 3}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#EF4444"
            fontFamily="monospace"
          >
            {yMin}
          </text>

          {/* Curve Area & Line (Two-Step Outdoor Sky Blue #4A90E2) */}
          <path d={areaD} fill="url(#twoBuluGradient)" />
          <path
            d={pathD}
            fill="none"
            stroke="#4A90E2"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Center Axis Title: 距离(m) */}
          <text
            x={padLeft + chartW / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#4A709C"
          >
            距离(m)
          </text>

          {/* KM Tick marks along bottom */}
          <text
            x={padLeft}
            y={height - 5}
            textAnchor="start"
            fontSize="9"
            fill="#94A3B8"
            fontFamily="monospace"
          >
            0
          </text>
          <text
            x={padLeft + chartW}
            y={height - 5}
            textAnchor="end"
            fontSize="9"
            fill="#94A3B8"
            fontFamily="monospace"
          >
            {(xMax * 1000).toFixed(0)}
          </text>

          {/* Two-Step Outdoor Style Hover Indicator & Vertical Hairline */}
          {activePoint && (
            <g>
              <line
                x1={activeX}
                y1={padTop - 2}
                x2={activeX}
                y2={padTop + chartH + 2}
                stroke="#94A3B8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <circle
                cx={activeX}
                cy={activeY}
                r="4.5"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Two-Step Outdoor Floating Tooltip (media_1788495771500.png) */}
        {activePoint && (
          <div
            className="absolute top-2 z-20 pointer-events-none bg-white/95 backdrop-blur-xs text-[#1E293B] text-[11px] px-3 py-1.5 rounded-lg shadow-lg border border-[#3B82F6]/60 space-y-0.5 leading-tight"
            style={{
              left: `${Math.min(
                Math.max(10, activeX + (activeX > containerWidth / 2 ? -150 : 16)),
                containerWidth - 160
              )}px`,
            }}
          >
            <div className="font-bold text-[#2563EB] flex items-center justify-between gap-2">
              <span>海拔:</span>
              <span className="font-mono">{activePoint.ele?.toFixed(2)} (米)</span>
            </div>
            <div className="text-gray-600 flex items-center justify-between gap-2 text-[10px]">
              <span>距离:</span>
              <span className="font-mono">{((activePoint.distanceKm || 0) * 1000).toFixed(0)} (米)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
