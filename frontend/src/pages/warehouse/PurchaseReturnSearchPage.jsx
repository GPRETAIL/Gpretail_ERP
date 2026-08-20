import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import { usePrintContext } from "../../context/PrintContext";

const toNumber = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const PurchaseReturnSearchPage = () => {
  const navigate = useNavigate();
  const { printHtml } = usePrintContext();

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const columns = useMemo(
    () => [
      {
        key: "return_no",
        label: "Return No",
        valueGetter: (row) => row.return_no || "-",
      },
      {
        key: "return_date",
        label: "Date",
        valueGetter: (row) => row.return_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.return_date),
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.supplier?.name || "-",
      },
      {
        key: "company",
        label: "Company",
        valueGetter: (row) => row.company?.name || "-",
      },
      {
        key: "transport",
        label: "Transport",
        valueGetter: (row) => row.transport?.name || "-",
      },
      {
        key: "total_qty",
        label: "Qty",
        valueGetter: (row) => Number(row.total_qty || 0),
        render: (value) => <div className="text-right">{Number(value || 0)}</div>,
      },
      {
        key: "total_amount",
        label: "Amount",
        valueGetter: (row) => toNumber(row.total_amount),
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
    ],
    []
  );

  const pagination = useMemo(() => {
    const total = results.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1);
    return { total, totalPages };
  }, [results.length, limit]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/purchase-returns", { params: { all: "true" } });
      setResults(res.data?.data || []);
    } catch (err) {
      console.error("Failed to search purchase returns:", err);
      setToast({
        open: true,
        type: "error",
        message: "Failed to search purchase returns",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/purchase-returns/${id}`)));
      setToast({ open: true, type: "success", message: `${keys.length} record(s) deleted` });
      setSelectedRows([]);
      handleSearch();
    } catch {
      setToast({ open: true, type: "error", message: "Failed to delete some records" });
    }
  };

  const handlePrint = (entry) => {
    const rows = (entry.items || [])
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.barcode || "-"}</td>
            <td>${item.product_name || "-"}</td>
            <td>${item.return_qty || 0}</td>
            <td style="text-align:right;">${toNumber(item.amount).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Purchase Return ${entry.return_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Purchase Return</h2>
          <div>Return No: ${entry.return_no}</div>
          <div>Date: ${entry.return_date}</div>
          <div>Supplier: ${entry.supplier?.name || "-"}</div>
          <div>Company: ${entry.company?.name || "-"}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    printHtml(html, {
      label: `PurchaseReturn-${entry.return_no || entry.id || "print"}`,
      docType: "purchase_return",
      companyId: Number(entry.company_id || entry.company?.id || 0) || undefined,
      copies: 1,
    });
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col master-responsive">
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
            onClick={() => navigate("/warehouse/purchase-return")}
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
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Purchase Return Search</span>
          </h1>
        </div>

        <ExportBottomSheet
          columns={columns}
          rows={results}
          selectedRowKeys={selectedRows}
          onExportRows={async () => {
            const res = await api.get("/purchase-returns", { params: { all: "true" } });
            return res.data?.data || [];
          }}
          fileName="purchase_return_search"
          buttonClassName="topbar-action-btn topbar-action-export"
        />
      </div>

      <div className="flex-1 p-4 min-h-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm p-3 h-full flex flex-col min-h-0">
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Searching purchase returns..."
            emptyText="No purchase return records found."
            searchPlaceholder="Search in purchase return fields..."
            showExport={false}
            tablePreferenceKey="warehouse.purchase_return_search.list"
            onRefresh={handleSearch}
            refreshDisabled={loading}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            paginationMode="client"
            fillHeight
            onRowClick={(entry) => navigate(`/warehouse/purchase-return?edit=${entry.id}`)}
            enableKeyboardNav
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            renderActions={(entry, { selectedCount } = {}) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/warehouse/purchase-return?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(entry)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Print
                </button>
              </div>
            )}
          />
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

export default PurchaseReturnSearchPage;
