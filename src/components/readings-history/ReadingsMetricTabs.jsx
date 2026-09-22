export default function ReadingsMetricTabs({
  selectedDeviceType,
  availableGasSubstanceCodes,
  selectedGasSubstance,
  onGasSubstanceChange,
  metricTabs,
  selectedMetricKey,
  onMetricKeyChange,
}) {
  if (selectedDeviceType === "gas") {
    return (
      <div className="gas-tabs">
        {availableGasSubstanceCodes.map((substanceCode) => (
          <button
            key={substanceCode}
            type="button"
            className={`gas-tab${selectedGasSubstance === substanceCode ? " gas-tab-active" : ""}`}
            onClick={() => onGasSubstanceChange(substanceCode)}
          >
            {substanceCode}
          </button>
        ))}
      </div>
    );
  }

  if (metricTabs.length <= 1) {
    return null;
  }

  return (
    <div className="metric-tabs">
      {metricTabs.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`metric-tab${selectedMetricKey === item.key ? " metric-tab-active" : ""}`}
          onClick={() => onMetricKeyChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
