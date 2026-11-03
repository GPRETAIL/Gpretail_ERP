import PageHeader from "@/shared/components/PageHeader";
import useStoreDisplayName from "@/shared/hooks/useStoreDisplayName";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { Box, Stack, Typography, Button, alpha } from "@mui/material";
import { toast } from "react-toastify";
import useResetOnChange from "@/shared/hooks/useResetOnChange";
import SummaryLayoutsDrawer, { SummaryLayoutsButtons } from "@/shared/components/SummaryLayoutsDrawer";
import { daysAgoKey, fetchSummary, fetchSummaryLayouts, todayKey } from "@/shared/utils/reportSummary";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getAllRows = async (url) => {
  const res = await api.get(url, { params: { all: "true" } });
  return res.data?.data || [];
};

const buildReportMeta = (key, title) => ({ key, title });

/** Rows of a Warehouse Reports tab the backend builds (purchase orders, tax, sections, transfers, retail cover). */
const getWarehouseReportRows = (report) => getAllRows(`/warehouse-reports/data/${report}`);

const num = (digits = 0) => (value) => (
  <Box sx={{ textAlign: "right" }}>
    {value === null || value === undefined || value === "" ? "-" : toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}
  </Box>
);

const poLineColumns = [
  { key: "po_no", label: "PO no" },
  { key: "po_date", label: "PO date" },
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status" },
  { key: "product", label: "Item" },
  { key: "code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "ordered", label: "Ordered", render: num() },
  { key: "received", label: "Received", render: num() },
  { key: "pending", label: "Pending", render: num() },
  { key: "unit_cost", label: "Rate", render: num(2) },
  { key: "amount", label: "Amount", render: num(2) },
  { key: "pending_value", label: "Pending value", render: num(2) },
  { key: "expected_date", label: "Expected by" },
  { key: "receipts", label: "Received in" },
];

const poSummaryColumns = [
  { key: "po_no", label: "PO no" },
  { key: "po_date", label: "PO date" },
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status" },
  { key: "lines", label: "Lines", render: num() },
  { key: "ordered", label: "Ordered", render: num() },
  { key: "received", label: "Received", render: num() },
  { key: "pending", label: "Pending", render: num() },
  { key: "amount", label: "Amount", render: num(2) },
  { key: "expected_date", label: "Expected by" },
  { key: "receipts", label: "Received in" },
];

const purchaseTaxColumns = [
  { key: "date", label: "Date" },
  { key: "bill_no", label: "Bill no" },
  { key: "source", label: "Source" },
  { key: "supplier", label: "Supplier" },
  { key: "tax_name", label: "Tax" },
  { key: "rate", label: "Rate %", render: num(2) },
  { key: "taxable", label: "Taxable", render: num(2) },
  { key: "tax", label: "Tax amount", render: num(2) },
];

const purchaseTaxSummaryColumns = [
  { key: "rate", label: "Rate %", render: num(2) },
  { key: "bills", label: "Bills", render: num() },
  { key: "taxable", label: "Taxable", render: num(2) },
  { key: "tax", label: "Tax amount", render: num(2) },
  { key: "total", label: "Total", render: num(2) },
];

const sectionPurchaseColumns = [
  { key: "section", label: "Section" },
  { key: "product", label: "Item" },
  { key: "code", label: "Code" },
  { key: "barcodes", label: "Barcodes", render: num() },
  { key: "from_purchase", label: "From purchases", render: num() },
  { key: "from_entry", label: "From inventory entries", render: num() },
  { key: "price", label: "Price", render: num(2) },
  { key: "last_received", label: "Last received" },
];

const supplierPendingColumns = [
  { key: "invoice_no", label: "Bill no" },
  { key: "bill_type", label: "Type" },
  { key: "bill_date", label: "Date" },
  { key: "supplier_name", label: "Supplier" },
  { key: "total_amount", label: "Bill amount", render: num(2) },
  { key: "paid_amount", label: "Paid", render: num(2) },
  { key: "balance_due", label: "Balance due", render: num(2) },
  { key: "days", label: "Days", render: num() },
];

const supplierPaymentColumns = [
  { key: "payment_no", label: "Payment no" },
  { key: "pay_date", label: "Date" },
  { key: "supplier_name", label: "Supplier" },
  { key: "payment_mode", label: "Mode" },
  { key: "reference_no", label: "Reference" },
  { key: "amount", label: "Amount", render: num(2) },
  { key: "notes", label: "Notes" },
];

const sectionReturnColumns = [
  { key: "section", label: "Section" },
  { key: "returns", label: "Returns", render: num() },
  { key: "items", label: "Items", render: num() },
  { key: "qty", label: "Qty", render: num() },
  { key: "amount", label: "Amount", render: num(2) },
];

const cancelledReturnColumns = [
  { key: "return_no", label: "Return no" },
  { key: "return_date", label: "Date" },
  { key: "supplier", label: "Supplier" },
  { key: "reason", label: "Reason" },
  { key: "amount", label: "Amount", render: num(2) },
];

const outwardColumns = [
  { key: "outward_no", label: "Transfer no" },
  { key: "outward_date", label: "Date" },
  { key: "from_store", label: "From store" },
  { key: "to_store", label: "To store" },
  { key: "status", label: "Status" },
  { key: "lines", label: "Lines", render: num() },
  { key: "qty", label: "Sent qty", render: num() },
  { key: "received", label: "Received qty", render: num() },
  { key: "value", label: "Value", render: num(2) },
  { key: "dispatched_at", label: "Dispatched" },
  { key: "received_at", label: "Received" },
];

const outwardLineColumns = [
  { key: "outward_no", label: "Transfer no" },
  { key: "outward_date", label: "Date" },
  { key: "from_store", label: "From store" },
  { key: "to_store", label: "To store" },
  { key: "status", label: "Status" },
  { key: "product", label: "Item" },
  { key: "code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "design_no", label: "Design" },
  { key: "qty", label: "Sent", render: num() },
  { key: "received", label: "Received", render: num() },
  { key: "damaged", label: "Damaged", render: num() },
  { key: "unit_price", label: "Price", render: num(2) },
  { key: "value", label: "Value", render: num(2) },
];

const stockMovementColumns = [
  { key: "from_store", label: "From store" },
  { key: "to_store", label: "To store" },
  { key: "product", label: "Item" },
  { key: "code", label: "Code" },
  { key: "transfers", label: "Transfers", render: num() },
  { key: "sent", label: "Sent", render: num() },
  { key: "received", label: "Received", render: num() },
  { key: "in_transit", label: "In transit", render: num() },
  { key: "value", label: "Value", render: num(2) },
];

const retailStockColumns = [
  { key: "product", label: "Item" },
  { key: "code", label: "Code" },
  { key: "section", label: "Section" },
  { key: "stock", label: "In stock", render: num() },
  { key: "sold_30_days", label: "Sold (30 days)", render: num() },
  { key: "per_day", label: "Per day", render: num(2) },
  { key: "days_of_cover", label: "Days of cover", render: num() },
  { key: "stock_value", label: "Stock value (MRP)", render: num(2) },
  { key: "last_sale", label: "Last sale" },
  { key: "status", label: "Status" },
];

const stockAuditColumns = [
  { key: "audit_no", label: "Audit no" },
  { key: "audit_date", label: "Date" },
  { key: "status", label: "Audit status" },
  { key: "product_name", label: "Item" },
  { key: "product_code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "system_qty", label: "System qty", render: num() },
  { key: "counted_qty", label: "Counted qty", render: num() },
  { key: "difference_qty", label: "Difference", render: num() },
  { key: "difference_value", label: "Difference value", render: num(2) },
  { key: "result", label: "Result" },
];

const supplierMasterColumns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Supplier" },
  { key: "company_name", label: "Company" },
  { key: "gstin", label: "GSTIN" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "current_balance", label: "Balance", render: num(2) },
  { key: "active_label", label: "Status" },
];

const agentMasterColumns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Agent" },
  { key: "contact_person", label: "Contact person" },
  { key: "phone_no", label: "Phone" },
  { key: "gst", label: "GST" },
  { key: "commission", label: "Commission %", render: num(2) },
  { key: "active_label", label: "Status" },
];

const taxMasterColumns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Tax" },
  { key: "type", label: "Type" },
  { key: "rate", label: "Rate %", render: num(2) },
  { key: "cgst_rate", label: "CGST %", render: num(2) },
  { key: "sgst_rate", label: "SGST %", render: num(2) },
  { key: "igst_rate", label: "IGST %", render: num(2) },
  { key: "use_label", label: "Used for" },
  { key: "active_label", label: "Status" },
];

