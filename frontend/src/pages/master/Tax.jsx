import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import UploadImportButton from "../../components/UploadImportButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const TAX_IMPORT_CONFIG = {
  aliases: {
    taxcode: "tax_code", code: "tax_code",
    name: "name",
    taxtype: "tax_type", taxcharges: "tax_type", type: "tax_type",
    taxpercentage: "tax_percentage", percentage: "tax_percentage", rate: "tax_percentage",
    issalestax: "is_sales_tax", salestax: "is_sales_tax",
    ispurchasetax: "is_purchase_tax", purchasetax: "is_purchase_tax",
    isdisabled: "is_disabled",
  },
  required: ["name"],
  boolFields: ["is_sales_tax", "is_purchase_tax", "is_disabled"],
  sampleFileName: "tax_sample.xlsx",
  sampleHeaders: [
    "tax_code", "name", "tax_type", "tax_percentage",
    "is_sales_tax", "is_purchase_tax", "is_disabled",
  ],
};

// tax_code is only unique per store, not globally -- the single-record GET this feeds needs to
// know which store's row was actually clicked, or it silently scopes to whichever store happens
// to be "active" for the caller and 404s on every row that isn't (see TaxController.getOne).
const taxEditPath = (tax) =>
  `/masters/tax/edit/${tax.taxCode}${tax.company_id != null ? `?company_id=${tax.company_id}` : ""}`;
const taxViewPath = (tax) =>
  `/masters/tax/${tax.taxCode}${tax.company_id != null ? `?company_id=${tax.company_id}` : ""}`;

const mapTaxRows = (items = []) =>
  items.map((t) => ({
    id: t.id,
    taxCode: t.tax_code ?? t.taxCode ?? "",
    name: t.name ?? "",
    taxPercent: t.tax_percentage ?? t.taxPercentage ?? "",
    split: `${t.cgst ?? "--"} / ${t.sgst ?? "--"} / --`,
    taxType: t.tax_type ?? t.taxType ?? "",
    isPurchaseTax: t.is_purchase_tax ?? t.isPurchaseTax ?? false,
    isSalesTax: t.is_sales_tax ?? t.isSalesTax ?? false,
    isDisabled: t.is_disabled ?? t.isDisabled ?? false,
    created_by: t.created_by ?? t.createdBy ?? "",
    company_id: t.company_id ?? t.companyId ?? null,
  }));


const Tax = () => {
  // --- Handlers ---
  const navigate = useNavigate();

  const handleNew = () => {
    navigate(`/masters/tax/new`);
  };
  const [taxData, setTaxData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmDlg, setConfirmDlg] = useState({ open: false, code: null, name: "", company_id: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);
  const storeMap = useStoreNameMap();

  useEffect(() => {
    fetchTaxData();
  }, [page, limit, tableSearch, forceFetchAll]);

  const fetchTaxData = async (queryOverride = tableSearch) => {
    try {
      setLoading(true);
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { page, limit };
      const res = await api.get("/taxes", { params });
      const rows = mapTaxRows(res.data?.data || []);
      setTaxData(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const columns = [
    { key: "taxCode", label: "Code" },
    { key: "name", label: "Name" },
    { key: "taxPercent", label: "Tax %" },
    { key: "split", label: "Split" },
    { key: "taxType", label: "Tax Type" },
    {
      key: "isPurchaseTax",
      label: "Is Purchase Tax",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.isPurchaseTax ? "yes" : "no"),
    },
    {
      key: "isSalesTax",
      label: "Is Sales Tax",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.isSalesTax ? "yes" : "no"),
    },
    {
      key: "isDisabled",
      label: "Is Disabled",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.isDisabled ? "yes" : "no"),
    },
    {
      key: "created_by",
      label: "Created By",
      render: (value) => value || "—",
      searchValue: (row) => row.created_by || "",
    },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  const handleDeleteConfirmed = async () => {
    const { code, company_id } = confirmDlg;
    setConfirmDlg({ open: false, code: null, name: "", company_id: null });
    try {
      await api.delete(`/taxes/${code}`, { params: company_id != null ? { company_id } : undefined });
      toast.success("Tax deleted");
      fetchTaxData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      // tax_code is only unique per store (see taxEditPath's comment above), so the delete request
      // needs each row's own company_id alongside its code -- the same scoping the single-row
      // delete above and the edit/view routes already carry.
      const targets = taxData
        .filter((row) => keys.includes(row.id))
        .map((row) => ({ taxCode: row.taxCode, companyId: row.company_id }))
        .filter((entry) => Boolean(entry.taxCode));
      await Promise.all(
        targets.map(({ taxCode, companyId }) =>
          api.delete(`/taxes/${taxCode}`, { params: companyId != null ? { company_id: companyId } : undefined })
        )
      );
      toast.success(`${targets.length} record(s) deleted`);
      setSelectedRows([]);
      fetchTaxData();
    } catch {
      toast.error("Failed to delete some records");
    }
  };
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirmDlg.open}
        message={`Are you sure you want to delete tax "${confirmDlg.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDlg({ open: false, code: null, name: "", company_id: null })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      {/* Header (Minimized) */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/masters")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Master
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Tax</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={handleNew}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/taxes/bulk"
            fieldConfig={TAX_IMPORT_CONFIG}
            onDone={() => {
              if (page === 1) fetchTaxData();
              else setPage(1);
            }}
          />
          <span>|</span>
          <ExportBottomSheet
            columns={columns}
            rows={taxData}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              const res = await api.get("/taxes", { params: { all: "true" } });
              return mapTaxRows(res.data?.data || []);
            }}
            fileName="taxes"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>
      <div className="p-3 flex-1 min-h-0">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-bold mb-3">Tax Search</h2>
          <FilterableDataTable
            rows={taxData}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search in tax fields..."
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            enableColumnResize
            tablePreferenceKey="masters.taxes.list"
            onRefresh={() => fetchTaxData()}
            refreshDisabled={loading}
            enableServerSearch
            onServerSearch={handleServerSearch}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            enableSelection
            enableKeyboardNav
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            onRowClick={(tax) => navigate(taxEditPath(tax))}
            fillHeight
            renderActions={(tax, { selectedCount } = {}) => (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(taxViewPath(tax))}
                  className="glass-btn glass-btn-primary"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(taxEditPath(tax))}
                  title="Modify"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDlg({ open: true, code: tax.taxCode, name: tax.name, company_id: tax.company_id })}
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Tax;
