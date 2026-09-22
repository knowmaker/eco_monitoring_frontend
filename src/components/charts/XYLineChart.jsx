import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { normalizeChartValue } from "./chartFormatters";
import {
  AXIS_TEXT_COLOR,
  DEFAULT_CHART_COLOR,
  GRID_LINE_STYLE,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_STYLE,
} from "./chartTheme";

function hasNumericValues(series, xKey, yKey) {
  return Boolean(
    series?.some((item) =>
      (item.points || []).some((point) => Number.isFinite(Number(point[xKey])) && Number.isFinite(Number(point[yKey])))
    )
  );
}

export default function XYLineChart({
  series,
  xKey,
  yKey,
  xAxisName,
  yAxisName,
  xAxisSplitNumber,
  yAxisInterval,
  showLegend = false,
  onEvents,
  tooltipFormatter,
  emptyText = "Нет данных за выбранный период.",
  chartClassName = "profile-line-echarts",
  chartKey,
  legendScrollDataIndex = 0,
}) {
  const hasValues = useMemo(() => hasNumericValues(series, xKey, yKey), [series, xKey, yKey]);

  const option = useMemo(() => {
    if (!series?.length || !hasValues) {
      return null;
    }

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDurationUpdate: 0,
      grid: {
        left: 58,
        right: 26,
        top: showLegend ? 28 : 26,
        bottom: 48,
      },
      tooltip: {
        trigger: "item",
        backgroundColor: TOOLTIP_BACKGROUND_COLOR,
        borderColor: TOOLTIP_BORDER_COLOR,
        textStyle: TOOLTIP_TEXT_STYLE,
        formatter: tooltipFormatter,
      },
      legend: showLegend
        ? {
            type: "scroll",
            top: 2,
            left: 58,
            right: 10,
            scrollDataIndex: legendScrollDataIndex,
            itemWidth: 14,
            itemHeight: 8,
            selectedMode: true,
            textStyle: { color: AXIS_TEXT_COLOR, fontSize: 11 },
            data: series.map((item) => ({
              name: item.label,
              textStyle: item.isActive
                ? { color: "#172033", fontWeight: 700 }
                : { color: AXIS_TEXT_COLOR, fontWeight: 500 },
            })),
          }
        : undefined,
      xAxis: {
        type: "value",
        scale: true,
        name: xAxisName,
        nameLocation: xAxisName ? "middle" : undefined,
        nameGap: xAxisName ? 30 : undefined,
        nameTextStyle: { color: AXIS_TEXT_COLOR, fontSize: 12, fontWeight: 600 },
        splitNumber: xAxisSplitNumber,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT_COLOR },
        splitLine: {
          lineStyle: GRID_LINE_STYLE,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: yAxisName,
        nameLocation: yAxisName ? "middle" : undefined,
        nameRotate: yAxisName ? 90 : undefined,
        nameGap: yAxisName ? 42 : undefined,
        nameTextStyle: { color: AXIS_TEXT_COLOR, fontSize: 12, fontWeight: 600 },
        interval: yAxisInterval,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT_COLOR },
        splitLine: {
          lineStyle: GRID_LINE_STYLE,
        },
      },
      series: series.map((item) => {
        const color = item.color || DEFAULT_CHART_COLOR;
        return {
          type: "line",
          id: String(item.key),
          name: item.label,
          data: (item.points || [])
            .filter((point) => Number.isFinite(Number(point[xKey])) && Number.isFinite(Number(point[yKey])))
            .map((point) => [normalizeChartValue(point[xKey]), normalizeChartValue(point[yKey])]),
          animationDurationUpdate: 0,
          smooth: item.smooth ?? false,
          triggerLineEvent: item.triggerLineEvent ?? false,
          symbol: "circle",
          symbolSize: item.symbolSize ?? 6,
          showSymbol: item.showSymbol ?? true,
          lineStyle: {
            width: 2.4,
            color,
          },
          itemStyle: {
            color,
          },
          ...(item.options || {}),
        };
      }),
    };
  }, [
    series,
    hasValues,
    xKey,
    yKey,
    xAxisName,
    yAxisName,
    xAxisSplitNumber,
    yAxisInterval,
    showLegend,
    tooltipFormatter,
    legendScrollDataIndex,
  ]);

  if (!series?.length || !hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="profile-chart-wrap">
      <ReactECharts key={chartKey} option={option} notMerge lazyUpdate className={chartClassName} onEvents={onEvents} />
    </div>
  );
}
