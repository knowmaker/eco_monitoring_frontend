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

export default function SimpleLineChart({
  series,
  xKey = "hour",
  xValues,
  xLabels,
  emptyText = "Нет данных за выбранный период.",
}) {
  const hasValues = useMemo(() => hasNumericValues(series), [series]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    const axisValues = xValues?.length ? xValues : Array.from({ length: 24 }, (_, idx) => idx);
    const categories = xLabels?.length
      ? xLabels
      : axisValues.map((value) => String(value).padStart(2, "0"));

    const preparedSeries = series.map((item, index) => {
      const byAxisValue = new Map((item.points || []).map((point) => [point[xKey], point.value]));
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
        data: axisValues.map((axisValue) => {
          const value = byAxisValue.get(axisValue);
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
        axisLabel: { color: "#647184", interval: xKey === "day" ? 1 : 2 },
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
  }, [series, hasValues, xKey, xValues, xLabels]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
    </div>
  );
}
