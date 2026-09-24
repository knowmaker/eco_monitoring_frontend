import { useMemo, useState } from "react";
import { ChevronLeft, RefreshCw, X } from "lucide-react";

import {
  DEVICE_METRIC_TABS,
  DEVICE_TYPE_LABELS,
  METEO_WIND_KEY,
} from "../../domain/devices";
import {
  parseIsoDay,
  parseIsoMonth,
  shiftDay,
  shiftMonth,
  toIsoDay,
  toIsoMonth,
} from "../../lib/date";
import CategoryLineChart from "../charts/CategoryLineChart";
import ProfileTemperatureChart from "../charts/ProfileTemperatureChart";
import ScrollablePanel from "../layout/ScrollablePanel";
import ReadingsMetricTabs from "./ReadingsMetricTabs";
import ReadingsPeriodToolbar from "./ReadingsPeriodToolbar";
import {
  createReadingsAxis,
  formatHourInterval,
  formatTimeOfDay,
  getHourBounds,
  isWindDirectionSeries,
  isWindSpeedSeries,
} from "./readingsUtils";
import useProfileReadings from "./useProfileReadings";
import useReadingsData from "./useReadingsData";
import useRawReadings from "./useRawReadings";
import TimeLineChart from "../charts/TimeLineChart";
import WindCompassStrip from "../charts/WindCompassStrip";
import XYLineChart from "../charts/XYLineChart";

const GAS_Y_AXIS_NAME = "Концентрация, мг/м³";
const DUST_Y_AXIS_NAME = "Концентрация, мг/м³";

function getXAxisName(viewMode) {
  return viewMode === "month" ? "Дата" : "Время";
}

function getYAxisName(selectedDeviceType, selectedMetricKey) {
  if (selectedDeviceType === "gas") {
    return GAS_Y_AXIS_NAME;
  }
  if (selectedDeviceType === "dust") {
    return DUST_Y_AXIS_NAME;
  }
  if (selectedDeviceType === "meteo" || selectedDeviceType === "ivtm") {
    return DEVICE_METRIC_TABS[selectedDeviceType]?.find((item) => item.key === selectedMetricKey)?.yAxisName;
  }
  return undefined;
}

