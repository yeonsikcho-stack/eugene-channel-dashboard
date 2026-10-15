'use client';

import { useRef, useState } from 'react';

interface TrendChartProps {
  label: string;
  points: { key: string; value: number | null }[];
  granularity?: 'month' | 'day';
}

const SERIES_COLOR = '#2a78d6';
const WIDTH = 320;
const HEIGHT = 120;
const PADDING = { top: 16, right: 12, bottom: 20, left: 40 };

function formatAxisLabel(key: string, granularity: 'month' | 'day') {
  return granularity === 'day' ? key.slice(5).replace('-', '/') : `${key.slice(5)}월`;
}

export function TrendChart({ label, points, granularity = 'month' }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const maxValue = hasData ? Math.max(...values) : 1;
  const minValue = hasData ? Math.min(0, ...values) : 0;
  const range = maxValue - minValue || 1;

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const xFor = (i: number) => PADDING.left + stepX * i;
  const yFor = (v: number) => PADDING.top + plotHeight - ((v - minValue) / range) * plotHeight;

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(i), y: yFor(p.value) });
  });
  if (current.length) segments.push(current);

  let lastKnownIndex: number | undefined;
  points.forEach((p, i) => {
    if (p.value !== null) lastKnownIndex = i;
  });

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length === 0 || stepX === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    const rawIndex = Math.round((localX - PADDING.left) / stepX);
    setHoverIndex(Math.min(points.length - 1, Math.max(0, rawIndex)));
  }

  const gridValues = hasData ? [minValue, (minValue + maxValue) / 2, maxValue] : [];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const markerRadius = points.length > 40 ? 2 : 4;
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#999]">{label}</span>
        {hasData && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-xs text-[#999] hover:text-[#555] underline"
          >
            {showTable ? '차트로 보기' : '표로 보기'}
          </button>
        )}
      </div>

      {!hasData && <div className="text-xs text-[#999] py-6 text-center">데이터 없음</div>}

      {hasData && !showTable && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {gridValues.map((g, idx) => (
            <line
              key={idx}
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke="#eee"
              strokeWidth={1}
            />
          ))}
          {gridValues.map((g, idx) => (
            <text
              key={idx}
              x={PADDING.left - 6}
              y={yFor(g)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              fill="#999"
            >
              {Math.round(g).toLocaleString()}
            </text>
          ))}

          {segments.map((segment, si) => (
            <path
              key={si}
              d={segment.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.map((p, i) =>
            p.value !== null ? (
              <circle
                key={i}
                cx={xFor(i)}
                cy={yFor(p.value)}
                r={markerRadius}
                fill={SERIES_COLOR}
                stroke="#fff"
                strokeWidth={markerRadius > 2 ? 2 : 1}
              />
            ) : null,
          )}

          {lastKnownIndex !== undefined && (
            <text
              x={xFor(lastKnownIndex)}
              y={yFor(points[lastKnownIndex].value as number) - 10}
              textAnchor="end"
              fontSize={10}
              fontWeight={600}
              fill="#0a0a0a"
            >
              {(points[lastKnownIndex].value as number).toLocaleString()}
            </text>
          )}

          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={i} x={xFor(i)} y={HEIGHT - 4} textAnchor="middle" fontSize={8} fill="#999">
                {formatAxisLabel(p.key, granularity)}
              </text>
            ) : null,
          )}

          {hoverIndex !== null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="#e5e5e5"
              strokeWidth={1}
            />
          )}
        </svg>
      )}

      {hasData && showTable && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#999]">
              <th className="text-left font-normal py-1">{granularity === 'day' ? '날짜' : '월'}</th>
              <th className="text-right font-normal py-1">값</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key} className="border-t border-gray-100">
                <td className="py-1">{p.key}</td>
                <td className="py-1 text-right tabular-nums">
                  {p.value !== null ? p.value.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasData && !showTable && (
        <div className="mt-1 text-xs text-[#555] h-4">
          {hovered && (
            <>
              {hovered.key}:{' '}
              <span className="font-medium text-[#0a0a0a]">
                {hovered.value !== null ? hovered.value.toLocaleString() : '데이터 없음'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
