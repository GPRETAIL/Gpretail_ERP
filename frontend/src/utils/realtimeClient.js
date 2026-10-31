import Pusher from "pusher-js";
import api from "../api/axios";

// Connection settings come from the server with the signed-in user (StoreContext::authFields
// "realtime"), so the browser always joins the same Pusher app the API signs for. The VITE_
// values are only a fallback; the key and cluster are public by design. A host is set only for
// a self-hosted Pusher-compatible server such as Laravel Reverb (needs a VPS).
const signedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const connectionSettings = () => {
  const server = signedInUser()?.realtime || {};
  const env = import.meta.env;
  return {
    key: server.key || env.VITE_PUSHER_KEY || "",
    cluster: server.cluster || env.VITE_PUSHER_CLUSTER || "ap2",
    host: server.host || env.VITE_PUSHER_HOST || "",
    port: Number(server.port || env.VITE_PUSHER_PORT || 443),
    scheme: server.scheme || env.VITE_PUSHER_SCHEME || "https",
  };
};

let client = null;
const channels = new Map(); // channel name -> { channel, consumers }

const clientOptions = ({ cluster, host, port, scheme }) => ({
  cluster,
  // Private channels are signed by the API with the signed-in user's token and store scope.
  channelAuthorization: {
    customHandler: ({ socketId, channelName }, callback) => {
      api.post("/realtime/auth", { socket_id: socketId, channel_name: channelName })
        .then((res) => callback(null, res.data))
        .catch((error) => callback(error, null));
    },
  },
  ...(host ? {
    wsHost: host, wsPort: port, wssPort: port,
    forceTLS: scheme === "https", enabledTransports: ["ws", "wss"],
  } : {}),
});

/** The signed-in user's own channel, or "" before login. */
export const personalChannel = () => {
  const id = signedInUser()?.id;
  return id ? `private-user-${id}` : "";
};

export const storeChannel = (storeId) => (storeId ? `private-store-${storeId}` : "");

/** Every channel that can carry the signed-in user's notifications: own, company-wide, their stores. */
export const notificationChannels = () => {
  const user = signedInUser();
  if (!user?.id) return [];
  const stores = (user.store_ids?.length ? user.store_ids : [user.store_id]).filter(Boolean).slice(0, 20);
  return [`private-user-${user.id}`, "private-company", ...stores.map(storeChannel)];
};

/**
 * Listens for `event` on a private channel over one shared connection per tab.
 * Returns a function that stops listening; the connection closes with its last listener.
 * Returns null when the push service cannot be reached, so callers keep polling.
 */
export function listen(channelName, event, handler) {
  if (!channelName) return null;
  let entry;
  try {
    if (!client) {
      const settings = connectionSettings();
      if (!settings.key) return null; // Push not configured on this server: callers keep polling.
      client = new Pusher(settings.key, clientOptions(settings));
    }
    entry = channels.get(channelName);
    if (!entry) {
      entry = { channel: client.subscribe(channelName), consumers: 0 };
      channels.set(channelName, entry);
    }
  } catch {
    return null;
  }
  entry.consumers += 1;
  entry.channel.bind(event, handler);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    entry.channel.unbind(event, handler);
    entry.consumers -= 1;
    if (entry.consumers > 0) return;
    channels.delete(channelName);
    client?.unsubscribe(channelName);
    if (channels.size === 0) {
      client?.disconnect();
      client = null;
    }
  };
}
