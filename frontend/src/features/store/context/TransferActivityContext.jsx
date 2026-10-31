/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const TransferActivityContext = createContext(null);

export const TRANSFER_ACTIVITY_STATUS = {
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
};

export const TRANSFER_ACTIVITY_TYPE = {
  IMPORT: "import",
  EXPORT: "export",
};

const createActivityId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function TransferActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);

  useEffect(() => {
    if (!recentActivity) return undefined;
    const timer = window.setTimeout(() => {
      setRecentActivity((current) => (current?.id === recentActivity.id ? null : current));
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [recentActivity]);

  const startActivity = useCallback((input = {}) => {
    const now = Date.now();
    const id = createActivityId();
    const activity = {
      id,
      type: input.type || TRANSFER_ACTIVITY_TYPE.EXPORT,
      status: TRANSFER_ACTIVITY_STATUS.RUNNING,
      label: String(input.label || "Transfer").trim() || "Transfer",
      path: String(input.path || "").trim(),
      progressPercent: Math.max(0, Math.min(100, Number(input.progressPercent) || 0)),
      statusMessage: String(input.statusMessage || "").trim(),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    setActivities((prev) => [activity, ...prev].slice(0, 20));
    return id;
  }, []);

  const updateActivity = useCallback((id, patch = {}) => {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === id
          ? {
              ...activity,
              ...patch,
              progressPercent:
                patch.progressPercent !== undefined
                  ? Math.max(0, Math.min(100, Number(patch.progressPercent) || 0))
                  : activity.progressPercent,
              updatedAt: Date.now(),
            }
          : activity
      )
    );
  }, []);

  const finishActivity = useCallback((id, patch = {}) => {
    let completedActivity = null;

    setActivities((prev) =>
      prev.map((activity) => {
        if (activity.id !== id) return activity;
        completedActivity = {
          ...activity,
          ...patch,
          status: patch.status || TRANSFER_ACTIVITY_STATUS.SUCCESS,
          progressPercent:
            patch.progressPercent !== undefined
              ? Math.max(0, Math.min(100, Number(patch.progressPercent) || 0))
              : 100,
          statusMessage:
            patch.statusMessage !== undefined ? String(patch.statusMessage || "").trim() : activity.statusMessage,
          updatedAt: Date.now(),
          completedAt: Date.now(),
        };
        return completedActivity;
      })
    );

    if (completedActivity) setRecentActivity(completedActivity);
  }, []);

  const clearRecentActivity = useCallback(() => setRecentActivity(null), []);

  const activeActivity = useMemo(
    () =>
      activities
        .filter((activity) => activity.status === TRANSFER_ACTIVITY_STATUS.RUNNING)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] || null,
    [activities]
  );

  const value = useMemo(
    () => ({
      activities,
      activeActivity,
      recentActivity,
      startActivity,
      updateActivity,
      finishActivity,
      clearRecentActivity,
      STATUS: TRANSFER_ACTIVITY_STATUS,
      TYPE: TRANSFER_ACTIVITY_TYPE,
    }),
    [activities, activeActivity, recentActivity, startActivity, updateActivity, finishActivity, clearRecentActivity]
  );

  return <TransferActivityContext.Provider value={value}>{children}</TransferActivityContext.Provider>;
}

export const useTransferActivity = () => {
  const context = useContext(TransferActivityContext);
  if (!context) {
    throw new Error("useTransferActivity must be used within a TransferActivityProvider");
  }
  return context;
};
