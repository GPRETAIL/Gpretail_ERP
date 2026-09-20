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
import { Box, Stack, Card, Typography, Button } from "@mui/material";
import api from "../../api/axios";
import UploadImportButton from "../../components/UploadImportButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import PageHeader from "../../components/PageHeader";
import useStoreNameMap from "../../hooks/useStoreNameMap";
import { createGroupFetchers } from "../../utils/serverGrouping";

// Matches config('pagination.resources.taxes.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchTaxGroupSummaries, onFetchGroupRows: fetchTaxGroupRows } =
  createGroupFetchers("/taxes", { taxType: "type" });

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
  const [rawPagination, setRawPagination] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);
  const storeMap = useStoreNameMap();

  useEffect(() => {
    fetchTaxData();
  }, [page, limit, tableSearch, forceFetchAll]);

  const fetchTaxData = async (queryOverride = tableSearch, cursorToken = null) => {
    try {
      setLoading(true);
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { ...(cursorToken ? { cursor: cursorToken } : { page }), limit };
      const res = await api.get("/taxes", { params });
      const rows = mapTaxRows(res.data?.data || []);
      setTaxData(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
        setRawPagination(null);
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
        setRawPagination(res.data?.pagination || null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  const handleTaxNextCursor = (cursor) => fetchTaxData(tableSearch, cursor);
  const handleTaxPreviousCursor = (cursor) => fetchTaxData(tableSearch, cursor);

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
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
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

      <PageHeader
        title={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography
              component="button"
              type="button"
              onClick={() => navigate("/masters")}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "primary.main",
                background: "none",
                border: "none",
                p: 0,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Master
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>/</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Tax</Typography>
          </Stack>
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={handleNew}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle size={12} />}
              size="small"
            >
              New
            </Button>
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
            <UploadImportButton
              endpoint="/taxes/bulk"
              fieldConfig={TAX_IMPORT_CONFIG}
              onDone={() => {
                if (page === 1) fetchTaxData();
                else setPage(1);
              }}
            />
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
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
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0 }}>
        <Card variant="outlined" sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, mb: 1.5 }}>
            Tax Search
          </Typography>
          <FilterableDataTable
            rows={taxData}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search in tax fields..."
            searchButtonClassName="glass-btn glass-btn-primary"
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
            pagination={rawPagination}
            enableVirtualization
            onPageChange={setPage}
            onNextCursor={handleTaxNextCursor}
            onPreviousCursor={handleTaxPreviousCursor}
            onFetchGroupSummaries={fetchTaxGroupSummaries}
            onFetchGroupRows={fetchTaxGroupRows}
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
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <button
                  onClick={() => navigate(taxViewPath(tax))}
                  className="glass-btn glass-btn-primary"
                  title="View"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => navigate(taxEditPath(tax))}
                  title="Modify"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setConfirmDlg({ open: true, code: tax.taxCode, name: tax.name, company_id: tax.company_id })}
                  className="glass-btn glass-btn-danger"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </Stack>
            )}
          />
        </Card>
      </Box>
    </Box>
  );
};

export default Tax;
