import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";

const today = new Date().toISOString().split("T")[0];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toDisplay = (value, fallback = "None") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toCurrency = (value) => toNumber(value).toFixed(2);

const buildInvoiceNavigationState = (entry) => ({
  fromTransportEntry: true,
  companyId: entry.company_id,
  companyName: entry.company?.name || "",
  supplierId: entry.supplier_id,
  supplierName: entry.supplier?.name || "",
  lrEntryNo: entry.lr_entry_no,
  lrNo: entry.lr_no,
  transportEntryId: entry.id,
  pieces: entry.no_of_pieces || 0,
  bundles: entry.no_of_bundles || 0,
});

const buildReceiptRowFromEntry = (entry) => ({
  transportEntryId: entry.id,
  supplierName: entry.supplier?.name || "-",
  fromLocation: entry.fromCity?.name || entry.auto_transfer_location || "-",
  entryNo: entry.lr_entry_no || "-",
  lrNo: entry.lr_no || "-",
  lrDate: entry.lr_date || "",
  noOfBundle: toNumber(entry.no_of_bundles),
  noOfBoxes: toNumber(entry.no_of_boxes),
  noOfPieces: toNumber(entry.no_of_pieces),
  weight: toNumber(entry.charged_weight || entry.actual_wgt),
  amount: toNumber(entry.goods_value),
});

