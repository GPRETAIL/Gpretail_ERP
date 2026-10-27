import { getRuntimeRoutingSnapshot } from "../api/runtimeRouting";

let previousIdentity = "";
let sequence = 0;

// Opaque in-memory cache generation: never retain another login/store/node's
// lookup or receipt data, and never put bearer tokens into diagnostic cache keys.
export function requestCacheScope() {
  const routing = getRuntimeRoutingSnapshot() || {};
  const identity = JSON.stringify([localStorage.getItem("token"), sessionStorage.getItem("activeStoreId"),
    routing.currentTarget, routing.localBaseUrl, routing.cloudBaseUrl]);
  if (identity !== previousIdentity) { previousIdentity = identity; sequence++; }
  return String(sequence);
}
