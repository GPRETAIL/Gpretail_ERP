import PageHeader from "@/shared/components/PageHeader";
import useResetOnChange from "@/shared/hooks/useResetOnChange";
import useStoreDisplayName from "@/shared/hooks/useStoreDisplayName";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "@/shared/api/apiClient";
import ExportBottomSheet from "@/shared/components/ExportBottomSheet";
import SummaryLayoutsDrawer, { SummaryDateField, SummaryField, SummaryLayoutsButtons , SummaryPanelRow } from "@/shared/components/SummaryLayoutsDrawer";
import { fetchSummary, fetchSummaryLayouts } from "@/shared/utils/reportSummary";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { Box, Stack, Typography, TextField, MenuItem, alpha } from "@mui/material";
import { muiFieldSx } from "@/shared/theme/formControlSizes";

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDayKey = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Math.round(toNumber(value) * 100) / 100;

const buildReportMeta = (key, title) => ({ key, title });

const getAllRows = async (url, params = {}) => {
  const res = await api.get(url, { params: { ...params, all: "true" } });
  return res.data?.data || [];
};

const getSaleDate = (row) => row?.sale_date || row?.sale_at || row?.created_at || "";
const getSaleCustomerName = (row) => row?.customer_name || row?.customer?.name || "-";
const getSaleCustomerMobile = (row) => row?.customer_mobile || row?.customer?.phone || "-";
const getSaleItems = (row) => (Array.isArray(row?.items) ? row.items : []);
const getSaleBillNo = (row) => row?.bill_no || row?.invoice_no || row?.order_no || row?.bill?.bill_no || row?.id || "-";
const getSaleStatus = (row) =>
  String(
    row?.bill?.status
      || row?.status
      || (row?.bill?.is_canceled ? "cancelled" : row?.is_credit ? "credit" : row?.bill?.is_paid ? "paid" : "open")
  )
    .trim()
    .toLowerCase();

const getReportSales = async () => (await getAllRows("/pos-sales"))
  .filter(row => !["cancelled", "canceled", "returned"].includes(getSaleStatus(row)));

const getSalePaymentMode = (row) => {
  if (row?.is_credit) return "Credit";
  const payments = Array.isArray(row?.payments) ? row.payments : [];
  const modes = ["CASH", "CARD", "UPI"]
    .filter((mode) => payments.some((p) => p?.payment_mode === mode && toNumber(p?.amount) > 0))
    .map((mode) => mode.charAt(0) + mode.slice(1).toLowerCase());
  if (modes.length > 0) return modes.join(" + ");
  if (row?.payment_mode) return row.payment_mode;
  const status = getSaleStatus(row);
  return ["paid", "settled", "completed"].includes(status) ? "Paid" : status;
};

const getSaleSettledAmount = (row) => {
  const status = getSaleStatus(row);
  if (["cancelled", "canceled", "returned"].includes(status)) return 0;
  // PosSale already tracks exactly how much was collected - no need to
  // derive it from a "remaining_amount" field that doesn't exist anywhere
  // in the response.
  return Math.max(0, round2(row?.paid_amount));
};

const getSaleSummary = (row) => {
  const items = getSaleItems(row);
  const totalQty = items.reduce((sum, item) => sum + Math.max(0, toNumber(item?.quantity)), 0);
  const discount = round2(row?.discount_amount);
  // Shared by PosSale-backed reports (real field: grand_total) and
  // CustomerOrder-backed ones like Estimate Bill Report (real field:
  // net_amount) - both real column names, not a guess either way.
  const net = round2(row?.grand_total ?? row?.net_amount);
  const cost = items.reduce(
    (sum, item) => sum + Math.max(0, toNumber(item?.cost_price)) * Math.max(0, toNumber(item?.quantity)),
    0
  );
  return {
    lines: items.length,
    totalQty,
    // PosSale.subtotal is already net-of-discount (add it back for gross);
    // CustomerOrder has no subtotal field at all - its total_amount is
    // already the gross, pre-discount figure, so used as-is.
    gross: row?.subtotal !== undefined
      ? round2(toNumber(row.subtotal) + discount)
      : round2(toNumber(row?.total_amount)),
    discount,
    net,
    tax: round2(row?.tax_amount),
    margin: round2(net - toNumber(row?.tax_amount) - cost),
  };
};

const buildPosSaleItemRows = async () => {
  const rows = await getReportSales();
  return rows.flatMap((sale, saleIndex) =>
    getSaleItems(sale).map((item, itemIndex) => {
      const qty = Math.max(0, toNumber(item?.quantity));
      const price = Math.max(0, toNumber(item?.selling_price));
      const taxPerc = Math.max(0, toNumber(item?.tax_rate));
      const discount = round2(item?.discount);
      const taxAmount = round2(item?.tax_amount);
      // PosSaleItem.subtotal is already discount-and-tax-inclusive (the
      // full line total) - used directly as `total` rather than
      // recomputed, since it's the authoritative value from when the sale
      // was actually recorded. `subtotal` here is our own pre-tax,
      // net-of-discount figure for the report column of that name.
      const subtotal = round2(Math.max(qty * price - discount, 0));
      const total = round2(item?.subtotal ?? subtotal + taxAmount);
      const cost = Math.max(0, toNumber(item?.cost_price));
      const gross = round2(cost * qty);
      return {
        id: `${sale.id || saleIndex}-${itemIndex}`,
        sale_id: sale.id || null,
        bill_no: getSaleBillNo(sale),
        sale_at: getSaleDate(sale),
        customer_name: getSaleCustomerName(sale),
        customer_mobile: getSaleCustomerMobile(sale),
        barcode: item?.barcode?.barcode || "-",
        product_name: item?.product?.name || "-",
        hsn: item?.product?.hsn_code || "-",
        salesman_name: item?.sales_man_name || item?.salesManName || "Unassigned",
        qty,
        price,
        subtotal,
        tax_perc: taxPerc,
        tax_amount: taxAmount,
        discount,
        total,
        gross,
        margin: round2(total - taxAmount - gross),
      };
    })
  );
};

const buildApprovedSalesOnApprovalRows = async () => {
  const rows = await getAllRows("/sales-on-approval", { status: "approved" });
  return rows
    .filter((row) => String(row?.status || "").trim().toLowerCase() === "approved")
    .map((row) => {
      const summary = getSaleSummary(row);
      return {
        ...row,
        bill_no: getSaleBillNo(row),
        sale_at: getSaleDate(row),
        customer_name: getSaleCustomerName(row),
        customer_mobile: getSaleCustomerMobile(row),
        total_qty: summary.totalQty,
        gross_value: summary.gross,
        total_discount: summary.discount,
        tax_amount: summary.tax,
        amount: round2(row?.amount),
        payment_mode: "Approval",
        report_status: "approved",
      };
    });
};

const buildCompanyNameMap = async () => {
  const rows = await getAllRows("/companies", { limit: 500, includeInactive: true });
  return new Map(
    rows.map((row) => [String(row?.id || ""), String(row?.name || "").trim() || `Company ${row?.id}`])
  );
};

const buildCompanyWiseSaleCollectionRows = async () => {
  const [rows, companyNameMap] = await Promise.all([
    getReportSales(),
    buildCompanyNameMap(),
  ]);

  return rows.map((row) => {
    const companyId = row?.store_id ?? null;
    const companyName =
      companyNameMap.get(String(companyId || ""))
      || `Company ${companyId || "-"}`;
    const summary = getSaleSummary(row);

    return {
      ...row,
      company_name: companyName,
      line_count: summary.lines,
      total_qty: summary.totalQty,
      gross_value: summary.gross,
      total_discount: summary.discount,
      amount: summary.net,
    };
  });
};

const buildSalesHsnRows = async () => {
  const itemRows = await buildPosSaleItemRows();

  const grouped = new Map();
  itemRows.forEach((row) => {
    const hsn = row.hsn;
    if (!grouped.has(hsn)) {
      grouped.set(hsn, {
        id: hsn,
        hsn,
        bills: new Set(),
        qty: 0,
        taxable_amount: 0,
        discount: 0,
        tax_amount: 0,
        total: 0,
      });
    }

    const entry = grouped.get(hsn);
    entry.bills.add(row.bill_no);
    entry.qty += toNumber(row.qty);
    entry.taxable_amount += toNumber(row.subtotal);
    entry.discount += toNumber(row.discount);
    entry.tax_amount += toNumber(row.tax_amount);
    entry.total += toNumber(row.total);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      bill_count: row.bills.size,
      taxable_amount: round2(row.taxable_amount),
      discount: round2(row.discount),
      tax_amount: round2(row.tax_amount),
      total: round2(row.total),
    }))
    .sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));
};

const buildSalesmanSummaryRows = async () => {
  const itemRows = await buildPosSaleItemRows();
  const grouped = new Map();

  itemRows.forEach((row) => {
    const key = String(row.salesman_name || "Unassigned").trim() || "Unassigned";
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        salesman_name: key,
        lines: 0,
        bills: new Set(),
        qty: 0,
        gross: 0,
        discount: 0,
        tax_amount: 0,
        total: 0,
        margin: 0,
      });
    }

    const entry = grouped.get(key);
    entry.lines += 1;
    entry.bills.add(row.bill_no);
    entry.qty += row.qty;
    entry.gross += row.gross;
    entry.discount += row.discount;
    entry.tax_amount += row.tax_amount;
    entry.total += row.total;
    entry.margin += row.margin;
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      bill_count: row.bills.size,
      gross: round2(row.gross),
      discount: round2(row.discount),
      tax_amount: round2(row.tax_amount),
      total: round2(row.total),
      margin: round2(row.margin),
    }))
    .sort((a, b) => String(a.salesman_name).localeCompare(String(b.salesman_name)));
};

const buildSalesTaxSummaryRows = async () => {
  const itemRows = await buildPosSaleItemRows();
  const grouped = new Map();

  itemRows.forEach((row) => {
    const key = String(row.tax_perc);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        tax_perc: row.tax_perc,
        bills: new Set(),
        qty: 0,
        taxable_amount: 0,
        discount: 0,
        tax_amount: 0,
        total: 0,
      });
    }

    const entry = grouped.get(key);
    entry.bills.add(row.bill_no);
    entry.qty += row.qty;
    entry.taxable_amount += row.subtotal;
    entry.discount += row.discount;
    entry.tax_amount += row.tax_amount;
    entry.total += row.total;
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      bill_count: row.bills.size,
      taxable_amount: round2(row.taxable_amount),
      discount: round2(row.discount),
      tax_amount: round2(row.tax_amount),
      total: round2(row.total),
    }))
    .sort((a, b) => b.tax_perc - a.tax_perc);
};

