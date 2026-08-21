import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import FilterableDataTable from "../../components/FilterableDataTable";

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
  try {
    const res = await api.get(url, { params: { ...params, all: "true" } });
    return res.data?.data || [];
  } catch {
    const res = await api.get(url, { params });
    return res.data?.data || [];
  }
};

const getSaleDate = (row) => row?.sale_at || row?.created_at || "";
const getSaleCustomerName = (row) => row?.customer_name || row?.customer?.name || "-";
const getSaleCustomerMobile = (row) => row?.customer_mobile || row?.customer?.phone || "-";
const getSaleItems = (row) => (Array.isArray(row?.items) ? row.items : []);
const getSaleBillNo = (row) => row?.bill_no || row?.bill?.bill_no || row?.id || "-";
const getSaleStatus = (row) =>
  String(
    row?.bill?.status
      || row?.status
      || (row?.bill?.is_canceled ? "cancelled" : row?.is_credit ? "credit" : row?.bill?.is_paid ? "paid" : "open")
  )
    .trim()
    .toLowerCase();

const getSalePaymentMode = (row) => {
  if (row?.is_credit) return "Credit";
  const payments = Array.isArray(row?.payments) ? row.payments : [];
  const modes = ["CASH", "CARD", "UPI"]
    .filter((mode) => payments.some((p) => p?.payment_mode === mode && toNumber(p?.amount) > 0))
    .map((mode) => mode.charAt(0) + mode.slice(1).toLowerCase());
  return modes.length > 0 ? modes.join(" + ") : "Paid";
};

const getSaleSettledAmount = (row) => {
  const status = getSaleStatus(row);
  if (status === "cancelled") return 0;
  // PosSale already tracks exactly how much was collected - no need to
  // derive it from a "remaining_amount" field that doesn't exist anywhere
  // in the response.
  return Math.max(0, round2(row?.paid_amount));
};

const getSaleSummary = (row) => {
  const items = getSaleItems(row);
  const totalQty = items.reduce((sum, item) => sum + Math.max(0, toNumber(item?.quantity)), 0);
  const discount = round2(row?.discount_amount);
  const net = round2(row?.grand_total);
  const cost = items.reduce(
    (sum, item) => sum + Math.max(0, toNumber(item?.cost_price)) * Math.max(0, toNumber(item?.quantity)),
    0
  );
  return {
    lines: items.length,
    totalQty,
    gross: round2(toNumber(row?.subtotal) + discount),
    discount,
    net,
    tax: round2(row?.tax_amount),
    margin: round2(net - cost),
  };
};

