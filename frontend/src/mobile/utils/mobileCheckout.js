import api from "../../api/axios";
import { getRuntimeRoutingSnapshot } from "../../api/runtimeRouting";
import { prepareCheckoutAttempt } from "../../pages/sales/posCheckoutAttempt";
import { addToSyncQueue, saveDraft } from "../offline/db";

// One basket has one durable key and one originating database, even if its
// response is lost. Print/share/save all use the same confirmed sale.
export function createMobileCheckout() {
  let attempt = null;
  let pending = null;
  return async (payload, context) => {
    if (pending) return pending;
    attempt = prepareCheckoutAttempt(attempt, payload, [context.userId, context.storeId]);
    if (attempt.saved) return attempt.saved;
    if (attempt.queued) return null;
    const current = attempt;
    current.target ||= getRuntimeRoutingSnapshot().currentTarget;
    pending = (async () => {
      if (!navigator.onLine) {
        if (!context.userId || !context.storeId) throw new Error("Select a store before saving an offline invoice.");
        const queued = await addToSyncQueue("create_invoice", "/pos-sales", "POST", current.payload, { ...context, target: current.target });
        if (queued == null) throw new Error("Could not save the offline invoice. Keep this page open and retry.");
        current.queued = true;
        await saveDraft("invoice", current.payload);
        return null;
      }
      // Failed online requests must not be silently queued and replayed as a
      // second invoice. The same key/node is retained for an explicit retry.
      const response = await api.post("/pos-sales", current.payload, { __posRetryTarget: current.target, storeScopeId: context.storeId });
      const saved = response.data?.data;
      if (!saved?.id) throw new Error("Invoice confirmation is unavailable. Check the sales list before retrying.");
      current.saved = saved;
      return current.saved;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