const buildDaySummaryRows = async () => {
  const rows = await getReportSales();
  const grouped = new Map();

  rows.forEach((sale) => {
    const key = formatDayKey(getSaleDate(sale));
    if (!key) return;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: key,
        sale_date: getSaleDate(sale),
        bill_count: 0,
        customer_count: new Set(),
        qty: 0,
        gross: 0,
        discount: 0,
        tax_amount: 0,
        net: 0,
      });
    }

    const entry = grouped.get(key);
    const summary = getSaleSummary(sale);
    entry.bill_count += 1;
    entry.customer_count.add(getSaleCustomerName(sale));
    entry.qty += summary.totalQty;
    entry.gross += summary.gross;
    entry.discount += summary.discount;
    entry.tax_amount += summary.tax;
    entry.net += summary.net;
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      customer_count: row.customer_count.size,
      gross: round2(row.gross),
      discount: round2(row.discount),
      tax_amount: round2(row.tax_amount),
      net: round2(row.net),
    }))
    .sort((a, b) => String(b.day_key).localeCompare(String(a.day_key)));
};

const buildCashOpeningClosingRows = async () => {
  const [openings, closings] = await Promise.all([
    getAllRows("/cash-openings"),
    getAllRows("/cash-closings"),
  ]);

  const grouped = new Map();
  const getKey = (row) => `${row.store_id || ""}__${row.id}`;

  // CashRegisterSession has no counter/location/paidBy/receivedBy - those
  // stay "-" honestly rather than reading relations that don't exist;
  // `user` is the one real relation available, used for the cashier name.
  openings.forEach((row) => {
    const dayKey = formatDayKey(row?.opened_at || row?.created_at);
    const counterName = "-";
    const key = getKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: dayKey,
        event_date: row?.opened_at || row?.created_at || "",
        location_name: "-",
        counter_name: counterName,
        opening_amount: 0,
        closing_bill_no: "-",
        closing_amount: 0,
        difference: 0,
        paid_by: "-",
        received_by: "-",
        cashier_name: "-",
      });
    }

    const entry = grouped.get(key);
    entry.opening_amount = round2(toNumber(row?.opening_cash));
    entry.cashier_name = row?.user?.name || entry.cashier_name;
    entry.event_date = row?.opened_at || entry.event_date;
  });

  closings.forEach((row) => {
    const dayKey = formatDayKey(row?.closed_at || row?.created_at);
    const counterName = "-";
    const key = getKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: dayKey,
        event_date: row?.closed_at || row?.created_at || "",
        location_name: "-",
        counter_name: counterName,
        opening_amount: 0,
        closing_bill_no: "-",
        closing_amount: 0,
        difference: 0,
        paid_by: "-",
        received_by: "-",
        cashier_name: "-",
      });
    }

    const entry = grouped.get(key);
    entry.closing_amount = round2(toNumber(row?.closing_cash));
    entry.difference = round2(toNumber(row?.difference));
    entry.cashier_name = row?.user?.name || entry.cashier_name;
    entry.event_date = row?.closed_at || entry.event_date;
    if (!entry.opening_amount && toNumber(row?.opening_cash) > 0) {
      entry.opening_amount = round2(row?.opening_cash);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => String(b.day_key).localeCompare(String(a.day_key)));
};

const buildDayEndSettlementSummaryRows = async () => {
  const rows = await getAllRows("/cash-closings");
  const grouped = new Map();

  rows.forEach((row) => {
    const key = formatDayKey(row?.closed_at || row?.created_at);
    if (!key) return;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: key,
        closing_date: row?.closed_at || row?.created_at || "",
        bill_count: 0,
        counters: new Set(),
        cashiers: new Set(),
        opening_amount: 0,
        closing_amount: 0,
        difference: 0,
      });
    }

    const entry = grouped.get(key);
    entry.bill_count += 1;
    entry.counters.add("-");
    entry.cashiers.add(row?.user?.name || "-");
    entry.opening_amount += round2(row?.opening_cash);
    entry.closing_amount += round2(row?.closing_cash);
    entry.difference += round2(row?.difference);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      counter_count: row.counters.size,
      cashier_count: row.cashiers.size,
      opening_amount: round2(row.opening_amount),
      closing_amount: round2(row.closing_amount),
      difference: round2(row.difference),
    }))
    .sort((a, b) => String(b.day_key).localeCompare(String(a.day_key)));
};

const buildCashierSettlementSummaryRows = async () => {
  const rows = await getAllRows("/cash-closings");
  const grouped = new Map();

  rows.forEach((row) => {
    const key = String(row?.user?.name || "Unassigned");
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        cashier_name: key,
        bill_count: 0,
        counters: new Set(),
        opening_amount: 0,
        closing_amount: 0,
        difference: 0,
      });
    }

    const entry = grouped.get(key);
    entry.bill_count += 1;
    entry.counters.add("-");
    entry.opening_amount += round2(row?.opening_cash);
    entry.closing_amount += round2(row?.closing_cash);
    entry.difference += round2(row?.difference);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      counter_count: row.counters.size,
      opening_amount: round2(row.opening_amount),
      closing_amount: round2(row.closing_amount),
      difference: round2(row.difference),
    }))
    .sort((a, b) => String(a.cashier_name).localeCompare(String(b.cashier_name)));
};

const buildSalesVsStockRows = async () => {
  const [saleItems, stockRows] = await Promise.all([
    buildPosSaleItemRows(),
    getAllRows("/barcodes/physical-stock"),
  ]);

  const soldByBarcode = new Map();
  saleItems.forEach((row) => {
    const key = String(row.barcode || "").trim();
    if (!key) return;
    const existing = soldByBarcode.get(key) || {
      sold_qty: 0,
      sold_value: 0,
      product_name: row.product_name || "-",
    };
    existing.sold_qty += row.qty;
    existing.sold_value += row.total;
    existing.product_name = row.product_name || existing.product_name;
    soldByBarcode.set(key, existing);
  });

  const stockByBarcode = new Map();
  stockRows.forEach((row) => {
    const key = String(row?.barcode || "").trim();
    if (!key) return;
    stockByBarcode.set(key, {
      current_stock: Math.max(0, toNumber(row?.qty)),
      product_name: row?.product_name || row?.productName || row?.product || "-",
      sale_price: round2(row?.selling_price || row?.final_price),
    });
  });

  const allBarcodes = new Set([...soldByBarcode.keys(), ...stockByBarcode.keys()]);
  return Array.from(allBarcodes)
    .map((barcode, index) => {
      const sold = soldByBarcode.get(barcode) || { sold_qty: 0, sold_value: 0, product_name: "-" };
      const stock = stockByBarcode.get(barcode) || { current_stock: 0, product_name: sold.product_name || "-", sale_price: 0 };
      return {
        id: `${barcode}-${index}`,
        barcode,
        product_name: stock.product_name || sold.product_name || "-",
        sold_qty: sold.sold_qty,
        current_stock: stock.current_stock,
        total_available: sold.sold_qty + stock.current_stock,
        sold_value: round2(sold.sold_value),
        sale_price: round2(stock.sale_price),
      };
    })
    .sort((a, b) => String(a.barcode).localeCompare(String(b.barcode)));
};

const buildCustomerRows = async (inactiveOnly = false) => {
  const rows = await getAllRows("/customers", inactiveOnly ? { includeInactive: "true" } : {});
  return rows
    .filter((row) => (inactiveOnly ? !row?.is_active : true))
    .map((row) => ({
      ...row,
      customer_type: row?.customer_type || "-",
      customer_category: row?.customerCategory?.name || "-",
      city_name: row?.city || "-",
      state_name: row?.state || "-",
      mobile_no: row?.phone || "-",
      active_label: row?.is_active ? "Active" : "Inactive",
    }));
};

const buildSalesReturnRows = async () => (await getAllRows("/pos-returns")).map((row) => ({
  ...row,
  return_no_display: row?.display_return_no || row?.return_no || "-",
  return_day: formatDayKey(row?.return_date),
  customer_name: row?.customer?.name || "-",
  mobile_no: row?.customer?.phone || "-",
  bill_no: row?.pos_sale?.invoice_no || row?.posSale?.invoice_no || (row?.standalone ? "Without bill" : "-"),
  qty: (Array.isArray(row?.items) ? row.items : []).reduce((sum, item) => sum + toNumber(item?.quantity), 0),
  refund: toNumber(row?.total_refund),
  reason: row?.return_reason_name || "-",
}));

const buildDealerDocumentRows = async (url, noField, dateField) => (await getAllRows(url)).map((row) => ({
  ...row,
  doc_no: row?.[noField] || "-",
  doc_day: formatDayKey(row?.[dateField]),
  customer_name: row?.customer_name || "-",
  qty: toNumber(row?.total_qty),
  amount: toNumber(row?.amount ?? row?.grand_total),
  status_label: row?.cancelled_at ? "Cancelled" : row?.status || "-",
}));

/** Rows of a Sales Reports tab the backend builds (stock batches, audits, loyalty, incentives) for the store. */
const getStoreReportRows = (report) => getAllRows(`/sales-reports/store/${report}`);

/**
 * Customers whose birthday (date_of_birth) or wedding anniversary (marriage_date) comes up next, soonest first,
 * so the store can send wishes. Customers without the date are left out.
 */
const buildCustomerOccasionRows = async (field) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (await getAllRows("/customers"))
    .filter((row) => row?.[field] && !Number.isNaN(new Date(row[field]).getTime()))
    .map((row) => {
      const date = new Date(row[field]);
      let next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      if (next < today) next = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
      return {
        ...row,
        mobile_no: row?.phone || "-",
        occasion_date: formatDayKey(row[field]),
        next_date: formatDayKey(next),
        days_to_go: Math.round((next - today) / 86400000),
        years: next.getFullYear() - date.getFullYear(),
      };
    })
    .sort((a, b) => a.days_to_go - b.days_to_go);
};

