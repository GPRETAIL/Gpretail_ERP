import axios from "axios";

// Share only concurrent identical JSON GETs. Never cache completed responses or
// share across authentication, store, node, query or an intervening write.
export function createReadCoalescer(adapter) {
  const pending = new Map();
  const statusPolicies = new WeakMap();
  let policyNumber = 0;
  let generation = 0;
  const invalidate = () => { generation++; pending.clear(); };
  const request = config => {
    const method = String(config.method || "get").toLowerCase();
    if (method !== "get" || config.auth || config.cancelToken || typeof config.withXSRFToken === "function" || config.onDownloadProgress || config.onUploadProgress
      || (config.responseType && config.responseType !== "json") || config.coalesce === false) return adapter(config);
    if (config.signal?.aborted) return Promise.reject(new axios.CanceledError("canceled", config));
    const headers = Object.entries(axios.AxiosHeaders.from(config.headers).toJSON()).sort(([a], [b]) => a.localeCompare(b));
    if (typeof config.validateStatus === "function" && !statusPolicies.has(config.validateStatus)) statusPolicies.set(config.validateStatus, ++policyNumber);
    const key = JSON.stringify([generation, axios.getUri(config), headers, config.timeout, config.withCredentials, config.responseType, statusPolicies.get(config.validateStatus)]);
    let entry = pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, subscribers: 0, promise: null, completed: false };
      pending.set(key, entry);
      entry.promise = Promise.resolve().then(() => adapter({ ...config, signal: controller.signal })).finally(() => {
        entry.completed = true;
        if (pending.get(key) === entry) pending.delete(key);
      });
    }
    entry.subscribers++;
    return new Promise((resolve, reject) => {
      let settled = false;
      const release = () => {
        config.signal?.removeEventListener("abort", cancel);
        entry.subscribers--;
        if (!entry.subscribers && !entry.completed) {
          if (pending.get(key) === entry) pending.delete(key);
          entry.controller.abort();
        }
      };
      const cancel = () => {
        if (settled) return;
        settled = true;
        release();
        reject(new axios.CanceledError("canceled", config));
      };
      config.signal?.addEventListener("abort", cancel, { once: true });
      entry.promise.then(response => {
        if (settled) return;
        settled = true;
        release();
        // Axios normally parses the raw JSON string independently per caller.
        // Custom JSON adapters may already return objects; isolate those too.
        try {
          const data = response.data && typeof response.data === "object" ? structuredClone(response.data) : response.data;
          resolve({ ...response, data, config });
        } catch (error) { reject(error); }
      }, error => {
        if (settled) return;
        settled = true;
        release();
        reject(axios.AxiosError.from(error, error.code, config, error.request,
          error.response ? { ...error.response, config } : undefined));
      });
    });
  };
  return { adapter: request, invalidate };
}
