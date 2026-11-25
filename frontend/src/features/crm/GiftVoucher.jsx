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
import SellVoucherDialog from "./giftvoucher/components/SellVoucherDialog";
import CancelVoucherDialog from "./giftvoucher/components/CancelVoucherDialog";
import { STATE_COLORS, STATE_LABELS, buildVoucherSlipHtml, money, paymentLabel } from "./giftvoucher/utils/voucherSlip";

const CANCEL_ROLES = ["supervisor", "manager", "admin", "super_admin"];
const STATUS_FILTERS = [{ value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "USED", label: "Used" }, { value: "EXPIRED", label: "Expired" }, { value: "CANCELLED", label: "Cancelled" }];

/**
 * CRM > Gift Voucher: sell a voucher for cash, card or UPI, see every voucher with what is left on it, print the slip
 * again, and (supervisor or above) cancel one nobody has used. A voucher pays a bill from the payment step at POS.
 */
export default function GiftVoucher() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const canCancel = CANCEL_ROLES.includes(authUser?.role);
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: String(authUser?.store_id || "") });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const res = await api.get("/gift-vouchers", { params: { status } });
      setRows(res.data?.data || []);
      setOutstanding(Number(res.data?.outstanding || 0));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the gift vouchers.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const userStoreId = authUser?.store_id;
  const printSlip = useCallback(async (voucher) => {
    const opened = await fetchReceiptCompanyInfo(voucher.store_id || userStoreId)
      .then((companyInfo) => browserPrintHtml(buildVoucherSlipHtml(voucher, companyInfo), { copies: 1 }))
      .catch(() => false);
    if (!opened) toast.error("Could not open the print window. Allow pop-ups and try again.");
  }, [userStoreId]);

  const columns = useMemo(() => [
    { key: "display_number", label: "Voucher", valueGetter: (r) => r.display_number },
    { key: "buyer_name", label: "Sold to", valueGetter: (r) => r.buyer_name || "-" },
    { key: "buyer_phone", label: "Phone", valueGetter: (r) => r.buyer_phone || "-" },
    { key: "issued_on", label: "Sold on", valueGetter: (r) => r.issued_on },
    { key: "expires_on", label: "Valid until", valueGetter: (r) => r.expires_on || "No expiry" },
    { key: "payment_mode", label: "Paid by", valueGetter: (r) => [paymentLabel(r.payment_mode), r.payment_reference].filter(Boolean).join(" · ") || "-" },
    { key: "original_amount", label: "Amount", valueGetter: (r) => r.original_amount, render: (v) => <Box sx={{ textAlign: "right" }}>{money(v)}</Box> },
    { key: "balance", label: "Balance", valueGetter: (r) => (r.state === "CANCELLED" ? 0 : r.balance), render: (v) => <Box sx={{ textAlign: "right", fontWeight: 600 }}>{money(v)}</Box> },
    { key: "state", label: "Status", valueGetter: (r) => r.state, render: (v) => <Chip size="small" color={STATE_COLORS[v] || "default"} label={STATE_LABELS[v] || v} /> },
  ], []);

  const sold = (voucher, message) => {
    setSelling(false);
    toast.success(message || "Gift voucher sold.");
    void printSlip(voucher);
    void load();
  };

  const cancelled = (_voucher, message) => {
    setCancelling(null);
    toast.success(message || "Gift voucher cancelled.");
    void load();
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={() => navigate("/crm")}
        backLabel="Back to CRM"
        title={<Breadcrumbs items={[{ label: "CRM", onClick: () => navigate("/crm") }, { label: "Gift Voucher" }]} />}
        actions={(
          <Button onClick={() => setSelling(true)} className="glass-btn glass-btn-success" sx={{ display: "inline-flex", alignItems: "center" }}>
            <Plus size={16} style={{ marginRight: 4 }} />Sell gift voucher
          </Button>
        )}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ p: { xs: 1, md: 2 }, pb: 0, alignItems: { sm: "center" } }}>
        <TextField select size="small" label="Show" value={status} onChange={(event) => { setLoading(true); setPage(1); setStatus(event.target.value); }} sx={{ minWidth: 160 }}>
          {STATUS_FILTERS.map((choice) => <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Still to be used on live vouchers: <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>₹{money(outstanding)}</Box>
        </Typography>
      </Stack>

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column" }}>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            loading={loading}
            loadingText="Loading gift vouchers..."
            emptyText="No gift vouchers yet. Use Sell gift voucher to add one."
            searchPlaceholder="Search number, name or phone..."
            tablePreferenceKey="crm.gift-vouchers"
            exportFileName="gift_vouchers"
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
            renderActions={(row) => (
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                {row.state !== "CANCELLED" && <Button size="small" startIcon={<Printer size={13} />} onClick={() => void printSlip(row)}>Print</Button>}
                {canCancel && row.state !== "CANCELLED" && row.state !== "USED" && row.balance === row.original_amount && (
                  <Button size="small" color="error" startIcon={<Trash2 size={13} />} onClick={() => setCancelling(row)}>Cancel</Button>
                )}
              </Stack>
            )}
          />
        </SearchGridPanel>
      </Box>

      <SellVoucherDialog open={selling} onClose={() => setSelling(false)} onSold={sold} />
      <CancelVoucherDialog voucher={cancelling} onClose={() => setCancelling(null)} onCancelled={cancelled} />
    </Box>
  );
}