const buildMyCustomerSalesRows = async () => {
  const rows = await getReportSales();
  const grouped = new Map();

  rows.forEach((sale, index) => {
    const customerId = sale?.customer_id ?? sale?.customer?.id ?? "";
    const customerName = getSaleCustomerName(sale);
    const customerMobile = getSaleCustomerMobile(sale);
    const normalizedCustomerName = String(customerName || "").trim().toLowerCase();
    const isWalkingCustomer =
      !customerId
      && (normalizedCustomerName === "" || normalizedCustomerName === "walking customer");
    if (isWalkingCustomer) return;
    const fallbackCustomerKey = `${customerName || "Walking Customer"}__${customerMobile || "-"}`;
    const groupKey = String(customerId || fallbackCustomerKey || `customer_${index}`).trim();
    const summary = getSaleSummary(sale);
    const items = getSaleItems(sale);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        id: groupKey,
        customer_id: customerId || null,
        customer_name: customerName,
        mobile_no: customerMobile,
        bills: new Set(),
        products: new Set(),
        total_qty: 0,
        total_amount: 0,
        last_sale_at: "",
      });
    }

    const entry = grouped.get(groupKey);
    entry.bills.add(getSaleBillNo(sale));
    items.forEach((item) => {
      const productName = String(item?.product_name || "").trim();
      if (productName) entry.products.add(productName);
    });
    entry.total_qty += summary.totalQty;
    entry.total_amount += summary.net;

    const currentDate = new Date(getSaleDate(sale)).getTime();
    const savedDate = new Date(entry.last_sale_at || 0).getTime();
    if (!entry.last_sale_at || currentDate > savedDate) {
      entry.last_sale_at = getSaleDate(sale);
    }
  });

  return Array.from(grouped.values())
    .map((row) => {
      const productList = Array.from(row.products.values());
      return {
        ...row,
        bill_count: row.bills.size,
        bill_numbers: Array.from(row.bills.values()).join(", "),
        product_count: row.products.size,
        product_names: productList.join(", "),
        total_qty: round2(row.total_qty),
        total_amount: round2(row.total_amount),
      };
    })
    .sort((a, b) => String(a.customer_name || "").localeCompare(String(b.customer_name || "")));
};

const buildEmployeeRows = async () => {
  const rows = await getAllRows("/employees");
  return rows.map((row) => ({
    ...row,
    employee_name: row?.name || "-",
    employee_code: row?.code || "-",
    contact_no: row?.phone || "-",
    email_id: row?.email || "-",
    active_label: row?.is_active ? "Active" : "Inactive",
  }));
};

const buildStockRows = async () => {
  const rows = await getAllRows("/barcodes/physical-stock");
  return rows.map((row, index) => ({
    id: row?.id || `stock-${index}`,
    barcode: row?.barcode || "-",
    product_name: row?.product_name || row?.productName || row?.product || "-",
    qty: Math.max(0, toNumber(row?.qty)),
    cost: round2(row?.cost),
    sale_price: round2(row?.selling_price || row?.final_price),
    batch: row?.batch_no || "-",
    size: row?.size || "-",
    design_no: row?.design_no || "-",
  }));
};

const buildDirectPurchaseItemRowsForSalesReport = async () => {
  const entries = await getAllRows("/direct-purchases");
  return entries.flatMap((entry, index) =>
    (entry.items || []).map((item, itemIndex) => ({
      id: `${entry.id || index}-${itemIndex}`,
      invoice_no: entry.invoice_no || "-",
      invoice_date: entry.invoice_date || "",
      product_name: item.product?.name || item.productName || item.product_name || "-",
      hsn_code: item.hsnCode || item.hsn_code || "-",
      qty: Math.max(0, parseInt(item.qty, 10) || 0),
      cost: toNumber(item.cost),
      price: toNumber(item.price),
      amount: toNumber(item.amount),
    }))
  );
};

