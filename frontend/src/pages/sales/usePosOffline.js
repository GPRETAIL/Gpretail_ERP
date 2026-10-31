import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  OFFLINE_CHANGED_EVENT, getOfflinePack, isNetworkFailure, listOfflineBills, offlineScope,
  refreshOfflinePack, refreshOfflineSeries, syncOfflineBills,
} from "./posOffline";

const PROBE_MS = 15000;
const PACK_REFRESH_MS = 30 * 60 * 1000;

/**
 * Offline state for one POS till: whether the server is reachable, the downloaded offline pack,
 * and the queue of bills saved offline. Bills sync automatically once the server answers again.
 */
export default function usePosOffline({ userId, storeId }) {
  const scope = offlineScope(userId, storeId);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [pack, setPack] = useState(null);
  const [bills, setBills] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const offlineRef = useRef(offline);
  useEffect(() => { offlineRef.current = offline; }, [offline]);

  const reload = useCallback(async () => {
    if (!scope) return;
    const [nextPack, nextBills] = await Promise.all([getOfflinePack(scope), listOfflineBills(scope)]).catch(() => [null, []]);
    setPack(nextPack);
    setBills(nextBills);
  }, [scope]);

  const sync = useCallback(async ({ quiet = false } = {}) => {
    if (!scope) return;
    setSyncing(true);
    try {
      const result = await syncOfflineBills(api, scope);
      if (result.stopped) setOffline(true);
      if (result.synced) toast.success(`${result.synced} offline bill${result.synced === 1 ? "" : "s"} synced`);
      if (result.flagged) toast.info(`${result.flagged} synced bill${result.flagged === 1 ? " has" : "s have"} points for a manager to check (Sales > Offline Bills).`);
      if (result.attention) toast.error(`${result.attention} offline bill${result.attention === 1 ? "" : "s"} could not be saved. Open the offline bills list.`);
      if (!quiet && !result.synced && !result.attention && result.stopped) toast.info("Still offline. Bills will sync when the server answers.");
    } catch (error) {
      // Offline storage itself is unavailable (private window, blocked site data).
      if (!quiet) toast.error(error.message || "Could not read the offline bills on this till.");
    } finally {
      setSyncing(false);
    }
  }, [scope]);

  const refresh = useCallback(async () => {
    if (!scope) return null;
    try {
      const next = await refreshOfflinePack(api, scope);
      setPack(next);
      return next;
    } catch (error) {
      if (isNetworkFailure(error)) setOffline(true);
      return null;
    }
  }, [scope]);

  /** A request just failed to reach the server. */
  const markOffline = useCallback(() => setOffline(true), []);

  // Load what is stored, then (online) download a fresh pack and send anything queued.
  useEffect(() => {
    if (!scope) return undefined;
    const timer = setTimeout(async () => {
      await reload();
      if (!offlineRef.current) {
        await sync({ quiet: true });
        await refresh();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [scope, reload, sync, refresh]);

  useEffect(() => {
    const changed = () => { void reload(); };
    const wentOffline = () => setOffline(true);
    window.addEventListener(OFFLINE_CHANGED_EVENT, changed);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.removeEventListener(OFFLINE_CHANGED_EVENT, changed);
      window.removeEventListener("offline", wentOffline);
    };
  }, [reload]);

  // While offline, check every few seconds (and when the network comes back) whether the server
  // answers again; then sync. The network being up does not mean the server is reachable.
  useEffect(() => {
    if (!offline || !scope) return undefined;
    let stopped = false;
    const probe = async () => {
      if (stopped || navigator.onLine === false) return;
      try {
        setPack(await refreshOfflineSeries(api, scope));
        if (stopped) return;
        setOffline(false);
        toast.success("Back online");
        await sync({ quiet: true });
        void refresh();
      } catch {
        // Still unreachable; try again on the next tick.
      }
    };
    const timer = setInterval(probe, PROBE_MS);
    window.addEventListener("online", probe);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("online", probe); };
  }, [offline, scope, sync, refresh]);

  // Keep the local catalog reasonably current while online.
  useEffect(() => {
    if (offline || !scope) return undefined;
    const timer = setInterval(() => { void refresh(); }, PACK_REFRESH_MS);
    return () => clearInterval(timer);
  }, [offline, scope, refresh]);

  const counts = useMemo(() => ({
    pending: bills.filter(bill => bill.status === "pending").length,
    attention: bills.filter(bill => bill.status === "attention").length,
  }), [bills]);

  return { scope, offline, pack, bills, ...counts, syncing, sync, refresh, markOffline };
}
