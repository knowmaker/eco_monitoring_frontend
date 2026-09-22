import { useState } from "react";

import { DEVICE_TYPE_LABELS, GAS_SUBSTANCE_ORDER } from "../../domain/devices";
import { applyGasValueCorrection } from "../../lib/gasValues";
import LatestDeviceHeader from "./LatestDeviceHeader";
import LatestMetric from "./LatestMetric";
import { formatLatestValue, formatWindValue } from "./latestReadingsFormatters";

function LatestProfileDeviceBlock({ device }) {
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
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.profile} bucketMs={device.bucket_ms} />
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

function LatestGasDeviceBlock({ device, useGasAbsoluteValues = true }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.gas} bucketMs={device.bucket_ms} />
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
              precision={2}
              limit={item.limit}
            />
          ))}
      </div>
    </div>
  );
}

function LatestDustDeviceBlock({ device }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.dust} bucketMs={device.bucket_ms} />
      <div className="latest-metrics">
        <LatestMetric label="PM1" value={device.pm1} precision={4} limit={device.limits?.pm1} />
        <LatestMetric label="PM2.5" value={device.pm2} precision={4} limit={device.limits?.pm2} />
        <LatestMetric label="PM10" value={device.pm10} precision={4} limit={device.limits?.pm10} />
        <LatestMetric label="TSP" value={device.tsp} precision={4} limit={device.limits?.tsp} />
      </div>
    </div>
  );
}

function LatestMeteoDeviceBlock({ device }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.meteo} bucketMs={device.bucket_ms} />
      <div className="latest-metrics">
        <LatestMetric label="Темп." value={device.air_temp} unit="°C" />
        <LatestMetric label="Влажн." value={device.air_hum} unit="%" />
        <LatestMetric label="Давл." value={device.atm_press} />
        <LatestMetric label="Ветер" displayValue={formatWindValue(device.hor_win_dir, device.hor_win_spd)} />
      </div>
    </div>
  );
}

function LatestIvtmDeviceBlock({ device }) {
  return (
    <div className="latest-device-block">
      <LatestDeviceHeader title={DEVICE_TYPE_LABELS.ivtm} bucketMs={device.bucket_ms} />
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
      useGasAbsoluteValues={options.useGasAbsoluteValues}
    />
  );
}
