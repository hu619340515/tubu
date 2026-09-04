import React, { useRef, useState } from 'react';
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
  const [localHoverPoint, setLocalHoverPoint] = useState<TrackPoint | null>(null);

  const activePoint = hoveredPoint || localHoverPoint;

  if (!points || points.length === 0) {
    return (
      <div className="p-3 bg-[#FAF8F5] border-t border-[#E5E1D8] text-xs text-[#7A7465] text-center">
        暂无高程轨迹点数据
      </div>
    );
  }

  // Downsample points for smooth rendering if dense
  const sampledPoints: TrackPoint[] = [];
  const step = Math.max(1, Math.floor(points.length / 300));
  for (let i = 0; i < points.length; i += step) {
    sampledPoints.push(points[i]);
  }
  if (sampledPoints[sampledPoints.length - 1] !== points[points.length - 1]) {
    sampledPoints.push(points[points.length - 1]);
  }

  // Dimensions
  const width = 600;
  const height = 120;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 22;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const yMin = Math.max(0, Math.floor((minElevation - 100) / 100) * 100);
  const yMax = Math.ceil((maxElevation + 100) / 100) * 100;
  const yRange = yMax - yMin || 1;

  const xMax = totalDistanceKm || sampledPoints[sampledPoints.length - 1]?.distanceKm || 1;

  const getX = (distKm: number) => padLeft + (distKm / xMax) * chartW;
  const getY = (ele: number) => padTop + chartH - ((ele - yMin) / yRange) * chartH;

  const pathD = sampledPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.distanceKm || 0)} ${getY(p.ele)}`)
    .join(' ');

  const areaD = `${pathD} L ${padLeft + chartW} ${padTop + chartH} L ${padLeft} ${padTop + chartH} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRatio = clientX / rect.width;
    const clickX = svgRatio * width;

    if (clickX < padLeft || clickX > padLeft + chartW) {
      setLocalHoverPoint(null);
      onHoverPoint?.(null);
      return;
    }

    const ratio = (clickX - padLeft) / chartW;
    const targetDist = ratio * xMax;

    // Find closest point
    let closest = points[0];
    let minDiff = 999999;
    for (const p of points) {
      const diff = Math.abs((p.distanceKm || 0) - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    setLocalHoverPoint(closest);
    onHoverPoint?.(closest);
  };

  const handleMouseLeave = () => {
    setLocalHoverPoint(null);
    onHoverPoint?.(null);
  };

  return (
    <div className="bg-[#FAF8F5] border-t border-[#D9D4C7] p-2 sm:p-2.5 shrink-0 select-none">
      {/* Stats row */}
      <div className="flex items-center justify-between gap-2 mb-1 px-1 text-[11px] text-[#7A7465]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#2C2C2C] flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>海拔剖面</span>
          </span>
          <span>
            最高 <strong>{maxElevation}m</strong>
          </span>
          <span>
            最低 <strong>{minElevation}m</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-0.5 text-emerald-700">
            <TrendingUp className="w-3 h-3" />
            <span>+{elevationGain}m</span>
          </span>
          <span className="flex items-center gap-0.5 text-amber-700">
            <TrendingDown className="w-3 h-3" />
            <span>-{elevationLoss}m</span>
          </span>
          <span className="font-mono font-bold text-[#5A5A40]">
            {totalDistanceKm}km
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="relative w-full h-[110px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5A5A40" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5A5A40" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft + chartW}
            y2={padTop}
            stroke="#E5E1D8"
            strokeDasharray="3 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={padLeft + chartW}
            y2={padTop + chartH / 2}
            stroke="#E5E1D8"
            strokeDasharray="3 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={padLeft + chartW}
            y2={padTop + chartH}
            stroke="#D9D4C7"
          />

          {/* Y Axis Labels */}
          <text
            x={padLeft - 6}
            y={padTop + 4}
            textAnchor="end"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            {yMax}m
          </text>
          <text
            x={padLeft - 6}
            y={padTop + chartH / 2 + 3}
            textAnchor="end"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            {Math.round(yMin + yRange / 2)}m
          </text>
          <text
            x={padLeft - 6}
            y={padTop + chartH}
            textAnchor="end"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            {yMin}m
          </text>

          {/* Area & Line */}
          <path d={areaD} fill="url(#eleGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke="#5A5A40"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X Axis Labels */}
          <text
            x={padLeft}
            y={height - 5}
            textAnchor="start"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            0km
          </text>
          <text
            x={padLeft + chartW / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            {(xMax / 2).toFixed(1)}km
          </text>
          <text
            x={padLeft + chartW}
            y={height - 5}
            textAnchor="end"
            fontSize="9"
            fill="#7A7465"
            fontFamily="monospace"
          >
            {xMax.toFixed(1)}km
          </text>

          {/* Hover Crosshair & Indicator */}
          {activePoint && (
            <g>
              <line
                x1={getX(activePoint.distanceKm || 0)}
                y1={padTop}
                x2={getX(activePoint.distanceKm || 0)}
                y2={padTop + chartH}
                stroke="#D95D39"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(activePoint.distanceKm || 0)}
                cy={getY(activePoint.ele)}
                r="4.5"
                fill="#D95D39"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Capsule */}
        {activePoint && (
          <div
            className="absolute top-0 z-20 pointer-events-none bg-[#2C2C2C]/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-lg shadow-md transform -translate-x-1/2"
            style={{
              left: `${((activePoint.distanceKm || 0) / xMax) * 100}%`,
            }}
          >
            <span className="font-bold">{activePoint.ele}m</span>
            <span className="text-[#DCD8CD] ml-1.5">
              {activePoint.distanceKm}km
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
