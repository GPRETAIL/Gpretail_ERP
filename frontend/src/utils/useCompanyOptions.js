import { useEffect, useState } from "react";
import api from "../api/axios";

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    value: String(row.id),
    label: row.name || `Company ${row.id}`,
  }));

export default function useCompanyOptions({ includeAll = false, allLabel = "ALL" } = {}) {
  const [companyOptions, setCompanyOptions] = useState(includeAll ? [{ value: "", label: allLabel }] : []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Active only: every consumer of this hook is a picker or filter (Dashboard scope, warehouse
        // search), and a store the control plane removed is not something to start new work against.
        // Views that render historical rows use useStoreNameMap instead, which keeps inactive stores
        // so past orders still show a store name.
        const res = await api.get("/companies", { params: { limit: 500 } });
        if (!mounted) return;
        const mapped = normalizeRows(res.data?.data || []);
        setCompanyOptions(includeAll ? [{ value: "", label: allLabel }, ...mapped] : mapped);
      } catch {
        if (!mounted) return;
        setCompanyOptions(includeAll ? [{ value: "", label: allLabel }] : []);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [includeAll, allLabel]);

  return companyOptions;
}
