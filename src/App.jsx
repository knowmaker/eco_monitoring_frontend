import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import AuthModal from "./components/auth/AuthModal";
import ExportPanel from "./components/export-aggregates/ExportPanel";
import ConcentrationMapPanel from "./components/concentration-map/ConcentrationMapPanel";
import SideMenu from "./components/layout/SideMenu";
import TemperatureProfilePanel from "./components/profile-map/TemperatureProfilePanel";
import Topbar from "./components/layout/Topbar";
import StationDetails from "./components/stations/StationDetails";
import StationManagementPanel from "./components/stations/StationManagementPanel";
import StationsPanel from "./components/stations/StationsPanel";
import useAdminMonitoringPosts from "./hooks/useAdminMonitoringPosts";
import useAuthState from "./hooks/useAuthState";
import useMonitoringMap from "./components/map/useMonitoringMap";
import useMonitoringPosts from "./hooks/useMonitoringPosts";
import useResponsiveViewport from "./hooks/useResponsiveViewport";
import useStationDevices from "./hooks/useStationDevices";
import useStationManagement from "./components/stations/useStationManagement";
import { GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY } from "./lib/gasValues";

const ProfileModal = lazy(() => import("./components/profile/ProfileModal"));
const RawMqttPayloadPanel = lazy(() => import("./components/raw-mqtt/RawMqttPayloadPanel"));
const ReadingsHistoryPanel = lazy(() => import("./components/readings-history/ReadingsHistoryPanel"));

const POSTS_REFRESH_MS = 600_000;
const STACKED_PANELS_QUERY = "(max-width: 1000px)";

