import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Eye, Printer, Ruler } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import { usePrintContext } from "@/features/printing/context/PrintContext";
import { DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION, fetchWarehouseBarcodeCustomization } from "@/features/warehouse/barcodes/utils/barcodeCustomisation";
import { buildBarcodeSheetPreviewHtml, buildLabelQrSources, printWarehouseBarcodeLabels } from "@/features/warehouse/barcodes/BarcodeGeneration";
import { employeeStickerLabels } from "@/features/sales/employee-sticker/utils/employeeStickerLabels";
import { applyEmployeeStickerSize, effectiveEmployeeStickerSize, formatEmployeeStickerSize } from "@/features/sales/employee-sticker/utils/employeeStickerSize";
import EmployeeStickerSizeDialog from "@/features/sales/employee-sticker/components/EmployeeStickerSizeDialog";

/**
 * Sales > Employee Sticker: a QR or barcode sticker per salesperson. At the POS the Salesperson field reads it, so each
 * sold item is credited to the employee (Incentive report, payroll's Sales Incentive). Printed like product stickers:
 * same printer, margins, font and print mode (Warehouse > Barcode Customisation). The sticker size is its own setting
 * (Sticker size, saved in Sales Customisation); until it is set, the product sticker size is used.
 */
export default function EmployeeSticker() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const { printHtml: queuePrintHtml } = usePrintContext();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [copies, setCopies] = useState({});
  const [codeType, setCodeType] = useState(null); // null until the store's sticker setting is known
  const [productCustomization, setCustomization] = useState(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  const [savedSize, setSavedSize] = useState(null); // this store's employee sticker size, or null = product sticker size
  const [sizeOpen, setSizeOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [preview, setPreview] = useState("");
  const customization = useMemo(() => applyEmployeeStickerSize(productCustomization, savedSize), [productCustomization, savedSize]);
  const sizeLabel = formatEmployeeStickerSize(effectiveEmployeeStickerSize(savedSize, productCustomization));
  const grid = useSearchGrid({ sourceRows: people, paginationMode: "client", scopeKey: String(authUser?.store_id || "") });
  const { page, limit, setPage, setLimit } = grid;
  const storeName = String(authUser?.company_name || "").trim() || "Store";
  const printAs = codeType || (customization?.codeType === "barcode" ? "barcode" : "code");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/salespeople");
      setPeople(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let alive = true;
    fetchWarehouseBarcodeCustomization(api, authUser?.company_id || undefined).then((config) => alive && setCustomization(config));
    return () => { alive = false; };
  }, [authUser?.company_id]);

  useEffect(() => {
    let alive = true;
    // The same store the size is saved for (the save sends companyId = the store).
    api.get("/sales-customization", { params: { company_id: authUser?.store_id } }).then((res) => {
      const size = res.data?.data?.employeeSticker;
      if (alive) setSavedSize(size && typeof size === "object" ? size : null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [authUser?.store_id]);

  const chosen = useMemo(() => people.filter((person) => selected.includes(person.id)), [people, selected]);
  const labels = useMemo(() => employeeStickerLabels(chosen, copies, printAs), [chosen, copies, printAs]);

  const showPreview = async () => {
    setPreview(buildBarcodeSheetPreviewHtml({ labels, customization, storeName, qrSources: await buildLabelQrSources(labels) }));
  };

  const print = async () => {
    if (!labels.length || printing) return;
    setPrinting(true);
    try {
      const result = await printWarehouseBarcodeLabels({
        labels, qrSources: await buildLabelQrSources(labels), customization, storeName, queuePrintHtml,
        jobName: chosen.length === 1 ? `Employee sticker ${chosen[0].name}` : `Employee stickers (${chosen.length})`,
      });
      if (result.message) toast[result.ok ? "success" : "error"](result.message);
    } catch (err) {
      toast.error(err?.message || "Failed to print employee stickers.");
    } finally {
      setPrinting(false);
    }
  };

  const columns = useMemo(() => [
    { key: "code", label: "Employee code", valueGetter: (row) => row.code || "-" },
    { key: "name", label: "Name", valueGetter: (row) => row.name },
    { key: "section", label: "Section", valueGetter: (row) => row.section || "-" },
    { key: "designation", label: "Designation", valueGetter: (row) => row.designation || "-" },
    { key: "sticker", label: "Sticker value", valueGetter: (row) => row.sticker },
    {
      key: "copies", label: "Copies", valueGetter: (row) => copies[row.id] ?? 1, sortable: false,
      render: (_value, row) => (
        <TextField size="small" type="number" value={copies[row.id] ?? 1}
          onChange={(e) => setCopies((current) => ({ ...current, [row.id]: Math.max(0, Math.min(500, Math.trunc(Number(e.target.value) || 0))) }))}
          slotProps={{ htmlInput: { min: 0, max: 500, "aria-label": `Copies for ${row.name}`, style: { width: 56, padding: "4px 6px" } } }} />
      ),
    },
  ], [copies]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <PageHeader
        onBack={() => navigate("/sales")}
        title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Employee Sticker" }]} />}
        actions={(
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            <ToggleButtonGroup size="small" exclusive value={printAs} onChange={(_e, value) => value && setCodeType(value)} aria-label="Print as">
              <ToggleButton value="code">QR code</ToggleButton>
              <ToggleButton value="barcode">Barcode</ToggleButton>
            </ToggleButtonGroup>
            <Button size="small" variant="outlined" startIcon={<Ruler size={15} />} onClick={() => setSizeOpen(true)} aria-label={`Sticker size, now ${sizeLabel}`}>
              Sticker size: {sizeLabel}
            </Button>
            <Button size="small" startIcon={<Eye size={15} />} disabled={!labels.length} onClick={() => void showPreview()}>Preview</Button>
            <Button variant="contained" size="small" startIcon={<Printer size={15} />} disabled={!labels.length || printing} onClick={() => void print()}>
              {printing ? "Printing..." : `Print${labels.length ? ` (${labels.length})` : ""}`}
            </Button>
          </Stack>
        )}
      />

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column", gap: 1 }}>
        <Alert severity="info" sx={{ py: 0 }}>
          Tick the salespeople and print their stickers. At the POS, scan the sticker in the Salesperson field after each item
          (switch it on in Sales Customisation) to credit the sale for incentives.
        </Alert>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            loading={loading}
            loadingText="Loading employees..."
            emptyText="No active employees in this store. Add them in HRMS > Employee."
            searchPlaceholder="Search employees..."
            tablePreferenceKey="sales.employee-sticker"
            showExport={false}
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
            enableSelection
            selectedRows={selected}
            onSelectionChange={setSelected}
            getRowSelectionLabel={(row) => `Select ${row.name}`}
          />
        </SearchGridPanel>
      </Box>

      {sizeOpen && (
        <EmployeeStickerSizeDialog open onClose={() => setSizeOpen(false)} saved={savedSize} product={productCustomization}
          storeId={authUser?.store_id} onSaved={setSavedSize} />
      )}

      <Dialog open={Boolean(preview)} onClose={() => setPreview("")} maxWidth="md" fullWidth aria-labelledby="sticker-preview-title">
        <DialogTitle id="sticker-preview-title">Sticker preview</DialogTitle>
        <DialogContent>
          <Box component="iframe" title="Employee sticker preview" srcDoc={preview} sx={{ width: "100%", height: 480, border: 1, borderColor: "divider", bgcolor: "#fff" }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview("")}>Close</Button>
          <Button variant="contained" startIcon={<Printer size={15} />} disabled={printing} onClick={() => { setPreview(""); void print(); }}>Print</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
