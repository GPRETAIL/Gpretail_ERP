// printerService.js
// Handles direct USB and Bluetooth printer connections from the browser.
// Uses WebUSB API and Web Bluetooth API — works in Chrome/Edge (HTTPS or localhost).

// ── ESC/POS command helpers ───────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;

const ESCPOS = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT_ON: new Uint8Array([ESC, 0x21, 0x10]),
  DOUBLE_HEIGHT_OFF: new Uint8Array([ESC, 0x21, 0x00]),
  LINE_FEED: new Uint8Array([0x0a]),
  CUT: new Uint8Array([GS, 0x56, 0x00]),
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),
};

const textEncoder = new TextEncoder();

const textToBytes = (text) => textEncoder.encode(text);

const buildLine = (left, right, width = 32) => {
  const gap = width - left.length - right.length;
  return left + (gap > 0 ? " ".repeat(gap) : " ") + right;
};

const dashedLine = (width = 32) => "-".repeat(width);

// ── Build ESC/POS receipt bytes ───────────────────────────────────────────

export const buildReceiptBytes = (receipt, paperWidth = 32) => {
  const parts = [];
  const add = (data) => parts.push(data);
  const text = (str) => add(textToBytes(str + "\n"));
  const textBlock = (str) => {
    String(str || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => text(line));
  };

  add(ESCPOS.INIT);

  // Header
  add(ESCPOS.ALIGN_CENTER);
  add(ESCPOS.BOLD_ON);
  add(ESCPOS.DOUBLE_HEIGHT_ON);
  text(receipt.storeName || "Store");
  add(ESCPOS.DOUBLE_HEIGHT_OFF);
  add(ESCPOS.BOLD_OFF);

  if (receipt.storeAddress) text(receipt.storeAddress);
  if (receipt.storePhone) text(`Tel: ${receipt.storePhone}`);
  text(dashedLine(paperWidth));

  add(ESCPOS.ALIGN_LEFT);
  if (receipt.billNo) text(`Bill: ${receipt.billNo}`);
  if (receipt.dateTime) {
    const dt = new Date(receipt.dateTime);
    text(`Date: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`);
  }
  if (receipt.cashierName) text(`Cashier: ${receipt.cashierName}`);
  if (receipt.customerName) text(`Customer: ${receipt.customerName}`);
  text(dashedLine(paperWidth));

  // Items
  add(ESCPOS.BOLD_ON);
  text(buildLine("Item", "Amount", paperWidth));
  add(ESCPOS.BOLD_OFF);
  text(dashedLine(paperWidth));

  for (const item of receipt.items || []) {
    const name = (item.name || "").substring(0, paperWidth - 10);
    const amt = Number(item.amount || 0).toFixed(2);
    text(buildLine(name, amt, paperWidth));
    if (item.qty && item.rate) {
      text(`  ${item.qty} x ${Number(item.rate).toFixed(2)}`);
    }
  }

  text(dashedLine(paperWidth));

  // Totals
  if (receipt.subTotal != null) text(buildLine("Subtotal", Number(receipt.subTotal).toFixed(2), paperWidth));
  if (receipt.discountAmount) text(buildLine("Discount", `-${Number(receipt.discountAmount).toFixed(2)}`, paperWidth));
  if (receipt.taxAmount) text(buildLine(`Tax${receipt.taxPercent ? ` (${receipt.taxPercent}%)` : ""}`, Number(receipt.taxAmount).toFixed(2), paperWidth));

  text(dashedLine(paperWidth));
  add(ESCPOS.BOLD_ON);
  add(ESCPOS.DOUBLE_HEIGHT_ON);
  text(buildLine("TOTAL", Number(receipt.total || 0).toFixed(2), paperWidth));
  add(ESCPOS.DOUBLE_HEIGHT_OFF);
  add(ESCPOS.BOLD_OFF);
  text(dashedLine(paperWidth));

  if (receipt.paidAmount) text(buildLine("Paid", Number(receipt.paidAmount).toFixed(2), paperWidth));
  if (receipt.changeAmount) text(buildLine("Change", Number(receipt.changeAmount).toFixed(2), paperWidth));
  if (receipt.paymentMethod) text(buildLine("Method", receipt.paymentMethod, paperWidth));

  // Footer
  add(ESCPOS.ALIGN_CENTER);
  add(ESCPOS.LINE_FEED);
  if (receipt.footerNote) text(receipt.footerNote);
  if (receipt.message) {
    textBlock(receipt.message);
  } else {
    text("Thank you!");
  }
  add(ESCPOS.LINE_FEED);
  add(ESCPOS.LINE_FEED);
  add(ESCPOS.LINE_FEED);
  add(ESCPOS.PARTIAL_CUT);

  // Merge all parts into a single Uint8Array
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
};

