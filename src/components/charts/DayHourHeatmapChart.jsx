import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { getDaysInMonth, toIsoMonth } from "../../lib/date";
import {
  AXIS_NAME_TEXT_STYLE,
  AXIS_TEXT_COLOR,
  CHART_BACKGROUND_COLOR,
  COMPACT_AXIS_NAME_TEXT_STYLE,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_STYLE,
} from "./chartTheme";
import { withResponsiveChartOption } from "./responsiveChartOption";

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const COLOR_SCALE = ["#4cac75", "#92ca70", "#d2dc76", "#f0d06d", "#ee9a5b", "#c94f45"];
const formatValue = (value) => value.toLocaleString("ru-RU", { maximumFractionDigits: 5 });

export default function DayHourHeatmapChart({ month, points, emptyText }) {
  const option = useMemo(() => {
    const days = Array.from({ length: getDaysInMonth(month) }, (_, index) => String(index + 1));
    const values = (points || []).filter((point) => Number.isFinite(point.value));
    if (!values.length) {
      return null;
    }

    const monthLabel = toIsoMonth(month).split("-").reverse().join(".");
    const maxValue = Math.max(...values.map((point) => point.value));
    const minValue = Math.min(0, ...values.map((point) => point.value));
    const colorMax = maxValue > minValue ? maxValue : minValue + 0.00001;
    const baseOption = {
      backgroundColor: CHART_BACKGROUND_COLOR,
      animation: false,
      grid: { left: 52, right: 14, top: 12, bottom: 55 },
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: TOOLTIP_BACKGROUND_COLOR,
        borderColor: TOOLTIP_BORDER_COLOR,
        textStyle: TOOLTIP_TEXT_STYLE,
        formatter: (params) => {
          if (params.seriesIndex !== 1) {
            return "";
          }
          const [hour, dayIndex, value] = params.data;
          const hourLabel = String(hour).padStart(2, "0");
          return `${String(dayIndex + 1).padStart(2, "0")}.${monthLabel}, ${hourLabel}:00-${hourLabel}:59<br />${formatValue(value)} мг/м³`;
        },
      },
      visualMap: [
        {
          show: false,
          min: 0,
          max: 1,
          seriesIndex: 0,
          inRange: { color: ["#f1f4f5", "#f1f4f5"] },
        },
        {
          type: "continuous",
          show: false,
          min: minValue,
          max: colorMax,
          seriesIndex: 1,
          inRange: { color: COLOR_SCALE },
        },
      ],
      xAxis: {
        type: "category",
        data: HOURS,
        name: "Время",
        nameLocation: "middle",
        nameGap: 32,
        nameTextStyle: AXIS_NAME_TEXT_STYLE,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisLabel: {
          color: AXIS_TEXT_COLOR,
          interval: 2,
          formatter: (label) => label,
        },
      },
      yAxis: {
        type: "category",
        data: days,
        inverse: true,
        name: "День месяца",
        nameLocation: "middle",
        nameGap: 32,
        nameTextStyle: AXIS_NAME_TEXT_STYLE,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: AXIS_TEXT_COLOR, interval: 0 },
      },
      series: [
        {
          type: "heatmap",
          silent: true,
          data: days.flatMap((_, dayIndex) => HOURS.map((_, hour) => [hour, dayIndex, 0])),
          itemStyle: { color: "#f1f4f5", borderColor: "#ffffff", borderWidth: 1 },
        },
        {
          type: "heatmap",
          data: values.map((point) => [point.hour, point.day - 1, point.value]),
          itemStyle: { borderColor: "#ffffff", borderWidth: 1 },
          emphasis: { itemStyle: { borderColor: "#172033", borderWidth: 1 } },
        },
      ],
    };

    return withResponsiveChartOption(baseOption, {
      grid: { left: 40, right: 8, top: 12, bottom: 50 },
      xAxis: {
        nameGap: 27,
        nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
        axisLabel: { color: AXIS_TEXT_COLOR, fontSize: 9, interval: 3 },
      },
      yAxis: {
        nameGap: 26,
        nameTextStyle: COMPACT_AXIS_NAME_TEXT_STYLE,
        axisLabel: { color: AXIS_TEXT_COLOR, fontSize: 9 },
      },
    });
  }, [month, points]);

  if (!option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="day-hour-heatmap-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="day-hour-heatmap-echarts" style={{ height: 510 }} />
    </div>
  );
}
