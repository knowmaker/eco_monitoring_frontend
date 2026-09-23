import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import AuthModal from "./components/auth/AuthModal";
import ExportPanel from "./components/export-aggregates/ExportPanel";
import SideMenu from "./components/layout/SideMenu";
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
import { archiveMonitoringPost, transferMonitoringPost, updateMonitoringPost } from "./api";
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

function createStationTransferForm(post = {}) {
  return {
    serial: post.serial || "",
    name: "",
    post_type: post.post_type || "",
    latitude: "",
    longitude: "",
    notes: post.notes || "",
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
  const [transferringStationId, setTransferringStationId] = useState(null);
  const [stationTransferForm, setStationTransferForm] = useState(createStationTransferForm);
  const [isTransferringStation, setIsTransferringStation] = useState(false);
  const [stationTransferError, setStationTransferError] = useState("");

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
  const managedMonitoringPostId = transferringStationId ?? editingStationId;
  const managedMonitoringPost =
    knownMonitoringPosts.find((post) => post.id === managedMonitoringPostId) ?? selectedMonitoringPost;
  const stationManagementMode = transferringStationId !== null ? "transfer" : editingStationId !== null ? "edit" : null;
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
    setTransferringStationId(null);
    setStationSaveError("");
    setStationTransferError("");
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
    setTransferringStationId(null);
    setStationSaveError("");
    setStationTransferError("");
    setStationCardSource(null);
    setIsRawPacketsOpen(false);
    setStationForm(createEmptyStationForm());
    setStationTransferForm(createStationTransferForm());
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
    setEditingStationId(null);
    setTransferringStationId(null);
    setStationSaveError("");
    setStationTransferError("");
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
    focusPost(post);
  };

  const handleStartEditStation = (post) => {
    setEditingStationId(post.id);
    setTransferringStationId(null);
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
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
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

  const handleStartTransferStation = (post) => {
    setEditingStationId(null);
    setStationTransferError("");
    setTransferringStationId(post.id);
    setStationTransferForm(createStationTransferForm(post));
    setIsReadingsCardOpen(false);
    setIsRawPacketsOpen(false);
  };

  const handleArchiveStation = async () => {
    if (editingStationId === null) {
      return;
    }
    const confirmed = window.confirm("Отправить станцию в архив? Новые измерения для этого места больше не будут добавляться.");
    if (!confirmed) {
      return;
    }

    setIsSavingStation(true);
    setStationSaveError("");

    try {
      const archivedPost = await archiveMonitoringPost(editingStationId);
      setEditingStationId(null);
      setStationForm(createEmptyStationForm());
      setSelectedMonitoringPostId(archivedPost.id);
      setPostsReloadToken((value) => value + 1);
      await loadAdminMonitoringPosts();
    } catch (error) {
      setStationSaveError(error instanceof Error ? error.message : "Не удалось отправить станцию в архив");
    } finally {
      setIsSavingStation(false);
    }
  };

  const handleCancelTransferStation = () => {
    const post = knownMonitoringPosts.find((candidate) => candidate.id === transferringStationId) ?? selectedMonitoringPost;
    setTransferringStationId(null);
    setStationTransferError("");
    setStationTransferForm(createStationTransferForm());
    if (post) {
      handleStartEditStation(post);
    }
  };

  const closeStationManagementPanel = () => {
    setEditingStationId(null);
    setTransferringStationId(null);
    setStationSaveError("");
    setStationTransferError("");
    setStationForm(createEmptyStationForm());
    setStationTransferForm(createStationTransferForm());
  };

  const handleTransferStation = async (event) => {
    event.preventDefault();
    if (transferringStationId === null) {
      return;
    }

    const latitude = toNullableFloat(stationTransferForm.latitude);
    const longitude = toNullableFloat(stationTransferForm.longitude);
    const payload = {
      name: stationTransferForm.name.trim() || null,
      post_type: stationTransferForm.post_type || null,
      latitude,
      longitude,
      notes: stationTransferForm.notes.trim() || null,
      is_confirmed: stationTransferForm.is_confirmed,
    };

    if (latitude === null || longitude === null) {
      setStationTransferError("Укажите новые координаты станции.");
      return;
    }
    if (
      payload.is_confirmed &&
      (!payload.name || !payload.post_type)
    ) {
      setStationTransferError("Для подтверждения нового места укажите название и тип поста.");
      return;
    }

    setIsTransferringStation(true);
    setStationTransferError("");

    try {
      const transferResult = await transferMonitoringPost(transferringStationId, payload);
      const nextPost = transferResult.monitoring_post;
      setTransferringStationId(null);
      setStationTransferForm(createStationTransferForm());
      setSelectedMonitoringPostId(nextPost.id);
      setIsReadingsCardOpen(false);
      setIsRawPacketsOpen(false);
      setPostsReloadToken((value) => value + 1);
      await loadAdminMonitoringPosts();
      focusPost(nextPost);
    } catch (error) {
      setStationTransferError(error instanceof Error ? error.message : "Не удалось перенести станцию");
    } finally {
      setIsTransferringStation(false);
    }
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
    isAdmin && isStationCardOpen && isRawPacketsOpen && selectedMonitoringPostId !== null
  );
  const isStationsPanelCovered =
    isMobileViewport &&
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
          onEditSelectedPost={() => {
            if (selectedMonitoringPost) {
              handleStartEditStation(selectedMonitoringPost);
            }
          }}
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
            refreshCounter={stationDetailsRefreshCounter}
            useGasAbsoluteValues={useGasAbsoluteValues}
            onOpenRawPackets={() => {
              setEditingStationId(null);
              setTransferringStationId(null);
              setIsRawPacketsOpen(true);
              setIsReadingsCardOpen(false);
            }}
            onSelectDeviceType={(deviceType) => {
              setEditingStationId(null);
              setTransferringStationId(null);
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
            useGasAbsoluteValues={useGasAbsoluteValues}
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
