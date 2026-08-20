import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";

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
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "tax_charges",
    label: "Tax",
    valueGetter: (row) => Number(row.tax_charges || 0),
    render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
  },
  {
    key: "net_amount",
    label: "Net Amount",
    valueGetter: (row) => Number(row.net_amount || 0),
    render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "dis_perc",
    label: "Discount %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_value",
    label: "Tax Value",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "net_amount",
    label: "Net Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Total",
    valueGetter: (row) => Number(row.total || 0),
    render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "gross",
    label: "Gross",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).gross,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax",
    label: "Tax",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).tax,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Total",
    valueGetter: (row) => getDirectPurchaseItemSummary(row).total,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "price",
    label: "Price",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "amount",
    label: "Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "amount",
    label: "Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "total_amount",
    label: "Amount",
    valueGetter: (row) => toNumber(row.total_amount),
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const stockReportColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
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
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "stock",
    label: "Stock",
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
  },
  { key: "product", label: "Product" },
  { key: "brand", label: "Brand" },
  { key: "supplier", label: "Supplier" },
  { key: "section", label: "Section" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{Number(value || 0)}</div>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const stockTransactionColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "cost",
    label: "Cost",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "sale",
    label: "Sale",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const productMasterColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
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
      <div
        key={group.key}
        className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          className="flex w-full items-center justify-between gap-4 border-l-4 border-l-blue-500 bg-gray-100 px-4 py-3 text-left transition hover:bg-gray-200 dark:border-l-blue-400 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <span className="text-sm font-bold uppercase tracking-wide text-slate-700 md:text-[15px] dark:text-gray-300">
            {title}
          </span>
          <span className="text-xl font-semibold leading-none text-slate-500 dark:text-gray-400">
            {expanded ? "−" : "+"}
          </span>
        </button>

        {expanded ? (
          <div className="bg-white px-4 py-3 dark:bg-gray-800">
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const active = selectedReportKey === item.key;
                const implemented = Boolean(REPORT_DATA_SOURCES[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectReport(group.key, item.key)}
                    disabled={!implemented}
                    className={`flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition ${
                      implemented
                        ? active
                          ? "bg-blue-50 dark:bg-indigo-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        : "cursor-not-allowed opacity-55"
                    }`}
                  >
                    <span className={`pt-0.5 text-xs font-bold ${implemented ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                      ◈
                    </span>
                    <span
                      className={`text-sm font-semibold underline decoration-gray-300 underline-offset-4 md:text-[15px] dark:decoration-gray-600 ${
                        implemented
                          ? active
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {item.title}
                      {!implemented ? " (Not available yet)" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-100 text-gray-800 flex flex-col dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/warehouse")}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label="Back to warehouse"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex items-center gap-1 text-sm font-semibold md:text-base">
            {selectedReport ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/warehouse")}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Warehouse
                </button>
                <span className="text-gray-500 dark:text-gray-400">/</span>
                <button
                  type="button"
                  onClick={() => setSelectedReportKey("")}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Reports
                </button>
                <span className="text-gray-500 dark:text-gray-400">/</span>
                <span className="text-gray-700 dark:text-gray-300">{selectedReport.title}</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/warehouse")}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Warehouse
                </button>
                <span className="text-gray-500 dark:text-gray-400">/</span>
                <span>Reports</span>
              </>
            )}
          </h1>
        </div>

        {selectedReport ? (
          <div className="hidden text-xs text-gray-500 md:block dark:text-gray-400">
            {reportLoading ? "Loading report..." : `${reportRows.length} row(s)`}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {selectedReport ? (
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 border-b border-gray-100 pb-2 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-900 md:text-base dark:text-gray-100">
                {selectedReport.title}
              </div>
            </div>

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
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 border-b border-gray-100 pb-3 dark:border-gray-700">
              <div className="text-base font-semibold text-gray-900 md:text-lg dark:text-gray-100">
                Warehouse Report Center
              </div>
              <div className="text-xs text-gray-500 md:text-sm dark:text-gray-400">
                Open a report group and choose a report. Implemented warehouse modules will load
                live data here.
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {REPORT_GRID_COLUMNS.map((columnGroup, index) => (
                <div key={`column_${index}`} className="space-y-5">
                  {columnGroup.map((groupKey) => renderGroupCard(groupLookup[groupKey]))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseReports;
