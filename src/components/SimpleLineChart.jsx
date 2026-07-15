import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

const PALETTE = ["#16856d", "#4f6db8", "#d4872d", "#8b5fbf", "#c5536f", "#2f8aa6"];

function hasNumericValues(series) {
  return Boolean(
    series?.some((item) =>
      (item.points || []).some((point) => Number.isFinite(point.value))
    )
  );
}

function formatAxisValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }
  const abs = Math.abs(number);
  if (abs > 0 && abs < 0.01) {
    return number.toFixed(4);
  }
  if (abs > 0 && abs < 1) {
    return number.toFixed(3);
  }
  return number.toFixed(2);
}

export default function SimpleLineChart({ series }) {
  const hasValues = useMemo(() => hasNumericValues(series), [series]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    const categories = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, "0"));
    const preparedSeries = series.map((item, index) => {
      const byHour = new Map((item.points || []).map((point) => [point.hour, point.value]));
      return {
        type: "line",
        name: item.label,
        smooth: true,
        connectNulls: false,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: {
          width: 2.4,
          color: PALETTE[index % PALETTE.length],
        },
        itemStyle: {
          color: PALETTE[index % PALETTE.length],
        },
        data: Array.from({ length: 24 }, (_, hour) => {
          const value = byHour.get(hour);
          return value === undefined ? null : value;
        }),
      };
    });

    return {
      backgroundColor: "transparent",
      animation: true,
      grid: {
        left: 48,
        right: 20,
        top: 24,
        bottom: 44,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "rgba(15, 23, 42, 0.14)",
        textStyle: { color: "#172033" },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: "#647184", fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: { color: "#647184", interval: 2 },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: {
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
        },
        axisLine: { show: false },
        axisLabel: {
          color: "#647184",
          formatter: formatAxisValue,
        },
      },
      series: preparedSeries,
    };
  }, [series, hasValues]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">Нет данных за выбранные сутки.</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
    </div>
  );
}
