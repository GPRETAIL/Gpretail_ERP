import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../api/axios";

// Shared confirmation and partial-failure handling for master list bulk deletion.
export default function useMasterBulkDelete({ endpoint, setSelectedRows, onDeleted }) {
  const [confirmation, setConfirmation] = useState(null);
  const pending = useRef(false);
  const currentEndpoint = useRef(endpoint);
  useEffect(() => { currentEndpoint.current = endpoint; }, [endpoint]);

  const requestDelete = (keys) => {
    if (!pending.current && keys.length) setConfirmation({ endpoint, keys: [...keys] });
  };
  const confirmDelete = async () => {
    if (pending.current || !confirmation) return;
    pending.current = true;
    const { endpoint: target, keys } = confirmation;
    setConfirmation(null);
    try {
      const results = await Promise.allSettled(keys.map(id => api.delete(`${target}/${encodeURIComponent(id)}`)));
      const deleted = new Set(keys.filter((_, index) => results[index].status === "fulfilled"));
      if (currentEndpoint.current === target) {
        setSelectedRows(previous => previous.filter(id => !deleted.has(id)));
        onDeleted();
      }
      if (deleted.size) toast.success(`${deleted.size} record${deleted.size === 1 ? "" : "s"} deleted successfully.`);
      const failed = keys.length - deleted.size;
      if (failed) toast.error(`${failed} record${failed === 1 ? "" : "s"} could not be deleted. Failed records remain selected; check whether they are in use and retry.`);
    } finally {
      pending.current = false;
    }
  };

  return { confirmation, requestDelete, confirmDelete, cancelDelete: () => setConfirmation(null) };
}