// ── USB Printer ───────────────────────────────────────────────────────────

const USB_PRINTER_FILTERS = [
  { classCode: 7 }, // Printer class
];

export const isWebUsbSupported = () => !!navigator.usb;

export const requestUsbPrinter = async () => {
  if (!navigator.usb) throw new Error("WebUSB is not supported in this browser. Use Chrome or Edge.");

  const device = await navigator.usb.requestDevice({ filters: USB_PRINTER_FILTERS });
  await device.open();

  // Select the first configuration if not already selected
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  // Find the printer interface and claim it
  const iface = device.configuration.interfaces.find((i) =>
    i.alternates.some((a) => a.interfaceClass === 7)
  );
  if (!iface) throw new Error("No printer interface found on this USB device.");

  await device.claimInterface(iface.interfaceNumber);

  // Find the OUT endpoint
  const alt = iface.alternates.find((a) => a.interfaceClass === 7);
  const outEndpoint = alt?.endpoints.find((e) => e.direction === "out");

  return {
    type: "usb",
    device,
    name: device.productName || `USB Printer (${device.vendorId})`,
    interfaceNumber: iface.interfaceNumber,
    endpointNumber: outEndpoint?.endpointNumber || 1,
  };
};

export const sendToUsbPrinter = async (printerRef, data) => {
  if (!printerRef?.device?.opened) {
    throw new Error("USB printer is not connected.");
  }
  await printerRef.device.transferOut(printerRef.endpointNumber, data);
};

export const disconnectUsbPrinter = async (printerRef) => {
  try {
    await printerRef?.device?.close();
  } catch {
    // ignore
  }
};

// ── Bluetooth Printer ─────────────────────────────────────────────────────

// Common BLE printer service/characteristic UUIDs
const BLE_PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const BLE_PRINTER_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";

export const isWebBluetoothSupported = () => !!navigator.bluetooth;

export const requestBluetoothPrinter = async () => {
  if (!navigator.bluetooth) throw new Error("Web Bluetooth is not supported in this browser. Use Chrome or Edge.");

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_PRINTER_SERVICE] }],
    optionalServices: [BLE_PRINTER_SERVICE],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(BLE_PRINTER_SERVICE);
  const characteristic = await service.getCharacteristic(BLE_PRINTER_CHAR);

  return {
    type: "bluetooth",
    device,
    server,
    characteristic,
    name: device.name || "Bluetooth Printer",
  };
};

export const sendToBluetoothPrinter = async (printerRef, data) => {
  if (!printerRef?.server?.connected) {
    throw new Error("Bluetooth printer is not connected.");
  }

  // BLE has a max write size (~512 bytes typically). Send in chunks.
  const CHUNK_SIZE = 512;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await printerRef.characteristic.writeValueWithoutResponse(chunk);
  }
};

export const disconnectBluetoothPrinter = (printerRef) => {
  try {
    printerRef?.server?.disconnect();
  } catch {
    // ignore
  }
};

// ── Unified send ──────────────────────────────────────────────────────────

export const sendToPrinter = async (printerRef, data) => {
  if (printerRef.type === "usb") {
    return sendToUsbPrinter(printerRef, data);
  } else if (printerRef.type === "bluetooth") {
    return sendToBluetoothPrinter(printerRef, data);
  }
  throw new Error(`Unknown printer type: ${printerRef.type}`);
};

export const disconnectPrinter = async (printerRef) => {
  if (printerRef?.type === "usb") return disconnectUsbPrinter(printerRef);
  if (printerRef?.type === "bluetooth") return disconnectBluetoothPrinter(printerRef);
};
