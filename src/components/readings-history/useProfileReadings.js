import { useMemo } from "react";

import {
  formatProfilePeriodLabel,
  formatProfileTooltipValue,
  getProfileInversionMarkLines,
  getProfilePeriodValue,
  hasProfileTemperatureData,
  normalizeChartValue,
} from "./readingsUtils";

export default function useProfileReadings({
  selectedDeviceType,
  profileRecords,
  selectedProfilePeriod,
  setSelectedProfilePeriod,
  viewMode,
}) {
  const availableProfilePeriods = useMemo(
    () => profileRecords.filter(hasProfileTemperatureData).map((profile) => getProfilePeriodValue(profile, viewMode)),
    [profileRecords, viewMode]
  );

  const activeProfilePeriod = useMemo(() => {
    if (selectedDeviceType !== "profile" || availableProfilePeriods.length === 0) {
      return selectedProfilePeriod;
    }
    return availableProfilePeriods.includes(selectedProfilePeriod)
      ? selectedProfilePeriod
      : availableProfilePeriods[0];
  }, [availableProfilePeriods, selectedDeviceType, selectedProfilePeriod]);

  const activeProfileLegendIndex = useMemo(() => {
    const index = availableProfilePeriods.findIndex((value) => value === activeProfilePeriod);
    return index >= 0 ? index : 0;
  }, [activeProfilePeriod, availableProfilePeriods]);

  const profileTemperatureSeries = useMemo(() => {
    if (selectedDeviceType !== "profile") {
      return [];
    }

    return profileRecords
      .filter(hasProfileTemperatureData)
      .map((profile) => {
        const periodValue = getProfilePeriodValue(profile, viewMode);
        const isActive = periodValue === activeProfilePeriod;
        const markLineData = isActive ? getProfileInversionMarkLines(profile.inversion) : [];

        return {
          key: `profile-${viewMode}-${periodValue}`,
          label: formatProfilePeriodLabel(periodValue, viewMode),
          isActive,
          color: "#16856d",
          points: (profile.levels || [])
            .filter((level) => Number.isFinite(level.height) && Number.isFinite(level.temperature))
            .sort((a, b) => a.height - b.height)
            .map((level) => ({
              temperature: normalizeChartValue(level.temperature),
              height: normalizeChartValue(level.height),
            })),
          showSymbol: isActive,
          symbolSize: 6,
          triggerLineEvent: true,
          options: {
            cursor: "pointer",
            z: isActive ? 3 : 1,
            lineStyle: {
              width: isActive ? 2.6 : 1.2,
              color: "#16856d",
              opacity: isActive ? 1 : 0.16,
            },
            itemStyle: {
              color: "#16856d",
              opacity: isActive ? 1 : 0.18,
            },
            emphasis: {
              lineStyle: {
                width: 2.6,
                opacity: 0.92,
              },
              itemStyle: {
                opacity: 1,
              },
            },
            markLine: markLineData.length
              ? {
                  symbol: "none",
                  label: {
                    color: "#9f2f2f",
                    fontSize: 11,
                    formatter: "{b}",
                  },
                  lineStyle: {
                    color: "#9f2f2f",
                    type: "dashed",
                    width: 1.2,
                  },
                  data: markLineData,
                }
              : undefined,
          },
        };
      });
  }, [activeProfilePeriod, profileRecords, selectedDeviceType, viewMode]);

  const getProfilePeriodByLabel = (label) => {
    return availableProfilePeriods.find((value) => formatProfilePeriodLabel(value, viewMode) === label);
  };

  const getProfilePeriodIndexByLabel = (label) => {
    return availableProfilePeriods.findIndex((value) => formatProfilePeriodLabel(value, viewMode) === label);
  };

  const scrollProfileLegendToLabel = (chart, label) => {
    const index = getProfilePeriodIndexByLabel(label);
    if (index >= 0) {
      chart?.dispatchAction({ type: "legendScroll", scrollDataIndex: index });
    }
  };

  const profileChartEvents = useMemo(
    () => ({
      click: (params, chart) => {
        if (params.componentType !== "series") {
          return;
        }
        const periodValue = getProfilePeriodByLabel(params.seriesName);
        if (Number.isFinite(periodValue)) {
          setSelectedProfilePeriod(periodValue);
          scrollProfileLegendToLabel(chart, params.seriesName);
        }
      },
      legendselectchanged: (params, chart) => {
        const periodValue = getProfilePeriodByLabel(params.name);
        if (Number.isFinite(periodValue)) {
          setSelectedProfilePeriod(periodValue);
        }
        chart?.setOption({
          legend: {
            selected: Object.fromEntries(
              availableProfilePeriods.map((value) => [formatProfilePeriodLabel(value, viewMode), true])
            ),
          },
        });
      },
    }),
    [availableProfilePeriods, viewMode]
  );

  const profileTooltipFormatter = useMemo(() => {
    return (params) => {
      const [temperature, height] = params.data || [];
      return [
        params.seriesName,
        `Высота: ${formatProfileTooltipValue(height, "м")}`,
        `Температура: ${formatProfileTooltipValue(temperature, "°C")}`,
      ].join("<br />");
    };
  }, []);

  return {
    activeProfileLegendIndex,
    profileTemperatureSeries,
    profileChartEvents,
    profileTooltipFormatter,
  };
}
