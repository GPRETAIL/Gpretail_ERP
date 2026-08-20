import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Search, Plus } from "lucide-react";
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

const buildIssueRowFromEntry = (entry) => ({
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

const TransportIssueEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transportEntryId = searchParams.get("transport_entry_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [transportEntry, setTransportEntry] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({});
  const [issueItems, setIssueItems] = useState([]);
  const [form, setForm] = useState({
    bookingOffice: "None",
    issueNumber: "",
    companyName: "",
    collectedById: "",
    issueDate: today,
    fromLocation: "None",
    receivingLocation: "None",
    lrNumber: "",
    entryNumber: "",
    noOfBundles: 0,
    noOfBoxes: 0,
    noOfPieces: 0,
    freightCharge: 0,
    weight: 0,
    count: 0,
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
        let nextIssueNumber = entry?.issue_no || "";

        if (!nextIssueNumber) {
          try {
            const issueNoRes = await api.get("/transport-entries/next-issue-number", {
              params: { company_id: entry?.company_id || undefined },
            });
            nextIssueNumber = issueNoRes.data?.next_no || "";
          } catch {
            nextIssueNumber = "";
          }
        }

        const defaultRow = entry ? buildIssueRowFromEntry(entry) : null;
        const persistedRows = Array.isArray(entry?.issue_items) ? entry.issue_items : [];
        const nextIssueItems = persistedRows.length > 0 ? persistedRows : (defaultRow ? [defaultRow] : []);

        setTransportEntry(entry);
        setEmployees(employeeRows);
        setIssueItems(nextIssueItems);
        setForm({
          bookingOffice: toDisplay(entry?.transport?.name),
          issueNumber: nextIssueNumber ? String(nextIssueNumber) : "",
          companyName: entry?.company?.name || "-",
          collectedById: entry?.issue_collected_by_id ? String(entry.issue_collected_by_id) : "",
          issueDate: entry?.issue_date || today,
          fromLocation: toDisplay(entry?.fromCity?.name),
          receivingLocation: toDisplay(entry?.receivingCity?.name || entry?.auto_transfer_location),
          lrNumber: entry?.lr_no || "",
          entryNumber: entry?.lr_entry_no ? String(entry.lr_entry_no) : "",
          noOfBundles: toNumber(entry?.no_of_bundles),
          noOfBoxes: toNumber(entry?.no_of_boxes),
          noOfPieces: toNumber(entry?.no_of_pieces),
          freightCharge: entry?.freight_charge ? 1 : 0,
          weight: toNumber(entry?.charged_weight || entry?.actual_wgt),
          count: defaultRow ? 1 : 0,
        });
      } catch (error) {
        console.error("Failed to load transport issue context:", error);
        showToast("error", "Failed to load transport issue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportEntryId]);

  const filteredRows = useMemo(() => {
    return issueItems.filter((row) =>
      columns.every((column) => {
        const query = String(filters[column.key] || "").trim().toLowerCase();
        if (!query) return true;
        const rawValue =
          column.key === "lrDate" ? formatDate(row[column.key]) : String(row[column.key] ?? "");
        return rawValue.toLowerCase().includes(query);
      })
    );
  }, [filters, issueItems]);

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const ensureCurrentRowAdded = (source) => {
    if (!transportEntry) return;
    const currentRow = buildIssueRowFromEntry(transportEntry);

    if (source === "lr" && form.lrNumber && form.lrNumber !== currentRow.lrNo) {
      showToast("warning", "LR number does not match the selected transport entry");
      return;
    }
    if (source === "entry" && form.entryNumber && String(form.entryNumber) !== String(currentRow.entryNo)) {
      showToast("warning", "Entry number does not match the selected transport entry");
      return;
    }

    setIssueItems((prev) => {
      if (prev.some((row) => String(row.transportEntryId) === String(currentRow.transportEntryId))) {
        return prev;
      }
      return [...prev, currentRow];
    });
  };

  const handleRemoveRow = (rowId) => {
    setIssueItems((prev) => prev.filter((row) => String(row.transportEntryId) !== String(rowId)));
  };

  const persistIssue = async (moveNext = false) => {
    if (!transportEntryId) {
      showToast("error", "Transport entry is required");
      return;
    }
    if (issueItems.length === 0) {
      showToast("warning", "Add at least one row before saving issue");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/transport-entries/${transportEntryId}`, {
        issueNo: form.issueNumber,
        issueDate: form.issueDate,
        issueCollectedById: form.collectedById,
        issueItems,
        status: "issue_generated",
      });
      showToast("success", moveNext ? "Issue saved" : "Issue saved successfully");
      if (moveNext) {
        navigate(`/warehouse/transport-receipt?transport_entry_id=${transportEntryId}`);
      }
    } catch (error) {
      console.error("Failed to save transport issue:", error);
      showToast("error", error.response?.data?.message || "Failed to save issue");
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
            <span className="text-gray-800 dark:text-gray-100">Transport Issue</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => persistIssue(false)}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => persistIssue(true)}
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
        <div className="w-[34rem] max-w-[36%] min-w-[320px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm p-4 overflow-y-auto">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Booking Office</div>
              <div className="mt-1 text-2xl font-semibold text-red-500 dark:text-red-400">{form.bookingOffice}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Company</div>
                <div className="mt-1 text-2xl font-semibold text-red-500 dark:text-red-400">{form.companyName}</div>
              </div>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-red-500 dark:text-red-400">*</span> Issue Number
                </span>
                <input
                  value={form.issueNumber}
                  readOnly
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 dark:text-red-400">*</span> Collected By
              </label>
              <select
                value={form.collectedById}
                onChange={(e) => handleFieldChange("collectedById", e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 dark:text-red-400">*</span> Issue Date
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => handleFieldChange("issueDate", e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From Location</div>
                <div className="mt-1 text-2xl font-semibold text-red-500 dark:text-red-400">{form.fromLocation}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Receiving Location</div>
                <div className="mt-1 text-2xl font-semibold text-red-500 dark:text-red-400">{form.receivingLocation}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-red-500 dark:text-red-400">*</span> LR Number
                </label>
                <div className="flex">
                  <input
                    value={form.lrNumber}
                    onChange={(e) => handleFieldChange("lrNumber", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-l-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => ensureCurrentRowAdded("lr")}
                    className="px-3 py-2 bg-sky-600 text-white rounded-r-sm hover:bg-sky-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-red-500 dark:text-red-400">*</span> Entry Number
                </label>
                <div className="flex">
                  <input
                    value={form.entryNumber}
                    onChange={(e) => handleFieldChange("entryNumber", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-l-sm px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => ensureCurrentRowAdded("entry")}
                    className="px-3 py-2 bg-sky-600 text-white rounded-r-sm hover:bg-sky-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="No Of Bundles" value={form.noOfBundles} />
              <Metric label="No Of Boxes" value={form.noOfBoxes} />
              <Metric label="No Of Pieces" value={form.noOfPieces} />
              <Metric label="Fright Charge" value={form.freightCharge} />
              <Metric label="Weight" value={form.weight} />
              <Metric label="Count" value={issueItems.length} />
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
                  <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-semibold text-center">Action</th>
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
                  <th className="border border-gray-300 dark:border-gray-600 px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      No issue rows found.
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
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.transportEntryId)}
                          className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700"
                        >
                          Remove
                        </button>
                      </td>
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

export default TransportIssueEntry;
