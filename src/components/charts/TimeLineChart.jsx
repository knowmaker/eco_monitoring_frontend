import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { formatAxisValue, normalizeChartValue } from "./chartFormatters";
import {
  AXIS_NAME_TEXT_STYLE,
  AXIS_TEXT_COLOR,
  CHART_BACKGROUND_COLOR,
  CHART_PALETTE,
  COMPACT_AXIS_NAME_TEXT_STYLE,
  GRID_LINE_STYLE,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_STYLE,
} from "./chartTheme";
import { withResponsiveChartOption } from "./responsiveChartOption";

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

function createYAxis({ position = "left", showSplitLine = true, name } = {}) {
  return {
    type: "value",
    scale: true,
    position,
    name,
    nameLocation: name ? "middle" : undefined,
    nameRotate: name ? 90 : undefined,
    nameGap: name ? 38 : undefined,
    nameTextStyle: AXIS_NAME_TEXT_STYLE,
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
  xAxisName,
  yAxisName,
  emptyText = "Нет сырых данных за выбранный интервал.",
}) {
  const hasValues = useMemo(() => hasNumericValues(series), [series]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    const hasSecondaryAxis = series.some((item) => item.yAxisIndex === 1);

    const baseOption = {
      backgroundColor: CHART_BACKGROUND_COLOR,
      animation: true,
      grid: {
        left: yAxisName ? 52 : 48,
        right: hasSecondaryAxis ? 48 : 20,
        top: 24,
        bottom: xAxisName ? 56 : 44,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
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
        name: xAxisName,
        nameLocation: xAxisName ? "middle" : undefined,
        nameGap: xAxisName ? 32 : undefined,
        nameTextStyle: AXIS_NAME_TEXT_STYLE,
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
        ? [createYAxis({ name: yAxisName }), createYAxis({ position: "right", showSplitLine: false })]
        : createYAxis({ name: yAxisName }),
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

    const compactYAxis = hasSecondaryAxis
      ? [
          {
            nameGap: yAxisName ? 32 : undefined,
            nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
            axisLabel: { fontSize: 9 },
          },
          { axisLabel: { fontSize: 9 } },
        ]
      : {
          nameGap: yAxisName ? 32 : undefined,
          nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
          axisLabel: { fontSize: 9 },
        };

    return withResponsiveChartOption(baseOption, {
      grid: { left: yAxisName ? 44 : 36, right: hasSecondaryAxis ? 36 : 8, top: 22, bottom: xAxisName ? 48 : 38 },
      legend: {
        right: 0,
        itemWidth: 12,
        itemHeight: 7,
        itemGap: 6,
        textStyle: { color: AXIS_TEXT_COLOR, fontSize: 9 },
      },
      xAxis: {
        nameGap: xAxisName ? 30 : undefined,
        nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
        axisLabel: {
          fontSize: 9,
          hideOverlap: true,
        },
      },
      yAxis: compactYAxis,
    });
  }, [series, hasValues, start, end, xAxisName, yAxisName]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
    </div>
  );
}
