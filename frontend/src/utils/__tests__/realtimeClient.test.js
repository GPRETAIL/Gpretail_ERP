import { beforeEach, expect, it, vi } from "vitest";
import { listen, notificationChannels, personalChannel } from "../realtimeClient";
import api from "../../api/axios";

const pusher = vi.hoisted(() => ({ options: null, subscribe: vi.fn(), unsubscribe: vi.fn(), disconnect: vi.fn(), channel: { bind: vi.fn(), unbind: vi.fn() } }));
vi.mock("pusher-js", () => ({ default: class {
  constructor(key, options) { pusher.options = options; return pusher; }
} }));
vi.mock("../../api/axios", () => ({ default: { post: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  pusher.subscribe.mockReturnValue(pusher.channel);
  localStorage.setItem("user", JSON.stringify({ id: 9, store_id: 2, store_ids: [2, 5], realtime: { key: "server-key", cluster: "ap2" } }));
});

it("signs private channels through the API with the signed-in user's session", async () => {
  const stop = listen("private-store-2", "approvals.updated", vi.fn());
  api.post.mockResolvedValue({ data: { auth: "key:signature" } });
  const callback = vi.fn();
  pusher.options.channelAuthorization.customHandler({ socketId: "1.2", channelName: "private-store-2" }, callback);
  await vi.waitFor(() => expect(callback).toHaveBeenCalledWith(null, { auth: "key:signature" }));
  expect(api.post).toHaveBeenCalledWith("/realtime/auth", { socket_id: "1.2", channel_name: "private-store-2" });
  stop();
});

it("shares one channel between listeners and closes the connection with the last one", () => {
  const first = listen("private-user-9", "approval.decided", vi.fn());
  const second = listen("private-user-9", "notifications.updated", vi.fn());
  expect(pusher.subscribe).toHaveBeenCalledTimes(1);
  first();
  first(); // stopping twice is harmless
  expect(pusher.unsubscribe).not.toHaveBeenCalled();
  second();
  expect(pusher.unsubscribe).toHaveBeenCalledExactlyOnceWith("private-user-9");
  expect(pusher.disconnect).toHaveBeenCalledTimes(1);
});

it("derives the user's channels and listens to nothing before login", () => {
  expect(personalChannel()).toBe("private-user-9");
  expect(notificationChannels()).toEqual(["private-user-9", "private-company", "private-store-2", "private-store-5"]);
  localStorage.removeItem("user");
  expect(notificationChannels()).toEqual([]);
  expect(listen("", "x", vi.fn())).toBeNull();
});
