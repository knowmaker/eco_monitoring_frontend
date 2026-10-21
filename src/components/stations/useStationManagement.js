import { useState } from "react";
import { archiveMonitoringPost, transferMonitoringPost, updateMonitoringPost } from "../../api";

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

export default function useStationManagement({
  knownMonitoringPosts,
  selectedMonitoringPost,
  setSelectedMonitoringPostId,
  setPostsReloadToken,
  loadAdminMonitoringPosts,
  setIsReadingsCardOpen,
  setIsRawPacketsOpen,
  focusPost,
}) {
  const [editingStationId, setEditingStationId] = useState(null);
  const [stationForm, setStationForm] = useState(createEmptyStationForm);
  const [isSavingStation, setIsSavingStation] = useState(false);
  const [stationSaveError, setStationSaveError] = useState("");
  const [transferringStationId, setTransferringStationId] = useState(null);
  const [stationTransferForm, setStationTransferForm] = useState(createStationTransferForm);
  const [isTransferringStation, setIsTransferringStation] = useState(false);
  const [stationTransferError, setStationTransferError] = useState("");

  const managedMonitoringPostId = transferringStationId ?? editingStationId;
  const managedMonitoringPost =
    knownMonitoringPosts.find((post) => post.id === managedMonitoringPostId) ?? selectedMonitoringPost;
  const stationManagementMode = transferringStationId !== null ? "transfer" : editingStationId !== null ? "edit" : null;
  const clearStationManagementMode = () => {
    setEditingStationId(null);
    setTransferringStationId(null);
    setStationSaveError("");
    setStationTransferError("");
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

  return {
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
  };
}