export default function App() {
  const [postsReloadToken, setPostsReloadToken] = useState(0);
  const [activeMenuPanel, setActiveMenuPanel] = useState(null);
  const [concentrationMapFrame, setConcentrationMapFrame] = useState(null);
  const [temperatureProfileFrame, setTemperatureProfileFrame] = useState(null);
  const [selectedMonitoringPostId, setSelectedMonitoringPostId] = useState(null);
  const [isStationCardOpen, setIsStationCardOpen] = useState(false);
  const [stationCardSource, setStationCardSource] = useState(null);
  const [isReadingsCardOpen, setIsReadingsCardOpen] = useState(false);
  const [isRawPacketsOpen, setIsRawPacketsOpen] = useState(false);

  const [modalMode, setModalMode] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGasValueCorrectionDisabled, setIsGasValueCorrectionDisabled] = useState(
    () => localStorage.getItem(GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY) === "true"
  );
  const { isAuthenticated, isAdmin, applyAuthSuccess, clearAuth } = useAuthState();
  const isStackedPanelsViewport = useResponsiveViewport(STACKED_PANELS_QUERY);
  const { monitoringPosts, loadError, isLoadingPosts, scheduledRefreshCounter } = useMonitoringPosts({
    isAdmin,
    refreshMs: POSTS_REFRESH_MS,
    reloadToken: postsReloadToken,
  });
  const {
    adminMonitoringPosts,
    isLoadingAdminPosts,
    adminPostsError,
    loadAdminMonitoringPosts,
  } = useAdminMonitoringPosts({
    isAdmin,
    activePanel: activeMenuPanel,
    reloadToken: postsReloadToken,
  });

  const statusText = useMemo(() => {
    if (isLoadingPosts) {
      return "Загрузка станций...";
    }
    if (loadError) {
      return loadError;
    }
    return `Станций на карте: ${monitoringPosts.length}`;
  }, [monitoringPosts.length, isLoadingPosts, loadError]);
  const statusKind = loadError ? "error" : isLoadingPosts ? "loading" : "ready";
  const stationStatusCounts = useMemo(
    () =>
      monitoringPosts.reduce(
        (counts, post) => {
          if (post.activity_status === "active") {
            counts.active += 1;
          } else if (post.activity_status === "archived") {
            counts.archived += 1;
          } else {
            counts.passive += 1;
          }
          return counts;
        },
        { active: 0, passive: 0, archived: 0 }
      ),
    [monitoringPosts]
  );
  const useGasAbsoluteValues = !isAuthenticated || !isGasValueCorrectionDisabled;

  const stationPanelPosts = isAdmin ? adminMonitoringPosts : monitoringPosts;
  const knownMonitoringPosts = isAdmin && adminMonitoringPosts.length ? adminMonitoringPosts : monitoringPosts;
  const selectedMonitoringPost =
    knownMonitoringPosts.find((post) => post.id === selectedMonitoringPostId) ?? null;
  const {
    selectedDevices,
    selectedDeviceType,
    setSelectedDeviceType,
    isLoadingDetails,
    detailsError,
    refreshCounter: stationDetailsRefreshCounter,
    refreshStationDetails,
  } = useStationDevices(selectedMonitoringPostId);

  const handleMapPostClick = (post) => {
    setActiveMenuPanel("stations");
    setIsStationCardOpen(true);
    setStationCardSource("map");
    clearStationManagementMode();
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    setSelectedMonitoringPostId(post.id);
  };

  const { mapContainerRef, focusPost, fitToPosts } = useMonitoringMap({
    monitoringPosts,
    selectedMonitoringPostId,
    onPostClick: handleMapPostClick,
    concentrationMapFrame,
    concentrationMapEnabled: activeMenuPanel === "concentration-map",
    temperatureProfileFrame,
    temperatureProfileEnabled: activeMenuPanel === "temperature-profile",
  });

  const {
    editingStationId,
    stationForm,
    setStationForm,
    isSavingStation,
    stationSaveError,
    stationTransferForm,
    setStationTransferForm,
    isTransferringStation,
    stationTransferError,
    managedMonitoringPost,
    stationManagementMode,
    clearStationManagementMode,
    closeStationManagementPanel,
    handleStartEditStation,
    handleSaveStation,
    handleStartTransferStation,
    handleArchiveStation,
    handleCancelTransferStation,
    handleTransferStation,
  } = useStationManagement({
    knownMonitoringPosts,
    selectedMonitoringPost,
    setSelectedMonitoringPostId,
    setPostsReloadToken,
    loadAdminMonitoringPosts,
    setIsReadingsCardOpen,
    setIsRawPacketsOpen,
    focusPost,
  });

  useEffect(() => {
    if (activeMenuPanel !== "temperature-profile") {
      setTemperatureProfileFrame(null);
    }
  }, [activeMenuPanel]);

  useEffect(() => {
    setSelectedMonitoringPostId((current) => {
      if (current === null || isAdmin) {
        return current;
      }
      return monitoringPosts.some((post) => post.id === current) ? current : null;
    });
  }, [isAdmin, monitoringPosts]);

  const handleLogout = () => {
    clearAuth();
    setIsProfileModalOpen(false);
    closeStationManagementPanel();
    setStationCardSource(null);
    setIsRawPacketsOpen(false);
  };

  const handleGasValueCorrectionDisabledChange = (isDisabled) => {
    setIsGasValueCorrectionDisabled(isDisabled);
    if (isDisabled) {
      localStorage.setItem(GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY);
    }
  };

  const handleSelectMonitoringPost = (post) => {
    setSelectedMonitoringPostId(post.id);
    setIsStationCardOpen(true);
    setStationCardSource("list");
    clearStationManagementMode();
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    focusPost(post);
  };

  const isStationDetailsInPanel =
    activeMenuPanel === "stations" &&
    isStationCardOpen &&
    selectedMonitoringPostId !== null;
  const isStationManagementPanelOpen = Boolean(stationManagementMode && managedMonitoringPost);
  const isReadingsPanelOpen = Boolean(
    isStationCardOpen && isReadingsCardOpen && selectedMonitoringPostId !== null && selectedDeviceType
  );
  const isRawPacketsPanelOpen = Boolean(
    isAdmin &&
    selectedMonitoringPost?.source !== "mosecom" &&
    isStationCardOpen &&
    isRawPacketsOpen &&
    selectedMonitoringPostId !== null
  );
  const isStationsPanelCovered =
    isStackedPanelsViewport &&
    (isStationManagementPanelOpen || isReadingsPanelOpen || isRawPacketsPanelOpen);

  const closeStationDetails = () => {
    setIsStationCardOpen(false);
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    closeStationManagementPanel();
    setSelectedMonitoringPostId(null);
    fitToPosts(monitoringPosts);
    if (stationCardSource === "map") {
      setActiveMenuPanel(null);
    }
    setStationCardSource(null);
  };

  const handleRefreshStationPanel = () => {
    setPostsReloadToken((value) => value + 1);
    if (isStationDetailsInPanel) {
      refreshStationDetails();
    }
  };

  return (
    <div className="app-shell">
      <Topbar
        statusKind={statusKind}
        statusText={statusText}
        stationStatusCounts={stationStatusCounts}
        isAuthenticated={isAuthenticated}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onLoginClick={() => setModalMode("login")}
        onRegisterClick={() => setModalMode("register")}
      />

      <SideMenu
        activeMenuPanel={activeMenuPanel}
        onStationsClick={() => setActiveMenuPanel((current) => (current === "stations" ? null : "stations"))}
        onConcentrationMapClick={() => {
          if (isStationCardOpen) {
            closeStationDetails();
          }
          setActiveMenuPanel((current) => {
            const next = current === "concentration-map" ? null : "concentration-map";
            if (next === null) setConcentrationMapFrame(null);
            return next;
          });
          setIsReadingsCardOpen(false);
          setIsRawPacketsOpen(false);
        }}
        onTemperatureProfileClick={() => {
          if (isStationCardOpen) {
            closeStationDetails();
          }
          setConcentrationMapFrame(null);
          setActiveMenuPanel((current) => (
            current === "temperature-profile" ? null : "temperature-profile"
          ));
          setIsReadingsCardOpen(false);
          setIsRawPacketsOpen(false);
        }}
        onExportClick={() => {
          if (isStationCardOpen) {
            closeStationDetails();
          }
          setActiveMenuPanel((current) => (current === "export" ? null : "export"));
          setIsReadingsCardOpen(false);
          setIsRawPacketsOpen(false);
        }}
      />

      {activeMenuPanel === "stations" && (
        <StationsPanel
          isCovered={isStationsPanelCovered}
          isStationDetailsInPanel={isStationDetailsInPanel}
          isAdmin={isAdmin}
          isLoadingAdminPosts={isLoadingAdminPosts}
          adminPostsError={adminPostsError}
          stationPanelPosts={stationPanelPosts}
          selectedMonitoringPostId={selectedMonitoringPostId}
          onRefresh={handleRefreshStationPanel}
          onClose={() => {
            if (isStationDetailsInPanel) {
              closeStationDetails();
            } else {
              setActiveMenuPanel(null);
            }
          }}
          onSelectPost={handleSelectMonitoringPost}
        >
          <StationDetails
            selectedMonitoringPost={selectedMonitoringPost}
            selectedMonitoringPostId={selectedMonitoringPostId}
            isAdmin={isAdmin}
            isRawPacketsOpen={isRawPacketsOpen}
            selectedDevices={selectedDevices}
            selectedDeviceType={selectedDeviceType}
            isReadingsCardOpen={isReadingsCardOpen}
            isLoadingDetails={isLoadingDetails}
            detailsError={detailsError}
            refreshCounter={stationDetailsRefreshCounter + scheduledRefreshCounter}
            useGasAbsoluteValues={useGasAbsoluteValues}
            onEditStation={() => {
              if (selectedMonitoringPost) {
                handleStartEditStation(selectedMonitoringPost);
              }
            }}
            onOpenRawPackets={() => {
              clearStationManagementMode();
              setIsRawPacketsOpen(true);
              setIsReadingsCardOpen(false);
            }}
            onSelectDeviceType={(deviceType) => {
              clearStationManagementMode();
              setSelectedDeviceType(deviceType);
              setIsReadingsCardOpen(true);
              setIsRawPacketsOpen(false);
            }}
          />
        </StationsPanel>
      )}

      {activeMenuPanel === "export" && (
        <ExportPanel
          monitoringPosts={monitoringPosts.filter((post) => post.source !== "mosecom")}
          isAuthenticated={isAuthenticated}
          onLoginClick={() => setModalMode("login")}
          onClose={() => setActiveMenuPanel(null)}
        />
      )}

      {activeMenuPanel === "concentration-map" && (
        <ConcentrationMapPanel
          onFrameChange={setConcentrationMapFrame}
          autoRefreshCounter={scheduledRefreshCounter}
          onClose={() => {
            setConcentrationMapFrame(null);
            setActiveMenuPanel(null);
          }}
        />
      )}

      {activeMenuPanel === "temperature-profile" && (
        <TemperatureProfilePanel
          onFrameChange={setTemperatureProfileFrame}
          onClose={() => {
            setTemperatureProfileFrame(null);
            setActiveMenuPanel(null);
          }}
        />
      )}

      {isStationManagementPanelOpen && (
        <StationManagementPanel
          mode={stationManagementMode}
          stationForm={stationForm}
          stationSaveError={stationSaveError}
          isSavingStation={isSavingStation}
          transferForm={stationTransferForm}
          transferError={stationTransferError}
          isTransferringStation={isTransferringStation}
          canTransferStation={isAdmin && !managedMonitoringPost.active_to}
          canArchiveStation={isAdmin && !managedMonitoringPost.active_to}
          onSaveStation={handleSaveStation}
          onStationFormChange={setStationForm}
          onStartTransfer={() => handleStartTransferStation(managedMonitoringPost)}
          onArchiveStation={handleArchiveStation}
          onSubmitTransfer={handleTransferStation}
          onTransferFormChange={setStationTransferForm}
          onCancelTransfer={handleCancelTransferStation}
          onClose={closeStationManagementPanel}
        />
      )}

      {isReadingsPanelOpen && (
        <Suspense fallback={null}>
          <ReadingsHistoryPanel
            monitoringPostId={selectedMonitoringPostId}
            selectedDeviceType={selectedDeviceType}
            isAuthenticated={isAuthenticated}
            allowsRawDrilldown={selectedMonitoringPost?.source !== "mosecom"}
            useGasAbsoluteValues={useGasAbsoluteValues}
            autoRefreshCounter={scheduledRefreshCounter}
            onClose={() => setIsReadingsCardOpen(false)}
          />
        </Suspense>
      )}

      {isRawPacketsPanelOpen && (
        <Suspense fallback={null}>
          <RawMqttPayloadPanel
            monitoringPostId={selectedMonitoringPostId}
            onClose={() => setIsRawPacketsOpen(false)}
          />
        </Suspense>
      )}

      <main ref={mapContainerRef} className="map-root" />

      {modalMode && (
        <AuthModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onAuthSuccess={applyAuthSuccess}
        />
      )}
      {isAuthenticated && isProfileModalOpen && (
        <Suspense fallback={null}>
          <ProfileModal
            isGasValueCorrectionDisabled={isGasValueCorrectionDisabled}
            onGasValueCorrectionDisabledChange={handleGasValueCorrectionDisabledChange}
            onClose={() => setIsProfileModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
