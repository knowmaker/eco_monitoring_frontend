import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

const PALETTE = ["#16856d", "#4f6db8", "#d4872d", "#8b5fbf", "#c5536f", "#2f8aa6"];

function hasNumericValues(series) {
  return Boolean(
    series?.some((item) =>
      (item.points || []).some((point) => Number.isFinite(Number(point.value)) && point.timestamp)
    )
  );
}

function normalizeChartValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : value;
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

function formatTimeLabel(value, { withSeconds = false } = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const options = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (withSeconds) {
    options.second = "2-digit";
  }
  return date.toLocaleTimeString("ru-RU", options);
}

function formatTooltipValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return formatAxisValue(number);
}

function createYAxis({ position = "left", showSplitLine = true } = {}) {
  return {
    type: "value",
    scale: true,
    position,
    splitLine: showSplitLine
      ? {
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
        }
      : { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: "#647184",
      formatter: formatAxisValue,
    },
  };
}

export default function TimeLineChart({
  series,
  start,
  end,
  emptyText = "Нет сырых данных за выбранный интервал.",
}) {
  const hasValues = useMemo(() => hasNumericValues(series), [series]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    const hasSecondaryAxis = series.some((item) => item.yAxisIndex === 1);

    return {
      backgroundColor: "transparent",
      animation: true,
      grid: {
        left: 48,
        right: hasSecondaryAxis ? 48 : 20,
        top: 24,
        bottom: 44,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "rgba(15, 23, 42, 0.14)",
        textStyle: { color: "#172033" },
        formatter: (params) => {
          const items = Array.isArray(params) ? params : [params];
          return [
            formatTimeLabel(items[0]?.value?.[0], { withSeconds: true }),
            ...items.map(
              (item) =>
                `${item.marker} ${item.seriesName}&nbsp;&nbsp;&nbsp;<strong>${formatTooltipValue(item.value?.[1])}</strong>`
            ),
          ].join("<br />");
        },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: "#647184", fontSize: 11 },
      },
      xAxis: {
        type: "time",
        min: start,
        max: end,
        interval: 10 * 60 * 1000,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#647184",
          showMaxLabel: true,
          formatter: formatTimeLabel,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
        },
      },
      yAxis: hasSecondaryAxis
        ? [createYAxis(), createYAxis({ position: "right", showSplitLine: false })]
        : createYAxis(),
      series: series.map((item, index) => ({
        type: "line",
        name: item.label,
        yAxisIndex: item.yAxisIndex ?? 0,
        smooth: true,
        connectNulls: false,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: true,
        lineStyle: {
          width: 2.4,
          color: PALETTE[index % PALETTE.length],
        },
        itemStyle: {
          color: PALETTE[index % PALETTE.length],
        },
        data: (item.points || [])
          .filter((point) => point.timestamp && Number.isFinite(Number(point.value)))
          .map((point) => [point.timestamp, normalizeChartValue(point.value)]),
      })),
    };
  }, [series, hasValues, start, end]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
    </div>
  );
}
