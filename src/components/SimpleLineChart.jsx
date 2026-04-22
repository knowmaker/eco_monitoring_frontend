import { useMemo } from "react";

const CHART_WIDTH = 680;
const CHART_HEIGHT = 260;
const MARGIN = { top: 18, right: 14, bottom: 34, left: 42 };
const PALETTE = ["#08d9b1", "#ff8f5a", "#8bc3ff", "#ffd36e", "#f67ecb", "#73e9ff"];

function buildSeriesPath(points, xScale, yScale) {
  let path = "";
  let hasSegment = false;
  points.forEach((point) => {
    if (point.value === null || point.value === undefined || !Number.isFinite(point.value)) {
      hasSegment = false;
      return;
    }
    const x = xScale(point.hour);
    const y = yScale(point.value);
    path += `${hasSegment ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
    hasSegment = true;
  });
  return path.trim();
}

export default function SimpleLineChart({ series }) {
  const prepared = useMemo(() => {
    const flatValues = [];
    series.forEach((s) => {
      s.points.forEach((p) => {
        if (p.value !== null && p.value !== undefined && Number.isFinite(p.value)) {
          flatValues.push(p.value);
        }
      });
    });

    if (flatValues.length === 0) {
      return { hasData: false };
    }

    let min = Math.min(...flatValues);
    let max = Math.max(...flatValues);
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const innerWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    const xScale = (hour) => MARGIN.left + (hour / 23) * innerWidth;
    const yScale = (value) => MARGIN.top + ((max - value) / (max - min)) * innerHeight;

    const lines = series.map((s, index) => ({
      key: s.key,
      label: s.label,
      color: PALETTE[index % PALETTE.length],
      path: buildSeriesPath(s.points, xScale, yScale),
    }));

    const yTicks = Array.from({ length: 5 }).map((_, idx) => {
      const ratio = idx / 4;
      const value = max - (max - min) * ratio;
      return {
        y: MARGIN.top + innerHeight * ratio,
        value,
      };
    });

    const xTicks = Array.from({ length: 24 }).filter((_, idx) => idx % 3 === 0 || idx === 23);

    return {
      hasData: true,
      lines,
      yTicks,
      xTicks,
      innerWidth,
      innerHeight,
      yScale,
      xScale,
    };
  }, [series]);

  if (!series?.length || !prepared.hasData) {
    return <div className="chart-empty">Нет данных за выбранные сутки.</div>;
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="chart-svg" role="img" aria-label="Sensor chart">
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={prepared.innerWidth}
          height={prepared.innerHeight}
          fill="rgba(255, 255, 255, 0.02)"
          stroke="rgba(255, 255, 255, 0.08)"
        />

        {prepared.yTicks.map((tick) => (
          <g key={`y-${tick.y}`}>
            <line
              x1={MARGIN.left}
              x2={CHART_WIDTH - MARGIN.right}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
            />
            <text x={MARGIN.left - 8} y={tick.y + 4} textAnchor="end" className="chart-axis-label">
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {prepared.xTicks.map((h) => (
          <text
            key={`x-${h}`}
            x={prepared.xScale(h)}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="chart-axis-label"
          >
            {String(h).padStart(2, "0")}
          </text>
        ))}

        {prepared.lines.map((line) => (
          <path
            key={line.key}
            d={line.path}
            fill="none"
            stroke={line.color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div className="chart-legend">
        {prepared.lines.map((line) => (
          <span key={`legend-${line.key}`} className="chart-legend-item">
            <span className="chart-legend-dot" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}
