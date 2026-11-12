// Shared by Cash Closing (Sales) and POS Old's Close: denomination counts, money text and the closing slip.

export const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

export const toNum = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const makeCountKey = (denomination) => `count_${denomination}`;

export const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatEmployee = (row) => {
  if (!row) return "-";
  const name = String(row?.name || "").trim() || "Unnamed";
  const code = String(row?.employee_code || "").trim();
  return code ? `${name} (${code})` : name;
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildBlankCounts = () =>
  DENOMINATIONS.reduce((acc, denomination) => {
    acc[makeCountKey(denomination)] = "0";
    return acc;
  }, {});

export const countedTotal = (formData) =>
  DENOMINATIONS.reduce((sum, denomination) => sum + Math.max(0, toInt(formData[makeCountKey(denomination)], 0)) * denomination, 0);

/**
 * What should be in the drawer and how far the count is off: expected = opening + cash sales − cash refunds
 * − counter expenses (the server works out the first three for the counter's open session).
 */
export const closingFigures = (position, expensesInput, counted) => {
  const expenses = Math.max(0, toNum(expensesInput, 0));
  const expected = toNum(position?.expectedBeforeExpenses, 0) - expenses;
  return { expenses, expected, difference: counted - expected };
};

/** The 72mm "Cash Over Statement" slip for a closing. */
export const buildClosingSlipHtml = ({ storeName, printedAt, counterName, receivedByName, cashierName, billNo, position, figures, closingAmount, formData }) => {
  const counts = DENOMINATIONS.map((denomination) => {
    const count = Math.max(0, toInt(formData[makeCountKey(denomination)], 0));
    return { denomination, count, amount: count * denomination };
  });
  const rows = counts.some((row) => row.count > 0) ? counts.filter((row) => row.count > 0) : counts;
  const notesText = String(formData.notes || "").trim();
  const line = (label, value) => `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cash Closing ${escapeHtml(billNo)}</title>
        <style>
          body { font-family: "Courier New", monospace; width: 72mm; margin: 0; padding: 8px; color: #111; font-size: 12px; line-height: 1.35; }
          .title { font-weight: 700; font-size: 15px; }
          .subtitle { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
          .line { border-top: 1px dashed #555; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .row span:last-child { text-align: right; white-space: nowrap; }
          .section-title { font-weight: 700; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 1px 0; font-size: 12px; }
          th { text-align: left; font-weight: 700; }
          td:last-child, th:last-child { text-align: right; }
          .notes { white-space: pre-wrap; word-break: break-word; }
        </style>
      </head>
      <body>
        <div class="title">${escapeHtml(storeName)}</div>
        <div class="subtitle">Cash Over Statement</div>
        <div class="line"></div>
        ${line("Date", printedAt)}
        ${line("Counter", counterName)}
        ${line("Received By", receivedByName)}
        ${line("Cashier", cashierName)}
        ${line("Bill No", billNo)}
        <div class="line"></div>
        <div class="section-title">Amount</div>
        ${line("Opening Cash", formatCurrency(position?.openingAmount))}
        ${line("Cash Sales", formatCurrency(position?.cashSales))}
        ${line("Cash Refunds", formatCurrency(position?.cashRefunds))}
        ${line("Counter Expenses", formatCurrency(figures.expenses))}
        ${line("Expected Cash", formatCurrency(figures.expected))}
        ${line("Counted Cash", formatCurrency(closingAmount))}
        ${line("Difference", formatCurrency(figures.difference))}
        <div class="line"></div>
        <div class="section-title">Cash Denomination</div>
        <table>
          <thead><tr><th>Rs</th><th>Nos</th><th>Amount</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.denomination.toLocaleString("en-IN"))}</td><td>${escapeHtml(row.count)}</td><td>${escapeHtml(formatCurrency(row.amount))}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="line"></div>
        ${line("Total Denomination", formatCurrency(closingAmount))}
        ${notesText ? `<div class="line"></div><div class="section-title">Notes</div><div class="notes">${escapeHtml(notesText)}</div>` : ""}
      </body>
    </html>
  `;
};

/** Prints an HTML document through a hidden iframe. Returns false when the browser can't prepare it. */
export const printHtmlInIframe = (html) => {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  iframe.setAttribute("aria-hidden", "true");
  const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);
  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
    }
    cleanup();
  };
  document.body.appendChild(iframe);
  const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDocument) {
    cleanup();
    return false;
  }
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  return true;
};