const buildSalesVsPurchaseVsStockRows = async () => {
  const [saleItems, purchaseItems, stockRows, productRows] = await Promise.all([
    buildPosSaleItemRows(),
    buildDirectPurchaseItemRowsForSalesReport(),
    getAllRows("/barcodes/physical-stock"),
    getAllRows("/products", { limit: 500 }),
  ]);

  const productMetaMap = new Map();
  productRows.forEach((row) => {
    const key = String(row?.name || "").trim().toLowerCase();
    if (!key) return;
    productMetaMap.set(key, {
      hsn: String(row?.hsn || "").trim() || "-",
    });
  });

  const grouped = new Map();
  const ensureEntry = (productName, hsn = "-") => {
    const normalizedName = String(productName || "").trim();
    const normalizedHsn = String(hsn || "-").trim() || "-";
    const key = `${normalizedName.toLowerCase()}__${normalizedHsn}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        product_name: normalizedName || "-",
        hsn: normalizedHsn,
        purchase_bills: new Set(),
        sale_bills: new Set(),
        purchase_qty: 0,
        purchase_amount: 0,
        purchase_cost_total: 0,
        sold_qty: 0,
        sold_amount: 0,
        stock_qty: 0,
        stock_cost_total: 0,
        stock_sale_price_total: 0,
      });
    }

    return grouped.get(key);
  };

  purchaseItems.forEach((row) => {
    const productName = row.product_name || "-";
    const fallbackHsn = productMetaMap.get(String(productName || "").trim().toLowerCase())?.hsn || "-";
    const entry = ensureEntry(productName, row.hsn_code || fallbackHsn);
    entry.purchase_bills.add(row.invoice_no || row.id);
    entry.purchase_qty += toNumber(row.qty);
    entry.purchase_amount += toNumber(row.amount);
    entry.purchase_cost_total += toNumber(row.cost) * toNumber(row.qty);
  });

  saleItems.forEach((row) => {
    const productName = row.product_name || "-";
    const fallbackHsn = productMetaMap.get(String(productName || "").trim().toLowerCase())?.hsn || "-";
    const entry = ensureEntry(productName, fallbackHsn);
    entry.sale_bills.add(row.bill_no || row.id);
    entry.sold_qty += toNumber(row.qty);
    entry.sold_amount += toNumber(row.total);
  });

  stockRows.forEach((row) => {
    const productName = row?.product_name || row?.productName || row?.product || "-";
    const fallbackHsn = productMetaMap.get(String(productName || "").trim().toLowerCase())?.hsn || "-";
    const entry = ensureEntry(productName, fallbackHsn);
    const qty = toNumber(row?.qty);
    entry.stock_qty += qty;
    entry.stock_cost_total += toNumber(row?.cost) * qty;
    entry.stock_sale_price_total += toNumber(row?.selling_price || row?.final_price) * qty;
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      purchase_bill_count: row.purchase_bills.size,
      sale_bill_count: row.sale_bills.size,
      purchase_amount: round2(row.purchase_amount),
      sold_amount: round2(row.sold_amount),
      avg_purchase_cost: row.purchase_qty > 0 ? round2(row.purchase_cost_total / row.purchase_qty) : 0,
      avg_sale_price: row.stock_qty > 0 ? round2(row.stock_sale_price_total / row.stock_qty) : 0,
      stock_cost_value: round2(row.stock_cost_total),
    }))
    .sort((a, b) => String(a.product_name).localeCompare(String(b.product_name)));
};

const salesReportColumns = [
  { key: "bill_no", label: "Bill No", valueGetter: (row) => getSaleBillNo(row) },
  {
    key: "sale_at",
    label: "Date",
    valueGetter: (row) => getSaleDate(row),
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(getSaleDate(row)),
  },
  { key: "customer_name", label: "Customer", valueGetter: (row) => getSaleCustomerName(row) },
  { key: "customer_mobile", label: "Mobile", valueGetter: (row) => getSaleCustomerMobile(row) },
  { key: "payment_mode", label: "Payment", valueGetter: (row) => getSalePaymentMode(row) },
  { key: "status", label: "Status", valueGetter: (row) => getSaleStatus(row) },
  {
    key: "line_count",
    label: "Lines",
    valueGetter: (row) => getSaleSummary(row).lines,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "total_qty",
    label: "Qty",
    valueGetter: (row) => getSaleSummary(row).totalQty,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "gross_value",
    label: "Gross",
    valueGetter: (row) => getSaleSummary(row).gross,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total_discount",
    label: "Discount",
    valueGetter: (row) => getSaleSummary(row).discount,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "amount",
    label: "Net",
    valueGetter: (row) => getSaleSummary(row).net,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const companyWiseSaleCollectionColumns = [
  { key: "company_name", label: "Company", valueGetter: (row) => row?.company_name || "-" },
  ...salesReportColumns,
  { key: "collected", label: "Collected", valueGetter: getSaleSettledAmount, render: value => numCell(value) },
];

const salesMarginColumns = [
  ...salesReportColumns,
  {
    key: "margin",
    label: "Margin",
    valueGetter: (row) => getSaleSummary(row).margin,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const salesVsSettlementColumns = [
  ...salesReportColumns,
  {
    key: "settled_amount",
    label: "Amount Settled",
    valueGetter: (row) => getSaleSettledAmount(row),
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const unsettledBillColumns = [
  { key: "bill_no", label: "Bill No", render: (_, row) => getSaleBillNo(row) },
  { key: "payment_mode", label: "Sale Type", render: (_, row) => (row?.is_credit ? "Credit" : row?.payment_mode || "-") },
  { key: "status", label: "Status" },
  {
    key: "amount",
    label: "Amount",
    render: (_, row) => <Box sx={{ textAlign: "right" }}>{toNumber(row?.grand_total).toFixed(2)}</Box>,
  },
  {
    key: "discount_amount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "remaining_amount",
    label: "Remaining",
    render: (_, row) => (
      <Box sx={{ textAlign: "right" }}>{Math.max(0, toNumber(row?.remaining_amount ?? (toNumber(row?.grand_total) - toNumber(row?.paid_amount)))).toFixed(2)}</Box>
    ),
  },
];

const saleItemColumns = [
  { key: "bill_no", label: "Bill No" },
  {
    key: "sale_at",
    label: "Date",
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(row.sale_at),
  },
  { key: "customer_name", label: "Customer" },
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "product_name", label: "Product" },
  { key: "salesman_name", label: "Salesman" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "price",
    label: "Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const salesmanSummaryColumns = [
  { key: "salesman_name", label: "Salesman" },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "lines",
    label: "Lines",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "gross",
    label: "Gross",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "margin",
    label: "Margin",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Net",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const daySummaryColumns = [
  {
    key: "sale_date",
    label: "Date",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.sale_date),
  },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "customer_count",
    label: "Customers",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "gross",
    label: "Gross",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const settlementOpeningClosingColumns = [
  {
    key: "event_date",
    label: "Date",
    render: (value) => formatDate(value),
    searchValue: (row) => formatDate(row.event_date),
  },
  { key: "location_name", label: "Location" },
  { key: "counter_name", label: "Counter" },
  { key: "cashier_name", label: "Cashier" },
  { key: "paid_by", label: "Paid By" },
  { key: "received_by", label: "Received By" },
  { key: "closing_bill_no", label: "Closing Bill" },
  {
    key: "opening_amount",
    label: "Opening",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "closing_amount",
    label: "Closing",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "difference",
    label: "Difference",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const taxSummaryColumns = [
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "taxable_amount",
    label: "Taxable",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const rightNumber = (digits = 0) => (value) => (
  <Box sx={{ textAlign: "right" }}>{value === null || value === undefined || value === "" ? "-" : toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}</Box>
);

const salesReturnColumns = [
  { key: "return_no_display", label: "Return no" },
  { key: "return_day", label: "Date" },
  { key: "customer_name", label: "Customer" },
  { key: "mobile_no", label: "Mobile" },
  { key: "bill_no", label: "Bill no" },
  { key: "qty", label: "Qty", render: rightNumber() },
  { key: "refund", label: "Refund", render: rightNumber(2) },
  { key: "refund_mode", label: "Refund mode" },
  { key: "reason", label: "Reason" },
];

const dealerDocumentColumns = (noLabel, dateLabel) => [
  { key: "doc_no", label: noLabel },
  { key: "doc_day", label: dateLabel },
  { key: "customer_name", label: "Dealer" },
  { key: "qty", label: "Qty", render: rightNumber() },
  { key: "amount", label: "Amount", render: rightNumber(2) },
  { key: "status_label", label: "Status" },
];

const occasionColumns = (dateLabel, yearsLabel) => [
  { key: "name", label: "Customer" },
  { key: "mobile_no", label: "Mobile" },
  { key: "occasion_date", label: dateLabel },
  { key: "next_date", label: "Next on" },
  { key: "days_to_go", label: "Days to go", render: rightNumber() },
  { key: "years", label: yearsLabel, render: rightNumber() },
];

const stockAgingColumns = [
  { key: "product_name", label: "Item" },
  { key: "product_code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "design_no", label: "Design" },
  { key: "source", label: "Received from" },
  { key: "received_at", label: "Received on" },
  { key: "received_qty", label: "Received qty", render: rightNumber() },
  { key: "remaining_qty", label: "In stock", render: rightNumber() },
  { key: "cost_price", label: "Cost", render: rightNumber(2) },
  { key: "stock_value", label: "Stock value", render: rightNumber(2) },
  { key: "age_days", label: "Age (days)", render: rightNumber() },
  { key: "age_bucket", label: "Age group" },
];

const shelfPeriodColumns = [
  { key: "product_name", label: "Item" },
  { key: "product_code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "design_no", label: "Design" },
  { key: "stock_qty", label: "In stock", render: rightNumber() },
  { key: "stock_value", label: "Stock value", render: rightNumber(2) },
  { key: "oldest_received", label: "Oldest received" },
  { key: "latest_received", label: "Latest received" },
  { key: "days_on_shelf", label: "Days on shelf", render: rightNumber() },
  { key: "shelf_period", label: "Shelf period (days)", render: rightNumber() },
  { key: "shelf_status", label: "Status" },
];

const stockAuditColumns = [
  { key: "audit_no", label: "Audit no" },
  { key: "audit_date", label: "Date" },
  { key: "status", label: "Audit status" },
  { key: "product_name", label: "Item" },
  { key: "product_code", label: "Code" },
  { key: "size", label: "Size" },
  { key: "system_qty", label: "System qty", render: rightNumber() },
  { key: "counted_qty", label: "Counted qty", render: rightNumber() },
  { key: "difference_qty", label: "Difference", render: rightNumber() },
  { key: "difference_value", label: "Difference value", render: rightNumber(2) },
  { key: "result", label: "Result" },
  { key: "notes", label: "Notes" },
];

const loyaltyRedemptionColumns = [
  { key: "redeemed_at", label: "Redeemed on" },
  { key: "customer_name", label: "Customer" },
  { key: "mobile_no", label: "Mobile" },
  { key: "card_no", label: "Card no" },
  { key: "bill_no", label: "Bill no" },
  { key: "bill_amount", label: "Bill amount", render: rightNumber(2) },
  { key: "points", label: "Points redeemed", render: rightNumber() },
  { key: "amount", label: "Redeemed value", render: rightNumber(2) },
  { key: "balance_after", label: "Points left", render: rightNumber() },
];

const incentiveEmployeeColumns = [
  { key: "month", label: "Month" },
  { key: "employee_code", label: "Employee code" },
  { key: "employee_name", label: "Employee" },
  { key: "section", label: "Section" },
  { key: "bills", label: "Bills", render: rightNumber() },
  { key: "qty", label: "Qty", render: rightNumber() },
  { key: "net_sales", label: "Net sales", render: rightNumber(2) },
  { key: "incentive_pct", label: "Incentive %", render: rightNumber(2) },
  { key: "incentive_amount", label: "Incentive", render: rightNumber(2) },
];

const incentiveSectionColumns = [
  { key: "month", label: "Month" },
  { key: "section", label: "Section" },
  { key: "employees", label: "Employees", render: rightNumber() },
  { key: "bills", label: "Bills", render: rightNumber() },
  { key: "qty", label: "Qty", render: rightNumber() },
  { key: "net_sales", label: "Net sales", render: rightNumber(2) },
  { key: "incentive_amount", label: "Incentive", render: rightNumber(2) },
];

/** The employee incentive rows added up per month and section. */
const buildIncentiveSectionRows = async () => {
  const grouped = new Map();
  (await getStoreReportRows("incentives")).forEach((row) => {
    const key = `${row.month}|${row.section}`;
    const current = grouped.get(key) || { month: row.month, section: row.section, employees: 0, bills: 0, qty: 0, net_sales: 0, incentive_amount: 0 };
    current.employees += 1;
    current.bills += toNumber(row.bills);
    current.qty += toNumber(row.qty);
    current.net_sales = round2(current.net_sales + toNumber(row.net_sales));
    current.incentive_amount = round2(current.incentive_amount + toNumber(row.incentive_amount));
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => b.month.localeCompare(a.month) || b.incentive_amount - a.incentive_amount);
};

const customerColumns = [
  { key: "name", label: "Customer" },
  { key: "code", label: "Code" },
  { key: "mobile_no", label: "Mobile" },
  { key: "customer_type", label: "Type" },
  { key: "customer_category", label: "Category" },
  { key: "city_name", label: "City" },
  { key: "state_name", label: "State" },
  { key: "active_label", label: "Status" },
];

const myCustomerSalesColumns = [
  { key: "customer_name", label: "Customer" },
  { key: "mobile_no", label: "Mobile" },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  { key: "bill_numbers", label: "Bill Numbers" },
  {
    key: "product_count",
    label: "Products",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  { key: "product_names", label: "Product Names" },
  {
    key: "total_qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "total_amount",
    label: "Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "last_sale_at",
    label: "Last Sale",
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(row.last_sale_at),
  },
];

const deliveryReportColumns = [
  { key: "order_no", label: "Order No" },
  {
    key: "created_at",
    label: "Date",
    render: (value, row) => formatDateTime(value || row?.updated_at),
    searchValue: (row) => formatDateTime(row.created_at || row.updated_at),
  },
  { key: "customer_name", label: "Customer", valueGetter: (row) => row.customer_name || row.customer?.name || "-" },
  { key: "customer_mobile", label: "Mobile", valueGetter: (row) => row.customer_mobile || row.customer?.phone || "-" },
  { key: "location", label: "Location", valueGetter: () => "-" },
  { key: "counter", label: "Counter", valueGetter: () => "-" },
  {
    key: "total_qty",
    label: "Qty",
    // CustomerOrder has no aggregate qty column - summed from its items.
    valueGetter: (row) =>
      (Array.isArray(row?.items) ? row.items : []).reduce((sum, item) => sum + Math.max(0, toNumber(item?.quantity)), 0),
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "total_amount",
    label: "Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  { key: "received_by", label: "Received By", valueGetter: () => "-" },
];

const salesHsnColumns = [
  { key: "hsn", label: "HSN" },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "taxable_amount",
    label: "Taxable",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const stockColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "product_name", label: "Product" },
  { key: "batch", label: "Batch" },
  { key: "size", label: "Size" },
  { key: "design_no", label: "Design" },
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
    key: "sale_price",
    label: "Sale",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const salesVsStockColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value || "-"}</Box>,
  },
  { key: "product_name", label: "Product" },
  {
    key: "sold_qty",
    label: "Sold Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "current_stock",
    label: "Current Stock",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "total_available",
    label: "Total Flow",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "sale_price",
    label: "Sale Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "sold_value",
    label: "Sold Value",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const salesVsPurchaseVsStockColumns = [
  { key: "product_name", label: "Product" },
  { key: "hsn", label: "HSN" },
  {
    key: "purchase_bill_count",
    label: "Purchase Bills",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "purchase_qty",
    label: "Purchased Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "purchase_amount",
    label: "Purchase Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "sold_qty",
    label: "Sold Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "sold_amount",
    label: "Sales Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "stock_qty",
    label: "Stock Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "avg_purchase_cost",
    label: "Avg Cost",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "avg_sale_price",
    label: "Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "stock_cost_value",
    label: "Stock Value",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const cashierWiseDiscountColumns = [
  { key: "cashier_name", label: "Cashier" },
  { key: "bill_no", label: "Bill No" },
  {
    key: "sale_at",
    label: "Date",
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(row.sale_at),
  },
  { key: "customer_name", label: "Customer" },
  {
    key: "bill_amount_before_discount",
    label: "Bill Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total_discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount_percentage",
    label: "Discount %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}%</Box>,
  },
  {
    key: "amount",
    label: "Net Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const billerWiseDiscountColumns = [
  { key: "bill_no", label: "Bill No" },
  {
    key: "sale_at",
    label: "Date",
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(row.sale_at),
  },
  { key: "customer_name", label: "Customer" },
  { key: "cashier_name", label: "Cashier" },
  {
    key: "bill_amount_before_discount",
    label: "Bill Price",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "total_discount",
    label: "Discount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
  {
    key: "discount_percentage",
    label: "Discount %",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}%</Box>,
  },
  {
    key: "amount",
    label: "Net Amount",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
  },
];

const buildCashierWiseDiscountRows = async () => {
  const rows = await getReportSales();
  return rows
    .filter((row) => toNumber(row?.discount_amount) > 0)
    .map((row) => {
      const totalDiscount = round2(row?.discount_amount);
      const billAmountBeforeDiscount = round2(toNumber(row?.grand_total) + totalDiscount);
      const discountPercentage = billAmountBeforeDiscount > 0
        ? round2((totalDiscount / billAmountBeforeDiscount) * 100)
        : 0;

      return {
        ...row,
        cashier_name: String(row?.user?.name || "Unknown").trim() || "Unknown",
        bill_no: getSaleBillNo(row),
        sale_at: getSaleDate(row),
        customer_name: getSaleCustomerName(row),
        bill_amount_before_discount: billAmountBeforeDiscount,
        total_discount: totalDiscount,
        discount_percentage: discountPercentage,
        amount: round2(row?.grand_total),
      };
    })
    .sort((a, b) => String(a.cashier_name).localeCompare(String(b.cashier_name)) || String(b.bill_no).localeCompare(String(a.bill_no)));
};

const employeeColumns = [
  { key: "employee_code", label: "Employee Code" },
  { key: "employee_name", label: "Employee" },
  { key: "contact_no", label: "Contact" },
  { key: "email_id", label: "Email" },
  { key: "active_label", label: "Status" },
];

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Aggregate views for the Sales Report only (opens from “Summary layouts” panel). */
const SALES_SUMMARY_MODE_OPTIONS = [
  { value: "location_summary", label: "LOCATION SUMMARY" },
  { value: "company_summary", label: "COMPANY SUMMARY" },
  { value: "date_summary", label: "DATE SUMMARY" },
  { value: "bill_summary", label: "BILL SUMMARY" },
  { value: "gst_bill_summary", label: "GST BILL SUMMARY" },
  { value: "bill_tax_summary", label: "BILL/TAX SUMMARY" },
  { value: "bill_detail", label: "BILL DETAIL" },
  { value: "day_metrics", label: "DAY SUMMARY" },
  { value: "discount_bills", label: "DISCOUNT BILLS SUMMARY" },
];

const numCell = (value) => (
  <Box sx={{ textAlign: "right" }}>
    {typeof value === "string" ? value : toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </Box>
);

const INT_SUMMARY_COLUMNS = [
  {
    key: "s_no",
    label: "S.No",
    valueGetter: (row) => row.s_no ?? "-",
    render: (value) => <Box sx={{ textAlign: "center" }}>{value}</Box>,
  },
  {
    key: "location_name",
    label: "Location",
    valueGetter: (row) => row.location_name || "-",
    render: (_, row) => (row.id === "__total__" ? <Box component="span" sx={{ fontWeight: 700 }}>Total</Box> : row.location_name || "-"),
  },
  {
    key: "company",
    label: "Company",
    valueGetter: (row) => row.company || "-",
    render: (_, row) => (row.id === "__total__" ? <Box component="span" sx={{ fontWeight: 700 }}>Total</Box> : row.company || "-"),
  },
  {
    key: "sale_date",
    label: "Date",
    valueGetter: (row) => row.sale_date || "",
    render: (value, row) => {
      if (row?.id === "__total__") return <Box component="span" sx={{ fontWeight: 700 }}>Total</Box>;
      return formatDate(value ? `${value}T12:00:00` : "");
    },
  },
  {
    key: "sale_qty",
    label: "Sale Qty",
    valueGetter: (row) => row.sale_qty,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  {
    key: "discount",
    label: "Discount",
    valueGetter: (row) => row.discount,
    render: (value) => numCell(value),
  },
  {
    key: "addnl_discount",
    label: "Addln. Discount",
    valueGetter: (row) => row.addnl_discount,
    render: (value) => numCell(value),
  },
  {
    key: "taxable_amount",
    label: "Taxable Amount",
    valueGetter: (row) => row.taxable_amount,
    render: (value) => numCell(value),
  },
  {
    key: "sale_tax",
    label: "Sale Tax",
    valueGetter: (row) => row.sale_tax,
    render: (value) => numCell(value),
  },
  {
    key: "rounding",
    label: "Rounding",
    valueGetter: (row) => row.rounding,
    render: (value) => numCell(value),
  },
  {
    key: "net_amount",
    label: "Net Amount",
    valueGetter: (row) => row.net_amount,
    render: (value) => numCell(value),
  },
];

const BILL_SUMMARY_COLUMNS = [
  {
    key: "s_no",
    label: "S.No",
    valueGetter: (row) => row.s_no ?? "-",
    render: (value) => <Box sx={{ textAlign: "center" }}>{value}</Box>,
  },
  {
    key: "bill_no",
    label: "Bill No",
    valueGetter: (row) => (row.bill_no != null ? `SB/${row.bill_no}` : "-"),
  },
  {
    key: "sale_at",
    label: "Date",
    render: (value) => formatDateTime(value),
    searchValue: (row) => formatDateTime(row.sale_at),
  },
  { key: "customer_name", label: "Customer" },
  {
    key: "gst_id",
    label: "GST No",
    valueGetter: (row) => row.gst_id || "—",
  },
  {
    key: "sale_qty",
    label: "Qty",
    valueGetter: (row) => row.sale_qty,
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  { key: "discount", label: "Discount", render: (value) => numCell(value), valueGetter: (row) => row.discount },
  { key: "addnl_discount", label: "Addln. Discount", render: (value) => numCell(value), valueGetter: (row) => row.addnl_discount },
  { key: "taxable_amount", label: "Taxable", render: (value) => numCell(value), valueGetter: (row) => row.taxable_amount },
  { key: "sale_tax", label: "Tax", render: (value) => numCell(value), valueGetter: (row) => row.sale_tax },
  { key: "rounding", label: "Rounding", render: (value) => numCell(value), valueGetter: (row) => row.rounding },
  { key: "net_amount", label: "Net", render: (value) => numCell(value), valueGetter: (row) => row.net_amount },
  { key: "payment", label: "Payment" },
];

const DISCOUNT_ONLY_BILL_COLUMNS = [
  INT_SUMMARY_COLUMNS[0],
  BILL_SUMMARY_COLUMNS[1],
  BILL_SUMMARY_COLUMNS[2],
  BILL_SUMMARY_COLUMNS[3],
  {
    key: "total_discount",
    label: "Line discount",
    valueGetter: (row) => row.total_discount,
    render: (value) => numCell(value),
  },
  INT_SUMMARY_COLUMNS[6],
  INT_SUMMARY_COLUMNS[10],
];

const DAY_METRICS_COLUMNS = [
  { key: "detail", label: "Detail", valueGetter: (row) => row.detail },
  {
    key: "value",
    label: "Value",
    valueGetter: (row) => row.value,
    render: (_, row) =>
      typeof row?.value === "number" ? (
        <Box sx={{ textAlign: "right", fontWeight: 500 }}>{toNumber(row.value).toLocaleString("en-IN")}</Box>
      ) : (
        <Box sx={{ textAlign: "right" }}>{row?.value ?? "—"}</Box>
      ),
  },
];

const BILL_DETAIL_LINE_COLUMNS = [
  { key: "bill_no", label: "Bill", valueGetter: (row) => (row.bill_no != null ? `SB/${row.bill_no}` : "-") },
  {
    key: "sale_at",
    label: "Sale time",
    render: (_, row) => formatDateTime(row.sale_at),
  },
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>{value}</Box>,
  },
  { key: "product_name", label: "Product" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
  },
  { key: "price", label: "Price", render: (value) => numCell(value) },
  { key: "tax_perc", label: "Tax %", render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box> },
  { key: "discount", label: "Discount", render: (value) => numCell(value) },
  { key: "total", label: "Line total", render: (value) => numCell(value) },
  { key: "bill_status", label: "Bill status" },
];

function buildSalesSummaryColumns(mode) {
  switch (mode) {
    case "location_summary":
      return [INT_SUMMARY_COLUMNS[0], INT_SUMMARY_COLUMNS[1]].concat(INT_SUMMARY_COLUMNS.slice(4));
    case "company_summary":
      return [INT_SUMMARY_COLUMNS[0], INT_SUMMARY_COLUMNS[2]].concat(INT_SUMMARY_COLUMNS.slice(4));
    case "date_summary":
      return [INT_SUMMARY_COLUMNS[0], INT_SUMMARY_COLUMNS[3]].concat(INT_SUMMARY_COLUMNS.slice(4));
    case "bill_summary":
      return BILL_SUMMARY_COLUMNS.filter((c) => c.key !== "gst_id");
    case "gst_bill_summary":
      return BILL_SUMMARY_COLUMNS.filter((c) => c.key !== "payment");
    case "bill_tax_summary":
      return BILL_SUMMARY_COLUMNS.filter((c) => !["gst_id", "payment"].includes(c.key));
    case "discount_bills":
      return DISCOUNT_ONLY_BILL_COLUMNS.filter(Boolean);
    case "bill_detail":
      return BILL_DETAIL_LINE_COLUMNS;
    case "day_metrics":
      return DAY_METRICS_COLUMNS;
    default:
      return INT_SUMMARY_COLUMNS;
  }
}

const REPORT_DATA_SOURCES = {
  sales_return_report: {
    summary: "pos_returns",
    columns: salesReturnColumns,
    fetchRows: buildSalesReturnRows,
    emptyText: "No sales returns found.",
  },
  dealer_invoice_report: {
    summary: "dealer_lines",
    columns: dealerDocumentColumns("Invoice no", "Invoice date"),
    fetchRows: () => buildDealerDocumentRows("/dealer-invoices", "bill_no", "invoice_date"),
    emptyText: "No dealer invoices found.",
  },
  dealer_return_report: {
    summary: "dealer_returns",
    columns: dealerDocumentColumns("Return no", "Return date"),
    fetchRows: () => buildDealerDocumentRows("/dealer-invoice-returns", "return_no", "return_date"),
    emptyText: "No dealer returns found.",
  },
  sales_report: {
    columns: salesReportColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No POS sales found.",
  },
  unsettled_bill_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      return getAllRows("/settlements/unpaid-bills", { status: "open" });
    },
    emptyText: "No unsettled sales bills found.",
  },
  sales_report_salesman_wise: {
    summary: "sale_lines",
    columns: salesmanSummaryColumns,
    fetchRows: buildSalesmanSummaryRows,
    emptyText: "No salesman wise sales rows found.",
  },
  sales_report_salesman_wise_detail: {
    summary: "sale_lines",
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No salesman detail rows found.",
  },
  sales_report_margin: {
    summary: "sale_lines",
    columns: salesMarginColumns,
    fetchRows: getReportSales,
    emptyText: "No sales margin rows found.",
  },
  sales_report_invoice_wise: {
    summary: "sale_lines",
    columns: salesReportColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No invoice wise sales rows found.",
  },
  sales_report_barcode_wise: {
    summary: "sale_lines",
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No barcode wise sales rows found.",
  },
  cancelled_sales_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      return getAllRows("/settlements/unpaid-bills", { status: "canceled" });
    },
    emptyText: "No cancelled sales found.",
  },
  approved_bill_report: {
    columns: salesReportColumns,
    fetchRows: buildApprovedSalesOnApprovalRows,
    emptyText: "No approved sales on approval bills found.",
  },
  delivery_report: {
    columns: deliveryReportColumns,
    fetchRows: () => getAllRows("/customer-orders"),
    emptyText: "No delivery rows found.",
  },
  day_summary_report: {
    summary: "sale_lines",
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No day summary rows found.",
  },
  day_end_settlement_summary: {
    columns: daySummaryColumns.map((column) => {
      if (column.key === "sale_date") {
        return {
          ...column,
          key: "closing_date",
          render: (value) => formatDate(value),
          searchValue: (row) => formatDate(row.closing_date),
        };
      }
      return column;
    }).filter((column) => column.key !== "tax_amount" && column.key !== "net").concat([
      {
        key: "opening_amount",
        label: "Opening",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
      {
        key: "difference",
        label: "Difference",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
    ]),
    fetchRows: buildDayEndSettlementSummaryRows,
    emptyText: "No day-end settlement rows found.",
  },
  cashier_wise_settlement_summary: {
    columns: [
      { key: "cashier_name", label: "Cashier" },
      {
        key: "counter_count",
        label: "Counters",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
      },
      {
        key: "bill_count",
        label: "Closings",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value)}</Box>,
      },
      {
        key: "opening_amount",
        label: "Opening",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
      {
        key: "difference",
        label: "Difference",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
    ],
    fetchRows: buildCashierSettlementSummaryRows,
    emptyText: "No cashier wise settlement rows found.",
  },
  settlement_opening_closing_report: {
    summary: "sale_payments",
    columns: settlementOpeningClosingColumns,
    fetchRows: buildCashOpeningClosingRows,
    emptyText: "No opening/closing rows found.",
  },
  company_wise_sale_collection_report: {
    summary: "sale_payments",
    columns: companyWiseSaleCollectionColumns,
    fetchRows: buildCompanyWiseSaleCollectionRows,
    emptyText: "No company wise sale collection rows found.",
    defaultGroupByColumn: "company_name",
  },
  credit_sale_collection_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      return getAllRows("/settlements/unpaid-bills", { status: "credit" });
    },
    emptyText: "No credit sale collection rows found.",
  },
  sales_tax_report_summary: {
    summary: "sale_lines",
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No sales tax summary rows found.",
  },
  sales_tax_report_column_wise: {
    summary: "sale_lines",
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No sales tax detail rows found.",
  },
  sales_hsn_report: {
    summary: "sale_lines",
    columns: salesHsnColumns,
    fetchRows: buildSalesHsnRows,
    emptyText: "No sales HSN rows found.",
  },
  my_customers_report: {
    summary: "customers",
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No customer sales rows found.",
  },
  inactive_customer_report: {
    summary: "customers",
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(true),
    emptyText: "No inactive customers found.",
  },
  sales_analysis_report: {
    summary: "sale_lines",
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No sales analysis rows found.",
  },
  sales_vs_settlement_report: {
    summary: "sale_payments",
    columns: salesVsSettlementColumns,
    fetchRows: getReportSales,
    emptyText: "No sales vs settlement rows found.",
  },
  sales_vs_stock_report: {
    summary: "store_stock",
    columns: salesVsStockColumns,
    fetchRows: buildSalesVsStockRows,
    emptyText: "No sales vs stock rows found.",
  },
  sales_vs_purchase_vs_stock: {
    columns: salesVsPurchaseVsStockColumns,
    fetchRows: buildSalesVsPurchaseVsStockRows,
    emptyText: "No sales vs purchase vs stock rows found.",
  },
  stock_detail_report: {
    summary: "store_stock",
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock detail rows found.",
  },
  direct_stock_report: {
    summary: "store_stock",
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No direct stock rows found.",
  },
  stock_audit_report: {
    columns: stockAuditColumns,
    fetchRows: () => getStoreReportRows("stock_audit"),
    emptyText: "No physical stock audits yet.",
  },
  cashier_wise_discount_report: {
    summary: "sale_lines",
    columns: cashierWiseDiscountColumns,
    fetchRows: buildCashierWiseDiscountRows,
    emptyText: "No cashier discount rows found.",
  },
  biller_wise_report: {
    summary: "sale_lines",
    columns: billerWiseDiscountColumns,
    fetchRows: buildCashierWiseDiscountRows,
    emptyText: "No discounted bills found.",
  },
  employee_detail_report: {
    columns: employeeColumns,
    fetchRows: buildEmployeeRows,
    emptyText: "No employee rows found.",
  },
  day_summary_without_offset: {
    summary: "sale_lines",
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No day summary rows found.",
  },
  estimate_bill_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  alteration_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  promotion_details_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  sales_snapshot_text: {
    summary: "sale_lines",
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No snapshot rows found.",
  },
  settlement_detail_report: {
    columns: [
      { key: "batch_no", label: "Settlement No" },
      { key: "settlement_date", label: "Date", render: formatDate },
      { key: "settler", label: "Settled By", valueGetter: row => row.settler?.name || "-" },
      ...["total_sales", "cash_total", "card_total", "upi_total", "credit_total"].map(key => ({ key, label: key.replaceAll("_", " "), render: numCell })),
    ],
    fetchRows: () => getAllRows("/settlements"),
    emptyText: "No settlement detail rows found.",
  },
  customer_advance_collection_report: {
    columns: [
      { key: "order_no", label: "Order No" },
      { key: "order_date", label: "Date", render: formatDate },
      { key: "customer", label: "Customer", valueGetter: row => row.customer?.name || "-" },
      { key: "advance_paid", label: "Advance Collected", render: numCell },
      { key: "balance_due", label: "Balance Due", render: numCell },
    ],
    fetchRows: async () => (await getAllRows("/customer-orders")).filter(row => toNumber(row.advance_paid) > 0),
    emptyText: "No customer advance rows found.",
  },
  settlement_reconciliation: {
    summary: "sale_payments",
    columns: daySummaryColumns,
    fetchRows: buildDayEndSettlementSummaryRows,
    emptyText: "No reconciliation rows found.",
  },
  sales_tax_report_row_wise: {
    summary: "sale_lines",
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No tax rows found.",
  },
  sales_tax_splitup_collection_report: {
    summary: "sale_lines",
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No tax splitup rows found.",
  },
  credit_customer_outstanding_report: {
    summary: "customers",
    columns: unsettledBillColumns,
    fetchRows: async () => {
      return getAllRows("/settlements/unpaid-bills", { status: "credit" });
    },
    emptyText: "No credit outstanding rows found.",
  },
  customer_gift_voucher_credit_note_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  settlement_coupon_issue_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  coupon_consumption_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  gift_voucher_credit_note_consumption_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  loyalty_reward_consumption_report: {
    summary: "customers",
    columns: loyaltyRedemptionColumns,
    fetchRows: () => getStoreReportRows("loyalty_redemptions"),
    emptyText: "No loyalty points have been redeemed yet.",
  },
  gift_issue_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  birthday_wishes: {
    columns: occasionColumns("Date of birth", "Turning"),
    fetchRows: () => buildCustomerOccasionRows("date_of_birth"),
    emptyText: "No customer has a date of birth saved.",
  },
  anniversary_wishes: {
    columns: occasionColumns("Marriage date", "Years"),
    fetchRows: () => buildCustomerOccasionRows("marriage_date"),
    emptyText: "No customer has a marriage date saved.",
  },
  customer_feedback_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  scheduled_message_log: { unavailableReason: "A dedicated data source for this report is not connected." },
  scheme_details_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  stock_report_with_shelf_period: {
    summary: "store_stock",
    columns: shelfPeriodColumns,
    fetchRows: () => getStoreReportRows("shelf_period"),
    emptyText: "No stock on hand.",
  },
  stock_aging_detail_report: {
    summary: "store_stock",
    columns: stockAgingColumns,
    fetchRows: () => getStoreReportRows("stock_aging"),
    emptyText: "No stock on hand.",
  },
  stock_marker_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  price_changer_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  stock_split_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  incentive_report_section: {
    summary: "sale_lines",
    columns: incentiveSectionColumns,
    fetchRows: buildIncentiveSectionRows,
    emptyText: "No sales with a salesman yet.",
  },
  incentive_report_employees: {
    summary: "sale_lines",
    columns: incentiveEmployeeColumns,
    fetchRows: () => getStoreReportRows("incentives"),
    emptyText: "No sales with a salesman yet.",
  },
  employee_advance_pending_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  b2b_sales_report: { unavailableReason: "A dedicated data source for this report is not connected." },
  b2b_sales_tax_report_column_wise: { unavailableReason: "A dedicated data source for this report is not connected." },
  b2b_sales_tax_report_row_wise: { unavailableReason: "A dedicated data source for this report is not connected." },
  b2b_sales_hsn_report: { unavailableReason: "A dedicated data source for this report is not connected." },
};

const REPORT_GROUPS = [
  {
    key: "sales_reports",
    title: "Sales Reports",
    displayCount: 16,
    items: [
      buildReportMeta("sales_report", "Sales Report"),
      buildReportMeta("unsettled_bill_report", "Unsettled Bill Report"),
      buildReportMeta("sales_report_salesman_wise", "Sales Report - Salesman Wise"),
      buildReportMeta("sales_report_salesman_wise_detail", "Sales Report - Salesman Wise Detail"),
      buildReportMeta("sales_report_margin", "Sales Report - Margin"),
      buildReportMeta("sales_report_invoice_wise", "Sales Report - Invoice wise"),
      buildReportMeta("sales_report_barcode_wise", "Sales Report - Barcode wise"),
      buildReportMeta("cancelled_sales_report", "Sales Report - Cancelled Sales Report"),
      buildReportMeta("sales_return_report", "Sales Return Report"),
      buildReportMeta("dealer_invoice_report", "Dealer Invoice Report"),
      buildReportMeta("dealer_return_report", "Dealer Return Report"),
      buildReportMeta("day_summary_without_offset", "Day Summary (Without OffSet Bill Configuration)"),
      buildReportMeta("approved_bill_report", "Approved Bill Report"),
      buildReportMeta("estimate_bill_report", "Estimate Bill Report"),
      buildReportMeta("delivery_report", "Delivery Report"),
      buildReportMeta("alteration_report", "Alteration Report"),
      buildReportMeta("promotion_details_report", "Promotion Details Report"),
      buildReportMeta("sales_snapshot_text", "Sales Snapshot Text"),
      buildReportMeta("day_summary_report", "Day Summary"),
    ],
  },
  {
    key: "settlement_reports",
    title: "Settlement Reports",
    displayCount: 8,
    items: [
      buildReportMeta("day_end_settlement_summary", "Day End Settlement Summary"),
      buildReportMeta("cashier_wise_settlement_summary", "Cashier Wise Settlement Summary"),
      buildReportMeta("settlement_detail_report", "Settlement Detail Report"),
      buildReportMeta("company_wise_sale_collection_report", "Company wise Sale Collection Report"),
      buildReportMeta("credit_sale_collection_report", "Credit Sale Collection Report"),
      buildReportMeta("customer_advance_collection_report", "Customer Advance Collection Report"),
      buildReportMeta("settlement_reconciliation", "Settlement Reconcilation"),
      buildReportMeta("settlement_opening_closing_report", "Daywise Settlement Opening/Closing Report"),
    ],
  },
  {
    key: "tax_reports",
    title: "Tax Reports",
    displayCount: 5,
    items: [
      buildReportMeta("sales_tax_report_summary", "Sales Tax Report (Summary)"),
      buildReportMeta("sales_tax_report_column_wise", "Sales Tax Report (Column wise)"),
      buildReportMeta("sales_tax_report_row_wise", "Sales Tax Report (Row wise)"),
      buildReportMeta("sales_hsn_report", "Sales HSN Report"),
      buildReportMeta("sales_tax_splitup_collection_report", "Sales Tax Splitup with Collection Report"),
    ],
  },
  {
    key: "customer_reports",
    title: "Customer Reports",
    displayCount: 13,
    items: [
      buildReportMeta("credit_customer_outstanding_report", "Credit Customer Outstanding Report"),
      buildReportMeta("customer_gift_voucher_credit_note_report", "Customer Gift Voucher/Credit Note Report"),
      buildReportMeta("settlement_coupon_issue_report", "Settlement Coupon Issue Report"),
      buildReportMeta("coupon_consumption_report", "Coupon Consumption Report"),
      buildReportMeta("gift_voucher_credit_note_consumption_report", "Gift Voucher/Credit Note Consumption Report"),
      buildReportMeta("loyalty_reward_consumption_report", "Loyalty Reward Consumption Report"),
      buildReportMeta("gift_issue_report", "Gift Issue Report"),
      buildReportMeta("birthday_wishes", "Birthday Wishes"),
      buildReportMeta("anniversary_wishes", "Anniversary Wishes"),
      buildReportMeta("my_customers_report", "My Customers Report"),
      buildReportMeta("customer_feedback_report", "Customer Feedback Report"),
      buildReportMeta("inactive_customer_report", "Inactive Customer Report"),
      buildReportMeta("scheduled_message_log", "Scheduled Message Log"),
    ],
  },
  {
    key: "reports_mobile_vertical",
    title: "Reports - Mobile Vertical",
    displayCount: 6,
    items: [
      buildReportMeta("scheme_details_report", "Scheme Details Report"),
    ],
  },
  {
    key: "analysis_reports",
    title: "Analysis Reports",
    displayCount: 3,
    items: [
      buildReportMeta("sales_analysis_report", "Sales Analysis Report"),
      buildReportMeta("sales_vs_settlement_report", "Sales Vs Settlement Report"),
      buildReportMeta("sales_vs_stock_report", "Sales Vs Stock Report"),
      buildReportMeta("sales_vs_purchase_vs_stock", "Sales Vs Purchase Vs Stock"),
    ],
  },
  {
    key: "stock_reports",
    title: "Stock Reports",
    displayCount: 7,
    items: [
      buildReportMeta("stock_detail_report", "Stock Detail Report"),
      buildReportMeta("stock_report_with_shelf_period", "Stock Report With Shelf Period"),
      buildReportMeta("stock_aging_detail_report", "Stock Aging Detail Report"),
      buildReportMeta("direct_stock_report", "Direct Stock Report"),
      buildReportMeta("stock_marker_report", "Stock Marker Report"),
      buildReportMeta("price_changer_report", "Price Changer Report"),
      buildReportMeta("stock_audit_report", "Stock Audit Report"),
      buildReportMeta("stock_split_report", "Stock Split Report"),
    ],
  },
  {
    key: "discount_reports",
    title: "Discount Reports",
    displayCount: 2,
    items: [
      buildReportMeta("biller_wise_report", "Biller Wise Report"),
      buildReportMeta("cashier_wise_discount_report", "Cashier Wise Report"),
    ],
  },
  {
    key: "hr_reports",
    title: "HR Reports",
    displayCount: 4,
    items: [
      buildReportMeta("incentive_report_section", "Incentive Report - Section"),
      buildReportMeta("incentive_report_employees", "Incentive Report - Employees"),
      buildReportMeta("employee_detail_report", "Employee Detail Report"),
      buildReportMeta("employee_advance_pending_report", "Employee Advance Pending Report"),
    ],
  },
  {
    key: "reports_b2b_vertical",
    title: "Reports - B2B Vertical",
    displayCount: 2,
    items: [
      buildReportMeta("b2b_sales_report", "Sales Report"),
      buildReportMeta("b2b_sales_tax_report_column_wise", "Sales Tax Report (Column wise)"),
      buildReportMeta("b2b_sales_tax_report_row_wise", "Sales Tax Report (Row wise)"),
      buildReportMeta("b2b_sales_hsn_report", "Sales HSN Report"),
    ],
  },
  {
    key: "add_ons",
    title: "Add-ons",
    displayCount: null,
    items: [],
  },
];

const REPORT_GRID_COLUMNS = [
  [
    "sales_reports",
    "settlement_reports",
    "tax_reports",
    "customer_reports",
    "reports_mobile_vertical",
    "add_ons",
  ],
  [
    "analysis_reports",
    "stock_reports",
    "discount_reports",
    "hr_reports",
    "reports_b2b_vertical",
  ],
];

const SalesReports = () => {
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
          implemented: Boolean(REPORT_DATA_SOURCES[item.key]?.fetchRows),
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

  const [salesSummaryDrawerOpen, setSalesSummaryDrawerOpen] = useState(false);
  const [salesSummaryForm, setSalesSummaryForm] = useState(() => {
    const d = (() => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { from: toYmd(start), to: toYmd(end), day: toYmd(end) };
    })();
    return {
      mode: "company_summary",
      from: d.from,
      to: d.to,
      day: d.day,
      billNo: "",
    };
  });
  const [salesSummaryScopedCompanyId, setSalesSummaryScopedCompanyId] = useState("");
  const [appliedSalesSummary, setAppliedSalesSummary] = useState(null);
  const [salesSummaryLoading, setSalesSummaryLoading] = useState(false);
  const [superAdminCompanies, setSuperAdminCompanies] = useState([]);

  const isSuperAdminUser = String(authUser?.role || "").trim().toLowerCase() === "super_admin";
  // Summary layouts of the other tabs (sales lines, payments, returns, dealer, customers), run on the server.
  const [tabSummaryLayouts, setTabSummaryLayouts] = useState({});
  useEffect(() => {
    let active = true;
    fetchSummaryLayouts("/sales-reports/summary-layouts").then((layouts) => { if (active) setTabSummaryLayouts(layouts); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useResetOnChange([selectedReportKey], () => {
    setAppliedSalesSummary(null);
  });

  useEffect(() => {
    if (!salesSummaryDrawerOpen || !isSuperAdminUser) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/companies", { params: { limit: 500, includeInactive: true } });
        const raw = res.data?.data || res.data || [];
        if (!cancelled) setSuperAdminCompanies(Array.isArray(raw) ? raw : []);
      } catch {
        if (!cancelled) setSuperAdminCompanies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salesSummaryDrawerOpen, isSuperAdminUser]);



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

  const grid = useSearchGrid({ sourceRows: reportRows, paginationMode: "client", scopeKey: selectedReportKey });
  const { page, setPage, limit, setLimit } = grid;

  const selectedReport = selectedReportKey ? reportLookup[selectedReportKey] || null : null;
  const selectedReportSource = selectedReport && REPORT_DATA_SOURCES[selectedReport.key]?.fetchRows ? REPORT_DATA_SOURCES[selectedReport.key] : null;

  const isSalesReportTab = selectedReport?.key === "sales_report";
  const tabSummary = selectedReportSource?.summary ? tabSummaryLayouts[selectedReportSource.summary] || null : null;
  const summaryOptions = isSalesReportTab ? SALES_SUMMARY_MODE_OPTIONS : tabSummary?.layouts || [];
  const summaryAvailable = isSalesReportTab || summaryOptions.length > 0;
  const openSummaryDrawer = () => {
    // Each tab has its own breakdowns: start on the first one when the last choice belongs to another tab.
    setSalesSummaryForm((prev) => (summaryOptions.some((opt) => opt.value === prev.mode) ? prev : { ...prev, mode: summaryOptions[0]?.value || "" }));
    setSalesSummaryDrawerOpen(true);
  };

  const displayRows = useMemo(() => {
    if (appliedSalesSummary?.rows) {
      return appliedSalesSummary.rows;
    }
    return reportRows;
  }, [appliedSalesSummary, reportRows]);

  const displayColumns = useMemo(() => {
    if (appliedSalesSummary?.columns) {
      return appliedSalesSummary.columns;
    }
    return selectedReportSource?.columns || [];
  }, [appliedSalesSummary, selectedReportSource?.columns]);

  const displayLoading =
    appliedSalesSummary ? salesSummaryLoading : reportLoading;

  // The other tabs' breakdowns: grouped and totalled by the server for the chosen period.
  const applyTabSummary = async () => {
    setSalesSummaryLoading(true);
    try {
      const summary = await fetchSummary("/sales-reports/summary", selectedReportSource.summary, {
        layout: salesSummaryForm.mode,
        ...(tabSummary?.dated ? { from: salesSummaryForm.from, to: salesSummaryForm.to } : {}),
      });
      setAppliedSalesSummary(summary);
      toast.success(summary.capped ? `${summary.label} applied (largest groups shown)` : `${summary.label} applied`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load summary report.");
      return false;
    } finally {
      setSalesSummaryLoading(false);
    }
  };

  const applySalesSummaryFromPanel = useCallback(async () => {
    const mode = salesSummaryForm.mode;
    if (mode === "bill_detail" && !String(salesSummaryForm.billNo || "").trim()) {
      toast.error("Enter a bill number (e.g. SB/142).");
      return false;
    }
    setSalesSummaryLoading(true);
    try {
      const params = {
        mode,
        from: salesSummaryForm.from,
        to: salesSummaryForm.to,
      };
      if (mode === "day_metrics") {
        params.day = salesSummaryForm.day || salesSummaryForm.from;
      }
      if (mode === "bill_detail") {
        params.billNo = String(salesSummaryForm.billNo || "").trim();
      }
      const cid = Number(salesSummaryScopedCompanyId || "");
      if (isSuperAdminUser && cid > 0) params.company_id = cid;

      const res = await api.get("/pos-sales/summary-report", { params });
      const payload = res.data?.data;
      const rows = payload?.rows || [];
      const columns = buildSalesSummaryColumns(mode);
      const opt = SALES_SUMMARY_MODE_OPTIONS.find((o) => o.value === mode);
      setAppliedSalesSummary({
        columns,
        rows,
        label: opt?.label || mode,
        from: payload?.from || params.from,
        to: payload?.to || params.to,
      });
      toast.success(`${opt?.label || "Summary"} applied`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load summary report.");
      return false;
    } finally {
      setSalesSummaryLoading(false);
    }
  }, [isSuperAdminUser, salesSummaryForm, salesSummaryScopedCompanyId]);

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
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

      if (appliedSalesSummary) {
        setReportLoading(false);
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
          setReportError(err?.response?.data?.message || `Failed to load ${selectedReport.title.toLowerCase()}.`);
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, selectedReportSource, appliedSalesSummary, setPage]);

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
        sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => toggleGroup(group.key)}
          sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 2, borderLeft: 4, borderLeftColor: "primary.main", bgcolor: "action.hover", px: 2, py: 1.5, textAlign: "left", transition: "background-color 0.15s", "&:hover": { bgcolor: "action.selected" } }}
        >
          <Typography component="span" sx={{ fontSize: { xs: 12.25, md: 15 }, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
            {title}
          </Typography>
          <Typography component="span" sx={{ fontSize: 17.5, fontWeight: 600, lineHeight: 1, color: "text.disabled" }}>
            {expanded ? "−" : "+"}
          </Typography>
        </Box>

        {expanded ? (
          <Box sx={{ bgcolor: "background.paper", px: 2, py: 1.5 }}>
            {group.items.length > 0 ? (
              <Stack sx={{ gap: 0.75 }}>
                {group.items.map((item) => {
                  const active = selectedReportKey === item.key;
                  const implemented = Boolean(REPORT_DATA_SOURCES[item.key]?.fetchRows);
                  return (
                    <Box
                      component="button"
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectReport(group.key, item.key)}
                      disabled={!implemented}
                      sx={{
                        display: "flex",
                        width: "100%",
                        alignItems: "flex-start",
                        gap: 1.5,
                        borderRadius: "3.5px",
                        px: 1,
                        py: 0.75,
                        textAlign: "left",
                        transition: "background-color 0.15s",
                        cursor: implemented ? "pointer" : "not-allowed",
                        opacity: implemented ? 1 : 0.55,
                        bgcolor: implemented && active ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) : "transparent",
                        "&:hover": implemented && !active ? { bgcolor: "action.hover" } : undefined,
                      }}
                    >
                      <Typography component="span" sx={{ pt: 0.25, fontSize: 10.5, fontWeight: 700, color: implemented ? "primary.main" : "text.disabled" }}>
                        {"◈"}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: { xs: 12.25, md: 15 },
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
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: { xs: 10.5, md: 12.25 }, color: "text.secondary" }}>
                No add-on reports are configured yet.
              </Typography>
            )}
          </Box>
        ) : null}
      </Box>
    );
  };

  return (
    <Box sx={{ height: "100%", minHeight: 0, bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      <PageHeader
        onBack={() => navigate("/sales")}
        backLabel="Back to sales"
        title={<>
          <Breadcrumbs
            items={
              selectedReport
                ? [
                    { label: "Sales", onClick: () => navigate("/sales") },
                    { label: "Reports", onClick: () => setSelectedReportKey("") },
                    { label: selectedReport.title },
                  ]
                : [
                    { label: "Sales", onClick: () => navigate("/sales") },
                    { label: "Reports" },
                  ]
            }
          />
        </>}
        actions={<>
          {selectedReport ? (
          <Stack direction="row" sx={{ flexShrink: 0, alignItems: "center", gap: 1 }}>
            {summaryAvailable ? (
              <SummaryLayoutsButtons onOpen={openSummaryDrawer} applied={Boolean(appliedSalesSummary)} onReset={() => setAppliedSalesSummary(null)} />
            ) : null}
            <ExportBottomSheet
              columns={displayColumns}
              rows={displayRows}
              fileName={`sales_report_${selectedReport.key}${appliedSalesSummary ? `_${appliedSalesSummary.label}` : ""}`}
              sheetName={selectedReport.title || "Sales Report"}
              title={resolvedExportCompanyName}
              titleResolver={resolveExportCompanyTitle}
              subtitle={
                appliedSalesSummary
                  ? `${selectedReport.title} — ${appliedSalesSummary.label}${appliedSalesSummary.from ? ` (${appliedSalesSummary.from} → ${appliedSalesSummary.to})` : ""}`
                  : `${selectedReport.title} Report`
              }
              buttonClassName="text-xs"
            />
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
              {appliedSalesSummary ? (
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                  Showing <Box component="strong">{appliedSalesSummary.label}</Box>
                  {appliedSalesSummary.from ? <> for {appliedSalesSummary.from} → {appliedSalesSummary.to}</> : null}
                </Typography>
              ) : summaryAvailable ? (
                <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>
                  Open <Box component="strong">Summary layouts</Box> for {isSalesReportTab ? "location / company / day / bill-style" : summaryOptions.slice(0, 4).map((opt) => opt.label.toLowerCase()).join(" / ")} breakdowns.
                </Typography>
              ) : null}
            </Box>

            <SummaryPanelRow
              panel={summaryAvailable ? (
              <SummaryLayoutsDrawer
                open={salesSummaryDrawerOpen}
                onClose={() => setSalesSummaryDrawerOpen(false)}
                description={isSalesReportTab
                  ? "Pick one breakdown. Company summary: admin sees only their store; super admin sees a row per company (or narrow with company below)."
                  : "Pick one breakdown and the period; the totals are worked out on the server for the selected store."}
                options={summaryOptions}
                mode={salesSummaryForm.mode}
                onModeChange={(mode) => setSalesSummaryForm((prev) => ({ ...prev, mode }))}
                dated={isSalesReportTab ? salesSummaryForm.mode !== "day_metrics" : Boolean(tabSummary?.dated)}
                from={salesSummaryForm.from}
                to={salesSummaryForm.to}
                onRangeChange={(range) => setSalesSummaryForm((prev) => ({ ...prev, ...range }))}
                loading={salesSummaryLoading}
                onApply={isSalesReportTab ? applySalesSummaryFromPanel : applyTabSummary}
                name="sales_summary_mode"
                topContent={isSalesReportTab && isSuperAdminUser ? (
                  <SummaryField label="Company scope">
                    <TextField select value={salesSummaryScopedCompanyId} onChange={(e) => setSalesSummaryScopedCompanyId(e.target.value)} size="small" fullWidth sx={muiFieldSx}>
                      <MenuItem value="">All allowed companies</MenuItem>
                      {(superAdminCompanies || []).map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>{c.name || `Company ${c.id}`}</MenuItem>
                      ))}
                    </TextField>
                  </SummaryField>
                ) : null}
                bottomContent={isSalesReportTab && salesSummaryForm.mode === "day_metrics" ? (
                  <SummaryDateField label="Day" value={salesSummaryForm.day} onChange={(day) => setSalesSummaryForm((prev) => ({ ...prev, day }))} />
                ) : isSalesReportTab && salesSummaryForm.mode === "bill_detail" ? (
                  <SummaryField label="Bill number">
                    <TextField type="text" value={salesSummaryForm.billNo} onChange={(e) => setSalesSummaryForm((prev) => ({ ...prev, billNo: e.target.value }))}
                      placeholder="e.g. SB/142 or 142" size="small" fullWidth sx={[muiFieldSx, { "& .MuiInputBase-input": { fontFamily: "monospace" } }]} />
                  </SummaryField>
                ) : null}
              />
            ) : null}
            >
            <FilterableDataTable
              key={`${selectedReport.key}${appliedSalesSummary ? `_${appliedSalesSummary.label}` : ""}`}
              rows={displayRows}
              columns={displayColumns}
              loading={displayLoading}
              loadingText={`Loading ${selectedReport.title.toLowerCase()}...`}
              emptyText={
                reportError
                || selectedReportSource?.emptyText
                || `No ${selectedReport.title.toLowerCase()} records found.`
              }
              searchPlaceholder={`Search ${selectedReport.title.toLowerCase()}...`}
              showExport={false}
              enableColumnResize
              exportFileName={`sales_report_${selectedReport.key}`}
              exportSheetName={selectedReport.title || "Sales Report"}
              exportTitle={resolvedExportCompanyName}
              exportTitleResolver={resolveExportCompanyTitle}
              exportSubtitle={`${selectedReport.title} Report`}
              tablePreferenceKey={`sales.reports.${selectedReport.key}${
                appliedSalesSummary
                  ? `.summary.${String(appliedSalesSummary.label).replace(/\s+/g, "_")}`
                  : ""
              }`}
              page={page}
              limit={limit}
              totalPages={Math.max(Math.ceil(displayRows.length / Math.max(limit, 1)), 1)}
              totalRows={displayRows.length}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              paginationMode="client"
            fillHeight
              defaultGroupByColumn={
                appliedSalesSummary
                  ? null
                  : selectedReportSource?.defaultGroupByColumn || null
              }
              enableVirtualization
            />
            </SummaryPanelRow>
          </SearchGridPanel>
        ) : (
          <Box sx={{ borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", p: { xs: 2, md: 2.5 }, boxShadow: 1 }}>
            <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider", pb: 1.5 }}>
              <Typography sx={{ fontSize: { xs: 14, md: 15.75 }, fontWeight: 600, color: "text.primary" }}>
                Sales Report Center
              </Typography>
              <Typography sx={{ fontSize: { xs: 10.5, md: 12.25 }, color: "text.secondary" }}>
                Open a report group and choose a report. Blue links are connected to implemented
                sales, customer, stock, or cash modules.
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xl: "1fr 1fr" } }}>
              {REPORT_GRID_COLUMNS.map((columnGroup, index) => (
                <Stack key={`column_${index}`} sx={{ gap: 2.5 }}>
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

export default SalesReports;
