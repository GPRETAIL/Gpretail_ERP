import { useCallback, useEffect, useEffectEvent, useState } from "react";

// Loaders are memoized by their real query inputs. Loading is derived from request identity,
// so changing store/search never renders an old result as if it belonged to the new query.
export default function useAsyncQuery(loader, { enabled = true, onSuccess, onError } = {}) {
  const receive = useEffectEvent((data, context) => onSuccess?.(data, context));
  const fail = useEffectEvent((error, context) => onError?.(error, context));
  const [revision, setRevision] = useState({ id: 0, silent: false });
  const [result, setResult] = useState(null);
  const reload = useCallback(options => setRevision(value => ({ id: value.id + 1, silent: Boolean(options?.silent) })), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    Promise.resolve().then(() => controller.signal.aborted ? undefined : loader({ signal: controller.signal })).then(data => {
      if (!controller.signal.aborted) {
        setResult({ loader, revision, data, error: null });
        receive(data, { silent: revision.silent });
      }
    }).catch(error => {
      if (!controller.signal.aborted) {
        setResult(previous => ({ loader, revision, data: revision.silent && previous?.loader === loader ? previous.data : null, error }));
        fail(error, { silent: revision.silent });
      }
    });
    return () => controller.abort();
  }, [loader, revision, enabled]);
  const setData = useCallback(update => {
    setResult(previous => previous?.loader === loader && previous?.revision === revision
      ? { ...previous, data: typeof update === "function" ? update(previous.data) : update }
      : previous);
  }, [loader, revision]);
  const current = result?.loader === loader && result?.revision === revision ? result : null;
  const backgroundRefresh = revision.silent && result?.loader === loader;
  return { data: current?.data ?? (backgroundRefresh ? result.data : null), error: current?.error ?? null, loading: enabled && !current && !backgroundRefresh, reload, setData };
}
