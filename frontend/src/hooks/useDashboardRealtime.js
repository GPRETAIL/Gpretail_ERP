import useRealtimeRefresh from "./useRealtimeRefresh";
import { storeChannel } from "../utils/realtimeClient";

/**
 * Keeps the dashboard "live": reloads on the store's dashboard.updated push (sales, cash,
 * stock; see DashboardBroadcastService), with a 3-minute safety poll. "All Stores" has no
 * single channel, so it polls every 30 seconds instead. Signature unchanged.
 */
const useDashboardRealtime = ({ enabled = true, companyId = "", onUpdate } = {}) => {
  useRealtimeRefresh({
    channels: [storeChannel(companyId)],
    events: ["dashboard.updated"],
    enabled,
    onUpdate,
    fallbackPollMs: 180000,
    noChannelPollMs: 30000,
  });
  return null;
};

export default useDashboardRealtime;
