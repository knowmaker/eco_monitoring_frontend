import { useEffect, useState } from "react";

import { DEVICE_TYPE_ORDER } from "../domain/devices";
import { fetchAvailableDeviceState } from "../api";

export default function useStationDevices(selectedMonitoringPostId) {
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (selectedMonitoringPostId === null) {
      setSelectedDevices([]);
      setSelectedDeviceType(null);
      setDetailsError("");
      setIsLoadingDetails(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);
    setDetailsError("");
    setSelectedDevices([]);
    setSelectedDeviceType(null);

    fetchAvailableDeviceState(selectedMonitoringPostId)
      .then((devices) => {
        if (cancelled) {
          return;
        }
        setSelectedDevices(
          [...devices].sort(
            (left, right) =>
              DEVICE_TYPE_ORDER.indexOf(left.device_type) - DEVICE_TYPE_ORDER.indexOf(right.device_type)
          )
        );
        setSelectedDeviceType((current) => {
          if (current && devices.some((device) => device.device_type === current)) {
            return current;
          }
          return null;
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDetailsError(error instanceof Error ? error.message : "Не удалось получить данные станции");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonitoringPostId, refreshCounter]);

  return {
    selectedDevices,
    selectedDeviceType,
    setSelectedDeviceType,
    isLoadingDetails,
    detailsError,
    refreshCounter,
    refreshStationDetails: () => setRefreshCounter((value) => value + 1),
  };
}
