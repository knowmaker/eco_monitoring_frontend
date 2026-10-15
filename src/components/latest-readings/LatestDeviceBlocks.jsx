import { useState } from "react";

import { DEVICE_TYPE_LABELS, GAS_SUBSTANCE_ORDER } from "../../domain/devices";
import { applyGasValueCorrection } from "../../lib/gasValues";
import LatestDeviceHeader from "./LatestDeviceHeader";
import LatestMetric from "./LatestMetric";
import { formatLatestValue, formatWindValue } from "./latestReadingsFormatters";

function LatestProfileDeviceBlock({ device, timeMode }) {
  const levels = Array.isArray(device.levels) ? device.levels : [];
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
  const selectedLevel = levels[selectedLevelIndex] ?? levels[0] ?? null;
  const canStep = levels.length > 1;
  const inversionRange =
    Number.isFinite(device.inversion_power) &&
    Number.isFinite(device.inversion_lower) &&
    Number.isFinite(device.inversion_upper)
      ? `${formatLatestValue(device.inversion_lower, "м", 0)}-${formatLatestValue(device.inversion_upper, "м", 0)}`
      : "-";

  const shiftLevel = (delta) => {
    setSelectedLevelIndex((current) => {
      if (!levels.length) {
        return 0;
      }
      return (current + delta + levels.length) % levels.length;
    });
  };

  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.profile} timestampMs={device.timestamp_ms} timeMode={timeMode} />
      <div className="latest-metrics latest-profile-level-metrics">
        <LatestMetric label="Высота" value={selectedLevel?.height} unit="м" precision={0} />
        <LatestMetric label="Темп." value={selectedLevel?.temperature} unit="°C" />
      </div>
      <div className="latest-profile-controls">
        <button
          type="button"
          className="latest-profile-step"
          disabled={!canStep}
          onClick={() => shiftLevel(-1)}
          title="Предыдущий уровень"
        >
          ниже
        </button>
        <button
          type="button"
          className="latest-profile-step"
          disabled={!canStep}
          onClick={() => shiftLevel(1)}
          title="Следующий уровень"
        >
          выше
        </button>
      </div>
      <div className="latest-metrics latest-profile-inversion-metrics">
        <LatestMetric label="Инверсия" displayValue={inversionRange} />
        <LatestMetric label="Разница темп." value={device.inversion_delta_t} unit="°C" />
      </div>
    </div>
  );
}

function LatestGasDeviceBlock({ device, timeMode, useGasAbsoluteValues = true }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.gas} timestampMs={device.timestamp_ms} timeMode={timeMode} />
      <div className="latest-metrics latest-metrics-gas">
        {GAS_SUBSTANCE_ORDER.map((substanceCode) =>
          device.substances.find((item) => item.substance_code === substanceCode)
        )
          .filter(Boolean)
          .map((item) => (
            <LatestMetric
              key={item.substance_code}
              label={item.substance_code}
              value={applyGasValueCorrection(item.value, useGasAbsoluteValues)}
              precision={3}
              limit={item.limit}
            />
          ))}
      </div>
    </div>
  );
}

function LatestDustDeviceBlock({ device, timeMode }) {
  const metrics = [
    { key: "pm1", label: "PM1", precision: 4 },
    { key: "pm2", label: "PM2.5", precision: 4 },
    { key: "pm10", label: "PM10", precision: 4 },
    { key: "tsp", label: "TSP", precision: 4 },
  ].filter((metric) => Number.isFinite(device[metric.key]));

  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.dust} timestampMs={device.timestamp_ms} timeMode={timeMode} />
      <div className="latest-metrics">
        {metrics.map((metric) => (
          <LatestMetric
            key={metric.key}
            label={metric.label}
            value={device[metric.key]}
            precision={metric.precision}
            limit={device.limits?.[metric.key]}
          />
        ))}
      </div>
    </div>
  );
}

function LatestMeteoDeviceBlock({ device, timeMode }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.meteo} timestampMs={device.timestamp_ms} timeMode={timeMode} />
      <div className="latest-metrics">
        <LatestMetric label="Темп." value={device.air_temp} unit="°C" />
        <LatestMetric label="Влажн." value={device.air_hum} unit="%" />
        <LatestMetric label="Давл." value={device.atm_press} />
        <LatestMetric label="Ветер" displayValue={formatWindValue(device.hor_win_dir, device.hor_win_spd)} />
      </div>
    </div>
  );
}

function LatestIvtmDeviceBlock({ device, timeMode }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.ivtm} timestampMs={device.timestamp_ms} timeMode={timeMode} />
      <div className="latest-metrics">
        <LatestMetric label="Влажн." value={device.sensor_ivtm_hum} unit="%" />
        <LatestMetric label="Темп." value={device.sensor_ivtm_temp} unit="°C" />
      </div>
    </div>
  );
}

const DEVICE_BLOCKS = {
  gas: LatestGasDeviceBlock,
  dust: LatestDustDeviceBlock,
  meteo: LatestMeteoDeviceBlock,
  ivtm: LatestIvtmDeviceBlock,
  profile: LatestProfileDeviceBlock,
};

export function renderLatestDeviceBlock(deviceType, latestReadings, options = {}) {
  const device = latestReadings?.[deviceType];
  const DeviceBlock = DEVICE_BLOCKS[deviceType];

  if (!device || !DeviceBlock) {
    return null;
  }

  return (
    <DeviceBlock
      key={deviceType}
      device={device}
      timeMode={latestReadings.time_mode}
      useGasAbsoluteValues={options.useGasAbsoluteValues}
    />
  );
}