const activeLabel = (row) => (row?.is_active === false || row?.is_active === 0 ? "Inactive" : "Active");
const dayOnly = (value) => (value ? String(value).slice(0, 10) : "-");

const getDirectPurchaseItemSummary = (row) => {
  const items = Array.isArray(row?.items) ? row.items : [];

  return items.reduce(
    (acc, item) => {
      const qty = Math.max(0, parseInt(item?.qty, 10) || 0);
      const cost = Math.max(0, toNumber(item?.cost));
      const marginPerc = toNumber(item?.margin_perc ?? item?.marginPerc);
      const discount = Math.max(0, toNumber(item?.discount));
      const baseRate = round2(cost + (cost * marginPerc) / 100);
      const baseAmount = round2(baseRate * qty);
      const taxableAmount = round2(Math.max(0, baseAmount - discount));
      const amount = round2(toNumber(item?.amount) || taxableAmount);
      const tax = round2(Math.max(0, amount - taxableAmount));
      const gross = round2(amount + discount);

      return {
        gross: acc.gross + gross,
        tax: acc.tax + tax,
        total: acc.total + amount,
      };
    },
    { gross: 0, tax: 0, total: 0 }
  );
};

const buildInvoiceDetailRows = async () => {
  const invoices = await getAllRows("/invoices");
  return invoices.flatMap((invoice, index) =>
    (invoice.items || []).map((item, itemIndex) => ({
      id: `${invoice.id || index}-${itemIndex}`,
      invoice_no: invoice.invoice_no || "-",
      invoice_date: invoice.invoice_date || "",
      supplier: invoice.supplier?.name || "-",
      company: invoice.company?.name || "-",
      charge_type: item.type || "-",
      amount_on: toNumber(item.amount_on),
      dis_perc: toNumber(item.dis_perc),
      discount: toNumber(item.discount),
      tax_perc: toNumber(item.tax_perc ?? item.tax?.tax_percentage),
      tax_value: toNumber(item.tax_value),
      net_amount: toNumber(item.net_amount),
    }))
  );
};

const buildDirectPurchaseItemRows = async () => {
  const entries = await getAllRows("/direct-purchases");
  return entries.flatMap((entry, index) =>
    (entry.items || []).map((item, itemIndex) => ({
      id: `${entry.id || index}-${itemIndex}`,
      invoice_no: entry.invoice_no || "-",
      invoice_date: entry.invoice_date || "",
      supplier: entry.supplier?.name || "-",
      company: entry.company?.name || "-",
      product: item.product?.name || item.productName || item.product_name || "-",
      size: item.size || "-",
      hsn_code: item.hsnCode || item.hsn_code || "-",
      qty: Math.max(0, parseInt(item.qty, 10) || 0),
      cost: toNumber(item.cost),
      discount: toNumber(item.discount),
      price: toNumber(item.price),
      amount: toNumber(item.amount),
    }))
  );
};

const buildPhysicalStockRowsWithAsOnDate = async () => {
  const rows = await getAllRows("/barcodes/physical-stock");
  const asOnDate = formatDate(new Date().toISOString());
  return rows.map((row, index) => ({
    id: row.id || `stock-${index}`,
    as_on_date: asOnDate,
    ...row,
  }));
};

