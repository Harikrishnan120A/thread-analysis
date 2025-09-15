"use client";
import React from 'react';

export default function Sparkline({ values, width = 160, height = 36, color = '#6af' }: { values: number[]; width?: number; height?: number; color?: string }) {
  const len = values.length;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = (i / (len - 1)) * (width - 2) + 1;
    const y = height - (((v - min) / span) * (height - 2) + 1);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${points.join(' L ')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
      {len > 1 && (
        <polygon
          points={`1,${height} ${points.join(' ')} ${width-1},${height}`}
          fill="url(#g1)"
          stroke="none"
        />
      )}
    </svg>
  );
}

