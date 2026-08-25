import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

export default function ProfileTemperatureChart({ profiles, viewMode, emptyText }) {
  const option = useMemo(() => {
    if (!profiles?.length) {
      return null;
    }

    const periodLabels = profiles.map((profile) =>
      viewMode === "month"
        ? String(profile.day ?? "").padStart(2, "0")
        : `${String(profile.hour ?? "").padStart(2, "0")}:00`
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
        minTemperature = Math.min(minTemperature, level.temperature);
        maxTemperature = Math.max(maxTemperature, level.temperature);
        heatmapData.push([periodIndex, heightIndexByValue.get(level.height), level.temperature]);
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
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "rgba(15, 23, 42, 0.14)",
        textStyle: { color: "#172033" },
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
        calculable: true,
        orient: "vertical",
        right: 0,
        top: 28,
        itemHeight: 180,
        text: ["°C", ""],
        textStyle: { color: "#647184", fontSize: 11 },
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
          color: "#647184",
          interval: viewMode === "month" ? 1 : 2,
        },
      },
      yAxis: {
        type: "category",
        data: heights.map((height) => String(height)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#647184" },
        splitLine: {
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
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
