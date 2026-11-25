import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Plus, Printer, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import { browserPrintHtml } from "@/features/printing/utils/posSaleReceiptPrinter";
import { fetchReceiptCompanyInfo } from "@/features/printing/utils/receiptCompanyInfo";
import IssueCouponDialog from "./giftcoupon/components/IssueCouponDialog";
import CancelCouponDialog from "./giftcoupon/components/CancelCouponDialog";
import { SOURCE_LABELS, STATE_COLORS, STATE_LABELS, buildCouponSlipHtml, money } from "./giftcoupon/utils/couponSlip";

const MANAGER_ROLES = ["supervisor", "manager", "admin", "super_admin"];
const STATUS_FILTERS = [{ value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "USED", label: "Used" }, { value: "EXPIRED", label: "Expired" }, { value: "CANCELLED", label: "Cancelled" }];

/**
 * CRM > Gift Coupon: every coupon, whether earned on a bill (Sales Customisation, Coupon rule) or given by hand. A
 * supervisor or above can give one, with a reason, or cancel one nobody has used. A coupon pays a bill from the payment step at POS.
 */
export default function GiftCoupon() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const canManage = MANAGER_ROLES.includes(authUser?.role);
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: String(authUser?.store_id || "") });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const res = await api.get("/gift-coupons", { params: { status } });
      setRows(res.data?.data || []);
      setOpen(Number(res.data?.outstanding || 0));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the coupons.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const userStoreId = authUser?.store_id;
  const printSlip = useCallback(async (coupon) => {
    const opened = await fetchReceiptCompanyInfo(coupon.store_id || userStoreId)
      .then((companyInfo) => browserPrintHtml(buildCouponSlipHtml(coupon, companyInfo), { copies: 1 }))
      .catch(() => false);
    if (!opened) toast.error("Could not open the print window. Allow pop-ups and try again.");
  }, [userStoreId]);

  const columns = useMemo(() => [
    { key: "display_number", label: "Coupon", valueGetter: (r) => r.display_number },
    { key: "buyer_name", label: "For", valueGetter: (r) => r.buyer_name || "-" },
    { key: "buyer_phone", label: "Phone", valueGetter: (r) => r.buyer_phone || "-" },
    { key: "issued_on", label: "Issued on", valueGetter: (r) => r.issued_on },
    { key: "expires_on", label: "Valid until", valueGetter: (r) => r.expires_on || "No expiry" },
    { key: "amount", label: "Value", valueGetter: (r) => r.amount, render: (v) => <Box sx={{ textAlign: "right", fontWeight: 600 }}>{money(v)}</Box> },
    { key: "min_bill_amount", label: "Smallest bill", valueGetter: (r) => r.min_bill_amount ?? 0, render: (v) => <Box sx={{ textAlign: "right" }}>{Number(v) > 0 ? money(v) : "Any"}</Box> },
    { key: "source", label: "How", valueGetter: (r) => [SOURCE_LABELS[r.source], r.reason].filter(Boolean).join(": ") },
    { key: "state", label: "Status", valueGetter: (r) => r.state, render: (v) => <Chip size="small" color={STATE_COLORS[v] || "default"} label={STATE_LABELS[v] || v} /> },
  ], []);

  const issued = (coupon, message) => {
    setIssuing(false);
    toast.success(message || "Coupon issued.");
    void printSlip(coupon);
    void load();
  };

  const cancelled = (_coupon, message) => {
    setCancelling(null);
    toast.success(message || "Coupon cancelled.");
    void load();
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={() => navigate("/crm")}
        backLabel="Back to CRM"
        title={<Breadcrumbs items={[{ label: "CRM", onClick: () => navigate("/crm") }, { label: "Gift Coupon" }]} />}
        actions={canManage ? (
          <Button onClick={() => setIssuing(true)} className="glass-btn glass-btn-success" sx={{ display: "inline-flex", alignItems: "center" }}>
            <Plus size={16} style={{ marginRight: 4 }} />Give a coupon
          </Button>
        ) : null}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ p: { xs: 1, md: 2 }, pb: 0, alignItems: { sm: "center" } }}>
        <TextField select size="small" label="Show" value={status} onChange={(event) => { setLoading(true); setPage(1); setStatus(event.target.value); }} sx={{ minWidth: 160 }}>
          {STATUS_FILTERS.map((choice) => <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Value of coupons not yet used: <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>₹{money(open)}</Box>
        </Typography>
      </Stack>

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column" }}>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            loading={loading}
            loadingText="Loading coupons..."
            emptyText="No coupons yet. Switch on Coupon on a paid bill in Sales Customisation, or give one by hand."
            searchPlaceholder="Search number, name or phone..."
            tablePreferenceKey="crm.gift-coupons"
            exportFileName="gift_coupons"
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
            renderActions={(row) => (
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                {row.state !== "CANCELLED" && <Button size="small" startIcon={<Printer size={13} />} onClick={() => void printSlip(row)}>Print</Button>}
                {canManage && (row.state === "ACTIVE" || row.state === "EXPIRED") && (
                  <Button size="small" color="error" startIcon={<Trash2 size={13} />} onClick={() => setCancelling(row)}>Cancel</Button>
                )}
              </Stack>
            )}
          />
        </SearchGridPanel>
      </Box>

      <IssueCouponDialog open={issuing} onClose={() => setIssuing(false)} onIssued={issued} />
      <CancelCouponDialog coupon={cancelling} onClose={() => setCancelling(null)} onCancelled={cancelled} />
    </Box>
  );
}
