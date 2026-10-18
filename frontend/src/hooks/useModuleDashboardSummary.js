import { useCallback } from "react";
import api from "../api/axios";
import useAsyncQuery from "./useAsyncQuery";

export default function useModuleDashboardSummary(endpoint, { active = false, params = {}, errorMessage = "Failed to load dashboard data." } = {}) {
  const queryKey = JSON.stringify([endpoint, params]);
  const loadSummary = useCallback(async ({ signal }) => {
    const [path, queryParams] = JSON.parse(queryKey);
    const response = await api.get(path, { params: queryParams, signal });
    if (!response.data?.success || !response.data?.data) throw new Error(errorMessage);
    return response.data.data;
  }, [queryKey, errorMessage]);
  const result = useAsyncQuery(loadSummary, { enabled: active });
  return { ...result, error: result.error ? result.error.response?.data?.message || result.error.message || "Error communicating with server." : null };
}