export default function ReadingsHistoryPanel({
  monitoringPostId,
  selectedDeviceType,
  isAuthenticated = false,
  useGasAbsoluteValues = true,
  onClose,
}) {
  const [viewMode, setViewMode] = useState("day");
  const [profileViewMode, setProfileViewMode] = useState("line");
  const [selectedProfilePeriod, setSelectedProfilePeriod] = useState(0);
  const [day, setDay] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [rawDrilldown, setRawDrilldown] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const axis = useMemo(() => createReadingsAxis(viewMode, month), [viewMode, month]);
  const {
    isLoading,
    errorText,
    series,
    effectiveSeries,
    profileRecords,
    availableGasSubstanceCodes,
    selectedGasSubstance,
    setSelectedGasSubstance,
    metricTabs,
    selectedMetricKey,
    setSelectedMetricKey,
  } = useReadingsData({
    monitoringPostId,
    selectedDeviceType,
    day,
    month,
    viewMode,
    refreshCounter,
    axis,
    useGasAbsoluteValues,
  });

  const meteoWindDirectionSeries = useMemo(
    () => (selectedDeviceType === "meteo" ? series.find((item) => isWindDirectionSeries(item)) ?? null : null),
    [selectedDeviceType, series]
  );

  const meteoWindSpeedSeries = useMemo(
    () => (selectedDeviceType === "meteo" ? series.find((item) => isWindSpeedSeries(item)) ?? null : null),
    [selectedDeviceType, series]
  );

  const {
    rawSeries,
    isRawLoading,
    rawErrorText,
    rawWindDirectionSeries,
    rawWindSpeedSeries,
    rawWindTimestamps,
    clearRawReadings,
  } = useRawReadings({
    monitoringPostId,
    selectedDeviceType,
    selectedGasSubstance,
    selectedMetricKey,
    rawDrilldown,
    refreshCounter,
    isAuthenticated,
    day,
    month,
    viewMode,
    useGasAbsoluteValues,
  });

  const {
    activeProfileLegendIndex,
    profileTemperatureSeries,
    profileChartEvents,
    profileTooltipFormatter,
  } = useProfileReadings({
    selectedDeviceType,
    profileRecords,
    selectedProfilePeriod,
    setSelectedProfilePeriod,
    viewMode,
  });

  const isWindCompositeMetric = selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY;
  const xAxisName = getXAxisName(viewMode);
  const yAxisName = getYAxisName(selectedDeviceType, selectedMetricKey);
  const canOpenRawDrilldown = isAuthenticated && viewMode === "day" && selectedDeviceType !== "profile";
  const dateInputType = viewMode === "month" ? "month" : "date";
  const dateInputValue = viewMode === "month" ? toIsoMonth(month) : toIsoDay(day);
  const maxDateInputValue = viewMode === "month" ? toIsoMonth(new Date()) : toIsoDay(new Date());
  const isNextPeriodDisabled = dateInputValue >= maxDateInputValue;

  const aggregateChartEvents = useMemo(
    () => ({
      click: (params) => {
        if (!canOpenRawDrilldown) {
          return;
        }
        const hour = axis.values[params.dataIndex];
        if (!Number.isInteger(hour)) {
          return;
        }
        const bounds = getHourBounds(day, hour);
        setRawDrilldown({
          hour,
          start: bounds.startParam,
          end: bounds.endParam,
          label: formatHourInterval(hour),
        });
      },
    }),
    [axis.values, canOpenRawDrilldown, day]
  );

  const shiftPeriod = (delta) => {
    if (viewMode === "month") {
      setMonth((prev) => {
        const nextMonth = shiftMonth(prev, delta);
        return delta > 0 && toIsoMonth(nextMonth) > maxDateInputValue ? prev : nextMonth;
      });
      return;
    }
    setDay((prev) => {
      const nextDay = shiftDay(prev, delta);
      return delta > 0 && toIsoDay(nextDay) > maxDateInputValue ? prev : nextDay;
    });
  };

  const handleDateInputChange = (value) => {
    if (viewMode === "month") {
      const nextMonth = parseIsoMonth(value);
      if (nextMonth && toIsoMonth(nextMonth) <= maxDateInputValue) {
        setMonth(nextMonth);
      }
      return;
    }

    const nextDay = parseIsoDay(value);
    if (nextDay && toIsoDay(nextDay) <= maxDateInputValue) {
      setDay(nextDay);
    }
  };

  return (
    <ScrollablePanel className="readings-card">
      <div className="card-header">
        <h2>Исторические наблюдения</h2>
        <div className="card-header-actions">
          <button
            type="button"
            className="card-refresh-btn"
            onClick={() => setRefreshCounter((value) => value + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className="card-close-btn" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {monitoringPostId && selectedDeviceType && (
        <>
          <div className="readings-heading">
            <div className="readings-type">{DEVICE_TYPE_LABELS[selectedDeviceType] ?? selectedDeviceType}</div>

            <div className="chart-view-tabs" role="tablist" aria-label="Вид графика">
              {selectedDeviceType === "profile" ? (
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileViewMode === "line"}
                    className={`chart-view-tab${profileViewMode === "line" ? " chart-view-tab-active" : ""}`}
                    onClick={() => setProfileViewMode("line")}
                  >
                    График
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileViewMode === "heatmap"}
                    className={`chart-view-tab${profileViewMode === "heatmap" ? " chart-view-tab-active" : ""}`}
                    onClick={() => setProfileViewMode("heatmap")}
                  >
                    Тепловая карта
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  className="chart-view-tab chart-view-tab-active"
                >
                  График
                </button>
              )}
            </div>
          </div>

          {!rawDrilldown && (
            <>
              <ReadingsPeriodToolbar
                viewMode={viewMode}
                dateInputType={dateInputType}
                dateInputValue={dateInputValue}
                maxDateInputValue={maxDateInputValue}
                isNextPeriodDisabled={isNextPeriodDisabled}
                onViewModeChange={setViewMode}
                onShiftPeriod={shiftPeriod}
                onDateInputChange={handleDateInputChange}
              />

              <ReadingsMetricTabs
                selectedDeviceType={selectedDeviceType}
                availableGasSubstanceCodes={availableGasSubstanceCodes}
                selectedGasSubstance={selectedGasSubstance}
                onGasSubstanceChange={setSelectedGasSubstance}
                metricTabs={metricTabs}
                selectedMetricKey={selectedMetricKey}
                onMetricKeyChange={setSelectedMetricKey}
              />
            </>
          )}

          {rawDrilldown && (
            <div className="chart-drilldown-bar">
              <button
                type="button"
                className="chart-drilldown-back"
                onClick={() => {
                  setRawDrilldown(null);
                  clearRawReadings();
                }}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                К графику
              </button>
              <span className="chart-drilldown-label">Сырые данные: {rawDrilldown.label}</span>
            </div>
          )}

          {isLoading && <p className="station-card-hint">Загрузка графика...</p>}
          {!isLoading && errorText && <p className="station-card-error">{errorText}</p>}
          {!isLoading &&
            !errorText &&
            (rawDrilldown ? (
              isRawLoading ? (
                <p className="station-card-hint">Загрузка сырых данных...</p>
              ) : rawErrorText ? (
                <p className="station-card-error">{rawErrorText}</p>
              ) : selectedDeviceType === "meteo" && selectedMetricKey === METEO_WIND_KEY ? (
                <WindCompassStrip
                  directionPoints={rawWindDirectionSeries?.points ?? []}
                  speedPoints={rawWindSpeedSeries?.points ?? []}
                  xKey="timestamp"
                  xValues={rawWindTimestamps}
                  labelFormatter={formatTimeOfDay}
                  emptyText="Нет сырых данных за выбранный час."
                />
              ) : (
                <TimeLineChart
                  series={rawSeries}
                  start={rawDrilldown.start}
                  end={rawDrilldown.end}
                  xAxisName="Время"
                  yAxisName={yAxisName}
                  emptyText="Нет сырых данных за выбранный час."
                />
              )
            ) : selectedDeviceType === "profile" ? (
              profileViewMode === "heatmap" ? (
                <ProfileTemperatureChart
                  profiles={profileRecords}
                  viewMode={viewMode}
                  emptyText={axis.emptyText}
                />
              ) : (
                <XYLineChart
                  series={profileTemperatureSeries}
                  xKey="temperature"
                  yKey="height"
                  xAxisName="Температура, °C"
                  yAxisName="Высота, м"
                  xAxisSplitNumber={8}
                  yAxisInterval={100}
                  showLegend
                  onEvents={profileChartEvents}
                  tooltipFormatter={profileTooltipFormatter}
                  emptyText={axis.emptyText}
                  chartKey={`profile-${viewMode}-${dateInputValue}`}
                  legendScrollDataIndex={activeProfileLegendIndex}
                />
              )
            ) : isWindCompositeMetric ? (
              <WindCompassStrip
                directionPoints={meteoWindDirectionSeries?.points ?? []}
                speedPoints={meteoWindSpeedSeries?.points ?? []}
                xKey={axis.key}
                xValues={axis.values}
                labelFormatter={axis.windLabelFormatter}
                onItemClick={
                  canOpenRawDrilldown
                    ? (hour) => {
                        if (!Number.isInteger(hour)) {
                          return;
                        }
                        const bounds = getHourBounds(day, hour);
                        setRawDrilldown({
                          hour,
                          start: bounds.startParam,
                          end: bounds.endParam,
                          label: formatHourInterval(hour),
                        });
                      }
                    : undefined
                }
                emptyText={axis.emptyText}
              />
            ) : (
              <CategoryLineChart
                series={effectiveSeries}
                xKey={axis.key}
                xValues={axis.values}
                xLabels={axis.labels}
                xAxisName={xAxisName}
                yAxisName={yAxisName}
                onEvents={canOpenRawDrilldown ? aggregateChartEvents : undefined}
                emptyText={axis.emptyText}
              />
            ))}
          {!isLoading && !errorText && !rawDrilldown && canOpenRawDrilldown && (
            <div className="chart-raw-access-note">
              Для просмотра сырых измерений за час, нажмите на нужное значение.
            </div>
          )}
        </>
      )}
    </ScrollablePanel>
  );
}
