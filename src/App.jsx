import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import AuthModal from "./components/auth/AuthModal";
import ExportPanel from "./components/export-aggregates/ExportPanel";
import SideMenu from "./components/layout/SideMenu";
import Topbar from "./components/layout/Topbar";
import StationDetails from "./components/stations/StationDetails";
import StationsPanel from "./components/stations/StationsPanel";
import useAdminMonitoringPosts from "./hooks/useAdminMonitoringPosts";
import useAuthState from "./hooks/useAuthState";
import useMonitoringMap from "./components/map/useMonitoringMap";
import useMonitoringPosts from "./hooks/useMonitoringPosts";
import useResponsiveViewport from "./hooks/useResponsiveViewport";
import useStationDevices from "./hooks/useStationDevices";
import { updateMonitoringPost } from "./api";
import { GAS_VALUE_CORRECTION_DISABLED_STORAGE_KEY } from "./lib/gasValues";

const ProfileModal = lazy(() => import("./components/profile/ProfileModal"));
const RawMqttPayloadPanel = lazy(() => import("./components/raw-mqtt/RawMqttPayloadPanel"));
const ReadingsHistoryPanel = lazy(() => import("./components/readings-history/ReadingsHistoryPanel"));

const POSTS_REFRESH_MS = 30_000;
const MOBILE_VIEWPORT_QUERY = "(max-width: 760px)";