const buildItemLocatorRows = async () => {
  const [barcodes, transports, inventoryEntries, directPurchases, invoices] = await Promise.all([
    getAllRows("/barcodes"),
    getAllRows("/transport-entries"),
    getAllRows("/inventory-entries"),
    getAllRows("/direct-purchases"),
    getAllRows("/invoices"),
  ]);

  const completedTransportMap = new Map(
    transports.filter((row) => row.status === "completed").map((row) => [row.id, row])
  );
  const directPurchaseMap = new Map(directPurchases.map((row) => [row.id, row]));
  const invoiceMap = new Map();
  invoices.forEach((invoice) => {
    if (!invoiceMap.has(invoice.transport_entry_id)) {
      invoiceMap.set(invoice.transport_entry_id, invoice);
    }
  });

  const inventoryMap = new Map();
  inventoryEntries.forEach((entry) => {
    const itemMap = new Map((entry.items || []).map((item) => [item.id, item]));
    inventoryMap.set(entry.id, { ...entry, _itemMap: itemMap });
  });

  return barcodes
    .filter((row) => toNumber(row.qty) > 0)
    .filter((row) => {
      const fromTransport = !!row.transport_entry_id && completedTransportMap.has(row.transport_entry_id);
      const fromDirectPurchase = !!row.direct_purchase_id && directPurchaseMap.has(row.direct_purchase_id);
      return fromTransport || fromDirectPurchase;
    })
    .map((barcodeRow, index) => {
      const transport = completedTransportMap.get(barcodeRow.transport_entry_id);
      const directPurchase = directPurchaseMap.get(barcodeRow.direct_purchase_id);
      const invoice = barcodeRow.transport_entry_id
        ? invoiceMap.get(barcodeRow.transport_entry_id)
        : null;
      const inventoryEntry = inventoryMap.get(barcodeRow.inventory_entry_id);
      const inventoryItem = inventoryEntry?._itemMap?.get(barcodeRow.inventory_item_id);

      return {
        id: barcodeRow.id || `locator-${index}`,
        mode: "stock",
        barcode: barcodeRow.barcode || "-",
        batch: barcodeRow.batch_id || "-",
        source: barcodeRow.direct_purchase_id ? "Direct Purchase" : "Transport",
        company: transport?.company?.name || directPurchase?.company?.name || "-",
        supplier:
          transport?.supplier?.name ||
          directPurchase?.supplier?.name ||
          inventoryEntry?.supplier?.name ||
          "-",
        product: barcodeRow.product_name || inventoryEntry?.product?.name || "-",
        brand: inventoryEntry?.brand?.name || "-",
        colour: inventoryEntry?.color?.name || "-",
        material: inventoryEntry?.material?.name || "-",
        pattern: inventoryEntry?.pattern?.name || "-",
        style: inventoryEntry?.style?.name || "-",
        sleeve: inventoryEntry?.sleeve?.name || "-",
        fit: inventoryEntry?.fit?.name || "-",
        type: inventoryEntry?.type?.name || "-",
        size: barcodeRow.size || inventoryItem?.size || "-",
        section: transport?.section || directPurchase?.retail_location || "Direct Purchase",
        design: barcodeRow.design_no || inventoryItem?.design_no || "-",
        hsn: inventoryEntry?.hsn_code || "-",
        invoiceNo: invoice?.invoice_no || directPurchase?.invoice_no || "-",
        lrNo: transport?.lr_no || directPurchase?.lr_no || "-",
        qty: toNumber(barcodeRow.qty),
        stock: toNumber(barcodeRow.qty),
        cost: toNumber(barcodeRow.cost),
        sale: toNumber(barcodeRow.selling_price),
        net: toNumber(barcodeRow.final_price),
      };
    })
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
};

const transportReportColumns = [
  {
    key: "lr_entry_no",
    label: "LR Entry#",
    valueGetter: (row) => row.lr_entry_no || row.id,
  },
  {
    key: "lr_no",
    label: "LR No",
    valueGetter: (row) => row.lr_no || "-",
  },
  {
    key: "lr_date",
    label: "LR Date",
    valueGetter: (row) => row.lr_date || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.lr_date),
  },
  {
    key: "lr_mode",
    label: "LR Mode",
    valueGetter: (row) => row.lr_mode || "-",
  },
  {
    key: "supplier",
    label: "Supplier",
    valueGetter: (row) => row.supplier?.name || "-",
  },
  {
    key: "transport",
    label: "Transport",
    valueGetter: (row) => row.transport?.name || "-",
  },
  {
    key: "from_city",
    label: "From City",
    valueGetter: (row) => row.fromCity?.name || "-",
  },
  {
    key: "receiving_city",
    label: "Recv City",
    valueGetter: (row) => row.receivingCity?.name || "-",
  },
];

