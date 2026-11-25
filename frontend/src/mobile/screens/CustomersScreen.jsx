import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Phone, Search } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { EMPTY_ARRAY } from "@/shared/utils/emptyValues";
import { rupees } from "@/mobile/utils/recordDocuments";
import { SkeletonTransList } from "../components/SkeletonCards";

/** Mobile > Customers: the customer list with what each owes; tap one to open it. (The Customers tile used to open a blank page.) */
export default function CustomersScreen({ onOpenCustomer }) {
  const [search, setSearch] = useState("");
  const fetchCustomers = useCallback(async ({ signal }) => {
    const res = await api.get("/customers", { params: { limit: 100, search: search || undefined }, signal });
    const data = res.data?.data;
    return Array.isArray(data) ? data : data?.data || [];
  }, [search]);
  const { data, loading, reload } = useAsyncQuery(fetchCustomers);
  const customers = data || EMPTY_ARRAY;

  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener("vx-network-restored", refresh);
    window.addEventListener("vx-pull-refresh", refresh);
    return () => {
      window.removeEventListener("vx-network-restored", refresh);
      window.removeEventListener("vx-pull-refresh", refresh);
    };
  }, [reload]);

  return (
    <Box>
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} color="#94a3b8" />
          <Box component="input" type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
        </Box>
      </Box>
      {loading ? <SkeletonTransList count={4} /> : customers.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}><Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No customers found</Typography></Box>
      ) : customers.map((customer) => {
        const owes = Number(customer.current_balance || 0);
        return (
          <Box component="button" type="button" key={customer.id} className="vx-trans-card" aria-label={`Open customer ${customer.name}`} onClick={() => onOpenCustomer(customer.id)} sx={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
            <Box className="vx-trans-left">
              <Box component="span" className="vx-trans-id">{customer.name}</Box>
              {customer.phone ? <Box component="span" className="vx-trans-meta" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><Phone size={11} /> {customer.phone}</Box> : null}
              {customer.city ? <Box component="span" className="vx-trans-meta">{customer.city}</Box> : null}
            </Box>
            <Box className="vx-trans-right">
              {owes > 0 ? <Box component="span" className="vx-trans-amount">{rupees(owes)} due</Box> : null}
              {Number(customer.loyalty_points) > 0 ? <Box component="span" className="vx-trans-meta">{Number(customer.loyalty_points)} points</Box> : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