function formatCoordinateInput(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function toNullableFloat(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyStationForm() {
  return {
    serial: "",
    name: "",
    post_type: "",
    latitude: "",
    longitude: "",
    notes: "",
    is_confirmed: true,
  };
}

export default function App() {
  const [postsReloadToken, setPostsReloadToken] = useState(0);
  const [activeMenuPanel, setActiveMenuPanel] = useState(null);
  const [editingStationId, setEditingStationId] = useState(null);
  const [stationForm, setStationForm] = useState(createEmptyStationForm);
  const [isSavingStation, setIsSavingStation] = useState(false);
  const [stationSaveError, setStationSaveError] = useState("");

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
  const isMobileViewport = useResponsiveViewport(MOBILE_VIEWPORT_QUERY);
  const { monitoringPosts, loadError, isLoadingPosts } = useMonitoringPosts({
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
    setEditingStationId(null);
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    setSelectedMonitoringPostId(post.id);
  };

  const { mapContainerRef, focusPost, fitToPosts } = useMonitoringMap({
    monitoringPosts,
    selectedMonitoringPostId,
    onPostClick: handleMapPostClick,
  });

  useEffect(() => {
    if (isMobileViewport) {
      setIsRawPacketsOpen(false);
    }
  }, [isMobileViewport]);

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
    setEditingStationId(null);
    setStationCardSource(null);
    setIsRawPacketsOpen(false);
    setStationForm(createEmptyStationForm());
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
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    focusPost(post);
  };

  const handleStartEditStation = (post) => {
    setEditingStationId(post.id);
    setStationSaveError("");
    setStationForm({
      serial: post.serial,
      name: post.name || "",
      post_type: post.post_type || "",
      latitude: formatCoordinateInput(post.latitude),
      longitude: formatCoordinateInput(post.longitude),
      notes: post.notes || "",
      is_confirmed: Boolean(post.is_confirmed),
    });
  };

  const handleSaveStation = async (event) => {
    event.preventDefault();
    setIsSavingStation(true);
    setStationSaveError("");

    const payload = {
      name: stationForm.name.trim() || null,
      post_type: stationForm.post_type || null,
      latitude: toNullableFloat(stationForm.latitude),
      longitude: toNullableFloat(stationForm.longitude),
      notes: stationForm.notes.trim() || null,
      is_confirmed: stationForm.is_confirmed,
    };

    if (
      payload.is_confirmed &&
      (!payload.name || !payload.post_type || payload.latitude === null || payload.longitude === null)
    ) {
      setStationSaveError("Для подтверждения станции заполните название, тип поста и координаты.");
      setIsSavingStation(false);
      return;
    }

    try {
      const savedPost = await updateMonitoringPost(editingStationId, payload);
      setEditingStationId(null);
      setStationForm(createEmptyStationForm());
      setSelectedMonitoringPostId(savedPost.id);
      setPostsReloadToken((value) => value + 1);
      await loadAdminMonitoringPosts();
    } catch (error) {
      setStationSaveError(error instanceof Error ? error.message : "Не удалось сохранить станцию");
    } finally {
      setIsSavingStation(false);
    }
  };

  const isStationDetailsInPanel =
    activeMenuPanel === "stations" &&
    isStationCardOpen &&
    selectedMonitoringPostId !== null;

  const closeStationDetails = () => {
    setIsStationCardOpen(false);
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
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
        isAuthenticated={isAuthenticated}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onLoginClick={() => setModalMode("login")}
        onRegisterClick={() => setModalMode("register")}
      />

      <SideMenu
        activeMenuPanel={activeMenuPanel}
        onStationsClick={() => setActiveMenuPanel((current) => (current === "stations" ? null : "stations"))}
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
          isStationDetailsInPanel={isStationDetailsInPanel}
          isAdmin={isAdmin}
          isLoadingAdminPosts={isLoadingAdminPosts}
          adminPostsError={adminPostsError}
          stationPanelPosts={stationPanelPosts}
          selectedMonitoringPostId={selectedMonitoringPostId}
          editingStationId={editingStationId}
          stationForm={stationForm}
          stationSaveError={stationSaveError}
          isSavingStation={isSavingStation}
          onRefresh={handleRefreshStationPanel}
          onClose={() => {
            if (isStationDetailsInPanel) {
              closeStationDetails();
            } else {
              setActiveMenuPanel(null);
            }
          }}
          onSelectPost={handleSelectMonitoringPost}
          onStartEdit={handleStartEditStation}
          onSaveStation={handleSaveStation}
          onStationFormChange={setStationForm}
          onCancelEdit={() => {
            setEditingStationId(null);
            setStationSaveError("");
          }}
        >
          <StationDetails
            selectedMonitoringPost={selectedMonitoringPost}
            selectedMonitoringPostId={selectedMonitoringPostId}
            isAdmin={isAdmin}
            isMobileViewport={isMobileViewport}
            isRawPacketsOpen={isRawPacketsOpen}
            selectedDevices={selectedDevices}
            selectedDeviceType={selectedDeviceType}
            isReadingsCardOpen={isReadingsCardOpen}
            isLoadingDetails={isLoadingDetails}
            detailsError={detailsError}
            refreshCounter={stationDetailsRefreshCounter}
            useGasAbsoluteValues={useGasAbsoluteValues}
            onOpenRawPackets={() => {
              setIsRawPacketsOpen(true);
              setIsReadingsCardOpen(false);
            }}
            onSelectDeviceType={(deviceType) => {
              setSelectedDeviceType(deviceType);
              setIsReadingsCardOpen(true);
              setIsRawPacketsOpen(false);
            }}
          />
        </StationsPanel>
      )}

      {activeMenuPanel === "export" && (
        <ExportPanel
          monitoringPosts={monitoringPosts}
          isAuthenticated={isAuthenticated}
          onLoginClick={() => setModalMode("login")}
          onClose={() => setActiveMenuPanel(null)}
        />
      )}

      {isStationCardOpen && isReadingsCardOpen && selectedMonitoringPostId !== null && selectedDeviceType && (
        <Suspense fallback={null}>
          <ReadingsHistoryPanel
            monitoringPostId={selectedMonitoringPostId}
            selectedDeviceType={selectedDeviceType}
            isAuthenticated={isAuthenticated}
            useGasAbsoluteValues={useGasAbsoluteValues}
            onClose={() => setIsReadingsCardOpen(false)}
          />
        </Suspense>
      )}

      {isAdmin && !isMobileViewport && isStationCardOpen && isRawPacketsOpen && selectedMonitoringPostId !== null && (
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
