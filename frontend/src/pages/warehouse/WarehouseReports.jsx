import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { Box, Stack, Typography, IconButton, Button, alpha } from "@mui/material";

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
  try {
    const res = await api.get(url, { params: { all: "true" } });
    return res.data?.data || [];
  } catch {
    const res = await api.get(url);
    return res.data?.data || [];
  }
};

const buildReportMeta = (key, title) => ({ key, title });

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
    columns: invoiceReportColumns,
    fetchRows: () => getAllRows("/invoices"),
    emptyText: "No invoices found.",
  },
  invoice_detail_report: {
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
    columns: purchaseReportColumns,
    fetchRows: () => getAllRows("/direct-purchases"),
    emptyText: "No direct purchases found.",
  },
  purchase_items_report: {
    columns: purchaseItemColumns,
    fetchRows: buildDirectPurchaseItemRows,
    emptyText: "No purchase item rows found.",
  },
  purchase_hsn_report: {
    columns: purchaseHsnColumns,
    fetchRows: buildDirectPurchaseItemRows,
    emptyText: "No purchase HSN rows found.",
  },
  purchase_return_report: {
    columns: purchaseReturnColumns,
    fetchRows: () => getAllRows("/purchase-returns"),
    emptyText: "No purchase returns found.",
  },
  stock_report: {
    columns: stockReportColumns,
    fetchRows: () => getAllRows("/barcodes/physical-stock"),
    emptyText: "No stock rows found.",
  },
  warehouse_stock_analysis_report: {
    columns: warehouseStockAnalysisColumns,
    fetchRows: () => getAllRows("/barcodes/physical-stock"),
    emptyText: "No warehouse stock analysis rows found.",
  },
  stock_ason_date: {
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
  const [resolvedExportCompanyName, setResolvedExportCompanyName] = useState(
    () => String(authUser?.company_name || "").trim()
  );

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

  useEffect(() => {
    let active = true;
    const fallbackName = String(authUser?.company_name || "").trim();
    if (fallbackName) {
      setResolvedExportCompanyName(fallbackName);
      return () => {
        active = false;
      };
    }

    const companyId = Number(authUser?.company_id || 0);
    if (!companyId) {
      setResolvedExportCompanyName("");
      return () => {
        active = false;
      };
    }

    const loadCompanyName = async () => {
      try {
        const res = await api.get(`/companies/${companyId}`);
        const companyName = String(res.data?.data?.name || res.data?.name || "").trim();
        if (active) setResolvedExportCompanyName(companyName);
      } catch {
        if (active) setResolvedExportCompanyName("");
      }
    };

    loadCompanyName();
    return () => {
      active = false;
    };
  }, [authUser?.company_id, authUser?.company_name]);

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
  }, [authUser?.company_id, resolvedExportCompanyName]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const selectedReport = selectedReportKey ? reportLookup[selectedReportKey] || null : null;
  const selectedReportSource = selectedReport ? REPORT_DATA_SOURCES[selectedReport.key] || null : null;

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
  }, [selectedReport, selectedReportSource]);

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
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1, boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse")} aria-label="Back to warehouse" sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: { xs: 12.25, md: 14 }, fontWeight: 600 }}>
            {selectedReport ? (
              <>
                <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: "inherit", fontWeight: 600 }}>
                  Warehouse
                </Button>
                <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
                <Button type="button" variant="text" onClick={() => setSelectedReportKey("")} sx={{ minWidth: "auto", p: 0, fontSize: "inherit", fontWeight: 600 }}>
                  Reports
                </Button>
                <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
                <Box component="span" sx={{ color: "text.secondary" }}>{selectedReport.title}</Box>
              </>
            ) : (
              <>
                <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: "inherit", fontWeight: 600 }}>
                  Warehouse
                </Button>
                <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
                <Box component="span">Reports</Box>
              </>
            )}
          </Stack>
        </Stack>

        {selectedReport ? (
          <Box sx={{ display: { xs: "none", md: "block" }, fontSize: 10.5, color: "text.secondary" }}>
            {reportLoading ? "Loading report..." : `${reportRows.length} row(s)`}
          </Box>
        ) : null}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
        {selectedReport ? (
          <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1, p: { xs: 1.5, md: 2 } }}>
            <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider", pb: 1 }}>
              <Typography sx={{ fontSize: { xs: 12.25, md: 14 }, fontWeight: 600, color: "text.primary" }}>
                {selectedReport.title}
              </Typography>
            </Box>

            <FilterableDataTable
              rows={reportRows}
              columns={selectedReportSource?.columns || []}
              loading={reportLoading}
              loadingText={`Loading ${selectedReport.title.toLowerCase()}...`}
              emptyText={
                reportError ||
                selectedReportSource?.emptyText ||
                `No ${selectedReport.title.toLowerCase()} records found.`
              }
              searchPlaceholder={`Search ${selectedReport.title.toLowerCase()}...`}
              exportFileName={`warehouse_report_${selectedReport.key}`}
              exportSheetName={selectedReport.title || "Warehouse Report"}
              exportTitle={resolvedExportCompanyName}
              exportTitleResolver={resolveExportCompanyTitle}
              exportSubtitle={`${selectedReport.title} Report`}
              enableColumnResize
              tablePreferenceKey={`warehouse.reports.${selectedReport.key}`}
              page={page}
              limit={limit}
              totalPages={Math.max(Math.ceil(reportRows.length / Math.max(limit, 1)), 1)}
              totalRows={reportRows.length}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              paginationMode="client"
            />
          </Box>
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
