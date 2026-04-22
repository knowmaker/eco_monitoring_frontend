import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

const PALETTE = ["#08d9b1", "#ff8f5a", "#8bc3ff", "#ffd36e", "#f67ecb", "#73e9ff"];

export default function SimpleLineChart({ series }) {
  const option = useMemo(() => {
    if (!series?.length) {
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
        backgroundColor: "rgba(11, 19, 36, 0.94)",
        borderColor: "rgba(255,255,255,0.15)",
        textStyle: { color: "#e9f1ff" },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: "#9fb0ce", fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.22)" } },
        axisTick: { show: false },
        axisLabel: { color: "#9fb0ce", interval: 2 },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.1)",
            type: "dashed",
          },
        },
        axisLine: { show: false },
        axisLabel: {
          color: "#9fb0ce",
          formatter: (value) => Number(value).toFixed(2),
        },
      },
      series: preparedSeries,
    };
  }, [series]);

  if (!series?.length || !option) {
    return <div className="chart-empty">Нет данных за выбранные сутки.</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
    </div>
  );
}
