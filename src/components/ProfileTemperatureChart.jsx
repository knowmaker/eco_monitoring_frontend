import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function hasProfileValues(profile) {
  return Boolean(profile?.levels?.some((level) => Number.isFinite(level.temperature) && Number.isFinite(level.height)));
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, "") : "-";
}

export default function ProfileTemperatureChart({ profile, periodLabel, emptyText }) {
  const hasValues = useMemo(() => hasProfileValues(profile), [profile]);

  const option = useMemo(() => {
    if (!hasValues) {
      return null;
    }

    const points = [...(profile.levels || [])]
      .filter((level) => Number.isFinite(level.temperature) && Number.isFinite(level.height))
      .sort((a, b) => a.height - b.height);
    const inversion = profile.inversion;
    const hasInversion =
      Number.isFinite(inversion?.power) &&
      inversion.power > 0 &&
      Number.isFinite(inversion?.lower) &&
      Number.isFinite(inversion?.upper) &&
      inversion.upper > inversion.lower;

    return {
      backgroundColor: "transparent",
      animation: true,
      grid: {
        left: 58,
        right: 28,
        top: 28,
        bottom: 42,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "rgba(15, 23, 42, 0.14)",
        textStyle: { color: "#172033" },
        formatter: (params) => {
          const point = params?.[0]?.data;
          if (!point) {
            return "";
          }
          return [
            periodLabel,
            `Высота: ${formatNumber(point[1], 0)} м`,
            `Температура: ${formatNumber(point[0])} °C`,
          ].join("<br />");
        },
      },
      xAxis: {
        type: "value",
        scale: true,
        name: "°C",
        nameLocation: "end",
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: { color: "#647184" },
        splitLine: {
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "м",
        nameLocation: "end",
        axisLine: { lineStyle: { color: "rgba(15, 23, 42, 0.18)" } },
        axisTick: { show: false },
        axisLabel: { color: "#647184", formatter: (value) => formatNumber(Number(value), 0) },
        splitLine: {
          lineStyle: {
            color: "rgba(15, 23, 42, 0.08)",
            type: "dashed",
          },
        },
      },
      series: [
        {
          type: "line",
          name: "Профиль",
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2.4, color: "#16856d" },
          itemStyle: { color: "#16856d" },
          data: points.map((level) => [level.temperature, level.height]),
          markArea: hasInversion
            ? {
                silent: true,
                itemStyle: { color: "rgba(195, 63, 63, 0.1)" },
                data: [[{ yAxis: inversion.lower }, { yAxis: inversion.upper }]],
              }
            : undefined,
        },
      ],
    };
  }, [hasValues, periodLabel, profile]);

  if (!hasValues || !option) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  const inversion = profile.inversion;
  const hasInversion = Number.isFinite(inversion?.power) && inversion.power > 0;

  return (
    <div className="profile-chart-wrap">
      <ReactECharts option={option} notMerge lazyUpdate className="chart-echarts" />
      {hasInversion && (
        <div className="profile-inversion-summary">
          <span>Инверсия</span>
          <strong>{formatNumber(inversion.power)}</strong>
          <span>
            {formatNumber(inversion.lower, 0)}-{formatNumber(inversion.upper, 0)} м
          </span>
        </div>
      )}
    </div>
  );
}