const buildPosSaleItemRows = async () => {
  const rows = await getAllRows("/pos-sales");
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
        salesman_name: item?.sales_man_name || item?.salesManName || "Unassigned",
        qty,
        price,
        subtotal,
        tax_perc: taxPerc,
        tax_amount: taxAmount,
        discount,
        total,
        gross,
        margin: round2(total - gross),
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
    getAllRows("/pos-sales"),
    buildCompanyNameMap(),
  ]);

  return rows.map((row) => {
    const companyId = row?.company_id ?? row?.company?.id ?? null;
    const companyName =
      row?.company?.name
      || companyNameMap.get(String(companyId || ""))
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

const buildProductHsnMap = async () => {
  const rows = await getAllRows("/products", { limit: 500 });
  const map = new Map();
  rows.forEach((row) => {
    const key = String(row?.name || "").trim().toLowerCase();
    if (!key) return;
    map.set(key, String(row?.hsn || "").trim() || "-");
  });
  return map;
};

const buildSalesHsnRows = async () => {
  const [itemRows, productHsnMap] = await Promise.all([
    buildPosSaleItemRows(),
    buildProductHsnMap(),
  ]);

  const grouped = new Map();
  itemRows.forEach((row) => {
    const hsn = productHsnMap.get(String(row?.product_name || "").trim().toLowerCase()) || "-";
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
  const rows = await getAllRows("/pos-sales");
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
  const getKey = (dateKey, counterName) => `${dateKey}__${counterName || "-"}`;

  openings.forEach((row) => {
    const dayKey = formatDayKey(row?.opening_at || row?.created_at);
    const counterName = row?.counter?.name || "-";
    const key = getKey(dayKey, counterName);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: dayKey,
        event_date: row?.opening_at || row?.created_at || "",
        location_name: row?.location?.name || "-",
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
    entry.location_name = row?.location?.name || entry.location_name;
    entry.opening_amount = round2(toNumber(row?.amount));
    entry.paid_by = row?.paidBy?.name || row?.paidBy?.employee_code || "-";
    entry.cashier_name = row?.cashier?.name || row?.cashier?.employee_code || entry.cashier_name;
    entry.event_date = row?.opening_at || entry.event_date;
  });

  closings.forEach((row) => {
    const dayKey = formatDayKey(row?.closing_at || row?.created_at);
    const counterName = row?.counter?.name || "-";
    const key = getKey(dayKey, counterName);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: dayKey,
        event_date: row?.closing_at || row?.created_at || "",
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
    entry.closing_bill_no = row?.bill_no || "-";
    entry.closing_amount = round2(toNumber(row?.closing_amount));
    entry.difference = round2(toNumber(row?.difference));
    entry.received_by = row?.receivedBy?.name || row?.receivedBy?.employee_code || "-";
    entry.cashier_name = row?.cashier?.name || row?.cashier?.employee_code || entry.cashier_name;
    entry.event_date = row?.closing_at || entry.event_date;
    if (!entry.opening_amount && toNumber(row?.opening_amount) > 0) {
      entry.opening_amount = round2(row?.opening_amount);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => String(b.day_key).localeCompare(String(a.day_key)));
};

const buildDayEndSettlementSummaryRows = async () => {
  const rows = await getAllRows("/cash-closings");
  const grouped = new Map();

  rows.forEach((row) => {
    const key = formatDayKey(row?.closing_at || row?.created_at);
    if (!key) return;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day_key: key,
        closing_date: row?.closing_at || row?.created_at || "",
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
    entry.counters.add(row?.counter?.name || "-");
    entry.cashiers.add(row?.cashier?.name || row?.cashier?.employee_code || "-");
    entry.opening_amount += round2(row?.opening_amount);
    entry.closing_amount += round2(row?.closing_amount);
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
    const key = String(row?.cashier?.name || row?.cashier?.employee_code || "Unassigned");
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
    entry.counters.add(row?.counter?.name || "-");
    entry.opening_amount += round2(row?.opening_amount);
    entry.closing_amount += round2(row?.closing_amount);
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
  const rows = await getAllRows("/customers");
  return rows
    .filter((row) => (inactiveOnly ? !row?.is_active : true))
    .map((row) => ({
      ...row,
      customer_type: row?.customer_type || "-",
      customer_category: row?.customerCategory?.name || "-",
      city_name: row?.city?.name || "-",
      state_name: row?.state?.name || "-",
      mobile_no: row?.mobile_no || "-",
      active_label: row?.is_active ? "Active" : "Inactive",
    }));
};

const buildMyCustomerSalesRows = async () => {
  const rows = await getAllRows("/pos-sales");
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
    employee_name: [row?.name, row?.surname].filter(Boolean).join(" ") || row?.name || "-",
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
    batch: row?.batch_id || "-",
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "total_qty",
    label: "Qty",
    valueGetter: (row) => getSaleSummary(row).totalQty,
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "gross_value",
    label: "Gross",
    valueGetter: (row) => getSaleSummary(row).gross,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total_discount",
    label: "Discount",
    valueGetter: (row) => getSaleSummary(row).discount,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "amount",
    label: "Net",
    valueGetter: (row) => getSaleSummary(row).net,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const companyWiseSaleCollectionColumns = [
  { key: "company_name", label: "Company", valueGetter: (row) => row?.company_name || "-" },
  ...salesReportColumns,
];

const salesMarginColumns = [
  ...salesReportColumns,
  {
    key: "margin",
    label: "Margin",
    valueGetter: (row) => getSaleSummary(row).margin,
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const salesVsSettlementColumns = [
  ...salesReportColumns,
  {
    key: "settled_amount",
    label: "Amount Settled",
    valueGetter: (row) => getSaleSettledAmount(row),
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const unsettledBillColumns = [
  { key: "bill_no", label: "Bill No" },
  { key: "order_number", label: "Order No" },
  { key: "sale_type", label: "Sale Type" },
  { key: "status", label: "Status" },
  {
    key: "amount",
    label: "Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount_amount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "remaining_amount",
    label: "Remaining",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
  },
  { key: "product_name", label: "Product" },
  { key: "salesman_name", label: "Salesman" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "price",
    label: "Price",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const salesmanSummaryColumns = [
  { key: "salesman_name", label: "Salesman" },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "lines",
    label: "Lines",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "gross",
    label: "Gross",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "margin",
    label: "Margin",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Net",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "customer_count",
    label: "Customers",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "gross",
    label: "Gross",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "net",
    label: "Net",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "closing_amount",
    label: "Closing",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "difference",
    label: "Difference",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const taxSummaryColumns = [
  {
    key: "tax_perc",
    label: "Tax %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "taxable_amount",
    label: "Taxable",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  { key: "bill_numbers", label: "Bill Numbers" },
  {
    key: "product_count",
    label: "Products",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  { key: "product_names", label: "Product Names" },
  {
    key: "total_qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "total_amount",
    label: "Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
  { key: "customer_mobile", label: "Mobile", valueGetter: (row) => row.customer_mobile || row.customer?.mobile_no || "-" },
  { key: "location", label: "Location", valueGetter: (row) => row.location?.name || "-" },
  { key: "counter", label: "Counter", valueGetter: (row) => row.counter?.name || "-" },
  {
    key: "total_qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "total_amount",
    label: "Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  { key: "received_by", label: "Received By", valueGetter: (row) => row.receivedBy?.name || row.receivedBy?.employee_code || "-" },
];

const salesHsnColumns = [
  { key: "hsn", label: "HSN" },
  {
    key: "bill_count",
    label: "Bills",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "taxable_amount",
    label: "Taxable",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "tax_amount",
    label: "Tax Amt",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total",
    label: "Total",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const stockColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
  },
  { key: "product_name", label: "Product" },
  { key: "batch", label: "Batch" },
  { key: "size", label: "Size" },
  { key: "design_no", label: "Design" },
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
    key: "sale_price",
    label: "Sale",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const salesVsStockColumns = [
  {
    key: "barcode",
    label: "Barcode",
    render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
  },
  { key: "product_name", label: "Product" },
  {
    key: "sold_qty",
    label: "Sold Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "current_stock",
    label: "Current Stock",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "total_available",
    label: "Total Flow",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "sale_price",
    label: "Sale Price",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "sold_value",
    label: "Sold Value",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const salesVsPurchaseVsStockColumns = [
  { key: "product_name", label: "Product" },
  { key: "hsn", label: "HSN" },
  {
    key: "purchase_bill_count",
    label: "Purchase Bills",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "purchase_qty",
    label: "Purchased Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "purchase_amount",
    label: "Purchase Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "sold_qty",
    label: "Sold Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "sold_amount",
    label: "Sales Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "stock_qty",
    label: "Stock Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  {
    key: "avg_purchase_cost",
    label: "Avg Cost",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "avg_sale_price",
    label: "Price",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "stock_cost_value",
    label: "Stock Value",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total_discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount_percentage",
    label: "Discount %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}%</div>,
  },
  {
    key: "amount",
    label: "Net Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "total_discount",
    label: "Discount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
  {
    key: "discount_percentage",
    label: "Discount %",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}%</div>,
  },
  {
    key: "amount",
    label: "Net Amount",
    render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
  },
];

const buildCashierWiseDiscountRows = async () => {
  const rows = await getAllRows("/pos-sales");
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
  <div className="text-right">
    {typeof value === "string" ? value : toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </div>
);

const INT_SUMMARY_COLUMNS = [
  {
    key: "s_no",
    label: "S.No",
    valueGetter: (row) => row.s_no ?? "-",
    render: (value) => <div className="text-center">{value}</div>,
  },
  {
    key: "location_name",
    label: "Location",
    valueGetter: (row) => row.location_name || "-",
    render: (_, row) => (row.id === "__total__" ? <span className="font-bold">Total</span> : row.location_name || "-"),
  },
  {
    key: "company",
    label: "Company",
    valueGetter: (row) => row.company || "-",
    render: (_, row) => (row.id === "__total__" ? <span className="font-bold">Total</span> : row.company || "-"),
  },
  {
    key: "sale_date",
    label: "Date",
    valueGetter: (row) => row.sale_date || "",
    render: (value, row) => {
      if (row?.id === "__total__") return <span className="font-bold">Total</span>;
      return formatDate(value ? `${value}T12:00:00` : "");
    },
  },
  {
    key: "sale_qty",
    label: "Sale Qty",
    valueGetter: (row) => row.sale_qty,
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
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
    render: (value) => <div className="text-center">{value}</div>,
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
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
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
        <div className="text-right font-medium">{toNumber(row.value).toLocaleString("en-IN")}</div>
      ) : (
        <div className="text-right">{row?.value ?? "—"}</div>
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
    render: (value) => <span className="font-mono text-[11px]">{value}</span>,
  },
  { key: "product_name", label: "Product" },
  {
    key: "qty",
    label: "Qty",
    render: (value) => <div className="text-right">{toNumber(value)}</div>,
  },
  { key: "price", label: "Price", render: (value) => numCell(value) },
  { key: "tax_perc", label: "Tax %", render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div> },
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
  sales_report: {
    columns: salesReportColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No POS sales found.",
  },
  unsettled_bill_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      const rows = await getAllRows("/settlements/unpaid-bills", { status: "all" });
      return rows.filter((row) => row?.sale_type === "pos_sale" && String(row?.status || "").toLowerCase() === "unsettled");
    },
    emptyText: "No unsettled sales bills found.",
  },
  sales_report_salesman_wise: {
    columns: salesmanSummaryColumns,
    fetchRows: buildSalesmanSummaryRows,
    emptyText: "No salesman wise sales rows found.",
  },
  sales_report_salesman_wise_detail: {
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No salesman detail rows found.",
  },
  sales_report_margin: {
    columns: salesMarginColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No sales margin rows found.",
  },
  sales_report_invoice_wise: {
    columns: salesReportColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No invoice wise sales rows found.",
  },
  sales_report_barcode_wise: {
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No barcode wise sales rows found.",
  },
  cancelled_sales_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      const rows = await getAllRows("/settlements/unpaid-bills", { status: "canceled" });
      return rows.filter((row) => row?.sale_type === "pos_sale");
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
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "difference",
        label: "Difference",
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
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
        render: (value) => <div className="text-right">{toNumber(value)}</div>,
      },
      {
        key: "bill_count",
        label: "Closings",
        render: (value) => <div className="text-right">{toNumber(value)}</div>,
      },
      {
        key: "opening_amount",
        label: "Opening",
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "difference",
        label: "Difference",
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
    ],
    fetchRows: buildCashierSettlementSummaryRows,
    emptyText: "No cashier wise settlement rows found.",
  },
  settlement_opening_closing_report: {
    columns: settlementOpeningClosingColumns,
    fetchRows: buildCashOpeningClosingRows,
    emptyText: "No opening/closing rows found.",
  },
  company_wise_sale_collection_report: {
    columns: companyWiseSaleCollectionColumns,
    fetchRows: buildCompanyWiseSaleCollectionRows,
    emptyText: "No company wise sale collection rows found.",
    defaultGroupByColumn: "company_name",
  },
  credit_sale_collection_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      const rows = await getAllRows("/settlements/unpaid-bills", { status: "credit" });
      return rows.filter((row) => row?.sale_type === "pos_sale" && String(row?.status || "").toLowerCase() === "credit");
    },
    emptyText: "No credit sale collection rows found.",
  },
  sales_tax_report_summary: {
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No sales tax summary rows found.",
  },
  sales_tax_report_column_wise: {
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No sales tax detail rows found.",
  },
  sales_hsn_report: {
    columns: salesHsnColumns,
    fetchRows: buildSalesHsnRows,
    emptyText: "No sales HSN rows found.",
  },
  my_customers_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No customer sales rows found.",
  },
  inactive_customer_report: {
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(true),
    emptyText: "No inactive customers found.",
  },
  sales_analysis_report: {
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No sales analysis rows found.",
  },
  sales_vs_settlement_report: {
    columns: salesVsSettlementColumns,
    fetchRows: () => getAllRows("/pos-sales"),
    emptyText: "No sales vs settlement rows found.",
  },
  sales_vs_stock_report: {
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
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock detail rows found.",
  },
  direct_stock_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No direct stock rows found.",
  },
  stock_audit_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock audit rows found.",
  },
  cashier_wise_discount_report: {
    columns: cashierWiseDiscountColumns,
    fetchRows: buildCashierWiseDiscountRows,
    emptyText: "No cashier discount rows found.",
  },
  biller_wise_report: {
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
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No day summary rows found.",
  },
  estimate_bill_report: {
    columns: salesReportColumns,
    fetchRows: () => getAllRows("/customer-orders"),
    emptyText: "No estimate bills found.",
  },
  alteration_report: {
    columns: deliveryReportColumns,
    fetchRows: () => getAllRows("/customer-orders"),
    emptyText: "No alteration rows found.",
  },
  promotion_details_report: {
    columns: cashierWiseDiscountColumns,
    fetchRows: buildCashierWiseDiscountRows,
    emptyText: "No promotion details found.",
  },
  sales_snapshot_text: {
    columns: daySummaryColumns,
    fetchRows: buildDaySummaryRows,
    emptyText: "No snapshot rows found.",
  },
  settlement_detail_report: {
    columns: settlementOpeningClosingColumns,
    fetchRows: buildCashOpeningClosingRows,
    emptyText: "No settlement detail rows found.",
  },
  customer_advance_collection_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No customer advance rows found.",
  },
  settlement_reconciliation: {
    columns: daySummaryColumns,
    fetchRows: buildDayEndSettlementSummaryRows,
    emptyText: "No reconciliation rows found.",
  },
  sales_tax_report_row_wise: {
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No tax rows found.",
  },
  sales_tax_splitup_collection_report: {
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No tax splitup rows found.",
  },
  credit_customer_outstanding_report: {
    columns: unsettledBillColumns,
    fetchRows: async () => {
      const rows = await getAllRows("/settlements/unpaid-bills", { status: "credit" });
      return rows.filter((r) => r?.sale_type === "pos_sale");
    },
    emptyText: "No credit outstanding rows found.",
  },
  customer_gift_voucher_credit_note_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No gift voucher rows found.",
  },
  settlement_coupon_issue_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No coupon issue rows found.",
  },
  coupon_consumption_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No coupon consumption rows found.",
  },
  gift_voucher_credit_note_consumption_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No gift voucher consumption rows found.",
  },
  loyalty_reward_consumption_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No loyalty reward rows found.",
  },
  gift_issue_report: {
    columns: myCustomerSalesColumns,
    fetchRows: buildMyCustomerSalesRows,
    emptyText: "No gift issue rows found.",
  },
  birthday_wishes: {
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(false),
    emptyText: "No birthday records found.",
  },
  anniversary_wishes: {
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(false),
    emptyText: "No anniversary records found.",
  },
  customer_feedback_report: {
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(false),
    emptyText: "No feedback records found.",
  },
  scheduled_message_log: {
    columns: customerColumns,
    fetchRows: () => buildCustomerRows(false),
    emptyText: "No scheduled messages found.",
  },
  scheme_details_report: {
    columns: cashierWiseDiscountColumns,
    fetchRows: buildCashierWiseDiscountRows,
    emptyText: "No scheme records found.",
  },
  stock_report_with_shelf_period: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock records found.",
  },
  stock_aging_detail_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock aging records found.",
  },
  stock_marker_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock marker records found.",
  },
  price_changer_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No price changer records found.",
  },
  stock_split_report: {
    columns: stockColumns,
    fetchRows: buildStockRows,
    emptyText: "No stock split records found.",
  },
  incentive_report_section: {
    columns: employeeColumns,
    fetchRows: buildEmployeeRows,
    emptyText: "No incentive records found.",
  },
  incentive_report_employees: {
    columns: employeeColumns,
    fetchRows: buildEmployeeRows,
    emptyText: "No incentive records found.",
  },
  employee_advance_pending_report: {
    columns: employeeColumns,
    fetchRows: buildEmployeeRows,
    emptyText: "No advance pending records found.",
  },
  b2b_sales_report: {
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No B2B sales rows found.",
  },
  b2b_sales_tax_report_column_wise: {
    columns: saleItemColumns,
    fetchRows: buildPosSaleItemRows,
    emptyText: "No B2B sales tax detail rows found.",
  },
  b2b_sales_tax_report_row_wise: {
    columns: taxSummaryColumns,
    fetchRows: buildSalesTaxSummaryRows,
    emptyText: "No B2B sales tax summary rows found.",
  },
  b2b_sales_hsn_report: {
    columns: salesHsnColumns,
    fetchRows: buildSalesHsnRows,
    emptyText: "No B2B sales HSN rows found.",
  },
};

const REPORT_GROUPS = [
  {
    key: "sales_reports",
    title: "Sales Reports",
    displayCount: 13,
    items: [
      buildReportMeta("sales_report", "Sales Report"),
      buildReportMeta("unsettled_bill_report", "Unsettled Bill Report"),
      buildReportMeta("sales_report_salesman_wise", "Sales Report - Salesman Wise"),
      buildReportMeta("sales_report_salesman_wise_detail", "Sales Report - Salesman Wise Detail"),
      buildReportMeta("sales_report_margin", "Sales Report - Margin"),
      buildReportMeta("sales_report_invoice_wise", "Sales Report - Invoice wise"),
      buildReportMeta("sales_report_barcode_wise", "Sales Report - Barcode wise"),
      buildReportMeta("cancelled_sales_report", "Sales Report - Cancelled Sales Report"),
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

  useEffect(() => {
    setAppliedSalesSummary(null);
  }, [selectedReportKey]);

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

  const displayRows = useMemo(() => {
    if (selectedReport?.key === "sales_report" && appliedSalesSummary?.rows) {
      return appliedSalesSummary.rows;
    }
    return reportRows;
  }, [appliedSalesSummary, reportRows, selectedReport?.key]);

  const displayColumns = useMemo(() => {
    if (selectedReport?.key === "sales_report" && appliedSalesSummary?.columns) {
      return appliedSalesSummary.columns;
    }
    return selectedReportSource?.columns || [];
  }, [appliedSalesSummary, selectedReport?.key, selectedReportSource?.columns]);

  const displayLoading =
    selectedReport?.key === "sales_report" && appliedSalesSummary ? salesSummaryLoading : reportLoading;

  const applySalesSummaryFromPanel = useCallback(async () => {
    const mode = salesSummaryForm.mode;
    if (mode === "bill_detail" && !String(salesSummaryForm.billNo || "").trim()) {
      toast.error("Enter a bill number (e.g. SB/142).");
      return;
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
      setSalesSummaryDrawerOpen(false);
      toast.success(`${opt?.label || "Summary"} applied`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load summary report.");
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

      if (selectedReport.key === "sales_report" && appliedSalesSummary) {
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
  }, [selectedReport, selectedReportSource, appliedSalesSummary]);

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
            {group.items.length > 0 ? (
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
            ) : (
              <div className="text-xs text-gray-500 md:text-sm dark:text-gray-400">
                No add-on reports are configured yet.
              </div>
            )}
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
            onClick={() => navigate("/sales")}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label="Back to sales"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex items-center gap-1 text-sm font-semibold md:text-base">
            {selectedReport ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/sales")}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Sales
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
                  onClick={() => navigate("/sales")}
                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Sales
                </button>
                <span className="text-gray-500 dark:text-gray-400">/</span>
                <span>Reports</span>
              </>
            )}
          </h1>
        </div>

        {selectedReport ? (
          <div className="flex shrink-0 items-center gap-2">
            {selectedReport.key === "sales_report" ? (
              <>
                <button
                  type="button"
                  onClick={() => setSalesSummaryDrawerOpen(true)}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Summary layouts
                </button>
                {appliedSalesSummary ? (
                  <button
                    type="button"
                    onClick={() => setAppliedSalesSummary(null)}
                    className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  >
                    Standard view
                  </button>
                ) : null}
              </>
            ) : null}
            <ExportBottomSheet
              columns={displayColumns}
              rows={displayRows}
              fileName={`sales_report_${selectedReport.key}${appliedSalesSummary ? `_${appliedSalesSummary.label}` : ""}`}
              sheetName={selectedReport.title || "Sales Report"}
              title={resolvedExportCompanyName}
              titleResolver={resolveExportCompanyTitle}
              subtitle={
                appliedSalesSummary && selectedReport.key === "sales_report"
                  ? `${selectedReport.title} — ${appliedSalesSummary.label} (${appliedSalesSummary.from} → ${appliedSalesSummary.to})`
                  : `${selectedReport.title} Report`
              }
              buttonClassName="text-xs"
            />
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
              {selectedReport.key === "sales_report" && appliedSalesSummary ? (
                <div className="mt-1 text-xs text-slate-600 dark:text-gray-300">
                  Showing <strong>{appliedSalesSummary.label}</strong> for {appliedSalesSummary.from}{" "}
                  → {appliedSalesSummary.to}
                </div>
              ) : selectedReport.key === "sales_report" ? (
                <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                  Open <strong>Summary layouts</strong> for location / company / day / bill-style breakdowns.
                </div>
              ) : null}
            </div>

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
              defaultGroupByColumn={
                appliedSalesSummary
                  ? null
                  : selectedReportSource?.defaultGroupByColumn || null
              }
              enableVirtualization
            />

            {selectedReport.key === "sales_report" ? (
              <>
                <div
                  role="presentation"
                  className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
                    salesSummaryDrawerOpen ? "opacity-100 visible" : "pointer-events-none opacity-0 invisible"
                  }`}
                  onClick={() => setSalesSummaryDrawerOpen(false)}
                />
                <aside
                  className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl transition-transform dark:border-gray-700 dark:bg-gray-800 ${
                    salesSummaryDrawerOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-gray-300">
                          Summary layouts
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                          Pick one breakdown. Company summary: admin sees only their store; super admin sees a row per company (or narrow with company below).
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Close"
                        className="text-lg leading-none text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-300"
                        onClick={() => setSalesSummaryDrawerOpen(false)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-xs">
                    {isSuperAdminUser ? (
                      <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-gray-300">Company scope</label>
                        <select
                          value={salesSummaryScopedCompanyId}
                          onChange={(e) => setSalesSummaryScopedCompanyId(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value="">All allowed companies</option>
                          {(superAdminCompanies || []).map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name || `Company ${c.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-2 font-semibold uppercase tracking-wide text-slate-700 dark:text-gray-300">Breakdown type</div>
                      <div className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
                        {SALES_SUMMARY_MODE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 ${
                              salesSummaryForm.mode === opt.value
                                ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-indigo-900/30"
                                : "border-transparent hover:bg-slate-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="sales_summary_mode"
                              className="shrink-0"
                              checked={salesSummaryForm.mode === opt.value}
                              onChange={() => setSalesSummaryForm((prev) => ({ ...prev, mode: opt.value }))}
                            />
                            <span className="font-medium text-[11px] leading-tight text-slate-800 dark:text-gray-200">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {salesSummaryForm.mode === "day_metrics" ? (
                      <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-gray-300">Day</label>
                        <input
                          type="date"
                          value={salesSummaryForm.day}
                          onChange={(e) => setSalesSummaryForm((prev) => ({ ...prev, day: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-semibold text-slate-700 dark:text-gray-300">From</label>
                          <input
                            type="date"
                            value={salesSummaryForm.from}
                            onChange={(e) => setSalesSummaryForm((prev) => ({ ...prev, from: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-semibold text-slate-700 dark:text-gray-300">To</label>
                          <input
                            type="date"
                            value={salesSummaryForm.to}
                            onChange={(e) => setSalesSummaryForm((prev) => ({ ...prev, to: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    {salesSummaryForm.mode === "bill_detail" ? (
                      <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-gray-300">Bill number</label>
                        <input
                          type="text"
                          value={salesSummaryForm.billNo}
                          onChange={(e) => setSalesSummaryForm((prev) => ({ ...prev, billNo: e.target.value }))}
                          placeholder='e.g. SB/142 or 142'
                          className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-gray-100 p-4 dark:border-gray-700">
                    <button
                      type="button"
                      disabled={salesSummaryLoading}
                      onClick={applySalesSummaryFromPanel}
                      className="w-full rounded bg-blue-600 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      {salesSummaryLoading ? "Loading…" : "Apply breakdown"}
                    </button>
                  </div>
                </aside>
              </>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 border-b border-gray-100 pb-3 dark:border-gray-700">
              <div className="text-base font-semibold text-gray-900 md:text-lg dark:text-gray-100">
                Sales Report Center
              </div>
              <div className="text-xs text-gray-500 md:text-sm dark:text-gray-400">
                Open a report group and choose a report. Blue links are connected to implemented
                sales, customer, stock, or cash modules.
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

export default SalesReports;
