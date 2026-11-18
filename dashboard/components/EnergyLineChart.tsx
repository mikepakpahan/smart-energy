'use client';

import React, { useState, useRef } from 'react';
import { Telemetry } from '@/types/energy';

interface EnergyLineChartProps {
  data: Telemetry[];
  maxLimit: number;
  limitPoints: number;
  onSelectLimit: (count: number) => void;
  theme?: 'light' | 'dark';
}

export default function EnergyLineChart({
  data,
  maxLimit,
  limitPoints,
  onSelectLimit,
  theme = 'dark',
}: EnergyLineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    item: Telemetry;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 25, right: 20, bottom: 35, left: 45 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Max Y scale
  const maxDataPower = data.reduce((max, item) => Math.max(max, item.power), 0);
  const chartMaxY = Math.max(maxLimit * 1.2, maxDataPower * 1.15, 600);
  const chartMinY = 0;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (power: number) => {
    const clamped = Math.max(chartMinY, Math.min(chartMaxY, power));
    return padding.top + plotHeight - ((clamped - chartMinY) / (chartMaxY - chartMinY)) * plotHeight;
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.power), item: d }));

  let pathString = '';
  if (points.length > 0) {
    pathString = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      pathString += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
  }

  const areaString = points.length > 0
    ? `${pathString} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : '';

  const limitY = getY(maxLimit);
  const isLight = theme === 'light';

  // Y-axis ticks
  const yTicks = [0, Math.round(chartMaxY / 2), Math.round(chartMaxY)];

  // Touch handlers for mobile tap-to-inspect
  const handleTouch = (clientX: number) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    const pointIndex = Math.round(ratio * (points.length - 1));
    const target = points[pointIndex];
    if (target) {
      setHoveredPoint({ index: pointIndex, x: target.x, y: target.y, item: target.item });
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xs transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Tren Daya Listrik
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            Riwayat konsumsi real-time (2 detik/data)
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 p-0.5 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
          {[15, 30, 50].map((count) => (
            <button
              key={count}
              onClick={() => onSelectLimit(count)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                limitPoints === count
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div
        ref={containerRef}
        onTouchStart={(e) => handleTouch(e.touches[0].clientX)}
        onTouchMove={(e) => handleTouch(e.touches[0].clientX)}
        className="relative w-full overflow-hidden touch-pan-x"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
        >
          <defs>
            <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="areaGradientDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke={isLight ? '#f1f5f9' : '#27272a'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 6}
                  y={y + 4}
                  textAnchor="end"
                  fill={isLight ? '#94a3b8' : '#71717a'}
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {tickVal}W
                </text>
              </g>
            );
          })}

          {/* Threshold Safety Limit Line */}
          <g>
            <line
              x1={padding.left}
              y1={limitY}
              x2={svgWidth - padding.right}
              y2={limitY}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity="0.8"
            />
            <text
              x={svgWidth - padding.right}
              y={limitY - 5}
              textAnchor="end"
              fill="#ef4444"
              fontSize="10"
              fontWeight="600"
              fontFamily="monospace"
            >
              BATAS: {maxLimit}W
            </text>
          </g>

          {/* Area Fill */}
          {areaString && (
            <path
              d={areaString}
              fill={isLight ? 'url(#areaGradientLight)' : 'url(#areaGradientDark)'}
            />
          )}

          {/* Main Curve Line */}
          {pathString && (
            <path
              d={pathString}
              fill="none"
              stroke={isLight ? '#059669' : '#34d399'}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}

          {/* Interactive touch/hover points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ index: i, x: pt.x, y: pt.y, item: pt.item })}
                onClick={() => setHoveredPoint({ index: i, x: pt.x, y: pt.y, item: pt.item })}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.item.is_overload ? 3.5 : 2}
                fill={pt.item.is_overload ? '#ef4444' : isLight ? '#059669' : '#34d399'}
                stroke={isLight ? '#ffffff' : '#18181b'}
                strokeWidth="1"
                className="pointer-events-none"
              />
            </g>
          ))}

          {/* Active Hover Crosshair */}
          {hoveredPoint && (
            <g pointerEvents="none">
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + plotHeight}
                stroke={isLight ? '#059669' : '#34d399'}
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={isLight ? '#059669' : '#34d399'}
                stroke={isLight ? '#ffffff' : '#09090b'}
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Timestamps (start, mid, end) */}
          {points.length > 0 &&
            [0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
              const pt = points[idx];
              if (!pt) return null;
              const timeStr = new Date(pt.item.recorded_at).toLocaleTimeString('id-ID', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill={isLight ? '#94a3b8' : '#71717a'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {timeStr}
                </text>
              );
            })}
        </svg>

        {/* Minimalist Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-950/95 p-2 text-xs shadow-md backdrop-blur-xs"
            style={{
              left: `${Math.min(80, Math.max(20, (hoveredPoint.x / svgWidth) * 100))}%`,
              top: `${Math.max(10, (hoveredPoint.y / svgHeight) * 100 - 25)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {hoveredPoint.item.power} Watt
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {hoveredPoint.item.detected_appliance}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {new Date(hoveredPoint.item.recorded_at).toLocaleTimeString('id-ID')}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 text-center text-[10px] text-zinc-400 sm:hidden">
        Sentuh kurva grafik untuk melihat rincian daya per detik
      </div>
    </div>
  );
}