const invoiceReportColumns = [
  {
    key: "invoice_no",
    label: "Invoice No",
    valueGetter: (row) => row.invoice_no || "-",
  },
  {
    key: "invoice_date",
    label: "Invoice Date",
    valueGetter: (row) => row.invoice_date || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.invoice_date),
  },
  {
    key: "entry_date",
    label: "Entry Date",
    valueGetter: (row) => row.entry_date || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.entry_date),
  },
  {
    key: "company",
    label: "Company",
    valueGetter: (row) => row.company?.name || "-",
  },
  {
    key: "supplier",
    label: "Supplier",
    valueGetter: (row) => row.supplier?.name || "-",
  },
  {
    key: "bundles",
    label: "Bundles",
    valueGetter: (row) => Number(row.bundles || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "tax_charges",
    label: "Tax",
    valueGetter: (row) => Number(row.tax_charges || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
  },
  {
    key: "net_amount",
    label: "Net Amount",
    valueGetter: (row) => Number(row.net_amount || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
  },
];

const invoiceDetailColumns = [
  { key: "invoice_no", label: "Invoice No" },
  {
    key: "invoice_date",
    label: "Invoice Date",
    render: (value) => formatDate(value),
  },
  { key: "supplier", label: "Supplier" },
  { key: "charge_type", label: "Type" },
  {
    key: "amount_on",
    label: "Amount On",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "dis_perc",
    label: "Discount %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_value",
    label: "Tax Value",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "net_amount",
    label: "Net Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const whEntryReportColumns = [
  {
    key: "id",
    label: "ID",
    valueGetter: (row) => row.id,
  },
  {
    key: "supplier",
    label: "Supplier",
    valueGetter: (row) => row.supplier?.name || "-",
  },
  {
    key: "product",
    label: "Product",
    valueGetter: (row) => row.product?.name || "-",
  },
  {
    key: "brand",
    label: "Brand",
    valueGetter: (row) => row.brand?.name || "-",
  },
  {
    key: "hsn_code",
    label: "HSN",
    valueGetter: (row) => row.hsn_code || "-",
  },
  {
    key: "tax",
    label: "Tax",
    valueGetter: (row) => (row.tax ? `${row.tax.name} ${row.tax.tax_percentage}%` : "-"),
  },
  {
    key: "item_value",
    label: "Item Value",
    valueGetter: (row) => Number(row.item_value || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Total",
    valueGetter: (row) => Number(row.total || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
  },
  {
    key: "created_at",
    label: "Created",
    valueGetter: (row) => row.created_at || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.created_at),
  },
];

const purchaseReportColumns = [
  {
    key: "invoice_no",
    label: "Invoice No",
    valueGetter: (row) => row.invoice_no || "-",
  },
  {
    key: "invoice_date",
    label: "Invoice Date",
    valueGetter: (row) => row.invoice_date || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.invoice_date),
  },
  {
    key: "company",
    label: "Company",
    valueGetter: (row) => row.company?.name || "-",
  },
  {
    key: "supplier",
    label: "Supplier",
    valueGetter: (row) => row.supplier?.name || "-",
  },
  {
    key: "status",
    label: "Status",
    valueGetter: (row) => row.invoice_workflow_status || "-",
  },
  {
    key: "transport",
    label: "Transport",
    valueGetter: (row) => row.transport?.name || "-",
  },
  {
    key: "lr_no",
    label: "LR No",
    valueGetter: (row) => row.lr_no || "-",
  },
  {
    key: "bundles",
    label: "Bundles",
    valueGetter: (row) => Number(row.bundles || 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "gross",
    label: "Gross",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).gross,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax",
    label: "Tax",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).tax,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Total",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).total,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "created_at",
    label: "Created",
    valueGetter: (row) => row.created_at || "",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.created_at),
  },
];

const purchaseItemColumns = [
  { key: "invoice_no", label: "Invoice No" },
  {
    key: "invoice_date",
    label: "Invoice Date",
    render: (value) => formatDate(value),
  },
  { key: "supplier", label: "Supplier" },
  { key: "product", label: "Product" },
  { key: "size", label: "Size" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "price",
    label: "Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "amount",
    label: "Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const purchaseHsnColumns = [
  { key: "invoice_no", label: "Invoice No" },
  {
    key: "invoice_date",
    label: "Invoice Date",
    render: (value) => formatDate(value),
  },
  { key: "supplier", label: "Supplier" },
  { key: "hsn_code", label: "HSN" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "amount",
    label: "Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const purchaseReturnColumns = [
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
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "total_amount",
    label: "Amount",
    valueGetter: (row) => toNumber(row.total_amount),
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const stockReportColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "batch", label: "Batch" },
  { key: "company", label: "Company" },
  { key: "supplier", label: "Supplier" },
  { key: "product", label: "Product" },
  { key: "brand", label: "Brand" },
  { key: "colour", label: "Colour" },
  { key: "material", label: "Material" },
  { key: "pattern", label: "Pattern" },
  { key: "style", label: "Style" },
  { key: "size", label: "Size" },
  { key: "section", label: "Section" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "stock",
    label: "Stock",
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const stockAsonDateColumns = [
  {
    key: "as_on_date",
    label: "As On Date",
    render: (value) => value || "-",
  },
  ...stockReportColumns,
];

const warehouseStockAnalysisColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "product", label: "Product" },
  { key: "brand", label: "Brand" },
  { key: "supplier", label: "Supplier" },
  { key: "section", label: "Section" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const stockTransactionColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "source", label: "Source" },
  { key: "company", label: "Company" },
  { key: "supplier", label: "Supplier" },
  { key: "product", label: "Product" },
  { key: "invoiceNo", label: "Invoice No" },
  { key: "lrNo", label: "LR No" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const productMasterColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "product", label: "Product" },
  { key: "brand", label: "Brand" },
  { key: "colour", label: "Colour" },
  { key: "material", label: "Material" },
  { key: "pattern", label: "Pattern" },
  { key: "style", label: "Style" },
  { key: "type", label: "Type" },
  { key: "size", label: "Size" },
  { key: "design", label: "Design" },
  { key: "hsn", label: "HSN" },
];

const REPORT_DATA_SOURCES = {
  transport_report: {
    columns: transportReportColumns,
    fetchRows: () => getAllRows("/transport-entries"),
    emptyText: "No transport entries found.",
  },
  invoice_report: {
    summary: "invoice_lines",
    columns: invoiceReportColumns,
    fetchRows: () => getAllRows("/invoices"),
    emptyText: "No invoices found.",
  },
  invoice_detail_report: {
    summary: "invoice_lines",
    columns: invoiceDetailColumns,
    fetchRows: buildInvoiceDetailRows,
    emptyText: "No invoice detail rows found.",
  },
  wh_entry_report: {
    columns: whEntryReportColumns,
    fetchRows: () => getAllRows("/inventory-entries"),
    emptyText: "No inventory entries found.",
  },
  purchase_report: {
    summary: "direct_purchase_lines",
    columns: purchaseReportColumns,
    fetchRows: () => getAllRows("/direct-purchases"),
    emptyText: "No direct purchases found.",
  },
  purchase_items_report: {
    summary: "direct_purchase_lines",
    columns: purchaseItemColumns,
    fetchRows: buildDirectPurchaseItemRows,
    emptyText: "No purchase item rows found.",
  },
  purchase_hsn_report: {
    summary: "direct_purchase_lines",
    columns: purchaseHsnColumns,
    fetchRows: buildDirectPurchaseItemRows,
    emptyText: "No purchase HSN rows found.",
  },
  purchase_return_report: {
    summary: "purchase_returns",
    columns: purchaseReturnColumns,
    fetchRows: () => getAllRows("/purchase-returns"),
    emptyText: "No purchase returns found.",
  },
  stock_report: {
    summary: "stock",
    columns: stockReportColumns,
    fetchRows: () => getAllRows("/barcodes/physical-stock"),
    emptyText: "No stock rows found.",
  },
  warehouse_stock_analysis_report: {
    summary: "stock",
    columns: warehouseStockAnalysisColumns,
    fetchRows: () => getAllRows("/barcodes/physical-stock"),
    emptyText: "No warehouse stock analysis rows found.",
  },
  stock_ason_date: {
    summary: "stock",
    columns: stockAsonDateColumns,
    fetchRows: buildPhysicalStockRowsWithAsOnDate,
    emptyText: "No stock rows found for the selected date.",
  },
  stock_transactions: {
    columns: stockTransactionColumns,
    fetchRows: buildItemLocatorRows,
    emptyText: "No stock transaction rows found.",
  },
  product_master_report: {
    columns: productMasterColumns,
    fetchRows: buildItemLocatorRows,
    emptyText: "No product master rows found.",
  },
  invoice_vs_purchase_order: {
    summary: "po_lines",
    columns: poLineColumns,
    fetchRows: () => getWarehouseReportRows("po_lines"),
    emptyText: "No purchase orders yet.",
  },
  purchase_order_summary_report: {
    summary: "po_lines",
    columns: poSummaryColumns,
    fetchRows: () => getWarehouseReportRows("po_summary"),
    emptyText: "No purchase orders yet.",
  },
  purchase_order_detail_report: {
    summary: "po_lines",
    columns: poLineColumns,
    fetchRows: () => getWarehouseReportRows("po_lines"),
    emptyText: "No purchase orders yet.",
  },
  purchase_order_item_wise_pending: {
    summary: "po_lines",
    columns: poLineColumns,
    fetchRows: async () => (await getWarehouseReportRows("po_lines")).filter((row) => toNumber(row.pending) > 0),
    emptyText: "Nothing is pending on open purchase orders.",
  },
  purchase_tax_report: {
    summary: "direct_purchase_lines",
    columns: purchaseTaxColumns,
    fetchRows: () => getWarehouseReportRows("purchase_tax"),
    emptyText: "No purchase tax yet.",
  },
  purchase_tax_summary_report: {
    summary: "direct_purchase_lines",
    columns: purchaseTaxSummaryColumns,
    fetchRows: () => getWarehouseReportRows("purchase_tax_summary"),
    emptyText: "No purchase tax yet.",
  },
  purchase_report_barcode_section_wise: {
    summary: "direct_purchase_lines",
    columns: sectionPurchaseColumns,
    fetchRows: () => getWarehouseReportRows("section_purchase"),
    emptyText: "No barcodes yet.",
  },
  supplier_pending_bills: {
    summary: "direct_purchase_lines",
    columns: supplierPendingColumns,
    fetchRows: async () => (await getAllRows("/supplier-payments/pending")).map((row) => ({
      ...row, bill_type: row?.invoice_type === "direct" ? "Direct purchase" : "Purchase invoice", bill_date: dayOnly(row?.invoice_date),
    })),
    emptyText: "No pending supplier bills.",
  },
  supplier_payment_report: {
    columns: supplierPaymentColumns,
    fetchRows: async () => (await getAllRows("/supplier-payments")).map((row) => ({
      ...row, pay_date: dayOnly(row?.payment_date), supplier_name: row?.supplier?.name || row?.supplier_name || "-",
    })),
    emptyText: "No supplier payments yet.",
  },
  section_wise_purchase_return_report: {
    summary: "purchase_returns",
    columns: sectionReturnColumns,
    fetchRows: () => getWarehouseReportRows("section_returns"),
    emptyText: "No purchase returns yet.",
  },
  purchase_return_report_cancelled: {
    summary: "purchase_returns",
    columns: cancelledReturnColumns,
    fetchRows: () => getWarehouseReportRows("cancelled_returns"),
    emptyText: "No cancelled purchase returns.",
  },
  stock_movement_locationwise: {
    summary: "outward_lines",
    columns: stockMovementColumns,
    fetchRows: () => getWarehouseReportRows("stock_movement"),
    emptyText: "No stock has moved between stores yet.",
  },
  retail_stock_analysis_report: {
    summary: "stock",
    columns: retailStockColumns,
    fetchRows: () => getWarehouseReportRows("retail_stock"),
    emptyText: "No stock on hand.",
  },
  stock_audit_report: {
    summary: "stock",
    columns: stockAuditColumns,
    fetchRows: () => getAllRows("/sales-reports/store/stock_audit"),
    emptyText: "No physical stock audits yet.",
  },
  outward_report: {
    summary: "outward_lines",
    columns: outwardColumns,
    fetchRows: () => getWarehouseReportRows("outwards"),
    emptyText: "No transfers yet.",
  },
  outward_details_report: {
    summary: "outward_lines",
    columns: outwardLineColumns,
    fetchRows: () => getWarehouseReportRows("outward_lines"),
    emptyText: "No transfers yet.",
  },
  pending_inward_report: {
    summary: "outward_lines",
    columns: outwardColumns,
    fetchRows: () => getWarehouseReportRows("pending_inward"),
    emptyText: "Nothing is in transit to this store.",
  },
  pending_outward_report: {
    summary: "outward_lines",
    columns: outwardColumns,
    fetchRows: () => getWarehouseReportRows("pending_outward"),
    emptyText: "Nothing sent from this store is waiting to be received.",
  },
  supplier_master_report: {
    columns: supplierMasterColumns,
    fetchRows: async () => (await getAllRows("/suppliers")).map((row) => ({ ...row, active_label: activeLabel(row) })),
    emptyText: "No suppliers yet.",
  },
  agent_master_report: {
    columns: agentMasterColumns,
    fetchRows: async () => (await getAllRows("/agents")).map((row) => ({
      ...row, phone_no: row?.phone || row?.contact_no || "-", commission: row?.commission_pct ?? row?.commission_rate ?? null, active_label: activeLabel(row),
    })),
    emptyText: "No agents yet.",
  },
  tax_master_report: {
    columns: taxMasterColumns,
    fetchRows: async () => (await getAllRows("/taxes")).map((row) => ({
      ...row,
      use_label: [row?.is_sales_tax ? "Sales" : null, row?.is_purchase_tax ? "Purchase" : null].filter(Boolean).join(" & ") || "-",
      active_label: activeLabel(row),
    })),
    emptyText: "No taxes yet.",
  },
};

const REPORT_GROUPS = [
  {
    key: "transport_reports",
    title: "Transport Reports",
    displayCount: null,
    items: [
      buildReportMeta("transport_report", "Transport Report"),
    ],
  },
  {
    key: "invoice_reports",
    title: "Invoice Reports",
    displayCount: null,
    items: [
      buildReportMeta("invoice_report", "Invoice Report"),
      buildReportMeta("invoice_detail_report", "Invoice Detail Report"),
      buildReportMeta("wh_entry_report", "WH Entry Report"),
      buildReportMeta("invoice_vs_purchase_order", "Invoice Vs Purchase Order"),
    ],
  },
  {
    key: "purchase_reports",
    title: "Purchase Reports",
    displayCount: 10,
    items: [
      buildReportMeta("purchase_report", "Purchase Report"),
      buildReportMeta("purchase_items_report", "Purchase Items Report"),
      buildReportMeta("purchase_hsn_report", "Purchase HSN Report"),
      buildReportMeta("purchase_tax_report", "Purchase Tax Report"),
      buildReportMeta("purchase_tax_summary_report", "Purchase Tax Summary Report"),
      buildReportMeta("purchase_report_barcode_section_wise", "Purchase Report - Barcode wise Section wise Purchase Report"),
      buildReportMeta("supplier_pending_bills", "Supplier Pending Bills"),
      buildReportMeta("supplier_payment_report", "Supplier Payment Report"),
      buildReportMeta("transport_pending_bills", "Transport Pending Bills"),
      buildReportMeta("transport_payment_report", "Transport Payment Report"),
    ],
  },
  {
    key: "purchase_return_reports",
    title: "Purchase Return Reports",
    displayCount: 4,
    items: [
      buildReportMeta("purchase_return_report", "Purchase Return Report"),
      buildReportMeta("section_wise_purchase_return_report", "Section wise Purchase Return Report"),
      buildReportMeta("purchase_return_report_cancelled", "Purchase Return Report(Cancelled)"),
      buildReportMeta("purchase_return_audit_report", "Purchase Return Audit Report"),
    ],
  },
  {
    key: "stock_reports",
    title: "Stock Reports",
    displayCount: 9,
    items: [
      buildReportMeta("stock_report", "Stock Report"),
      buildReportMeta("stock_movement_locationwise", "Stock Movement - Locationwise"),
      buildReportMeta("warehouse_stock_analysis_report", "Warehouse Stock Analysis Report"),
      buildReportMeta("retail_stock_analysis_report", "Retail Stock Analysis Report"),
      buildReportMeta("stock_ason_date", "Stock - Ason Date"),
      buildReportMeta("stock_audit_report", "Stock Audit Report"),
      buildReportMeta("stock_transactions", "Stock - Transactions"),
      buildReportMeta("stock_depreciation", "Stock - Depreciation"),
    ],
  },
  {
    key: "purchase_order_reports",
    title: "Purchase Order Reports",
    displayCount: 5,
    items: [
      buildReportMeta("pending_purchase_request", "Pending Purchase Request"),
      buildReportMeta("cancelled_purchase_request", "Cancelled Purchase Request"),
      buildReportMeta("purchase_order_summary_report", "Purchase Order - Summary Report"),
      buildReportMeta("purchase_order_detail_report", "Purchase Order - Detail Report"),
      buildReportMeta("purchase_order_item_wise_pending", "Purchase Order - Item wise Pending"),
    ],
  },
  {
    key: "outward_reports",
    title: "Outward Reports",
    displayCount: 6,
    items: [
      buildReportMeta("outward_report", "Outward Report"),
      buildReportMeta("outward_details_report", "Outward Details Report"),
      buildReportMeta("pending_inward_report", "Pending Inward Report - Stock transferred to sale Location but not accepted."),
      buildReportMeta("pending_outward_report", "Pending Outward Report - Stock not transferred to sale Location."),
      buildReportMeta("job_work_outward_report", "Job Work Outward Report"),
      buildReportMeta("job_work_inward_report", "Job Work Inward Report"),
    ],
  },
  {
    key: "other_reports",
    title: "Other Reports",
    displayCount: 4,
    items: [
      buildReportMeta("product_master_report", "Product Master Report"),
      buildReportMeta("supplier_master_report", "Supplier Master Report"),
      buildReportMeta("agent_master_report", "Agent Master Report"),
      buildReportMeta("tax_master_report", "Tax Master Report"),
    ],
  },
];

const REPORT_GRID_COLUMNS = [
  [
    "transport_reports",
    "invoice_reports",
    "purchase_reports",
    "purchase_return_reports",
  ],
  [
    "stock_reports",
    "purchase_order_reports",
    "outward_reports",
    "other_reports",
  ],
];

const WarehouseReports = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const resolvedExportCompanyName = useStoreDisplayName(authUser);

  const groupLookup = useMemo(
    () => REPORT_GROUPS.reduce((acc, group) => ({ ...acc, [group.key]: group }), {}),
    []
  );

  const reportLookup = useMemo(() => {
    const reports = {};
    REPORT_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        reports[item.key] = {
          ...item,
          groupKey: group.key,
          groupTitle: group.title,
          implemented: Boolean(REPORT_DATA_SOURCES[item.key]),
        };
      });
    });
    return reports;
  }, []);

  const [expandedGroups, setExpandedGroups] = useState(() =>
    REPORT_GROUPS.reduce((acc, group) => ({ ...acc, [group.key]: false }), {})
  );
  const [selectedReportKey, setSelectedReportKey] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");



  const resolveExportCompanyTitle = useCallback((sourceRows = []) => {
    const uniqueNames = Array.from(
      new Set(
        (Array.isArray(sourceRows) ? sourceRows : [])
          .map((row) =>
            String(
              row?.company_name
              || row?.company?.name
              || row?.company
              || row?.store_name
              || ""
            ).trim()
          )
          .filter((value) => value && value !== "-")
      )
    );
    if (uniqueNames.length === 1) return uniqueNames[0];
    if (resolvedExportCompanyName) return resolvedExportCompanyName;
    if (uniqueNames.length > 0) return uniqueNames[0];
    return authUser?.company_id ? `Company ${authUser.company_id}` : "Company";
  }, [authUser, resolvedExportCompanyName]);

  const [summaryLayouts, setSummaryLayouts] = useState({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryForm, setSummaryForm] = useState(() => ({ mode: "", from: daysAgoKey(30), to: todayKey() }));
  const [appliedSummary, setAppliedSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  useEffect(() => {
    let active = true;
    fetchSummaryLayouts("/warehouse-reports/summary-layouts").then((layouts) => { if (active) setSummaryLayouts(layouts); }).catch(() => {});
    return () => { active = false; };
  }, []);
  // A summary belongs to the report it was made on.
  useResetOnChange([selectedReportKey], () => setAppliedSummary(null));

  const grid = useSearchGrid({ sourceRows: reportRows, paginationMode: "client", scopeKey: selectedReportKey });
  const { page, setPage, limit, setLimit } = grid;

  const selectedReport = selectedReportKey ? reportLookup[selectedReportKey] || null : null;
  const selectedReportSource = selectedReport ? REPORT_DATA_SOURCES[selectedReport.key] || null : null;
  const tabSummary = selectedReportSource?.summary ? summaryLayouts[selectedReportSource.summary] || null : null;
  const summaryOptions = tabSummary?.layouts || [];
  const tableRows = appliedSummary ? appliedSummary.rows : reportRows;
  const tableColumns = appliedSummary ? appliedSummary.columns : selectedReportSource?.columns || [];
  const openSummary = () => {
    setSummaryForm((prev) => (summaryOptions.some((opt) => opt.value === prev.mode) ? prev : { ...prev, mode: summaryOptions[0]?.value || "" }));
    setSummaryOpen(true);
  };
  const applySummary = async () => {
    setSummaryLoading(true);
    try {
      const summary = await fetchSummary("/warehouse-reports/summary", selectedReportSource.summary, {
        layout: summaryForm.mode,
        ...(tabSummary?.dated ? { from: summaryForm.from, to: summaryForm.to } : {}),
      });
      setAppliedSummary(summary);
      setSummaryOpen(false);
      setPage(1);
      toast.success(summary.capped ? `${summary.label} applied (largest groups shown)` : `${summary.label} applied`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadReportRows = async () => {
      if (!selectedReport) {
        setReportRows([]);
        setReportLoading(false);
        setReportError("");
        setPage(1);
        return;
      }

      if (!selectedReportSource) {
        setReportRows([]);
        setReportLoading(false);
        setReportError("This report is not connected yet.");
        setPage(1);
        return;
      }

      setReportRows([]);
      setReportLoading(true);
      setReportError("");
      setPage(1);
      try {
        const rows = await selectedReportSource.fetchRows();
        if (!cancelled) setReportRows(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!cancelled) {
          setReportRows([]);
          setReportError(
            err?.response?.data?.message || `Failed to load ${selectedReport.title.toLowerCase()}.`
          );
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };

    loadReportRows();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, selectedReportSource, setPage]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleSelectReport = (groupKey, reportKey) => {
    const report = reportLookup[reportKey];
    if (!report?.implemented) return;
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: true,
    }));
    setSelectedReportKey(reportKey);
  };

  const renderGroupCard = (group) => {
    const expanded = !!expandedGroups[group.key];
    const title = group.displayCount ? `${group.title} (${group.displayCount})` : group.title;

    return (
      <Box
        key={group.key}
        sx={{ overflow: "hidden", borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 }}
      >
        <Stack
          component="button"
          type="button"
          direction="row"
          onClick={() => toggleGroup(group.key)}
          sx={{ width: "100%", alignItems: "center", justifyContent: "space-between", gap: 2, borderLeft: "4px solid", borderLeftColor: "primary.main", bgcolor: "action.hover", px: 2, py: 1.5, textAlign: "left", cursor: "pointer", "&:hover": { bgcolor: "action.selected" } }}
        >
          <Typography component="span" sx={{ fontSize: { xs: 12.25, md: 15.75 }, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
            {title}
          </Typography>
          <Typography component="span" sx={{ fontSize: 17.5, fontWeight: 600, lineHeight: 1, color: "text.disabled" }}>
            {expanded ? "−" : "+"}
          </Typography>
        </Stack>

        {expanded ? (
          <Box sx={{ bgcolor: "background.paper", px: 2, py: 1.5 }}>
            <Stack spacing={0.75}>
              {group.items.map((item) => {
                const active = selectedReportKey === item.key;
                const implemented = Boolean(REPORT_DATA_SOURCES[item.key]);
                return (
                  <Stack
                    key={item.key}
                    component="button"
                    type="button"
                    direction="row"
                    spacing={1.5}
                    onClick={() => handleSelectReport(group.key, item.key)}
                    disabled={!implemented}
                    sx={(theme) => ({
                      width: "100%",
                      alignItems: "flex-start",
                      borderRadius: "3.5px",
                      px: 1,
                      py: 0.75,
                      textAlign: "left",
                      border: 0,
                      bgcolor: implemented && active ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent",
                      cursor: implemented ? "pointer" : "not-allowed",
                      opacity: implemented ? 1 : 0.55,
                      "&:hover": implemented ? { bgcolor: active ? undefined : "action.hover" } : undefined,
                    })}
                  >
                    <Typography component="span" sx={{ pt: 0.25, fontSize: 10.5, fontWeight: 700, color: implemented ? "primary.main" : "text.disabled" }}>
                      ◈
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: { xs: 12.25, md: 15.75 },
                        fontWeight: 600,
                        textDecoration: "underline",
                        textDecorationColor: "divider",
                        textUnderlineOffset: "4px",
                        color: implemented ? "primary.main" : "text.secondary",
                      }}
                    >
                      {item.title}
                      {!implemented ? " (Not available yet)" : ""}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        ) : null}
      </Box>
    );
  };

  return (
    <Box sx={{ height: "100%", minHeight: 0, bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      <PageHeader
        onBack={() => navigate("/warehouse")}
        backLabel="Back to warehouse"
        title={<>
          <Breadcrumbs
            items={
              selectedReport
                ? [
                    { label: "Warehouse", onClick: () => navigate("/warehouse") },
                    { label: "Reports", onClick: () => setSelectedReportKey("") },
                    { label: selectedReport.title },
                  ]
                : [
                    { label: "Warehouse", onClick: () => navigate("/warehouse") },
                    { label: "Reports" },
                  ]
            }
          />
        </>}
        actions={<>
          {selectedReport ? (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            {summaryOptions.length ? (
              <SummaryLayoutsButtons onOpen={openSummary} applied={Boolean(appliedSummary)} onReset={() => setAppliedSummary(null)} />
            ) : null}
            <Box sx={{ display: { xs: "none", md: "block" }, fontSize: 10.5, color: "text.secondary" }}>
              {reportLoading ? "Loading report..." : `${appliedSummary ? appliedSummary.rows.length : reportRows.length} row(s)`}
            </Box>
          </Stack>
        ) : null}
        </>}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflow: selectedReport ? "hidden" : "auto", p: selectedReport ? 0.75 : 2 }}>
        {selectedReport ? (
          <SearchGridPanel>
            <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider", pb: 1 }}>
              <Typography sx={{ fontSize: { xs: 12.25, md: 14 }, fontWeight: 600, color: "text.primary" }}>
                {selectedReport.title}
              </Typography>
              {appliedSummary ? (
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                  Showing <Box component="strong">{appliedSummary.label}</Box>
                  {appliedSummary.from ? <> for {appliedSummary.from} → {appliedSummary.to}</> : null}
                </Typography>
              ) : null}
            </Box>

            <FilterableDataTable
              key={`${selectedReport.key}${appliedSummary ? `_${appliedSummary.label}` : ""}`}
              rows={tableRows}
              columns={tableColumns}
              loading={reportLoading || summaryLoading}
              loadingText={`Loading ${selectedReport.title.toLowerCase()}...`}
              emptyText={
                reportError ||
                selectedReportSource?.emptyText ||
                `No ${selectedReport.title.toLowerCase()} records found.`
              }
              searchPlaceholder={`Search ${selectedReport.title.toLowerCase()}...`}
              exportFileName={`warehouse_report_${selectedReport.key}${appliedSummary ? `_${appliedSummary.label}` : ""}`}
              exportSheetName={selectedReport.title || "Warehouse Report"}
              exportTitle={resolvedExportCompanyName}
              exportTitleResolver={resolveExportCompanyTitle}
              exportSubtitle={appliedSummary ? `${selectedReport.title} — ${appliedSummary.label}${appliedSummary.from ? ` (${appliedSummary.from} → ${appliedSummary.to})` : ""}` : `${selectedReport.title} Report`}
              enableColumnResize
              tablePreferenceKey={`warehouse.reports.${selectedReport.key}${appliedSummary ? `.summary.${String(appliedSummary.label).replace(/\s+/g, "_")}` : ""}`}
              page={page}
              limit={limit}
              totalPages={Math.max(Math.ceil(tableRows.length / Math.max(limit, 1)), 1)}
              totalRows={tableRows.length}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              paginationMode="client"
            fillHeight
            />
            {summaryOptions.length ? (
              <SummaryLayoutsDrawer
                open={summaryOpen}
                onClose={() => setSummaryOpen(false)}
                options={summaryOptions}
                mode={summaryForm.mode}
                onModeChange={(mode) => setSummaryForm((prev) => ({ ...prev, mode }))}
                dated={Boolean(tabSummary?.dated)}
                from={summaryForm.from}
                to={summaryForm.to}
                onRangeChange={(range) => setSummaryForm((prev) => ({ ...prev, ...range }))}
                loading={summaryLoading}
                onApply={applySummary}
                name="warehouse_summary_mode"
              />
            ) : null}
          </SearchGridPanel>
        ) : (
          <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, p: { xs: 2, md: 2.5 } }}>
            <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider", pb: 1.5 }}>
              <Typography sx={{ fontSize: { xs: 14, md: 15.75 }, fontWeight: 600, color: "text.primary" }}>
                Warehouse Report Center
              </Typography>
              <Typography sx={{ fontSize: { xs: 10.5, md: 12.25 }, color: "text.secondary" }}>
                Open a report group and choose a report. Implemented warehouse modules will load
                live data here.
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, 1fr)" }, gap: 2.5 }}>
              {REPORT_GRID_COLUMNS.map((columnGroup, index) => (
                <Stack key={`column_${index}`} spacing={2.5}>
                  {columnGroup.map((groupKey) => renderGroupCard(groupLookup[groupKey]))}
                </Stack>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WarehouseReports;
