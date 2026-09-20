import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, RotateCcw, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const mapCustomerOption = (row) => ({
  value: String(row.id),
  id: String(row.id),
  label: `${row.name || "Unnamed"}${row.phone ? ` (${row.phone})` : ""}`,
  name: row.name || "Unnamed",
});

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
};

const toStatus = (value) => String(value || "").trim().toLowerCase();

const ApprovalInbox = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    product: "",
    customerId: "",
    status: "",
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [actingAction, setActingAction] = useState("");

  // customers is only ever seeded with a small batch (see loadFilters below) -- this hits
  // /customers' own ?search= endpoint for anything beyond that.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const mapped = (res.data?.data || []).map(mapCustomerOption);
      if (mapped.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.value));
          const newOnes = mapped.filter((c) => !existingIds.has(c.value));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
    ],
    []
  );

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const [customersRes, barcodeRes] = await Promise.all([
        api.get("/customers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
      ]);

      setCustomers((customersRes.data?.data || []).map(mapCustomerOption));

      const seen = new Set();
      const productRows = [];
      (barcodeRes.data?.data || []).forEach((row) => {
        const name = String(row.product_name || "").trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        productRows.push({ value: name, label: name });
      });
      productRows.sort((a, b) => a.label.localeCompare(b.label));
      setProducts(productRows);
    } catch {
      toast.error("Failed to load inbox filters");
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const runSearch = useCallback(async (overrideFilters = null) => {
    const activeFilters = overrideFilters || filters;
    setSearching(true);
    try {
      const params = { all: true };
      if (activeFilters.product) params.product = activeFilters.product;
      if (activeFilters.customerId) params.customerId = activeFilters.customerId;
      if (activeFilters.status) params.status = activeFilters.status;

      const res = await api.get("/sales-on-approval", { params });
      setRows(res.data?.data || []);
    } catch {
      toast.error("Failed to search approval inbox");
    } finally {
      setSearching(false);
    }
  }, [filters]);

  const loadDetails = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetails(true);
    try {
      const res = await api.get(`/sales-on-approval/${id}`);
      setSelectedSale(res.data?.data || null);
    } catch {
      toast.error("Failed to load sales on approval details");
      setSelectedSale(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadFilters();
    runSearch({
      product: "",
      customerId: "",
      status: "",
    });
  }, [loadFilters, runSearch]);

  const handleResetFilters = async () => {
    const nextFilters = { product: "", customerId: "", status: "" };
    setFilters(nextFilters);
    await runSearch(nextFilters);
  };

  const handleView = async (rowId) => {
    setViewOpen(true);
    await loadDetails(rowId);
  };

  const handleApprove = async (row) => {
    if (!row?.id) return;
    if (toStatus(row.status) !== "pending") {
      toast.error("Only pending sales can be approved");
      return;
    }

    setActingId(row.id);
    setActingAction("approve");
    try {
      const res = await api.post(`/sales-on-approval/${row.id}/accept`);
      toast.success(res.data?.message || "Approved successfully");

      await runSearch();
      if (viewOpen && String(selectedSale?.id) === String(row.id)) {
        await loadDetails(row.id);
      }
      window.dispatchEvent(new Event("sales-on-approval-updated"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve sale");
    } finally {
      setActingId(null);
      setActingAction("");
    }
  };

  const handleDecline = async (row) => {
    if (!row?.id) return;
    if (toStatus(row.status) !== "pending") {
      toast.error("Only pending sales can be declined");
      return;
    }

    setActingId(row.id);
    setActingAction("decline");
    try {
      const res = await api.post(`/sales-on-approval/${row.id}/reject`);
      toast.success(res.data?.message || "Declined successfully");

      await runSearch();
      if (viewOpen && String(selectedSale?.id) === String(row.id)) {
        await loadDetails(row.id);
      }
      window.dispatchEvent(new Event("sales-on-approval-updated"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to decline sale");
    } finally {
      setActingId(null);
      setActingAction("");
    }
  };

  return (
    <Stack spacing={2} sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ color: "text.secondary" }}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600 }}>Sales Approval Inbox</Typography>
        </Stack>
      </Stack>

      <Stack spacing={2} sx={{ p: 2, pb: 6 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" }, gap: 1, alignItems: "end" }}>
            <Box sx={{ gridColumn: { md: "span 4" } }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Product</Typography>
              <TextField
                select
                value={filters.product}
                onChange={(e) => setFilters((prev) => ({ ...prev, product: e.target.value }))}
                disabled={loadingFilters}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
              >
                <MenuItem value="">All products</MenuItem>
                {products.map((row) => (
                  <MenuItem key={row.value} value={row.value}>
                    {row.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ gridColumn: { md: "span 4" } }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Customer</Typography>
              <AsyncSearchSelect
                name="customerId"
                value={filters.customerId}
                onChange={(e) => setFilters((prev) => ({ ...prev, customerId: e.target.value }))}
                options={customers}
                onAsyncSearch={handleAsyncCustomerSearch}
                placeholder="All customers"
                searchPlaceholder="Search customer..."
              />
            </Box>

            <Box sx={{ gridColumn: { md: "span 2" } }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Status</Typography>
              <TextField
                select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
              >
                <MenuItem value="">All status</MenuItem>
                {statusOptions.map((row) => (
                  <MenuItem key={row.value} value={row.value}>
                    {row.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ gridColumn: { md: "span 1" } }}>
              <Button
                onClick={() => runSearch()}
                className="glass-btn glass-btn-primary"
                fullWidth
                sx={{ height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Search"
              >
                <Search size={16} />
              </Button>
            </Box>

            <Box sx={{ gridColumn: { md: "span 1" } }}>
              <Button
                onClick={handleResetFilters}
                className="glass-btn glass-btn-secondary"
                fullWidth
                sx={{ height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Reset"
              >
                <RotateCcw size={16} />
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflowX: "auto" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>
            Approval Rows
          </Box>
          <Table sx={{ width: "100%", fontSize: 12.25 }}>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
              <TableRow>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Approval No</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Date</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Customer</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Status</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Bill #</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Amount</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ px: 1.5, py: 4, textAlign: "center", color: "text.disabled" }}>
                    {searching ? "Searching..." : "No entries found"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, fontWeight: 600 }}>{row.approval_no}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>{formatDateTime(row.sale_at)}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>{row.customer_name || row.customer?.name || "-"}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textTransform: "capitalize" }}>{toStatus(row.status) || "-"}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>{row.bill?.bill_no || "-"}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{formatMoney(row.amount || 0)}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                        <Button
                          onClick={() => handleView(row.id)}
                          className="glass-btn glass-btn-primary"
                          sx={{ display: "inline-flex", alignItems: "center" }}
                        >
                          <Eye size={14} style={{marginRight: 4}} />
                          View
                        </Button>
                        <Button
                          onClick={() => handleApprove(row)}
                          disabled={!!actingId || toStatus(row.status) !== "pending"}
                          className="glass-btn glass-btn-success disabled:opacity-50"
                          sx={{ display: "inline-flex", alignItems: "center" }}
                        >
                          <CheckCircle2 size={14} style={{marginRight: 4}} />
                          {actingId === row.id && actingAction === "approve" ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          onClick={() => handleDecline(row)}
                          disabled={!!actingId || toStatus(row.status) !== "pending"}
                          className="glass-btn glass-btn-danger disabled:opacity-50"
                          sx={{ display: "inline-flex", alignItems: "center" }}
                        >
                          <X size={14} style={{marginRight: 4}} />
                          {actingId === row.id && actingAction === "decline" ? "Declining..." : "Decline"}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>

      {viewOpen && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 50, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Box sx={{ bgcolor: "background.paper", width: "100%", maxWidth: 1152, maxHeight: "90vh", borderRadius: "7px", boxShadow: 8, overflow: "hidden" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
              <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Sales On Approval Details</Typography>
              <IconButton
                onClick={() => setViewOpen(false)}
                sx={{ color: "text.secondary" }}
                aria-label="Close details"
              >
                <X size={20} />
              </IconButton>
            </Stack>

            <Stack spacing={2} sx={{ p: 2, overflowY: "auto", maxHeight: "calc(90vh - 56px)", color: "text.primary" }}>
              {loadingDetails ? (
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Loading details...</Typography>
              ) : !selectedSale ? (
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Unable to load details.</Typography>
              ) : (
                <>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1, fontSize: 12.25 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Approval No</Box>
                      <Box component="span" sx={{ fontWeight: 600 }}>{selectedSale.approval_no || "-"}</Box>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Status</Box>
                      <Box component="span" sx={{ fontWeight: 600, textTransform: "capitalize" }}>{toStatus(selectedSale.status) || "-"}</Box>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Bill No</Box>
                      <Box component="span" sx={{ fontWeight: 600 }}>{selectedSale.bill?.bill_no || "-"}</Box>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Date</Box>
                      <Box component="span" sx={{ fontWeight: 600 }}>{formatDateTime(selectedSale.sale_at)}</Box>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Total Qty</Box>
                      <Box component="span" sx={{ fontWeight: 600 }}>{selectedSale.total_qty || 0}</Box>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Amount</Box>
                      <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(selectedSale.amount || 0)}</Box>
                    </Stack>
                  </Box>

                  <Stack spacing={0.5} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", p: 1.5, fontSize: 12.25 }}>
                    <Typography component="h2" sx={{ fontWeight: 600, color: "text.secondary" }}>Customer Details</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 0.5 }}>
                      <Box>Name: {selectedSale.customer_name || selectedSale.customer?.name || "-"}</Box>
                      <Box>Mobile: {selectedSale.customer_mobile || selectedSale.customer?.mobile_no || "-"}</Box>
                      <Box>Billing Name: {selectedSale.customer?.billing_name || "-"}</Box>
                      <Box>Email: {selectedSale.customer?.email_id || "-"}</Box>
                      <Box sx={{ gridColumn: { md: "span 2" } }}>Address: {selectedSale.customer?.address || "-"}</Box>
                    </Box>
                  </Stack>

                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", overflowX: "auto" }}>
                    <Table sx={{ width: "100%", fontSize: 12.25 }}>
                      <TableHead sx={{ bgcolor: "action.hover", color: "text.secondary" }}>
                        <TableRow>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Barcode</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Product</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>Qty</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Price</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Tax %</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Discount</TableCell>
                          <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedSale.items || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ px: 1.5, py: 3, textAlign: "center", color: "text.disabled" }}>
                              No items found
                            </TableCell>
                          </TableRow>
                        ) : (
                          (selectedSale.items || []).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>{item.barcode || "-"}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1 }}>{item.product_name || "-"}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>{item.qty || 0}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{formatMoney(item.price || 0)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{Number(item.tax_perc || 0).toFixed(2)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{formatMoney(item.discount || 0)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{formatMoney(item.total || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                    <Button
                      type="button"
                      onClick={() => handleApprove(selectedSale)}
                      disabled={!!actingId || toStatus(selectedSale.status) !== "pending"}
                      className="glass-btn glass-btn-success disabled:opacity-50"
                      sx={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <CheckCircle2 size={14} style={{marginRight: 4}} />
                      {actingId === selectedSale.id && actingAction === "approve" ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleDecline(selectedSale)}
                      disabled={!!actingId || toStatus(selectedSale.status) !== "pending"}
                      className="glass-btn glass-btn-danger disabled:opacity-50"
                      sx={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <X size={14} style={{marginRight: 4}} />
                      {actingId === selectedSale.id && actingAction === "decline" ? "Declining..." : "Decline"}
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default ApprovalInbox;
