import api from "./axios";

export const getRemoteSupportConfig = async () => {
  const res = await api.get("/remote-support/config");
  return res.data?.data || {};
};

export const requestRemoteSupport = async (payload) => {
  const res = await api.post("/remote-support/request", payload);
  return res.data?.data || {};
};

export const getActiveRemoteSupportSession = async () => {
  const res = await api.get("/remote-support/active");
  return res.data?.data || null;
};

export const cancelRemoteSupportSession = async (id) => {
  const res = await api.post(`/remote-support/${id}/cancel`);
  return res.data || {};
};

export const getRemoteSupportSessions = async (params = {}) => {
  const res = await api.get("/remote-support/sessions", { params });
  return res.data || {};
};

export const endRemoteSupportSession = async (id, notes = "") => {
  const res = await api.post(`/remote-support/${id}/end`, { notes });
  return res.data?.data || {};
};
