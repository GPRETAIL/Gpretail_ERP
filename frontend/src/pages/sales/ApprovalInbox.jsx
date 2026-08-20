import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, RotateCcw, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

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
        api.get("/customers").catch(() => ({ data: { data: [] } })),
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
      ]);

      const customerRows = (customersRes.data?.data || []).map((row) => ({
        value: String(row.id),
        label: `${row.name || "Unnamed"}${row.mobile_no ? ` (${row.mobile_no})` : ""}`,
      }));
      setCustomers(customerRows);

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 space-y-4">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold">Sales Approval Inbox</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Product</label>
              <select
                value={filters.product}
                onChange={(e) => setFilters((prev) => ({ ...prev, product: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loadingFilters}
              >
                <option value="">All products</option>
                {products.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Customer</label>
              <select
                value={filters.customerId}
                onChange={(e) => setFilters((prev) => ({ ...prev, customerId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loadingFilters}
              >
                <option value="">All customers</option>
                {customers.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All status</option>
                {statusOptions.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={() => runSearch()}
                className="glass-btn glass-btn-primary w-full h-[38px] inline-flex items-center justify-center"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={handleResetFilters}
                className="glass-btn glass-btn-secondary w-full h-[38px] inline-flex items-center justify-center"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Approval Rows
          </div>
          <table className="w-full text-sm">
            <thead className="bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Approval No</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Date</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Customer</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Status</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Bill #</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-right">Amount</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">
                    {searching ? "Searching..." : "No entries found"}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border dark:border-gray-700 px-2 py-2 font-semibold">{row.approval_no}</td>
                    <td className="border dark:border-gray-700 px-2 py-2">{formatDateTime(row.sale_at)}</td>
                    <td className="border dark:border-gray-700 px-2 py-2">{row.customer_name || row.customer?.name || "-"}</td>
                    <td className="border dark:border-gray-700 px-2 py-2 capitalize">{toStatus(row.status) || "-"}</td>
                    <td className="border dark:border-gray-700 px-2 py-2">{row.bill?.bill_no || "-"}</td>
                    <td className="border dark:border-gray-700 px-2 py-2 text-right">{formatMoney(row.amount || 0)}</td>
                    <td className="border dark:border-gray-700 px-2 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(row.id)}
                          className="glass-btn glass-btn-primary inline-flex items-center"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleApprove(row)}
                          disabled={!!actingId || toStatus(row.status) !== "pending"}
                          className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {actingId === row.id && actingAction === "approve" ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleDecline(row)}
                          disabled={!!actingId || toStatus(row.status) !== "pending"}
                          className="glass-btn glass-btn-danger inline-flex items-center disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          {actingId === row.id && actingAction === "decline" ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-6xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sales On Approval Details</h2>
              <button
                onClick={() => setViewOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-56px)] text-gray-800 dark:text-gray-100">
              {loadingDetails ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading details...</p>
              ) : !selectedSale ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Unable to load details.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Approval No</span>
                      <span className="font-semibold">{selectedSale.approval_no || "-"}</span>
                    </div>
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className="font-semibold capitalize">{toStatus(selectedSale.status) || "-"}</span>
                    </div>
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Bill No</span>
                      <span className="font-semibold">{selectedSale.bill?.bill_no || "-"}</span>
                    </div>
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Date</span>
                      <span className="font-semibold">{formatDateTime(selectedSale.sale_at)}</span>
                    </div>
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Total Qty</span>
                      <span className="font-semibold">{selectedSale.total_qty || 0}</span>
                    </div>
                    <div className="flex justify-between border dark:border-gray-700 rounded-sm px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-400">Amount</span>
                      <span className="font-semibold">{formatMoney(selectedSale.amount || 0)}</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 text-sm space-y-1">
                    <h2 className="font-semibold text-gray-700 dark:text-gray-300">Customer Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      <div>Name: {selectedSale.customer_name || selectedSale.customer?.name || "-"}</div>
                      <div>Mobile: {selectedSale.customer_mobile || selectedSale.customer?.mobile_no || "-"}</div>
                      <div>Billing Name: {selectedSale.customer?.billing_name || "-"}</div>
                      <div>Email: {selectedSale.customer?.email_id || "-"}</div>
                      <div className="md:col-span-2">Address: {selectedSale.customer?.address || "-"}</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <tr>
                          <th className="border dark:border-gray-700 px-2 py-2 text-left">Barcode</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-left">Product</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-center">Qty</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-right">Price</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-right">Tax %</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-right">Discount</th>
                          <th className="border dark:border-gray-700 px-2 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedSale.items || []).length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">
                              No items found
                            </td>
                          </tr>
                        ) : (
                          (selectedSale.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="border dark:border-gray-700 px-2 py-2">{item.barcode || "-"}</td>
                              <td className="border dark:border-gray-700 px-2 py-2">{item.product_name || "-"}</td>
                              <td className="border dark:border-gray-700 px-2 py-2 text-center">{item.qty || 0}</td>
                              <td className="border dark:border-gray-700 px-2 py-2 text-right">{formatMoney(item.price || 0)}</td>
                              <td className="border dark:border-gray-700 px-2 py-2 text-right">{Number(item.tax_perc || 0).toFixed(2)}</td>
                              <td className="border dark:border-gray-700 px-2 py-2 text-right">{formatMoney(item.discount || 0)}</td>
                              <td className="border dark:border-gray-700 px-2 py-2 text-right">{formatMoney(item.total || 0)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedSale)}
                      disabled={!!actingId || toStatus(selectedSale.status) !== "pending"}
                      className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {actingId === selectedSale.id && actingAction === "approve" ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(selectedSale)}
                      disabled={!!actingId || toStatus(selectedSale.status) !== "pending"}
                      className="glass-btn glass-btn-danger inline-flex items-center disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {actingId === selectedSale.id && actingAction === "decline" ? "Declining..." : "Decline"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalInbox;
