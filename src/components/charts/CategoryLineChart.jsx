import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import {
  formatAxisValue,
  formatDayAxisLabel,
  formatHourIntervalAxisLabel,
  normalizeChartValue,
} from "./chartFormatters";
import {
  AXIS_NAME_TEXT_STYLE,
  AXIS_TEXT_COLOR,
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
      (item.points || []).some((point) => Number.isFinite(point.value))
    )
  );
}

export default function CategoryLineChart({
  series,
  xKey = "hour",
  xValues,
  xLabels,
  xAxisName,
  yAxisName,
  onEvents,
  emptyText = "Нет данных за выбранный период.",
}) {
  const hasValues = useMemo(() => hasNumericValues(series), [series]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    const axisValues = xValues?.length ? xValues : Array.from({ length: 24 }, (_, idx) => idx);
    const categories = xLabels;

    const preparedSeries = series.map((item, index) => {
      const byAxisValue = new Map((item.points || []).map((point) => [point[xKey], point.value]));
      return {
        type: "line",
        name: item.label,
        smooth: true,
        connectNulls: false,
        cursor: onEvents?.click ? "pointer" : "default",
        triggerLineEvent: Boolean(onEvents?.click),
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
        data: axisValues.map((axisValue) => {
          const value = byAxisValue.get(axisValue);
          return value === undefined ? null : normalizeChartValue(value);
        }),
      };
    });

    const baseOption = {
      backgroundColor: "transparent",
      animation: true,
      grid: {
        left: yAxisName ? 56 : 48,
        right: 20,
        top: 24,
        bottom: xAxisName ? 56 : 44,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: TOOLTIP_BACKGROUND_COLOR,
        borderColor: TOOLTIP_BORDER_COLOR,
        textStyle: TOOLTIP_TEXT_STYLE,
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: AXIS_TEXT_COLOR, fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: categories,
        name: xAxisName,
        nameLocation: xAxisName ? "middle" : undefined,
        nameGap: xAxisName ? 34 : undefined,
        nameTextStyle: AXIS_NAME_TEXT_STYLE,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: AXIS_TEXT_COLOR,
          interval: xKey === "day" ? 1 : 2,
          formatter:
            xKey === "hour" ? formatHourIntervalAxisLabel : xKey === "day" ? formatDayAxisLabel : undefined,
        },
        splitLine: {
          show: true,
          interval: 0,
          lineStyle: {
            ...GRID_LINE_STYLE,
          },
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: yAxisName,
        nameLocation: yAxisName ? "middle" : undefined,
        nameRotate: yAxisName ? 90 : undefined,
        nameGap: yAxisName ? 42 : undefined,
        nameTextStyle: AXIS_NAME_TEXT_STYLE,
        splitLine: {
          lineStyle: {
            ...GRID_LINE_STYLE,
          },
        },
        axisLine: { show: false },
        axisLabel: {
          color: AXIS_TEXT_COLOR,
          formatter: formatAxisValue,
        },
      },
      series: preparedSeries,
    };

    return withResponsiveChartOption(baseOption, {
      grid: { left: yAxisName ? 46 : 36, right: 8, top: 22, bottom: xAxisName ? 48 : 38 },
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
          interval: xKey === "day" ? 2 : 3,
        },
      },
      yAxis: {
        nameGap: yAxisName ? 34 : undefined,
        nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
        axisLabel: { fontSize: 9 },
      },
    });
  }, [series, hasValues, xKey, xValues, xLabels, xAxisName, yAxisName, onEvents]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" onEvents={onEvents} />
    </div>
  );
}