const columns = [
  { key: "supplierName", label: "Supplier Name" },
  { key: "fromLocation", label: "From Location" },
  { key: "entryNo", label: "Entry No" },
  { key: "lrNo", label: "LR No" },
  { key: "lrDate", label: "LR Date" },
  { key: "noOfBundle", label: "No of Bundle", align: "right" },
  { key: "noOfBoxes", label: "No of Boxes", align: "right" },
  { key: "noOfPieces", label: "No of Pieces", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
  { key: "amount", label: "Amount", align: "right" },
];

const TransportReceipt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transportEntryId = searchParams.get("transport_entry_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [transportEntry, setTransportEntry] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({});
  const [receiptItems, setReceiptItems] = useState([]);
  const [form, setForm] = useState({
    bookingOffice: "None",
    receiptNumber: "",
    receivedOn: today,
    issueNumber: "",
    issueDate: "",
    receivedById: "",
    companyName: "",
    securityInwardNo: "",
    securityInwardDate: today,
    bundles: 0,
    boxes: 0,
    weight: 0,
    freight: 0,
    loadingChargeAmount: 0,
    loadingChargePaid: false,
    freightChargeAmount: 0,
    freightChargePaid: false,
    otherCharges: 0,
    totalCharges: 0,
  });

  const showToast = (type, message) => setToast({ open: true, type, message });

  useEffect(() => {
    if (!transportEntryId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [entryRes, employeesRes] = await Promise.all([
          api.get(`/transport-entries/${transportEntryId}`),
          api.get("/employees").catch(() => ({ data: { data: [] } })),
        ]);

        const entry = entryRes.data?.data || null;
        const employeeRows = employeesRes.data?.data || [];
        let nextReceiptNumber = entry?.receipt_no || "";

        if (!nextReceiptNumber) {
          try {
            const receiptNoRes = await api.get("/transport-entries/next-receipt-number", {
              params: { company_id: entry?.company_id || undefined },
            });
            nextReceiptNumber = receiptNoRes.data?.next_no || "";
          } catch {
            nextReceiptNumber = "";
          }
        }
        const defaultRow = entry ? buildReceiptRowFromEntry(entry) : null;
        const persistedRows = Array.isArray(entry?.receipt_items) ? entry.receipt_items : [];
        const nextRows = persistedRows.length > 0 ? persistedRows : (defaultRow ? [defaultRow] : []);
        const loadingChargeAmount = toNumber(entry?.receipt_loading_charge_amount);
        const freightChargeAmount = toNumber(entry?.receipt_freight_charge_amount);
        const otherCharges = toNumber(entry?.receipt_other_charges);

        setTransportEntry(entry);
        setEmployees(employeeRows);
        setReceiptItems(nextRows);
        setForm({
          bookingOffice: toDisplay(entry?.transport?.name),
          receiptNumber: nextReceiptNumber ? String(nextReceiptNumber) : "",
          receivedOn: entry?.receipt_date || today,
          issueNumber: entry?.issue_no ? String(entry.issue_no) : "",
          issueDate: entry?.issue_date || "",
          receivedById: entry?.receipt_received_by_id ? String(entry.receipt_received_by_id) : "",
          companyName: entry?.company?.name || "-",
          securityInwardNo: entry?.receipt_security_inward_no || "",
          securityInwardDate: entry?.receipt_security_inward_date || today,
          bundles: toNumber(entry?.receipt_bundles ?? entry?.no_of_bundles),
          boxes: toNumber(entry?.receipt_boxes ?? entry?.no_of_boxes),
          weight: toNumber(entry?.receipt_weight ?? entry?.charged_weight ?? entry?.actual_wgt),
          freight: toNumber(entry?.receipt_freight),
          loadingChargeAmount,
          loadingChargePaid: Boolean(entry?.receipt_loading_charge_paid),
          freightChargeAmount,
          freightChargePaid: Boolean(entry?.receipt_freight_charge_paid),
          otherCharges,
          totalCharges: toNumber(entry?.receipt_total_charges ?? loadingChargeAmount + freightChargeAmount + otherCharges),
        });
      } catch (error) {
        console.error("Failed to load transport receipt context:", error);
        showToast("error", "Failed to load receipt page");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportEntryId]);

  const filteredRows = useMemo(() => {
    return receiptItems.filter((row) =>
      columns.every((column) => {
        const query = String(filters[column.key] || "").trim().toLowerCase();
        if (!query) return true;
        const rawValue =
          column.key === "lrDate" ? formatDate(row[column.key]) : String(row[column.key] ?? "");
        return rawValue.toLowerCase().includes(query);
      })
    );
  }, [filters, receiptItems]);

  useEffect(() => {
    setForm((prev) => {
      const totalCharges =
        toNumber(prev.loadingChargeAmount) +
        toNumber(prev.freightChargeAmount) +
        toNumber(prev.otherCharges);
      if (toNumber(prev.totalCharges) === totalCharges) return prev;
      return { ...prev, totalCharges };
    });
  }, [form.loadingChargeAmount, form.freightChargeAmount, form.otherCharges]);

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const persistReceipt = async (moveNext = false) => {
    if (!transportEntryId) {
      showToast("error", "Transport entry is required");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/transport-entries/${transportEntryId}`, {
        receiptNo: form.receiptNumber || null,
        receiptDate: form.receivedOn,
        receiptReceivedById: form.receivedById || null,
        receiptSecurityInwardNo: form.securityInwardNo,
        receiptSecurityInwardDate: form.securityInwardDate,
        receiptBundles: form.bundles,
        receiptBoxes: form.boxes,
        receiptWeight: form.weight,
        receiptFreight: form.freight,
        receiptLoadingChargeAmount: form.loadingChargeAmount,
        receiptLoadingChargePaid: form.loadingChargePaid,
        receiptFreightChargeAmount: form.freightChargeAmount,
        receiptFreightChargePaid: form.freightChargePaid,
        receiptOtherCharges: form.otherCharges,
        receiptTotalCharges: form.totalCharges,
        receiptItems,
        status: "receipt_generated",
      });

      showToast("success", moveNext ? "Receipt saved" : "Receipt saved successfully");

      if (moveNext && transportEntry) {
        navigate("/warehouse/invoice", { state: buildInvoiceNavigationState(transportEntry) });
      }
    } catch (error) {
      console.error("Failed to save transport receipt:", error);
      showToast("error", error.response?.data?.message || "Failed to save receipt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="table" rows={8} cols={8} />;
  }

  if (!transportEntryId || !transportEntry) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-400">
          Open this page from a lorry transport entry.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            type="button"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Transport Receipt</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => persistReceipt(false)}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => persistReceipt(true)}
            disabled={saving}
            className="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            Save & Next
          </button>
          <button
            onClick={() => navigate("/warehouse/transport-issue/search")}
            className="glass-btn glass-btn-primary flex items-center"
          >
            <Search className="w-4 h-4 mr-1" />
            Search
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        <div className="w-[30rem] max-w-[34%] min-w-[300px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm p-4 overflow-y-auto">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Booking Office</div>
              <div className="mt-1 text-2xl font-semibold text-red-500 dark:text-red-400">{form.bookingOffice}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Number</span>
                <input
                  value={form.receiptNumber}
                  readOnly
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Received On</span>
                <input
                  type="date"
                  value={form.receivedOn}
                  onChange={(e) => handleFieldChange("receivedOn", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Metric label="Issue Date" value={form.issueDate ? formatDate(form.issueDate) : "-"} />
              <Metric label="Issue No" value={form.issueNumber || "-"} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Received By</label>
                <select
                  value={form.receivedById}
                  onChange={(e) => handleFieldChange("receivedById", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <Metric label="Company" value={form.companyName} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Security Inward No</span>
                <input
                  value={form.securityInwardNo}
                  onChange={(e) => handleFieldChange("securityInwardNo", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Security Inward Date</span>
                <input
                  type="date"
                  value={form.securityInwardDate}
                  onChange={(e) => handleFieldChange("securityInwardDate", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <EditableMetric label="Bundles" value={form.bundles} onChange={(value) => handleFieldChange("bundles", value)} />
              <EditableMetric label="Boxes" value={form.boxes} onChange={(value) => handleFieldChange("boxes", value)} />
              <EditableMetric label="Weight" value={form.weight} onChange={(value) => handleFieldChange("weight", value)} />
              <EditableMetric label="Freight" value={form.freight} onChange={(value) => handleFieldChange("freight", value)} />
            </div>

            <div className="space-y-3 rounded border border-gray-200 dark:border-gray-700 p-3">
              <ChargeRow
                label="Loading Charge"
                amount={form.loadingChargeAmount}
                paid={form.loadingChargePaid}
                onAmountChange={(value) => handleFieldChange("loadingChargeAmount", value)}
                onPaidChange={(checked) => handleFieldChange("loadingChargePaid", checked)}
              />
              <ChargeRow
                label="Freight Charge"
                amount={form.freightChargeAmount}
                paid={form.freightChargePaid}
                onAmountChange={(value) => handleFieldChange("freightChargeAmount", value)}
                onPaidChange={(checked) => handleFieldChange("freightChargePaid", checked)}
              />
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Other Charges</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.otherCharges}
                  onChange={(e) => handleFieldChange("otherCharges", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
                />
              </label>
              <Metric label="Total Charges" value={toCurrency(form.totalCharges)} />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm min-w-[1050px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
                <tr className="bg-sky-100 dark:bg-sky-900/30">
                  {columns.map((column) => (
                    <th key={column.key} className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <input
                        value={filters[column.key] || ""}
                        onChange={(e) => setFilters((prev) => ({ ...prev, [column.key]: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1 text-xs"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      No receipt rows found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.transportEntryId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-100">
                      {columns.map((column) => {
                        const value =
                          column.key === "lrDate"
                            ? formatDate(row[column.key])
                            : column.align === "right"
                              ? toNumber(row[column.key]).toFixed(2)
                              : row[column.key];
                        return (
                          <td
                            key={column.key}
                            className={`border border-gray-200 dark:border-gray-700 px-2 py-2 ${column.align === "right" ? "text-right" : ""}`}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div>
    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</div>
    <input
      readOnly
      value={value}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    />
  </div>
);

const EditableMetric = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</span>
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
    />
  </label>
);

const ChargeRow = ({ label, amount, paid, onAmountChange, onPaidChange }) => (
  <div className="grid grid-cols-[1fr_120px_72px] items-end gap-3">
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
    <label className="block">
      <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Amount</span>
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
      />
    </label>
    <label className="flex items-center gap-2 pb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={paid}
        onChange={(e) => onPaidChange(e.target.checked)}
        className="h-4 w-4 accent-blue-600"
      />
      Paid
    </label>
  </div>
);

export default TransportReceipt;
