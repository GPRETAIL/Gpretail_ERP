import { afterEach, expect, it, vi } from "vitest";
import { clearPrivateApiCache } from "../privateApiCache";

afterEach(() => vi.unstubAllGlobals());

it("removes API caches from all releases and retains offline app assets", async () => {
  const remove = vi.fn().mockResolvedValue(true);
  const postMessage = vi.fn();
  vi.stubGlobal("caches", { keys: async () => ["vynerix-api-old", "vynerix-api-current", "vynerix-static-current", "unrelated"], delete: remove });
  vi.stubGlobal("navigator", { serviceWorker: { controller: { postMessage } } });
  await clearPrivateApiCache();
  expect(postMessage).toHaveBeenCalledWith({ type: "VX_CLEAR_API_CACHE" });
  expect(remove.mock.calls.map(([name]) => name)).toEqual(["vynerix-api-old", "vynerix-api-current"]);
});

it("allows logout when cache storage is unavailable", async () => {
  vi.stubGlobal("caches", { keys: vi.fn().mockRejectedValue(new Error("storage blocked")) });
  await expect(clearPrivateApiCache()).resolves.toBeUndefined();
});
