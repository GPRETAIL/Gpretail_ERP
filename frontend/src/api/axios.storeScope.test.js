import { beforeEach, expect, it, vi } from "vitest";
import axios from "axios";
import api from "./axios";
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
it("preserves intentional cancellation without logging an API failure", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const canceled = new axios.CanceledError("canceled");
  try {
    await expect(api.get("/products", { adapter: () => Promise.reject(canceled) })).rejects.toBe(canceled);
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
it("uses an explicit authorized-form scope without overwriting the active workspace store", async () => {
  sessionStorage.setItem("activeStoreId", "2");
  let sent;
  await api.post("/user-access", { store_id: 3 }, { storeScopeId: "3", adapter: async (config) => { sent = config; return { data: {}, status: 200, statusText: "OK", headers: {}, config }; } });
  for (const header of ["X-Company-Scope-Id", "X-Company-Id", "X-Store-Id"]) expect(sent.headers.get(header)).toBe("3");
  expect(sessionStorage.getItem("activeStoreId")).toBe("2");
});
it("keeps ordinary requests in the active workspace store", async () => {
  sessionStorage.setItem("activeStoreId", "2");
  let sent;
  await api.get("/products", { adapter: async (config) => { sent = config; return { data: {}, status: 200, statusText: "OK", headers: {}, config }; } });
  expect(sent.headers.get("X-Company-Scope-Id")).toBe("2");
});
