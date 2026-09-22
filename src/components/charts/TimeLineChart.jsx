import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { formatAxisValue, normalizeChartValue } from "./chartFormatters";
import {
  AXIS_TEXT_COLOR,
  CHART_PALETTE,
  GRID_LINE_STYLE,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_STYLE,
} from "./chartTheme";

function hasNumericValues(series) {
  return Boolean(
    series?.some((item) =>
      (item.points || []).some((point) => Number.isFinite(Number(point.value)) && point.timestamp)
    )
  );
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
            ...GRID_LINE_STYLE,
          },
        }
      : { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: AXIS_TEXT_COLOR,
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
        backgroundColor: TOOLTIP_BACKGROUND_COLOR,
        borderColor: TOOLTIP_BORDER_COLOR,
        textStyle: TOOLTIP_TEXT_STYLE,
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
        textStyle: { color: AXIS_TEXT_COLOR, fontSize: 11 },
      },
      xAxis: {
        type: "time",
        min: start,
        max: end,
        interval: 10 * 60 * 1000,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: AXIS_TEXT_COLOR,
          showMaxLabel: true,
          formatter: formatTimeLabel,
        },
        splitLine: {
          show: true,
          lineStyle: {
            ...GRID_LINE_STYLE,
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
          color: CHART_PALETTE[index % CHART_PALETTE.length],
        },
        itemStyle: {
          color: CHART_PALETTE[index % CHART_PALETTE.length],
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
