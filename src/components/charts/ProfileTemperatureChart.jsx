import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import {
  formatDayAxisLabel,
  formatHourInterval,
  formatHourIntervalAxisLabel,
  normalizeChartValue,
} from "./chartFormatters";
import {
  AXIS_TEXT_COLOR,
  GRID_LINE_STYLE,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_STYLE,
} from "./chartTheme";

function formatTemperatureLegendValue(value) {
  return Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, "") : "";
}

export default function ProfileTemperatureChart({ profiles, viewMode, emptyText }) {
  const option = useMemo(() => {
    if (!profiles?.length) {
      return null;
    }

    const periodLabels = profiles.map((profile) =>
      viewMode === "month"
        ? `${String(profile.day ?? "").padStart(2, "0")} число`
        : formatHourInterval(profile.hour ?? "")
    );
    const heights = Array.from(
      new Set(
        profiles.flatMap((profile) =>
          (profile.levels || [])
            .map((level) => level.height)
            .filter((height) => Number.isFinite(height))
        )
      )
    ).sort((a, b) => a - b);
    const heightIndexByValue = new Map(heights.map((height, index) => [height, index]));
    const heatmapData = [];
    const lowerInversionData = [];
    const upperInversionData = [];
    let minTemperature = Infinity;
    let maxTemperature = -Infinity;

    profiles.forEach((profile, periodIndex) => {
      (profile.levels || []).forEach((level) => {
        if (!Number.isFinite(level.temperature) || !Number.isFinite(level.height)) {
          return;
        }
        const temperature = normalizeChartValue(level.temperature);
        minTemperature = Math.min(minTemperature, temperature);
        maxTemperature = Math.max(maxTemperature, temperature);
        heatmapData.push([periodIndex, heightIndexByValue.get(level.height), temperature]);
      });

      const inversion = profile.inversion;
      if (
        Number.isFinite(inversion?.power) &&
        inversion.power > 0 &&
        Number.isFinite(inversion?.lower) &&
        Number.isFinite(inversion?.upper)
      ) {
        lowerInversionData.push([periodIndex, heightIndexByValue.get(inversion.lower) ?? null]);
        upperInversionData.push([periodIndex, heightIndexByValue.get(inversion.upper) ?? null]);
      } else {
        lowerInversionData.push([periodIndex, null]);
        upperInversionData.push([periodIndex, null]);
      }
    });

    if (heatmapData.length === 0) {
      return null;
    }

    return {
      backgroundColor: "transparent",
      animation: true,
      grid: {
        left: 48,
        right: 72,
        top: 24,
        bottom: 46,
      },
      tooltip: {
        trigger: "item",
        backgroundColor: TOOLTIP_BACKGROUND_COLOR,
        borderColor: TOOLTIP_BORDER_COLOR,
        textStyle: TOOLTIP_TEXT_STYLE,
        formatter: (params) => {
          if (params.seriesType !== "heatmap") {
            return "";
          }
          const [periodIndex, heightIndex, temperature] = params.data;
          return [
            periodLabels[periodIndex],
            `Высота: ${heights[heightIndex]} м`,
            `Температура: ${temperature} °C`,
          ].join("<br />");
        },
      },
      visualMap: {
        min: minTemperature,
        max: maxTemperature,
        seriesIndex: 0,
        calculable: false,
        orient: "vertical",
        right: 0,
        top: 18,
        itemHeight: 190,
        text: [`${formatTemperatureLegendValue(maxTemperature)} °C`, formatTemperatureLegendValue(minTemperature)],
        textStyle: { color: AXIS_TEXT_COLOR, fontSize: 11 },
        inRange: {
          color: ["#1749c8", "#1686d9", "#24c6d8", "#b8ecb4", "#f4de55", "#f49a18", "#cf2f24"],
        },
      },
      xAxis: {
        type: "category",
        data: periodLabels,
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: AXIS_TEXT_COLOR,
          interval: viewMode === "month" ? 1 : 2,
          formatter: viewMode === "day" ? formatHourIntervalAxisLabel : formatDayAxisLabel,
        },
      },
      yAxis: {
        type: "category",
        data: heights.map((height) => String(height)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT_COLOR },
        splitLine: {
          lineStyle: GRID_LINE_STYLE,
        },
      },
      series: [
        {
          type: "heatmap",
          name: "Температура",
          data: heatmapData,
          emphasis: {
            itemStyle: {
              borderColor: "rgba(15, 23, 42, 0.28)",
              borderWidth: 1,
            },
          },
        },
        {
          type: "line",
          name: "Низ инверсии",
          data: lowerInversionData,
          connectNulls: false,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 1.4, color: "#9f2f2f", type: "dashed" },
        },
        {
          type: "line",
          name: "Верх инверсии",
          data: upperInversionData,
          connectNulls: false,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 1.4, color: "#9f2f2f", type: "dashed" },
        },
      ],
    };
  }, [profiles, viewMode]);

  if (!option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="profile-chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="profile-heatmap-echarts" />
    </div>
  );
}
