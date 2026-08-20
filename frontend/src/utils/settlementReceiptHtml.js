const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatAmount = (value) => toNum(value, 0).toFixed(2);

const formatSlipDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

const formatSlipTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const buildMetaLine = (label, value) => `
  <div class="meta-line">
    <span class="meta-label">${escapeHtml(label)}</span>
    <span class="meta-sep">:</span>
    <span class="meta-value">${escapeHtml(value)}</span>
  </div>
`;

const buildPaymentLine = (label, value, { asText = false } = {}) => `
  <div class="meta-line payment-line">
    <span class="meta-label">${escapeHtml(label)}</span>
    <span class="meta-sep">:</span>
    <span class="meta-value">${escapeHtml(asText ? String(value ?? "") : formatAmount(value))}</span>
  </div>
`;

export const buildSettlementReceiptHtml = ({
  storeName = "",
  storeAddress = "",
  cashierName = "",
  counterName = "",
  settledAt = null,
  settlementNo = "",
  bills = [],
  grandTotal = 0,
  receivedAmount = 0,
  isRefundSettlement = false,
  refundAmount = 0,
  payments = [],
} = {}) => {
  const settledDate = formatSlipDate(settledAt);
  const settledTime = formatSlipTime(settledAt);
  const billRows = (Array.isArray(bills) ? bills : []).map((row, index) => ({
    sno: row.sno ?? index + 1,
    billNo: row.billNo ?? row.bill_no ?? row.order_number ?? "",
    amount: toNum(row.amount ?? row.settlement_amount ?? row.remaining_amount, 0),
  }));
  const paymentRows = (Array.isArray(payments) ? payments : [])
    .map((row) => ({
      label: String(row.label || "").trim(),
      amount: toNum(row.amount, 0),
      value: row.value ?? row.amount,
      isText: Boolean(row.isText),
    }))
    .filter((row) => row.label && (row.isText ? String(row.value || "").trim() : row.amount > 0));

  const billRowsHtml = billRows.map((row) => `
    <tr>
      <td class="sno">${escapeHtml(row.sno)}</td>
      <td class="bill-no">${escapeHtml(row.billNo)}</td>
      <td class="num">${escapeHtml(formatAmount(row.amount))}</td>
    </tr>
  `).join("");

  const paymentRowsHtml = paymentRows
    .map((row) => buildPaymentLine(row.label, row.value, { asText: row.isText }))
    .join("");
  const settlementAmountLabel = isRefundSettlement ? "Refund Amount" : "Received Amount";
  const settlementAmountValue = isRefundSettlement
    ? Math.abs(toNum(refundAmount, 0))
    : toNum(receivedAmount, 0);

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Settlement ${escapeHtml(settlementNo || "")}</title>
    <style>
      @page { margin: 0.18in; size: auto; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 10px;
        color: #111827;
        background: #ffffff;
        font-family: "Courier New", Courier, monospace;
      }
      .receipt {
        width: 72mm;
        max-width: 100%;
        margin: 0 auto;
        font-size: 11px;
        line-height: 1.35;
      }
      .meta-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 4px;
        margin: 2px 0;
      }
      .meta-label { white-space: nowrap; }
      .meta-sep { text-align: center; }
      .meta-value {
        text-align: right;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .divider {
        border-top: 1px dashed #111827;
        margin: 8px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 3px 2px;
        vertical-align: top;
      }
      th {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-bottom: 1px solid #111827;
      }
      .sno { width: 12%; text-align: left; }
      .bill-no { width: 48%; text-align: left; }
      .num { text-align: right; white-space: nowrap; }
      .payment-line { margin-top: 2px; }
      .store-name {
        text-align: center;
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .store-address {
        text-align: center;
        font-size: 10px;
        line-height: 1.35;
        white-space: pre-wrap;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      ${storeName ? `<div class="store-name">${escapeHtml(storeName)}</div>` : ""}
      ${storeAddress ? `<div class="store-address">${escapeHtml(storeAddress)}</div>` : ""}
      ${storeName || storeAddress ? `<div class="divider"></div>` : ""}
      ${buildMetaLine("Cashier Name", cashierName || "-")}
      ${buildMetaLine("Counter", counterName || "-")}
      ${buildMetaLine("Date", settledDate || "-")}
      ${buildMetaLine("Time", settledTime || "-")}
      ${buildMetaLine("SNO", settlementNo || "-")}
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th class="sno">SL</th>
            <th class="bill-no">BILL NO</th>
            <th class="num">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${billRowsHtml || `<tr><td colspan="3" class="num">-</td></tr>`}
        </tbody>
      </table>
      <div class="divider"></div>
      ${buildPaymentLine("Grand Total", grandTotal)}
      ${buildPaymentLine(settlementAmountLabel, settlementAmountValue)}
      ${paymentRowsHtml ? `<div class="divider"></div>${paymentRowsHtml}` : ""}
    </div>
  </body>
</html>`;
};

export const browserPrintHtml = (html, { copies = 1 } = {}) => {
  const count = Math.min(3, Math.max(1, Number.parseInt(copies, 10) || 1));
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;width:0;height:0;border:none;left:0;top:0;opacity:0;pointer-events:none"
  );
  iframe.setAttribute("title", "Settlement print");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return false;
  }

  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      let remaining = count;
      const next = () => {
        win.print();
        remaining -= 1;
        if (remaining > 0) {
          setTimeout(next, 450);
        } else {
          setTimeout(cleanup, 600);
        }
      };
      next();
    } catch {
      cleanup();
      return false;
    }
    return true;
  };

  if (doc.readyState === "complete") {
    return runPrint();
  }

  iframe.onload = runPrint;
  setTimeout(runPrint, 500);
  return true;
};
