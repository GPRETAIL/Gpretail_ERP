/**
 * GP Retail ERP - Local Silent Printer Connector Service
 * 
 * Runs a local WebSocket server on ws://127.0.0.1:5001 (and ws://localhost:5001)
 * to enable instant, silent printing directly to USB, thermal receipt, and label printers
 * without opening browser print preview dialogs.
 * 
 * Works 100% standalone out-of-the-box with ZERO npm install needed!
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');
const EventEmitter = require('events');

const PORT = process.env.PORT || 5001;
const CONFIG_FILE = path.join(__dirname, 'printer_config.json');
// The connector normally runs as a hidden background process (install_autostart.bat /
// start_background.bat) with no visible console, so console.log alone is invisible to whoever's
// debugging a real print job - append to a real file next to the script instead.
const DEBUG_LOG_FILE = path.join(__dirname, 'print-debug.log');
const logDebug = (line) => {
  try {
    fs.appendFileSync(DEBUG_LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
  } catch {}
};
const VERSION = '2.0.0';
const isWindows = process.platform === 'win32';

process.on('uncaughtException', (err) => {
  console.error('[Connector Error]', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Connector Rejection]', reason);
});

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading config file:', err.message);
  }
  return {
    selectedPrinterName: '',
    selectedPrinterNames: [],
    selectedTransport: 'printer',
    selectedBluetoothDeviceName: '',
    printerRoutes: [],
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving config file:', err.message);
    return false;
  }
}

// Installed printers essentially never change during normal operation, but this was being
// re-queried via a fresh PowerShell + WMI (Get-CimInstance) call on every single print job -
// measured at ~1.3s by itself, more than every other stage of the print pipeline combined. Cache
// it for a minute; the explicit "list printers" UI action (Settings > Printing Configuration)
// still forces a fresh read so a newly-connected printer shows up without waiting out the cache.
const PRINTER_LIST_CACHE_TTL_MS = 60000;
let printerListCache = null;
let printerListCacheAt = 0;

function fetchSystemPrintersUncached() {
  return new Promise((resolve) => {
    const isWindows = os.platform() === 'win32';

    if (isWindows) {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline, Local | ConvertTo-Json -Compress"`;
      exec(psCommand, { timeout: 8000 }, (error, stdout) => {
        if (error || !stdout || !stdout.trim()) {
          exec('wmic printer get name,default,workoffline /format:csv', { timeout: 6000 }, (wmicErr, wmicOut) => {
            if (wmicErr || !wmicOut || !wmicOut.trim()) {
              resolve([]);
              return;
            }
            const lines = wmicOut.trim().split(/\r?\n/).slice(1);
            const printers = lines.map(line => {
              const parts = line.split(',');
              if (parts.length >= 3) {
                return {
                  name: parts[2]?.trim() || parts[1]?.trim(),
                  isDefault: parts[1]?.toLowerCase() === 'true',
                  isOffline: parts[3]?.toLowerCase() === 'true',
                  connectionType: 'USB',
                  canPrint: true,
                };
              }
              return null;
            }).filter(p => p && p.name);
            resolve(printers);
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const printers = list.map(item => ({
            name: String(item.Name || '').trim(),
            isDefault: Boolean(item.Default),
            isOffline: Boolean(item.WorkOffline),
            connectionType: item.Local ? 'USB' : 'Network',
            canPrint: !item.WorkOffline,
          })).filter(p => p.name);
          resolve(printers);
        } catch {
          resolve([]);
        }
      });
    } else {
      exec('lpstat -p -d', { timeout: 6000 }, (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        const lines = stdout.split('\n');
        let defaultPrinter = '';
        const printers = [];

        lines.forEach(line => {
          if (line.startsWith('system default destination:')) {
            defaultPrinter = line.split(':')[1]?.trim() || '';
          } else if (line.startsWith('printer ')) {
            const match = line.match(/^printer\s+([^\s]+)/);
            if (match && match[1]) {
              const name = match[1];
              printers.push({
                name,
                isDefault: name === defaultPrinter,
                isOffline: line.includes('disabled'),
                connectionType: 'Local',
                canPrint: true,
              });
            }
          }
        });
        resolve(printers);
      });
    }
  });
}

async function getSystemPrinters({ forceRefresh = false } = {}) {
  if (!forceRefresh && printerListCache && (Date.now() - printerListCacheAt) < PRINTER_LIST_CACHE_TTL_MS) {
    return printerListCache;
  }
  const printers = await fetchSystemPrintersUncached();
  printerListCache = printers;
  printerListCacheAt = Date.now();
  return printers;
}

// Silent print execution without print preview
async function executeSilentPrint(payload) {
  const isWindows = os.platform() === 'win32';
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const config = loadConfig();

  const labelData = payload.Label || payload.label;
  const imageDataUrl = labelData?.imageDataUrl || labelData?.dataUrl;
  logDebug(`Job received: docType=${payload.DocumentType || payload.documentType} printerFunction=${payload.PrinterFunction || payload.printerFunction} labelKind=${typeof labelData === "object" ? labelData?.kind : typeof labelData} hasLabelPages=${Array.isArray(labelData?.pages)} hasImageDataUrl=${!!imageDataUrl} imageDataUrlLen=${imageDataUrl ? String(imageDataUrl).length : 0} hasReceipt=${!!(payload.Receipt || payload.receipt)} hasMessage=${!!(payload.Message || payload.message)} messageLen=${String(payload.Message || payload.message || "").length}`);
  const isReceiptOrLabel = Boolean(imageDataUrl || labelData || /receipt|label|pos/i.test(payload.DocumentType || payload.documentType || ''));

  const systemPrinters = await getSystemPrinters();

  let targetPrinterName = 
    payload.Printer?.PrinterName || 
    payload.PrinterName || 
    payload.printerName || 
    '';

  // Check function routing (e.g. printer_function === "receipt")
  if (!targetPrinterName && Array.isArray(config.printerRoutes)) {
    const route = config.printerRoutes.find(r => 
      r.printer_function && (
        (isReceiptOrLabel && String(r.printer_function).toLowerCase() === 'receipt') ||
        (!isReceiptOrLabel && String(r.printer_function).toLowerCase() === 'a4')
      )
    );
    if (route?.printer_name) targetPrinterName = route.printer_name;
  }

  if (!targetPrinterName && config.selectedPrinterName) {
    targetPrinterName = config.selectedPrinterName;
  }

  // Auto-detect thermal printer for receipts if not explicitly picked
  if (!targetPrinterName && isReceiptOrLabel && systemPrinters.length > 0) {
    const thermal = systemPrinters.find(p => /rp3200|tvs|pos|thermal|tm-t|receipt|tsp|te244|zebra|tsc/i.test(p.name));
    if (thermal) targetPrinterName = thermal.name;
  }

  // Fallback to system default printer
  if (!targetPrinterName && systemPrinters.length > 0) {
    const defaultP = systemPrinters.find(p => p.isDefault) || systemPrinters[0];
    targetPrinterName = defaultP?.name || '';
  }

  console.log(`[Connector] Silent Print Target: "${targetPrinterName}"`);

  // Windows' spooler happily accepts a job for a printer that's powered off or disconnected and
  // reports the hand-off as successful - the job just sits queued at the OS level while nothing
  // physically prints, and the WS caller has no way to know. Catch the most common real failure
  // (offline/unreachable printer) before spending time on the print attempt at all.
  if (targetPrinterName) {
    const targetPrinterInfo = systemPrinters.find(
      p => p.name.toLowerCase() === targetPrinterName.toLowerCase()
    );
    if (targetPrinterInfo?.isOffline) {
      throw new Error(`Printer "${targetPrinterName}" is offline or unreachable. Check it's powered on and connected, then try again.`);
    }
  }

  // 0. Multi-page image print (one page per physical label row) - label printers with a die-cut/
  // gap-sensing roll are normally driven by their Windows driver as one page PER row, with the
  // driver (not our software) owning the real label pitch and advancing/cutting at each page
  // boundary. A single tall "page" covering several rows relies on the driver accepting an
  // arbitrarily tall custom page size, which some label-printer drivers silently refuse - they
  // just print whatever fits their configured one-label media size and drop the rest, which looks
  // like only the first label printed no matter how many were requested. BarcodeGeneration.jsx
  // renders each row as its own image for exactly this reason - print them as separate pages of
  // one PrintDocument so the printer's own gap sensor paces each one correctly.
  const labelPages = Array.isArray(labelData?.pages) ? labelData.pages.filter((p) => p?.imageDataUrl) : [];
  if (isWindows && labelPages.length > 0) {
    logDebug(`Branch 0 (multi-page label) selected: ${labelPages.length} pages`);
    const mmToHundredthsInch = (mm) => Math.round((Number(mm) || 0) * 100 / 25.4);
    const pageImagePaths = labelPages.map((pageData, index) => {
      const base64Data = pageData.imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const imgPath = path.join(tempDir, `print_job_${timestamp}_p${index}.png`);
      fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
      return imgPath;
    });
    const firstPage = labelPages[0];
    const printableWHundredths = firstPage.pageWidthMm ? Math.max(50, mmToHundredthsInch(firstPage.pageWidthMm)) : 275;
    const pageHHundredths = firstPage.pageHeightMm ? Math.max(50, mmToHundredthsInch(firstPage.pageHeightMm)) : 400;
    // Print-time calibration offset (from the Warehouse Customisation "print margin" settings) -
    // for compensating a printer's own print-head-vs-gap-sensor offset. The physical label size is
    // fixed regardless of what we ask for, so the page size itself is NOT changed by this - only
    // where the (unchanged-size) content gets drawn within that fixed page shifts. A negative
    // offset naturally clips the leading edge and leaves a gap at the trailing edge (and vice
    // versa for positive) rather than growing/shrinking the page, since resizing the page would
    // just rescale the whole image rather than truly shifting it relative to the real label.
    const marginTopHundredths = mmToHundredthsInch(labelData?.marginTopMm || 0);
    const marginLeftHundredths = mmToHundredthsInch(labelData?.marginLeftMm || 0);

    return new Promise((resolve, reject) => {
      const imagePathsLiteral = pageImagePaths
        .map((p) => `"${p.replace(/\\/g, '\\\\')}"`)
        .join(', ');
      const psScript = `
Add-Type -AssemblyName System.Drawing

$targetPrinter = "${targetPrinterName.replace(/"/g, '`"')}"
$imagePaths = @(${imagePathsLiteral})

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController

if ($targetPrinter) {
    $doc.PrinterSettings.PrinterName = $targetPrinter
}

if (-not $doc.PrinterSettings.IsValid) {
    Write-Error "Invalid printer: $targetPrinter"
    exit 1
}

# GDI/the driver otherwise silently picks whatever resolution profile it defaults to (often a
# conservative "Normal"/lower-DPI preset, not the print head's real native maximum) - the app has
# to explicitly ask for the highest one the driver reports, or a print can look soft even with a
# high-resolution source image, since the actual dots on the label are capped by this setting
# regardless of source detail.
try {
    $bestRes = $doc.PrinterSettings.PrinterResolutions | Sort-Object X -Descending | Select-Object -First 1
    if ($bestRes) {
        $doc.DefaultPageSettings.PrinterResolution = $bestRes
    }
} catch {}

$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false

$printableW = ${printableWHundredths}
$pageH = ${pageHHundredths}
$offsetX = ${marginLeftHundredths}
$offsetY = ${marginTopHundredths}

try {
    # Exact page size, no extra buffer - on gap-sensing label media the printer's own sensor
    # paces each physical label using its real pitch. Any extra height added here (a previous
    # "+20 hundredths-inch bleed" attempt) makes the driver think each page is taller than one
    # real label, so it advances past additional blank labels to resync with the next detected
    # gap - visible as labels being skipped between printed ones.
    $rollSize = New-Object System.Drawing.Printing.PaperSize("CustomLabel", [int]$printableW, [int]$pageH)
    $doc.DefaultPageSettings.PaperSize = $rollSize
} catch {}

$script:pageIndex = 0

$doc.add_PrintPage({
    param($sender, $e)
    $img = [System.Drawing.Image]::FromFile($imagePaths[$script:pageIndex])
    # Bicubic/high-quality smoothing is meant for photographic gradients - on monochrome thermal
    # output it introduces grey anti-aliased pixels at every text/QR edge, which the printer then
    # has to threshold/dither down to pure black-and-white, turning crisp edges into a blurred/
    # fuzzy look. NearestNeighbor with no smoothing keeps edges hard, which prints far more legibly
    # on 1-bit thermal hardware even though it would look worse for a real photo.
    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $e.Graphics.DrawImage($img, [int]$offsetX, [int]$offsetY, [int]$printableW, [int]$pageH)
    $img.Dispose()
    $script:pageIndex++
    $e.HasMorePages = ($script:pageIndex -lt $imagePaths.Count)
})

$doc.Print()
$doc.Dispose()
`;
      const tempPs1 = path.join(tempDir, `print_job_${timestamp}.ps1`);
      fs.writeFileSync(tempPs1, psScript, 'utf8');

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { timeout: 30000 }, (err, out, stderr) => {
        try { fs.unlinkSync(tempPs1); } catch {}
        pageImagePaths.forEach((p) => { try { fs.unlinkSync(p); } catch {} });
        if (err) {
          console.error('[Connector] Multi-page label print error:', err.message, stderr);
          reject(new Error(`Silent print failed: ${err.message}`));
        } else {
          console.log(`[Connector] ${labelPages.length}-page label sheet printed directly to "${targetPrinterName}"`);
          resolve({ success: true, message: `${labelPages.length}-page document printed silently to ${targetPrinterName}` });
        }
      });
    });
  }

  // ESC/POS raw byte print (GDI-free fast path for receipts) - checked ahead of the rendered-image
  // branch so it takes priority when present. Unlike every other branch in this function, this one
  // deliberately never loads System.Drawing/GDI+ - the whole point is skipping that assembly-load
  // cost (and all image rasterization) entirely, writing the already-built byte stream straight to
  // the printer via the spooler's RAW datatype (OpenPrinter/StartDocPrinter/WritePrinter/
  // EndDocPrinter from winspool.drv - the standard "RawPrinterHelper" P/Invoke pattern). On any
  // failure this throws/rejects the same way Branch 1 does, which is what lets the frontend's
  // queue-level catch fall back cleanly to the rendered-image path rather than the job vanishing.
  if (isWindows && labelData?.kind === 'escpos_raw_v1' && typeof labelData.dataBase64 === 'string' && labelData.dataBase64) {
    // Many receipt-printer vendors only ship a GDI-oriented driver (built for the rendered-image
    // path, not for raw ESC/POS bytes) - even with datatype "RAW", that kind of driver can still
    // intercept and reprocess the byte stream through its own font/rendering logic instead of
    // passing it straight to the printer. config.escposPrinterName lets this branch target a
    // separate queue (e.g. a "Generic / Text Only" queue on the same port) that's a genuine raw
    // passthrough, without disturbing targetPrinterName used by every other (image-based) branch.
    const escposTargetPrinterName = config.escposPrinterName || targetPrinterName;
    logDebug(`Branch ESC/POS (raw bytes) selected: ~${labelData.byteLength || labelData.dataBase64.length} bytes, printer="${escposTargetPrinterName}"`);
    const rawBuffer = Buffer.from(labelData.dataBase64, 'base64');
    const tempPrnPath = path.join(tempDir, `print_job_${timestamp}.prn`);
    fs.writeFileSync(tempPrnPath, rawBuffer);

    return new Promise((resolve, reject) => {
      const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        try {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "GP Retail ESC/POS Receipt";
            di.pDataType = "RAW";
            if (!StartDocPrinter(hPrinter, 1, di)) return false;
            try {
                if (!StartPagePrinter(hPrinter)) return false;
                try {
                    int written;
                    return WritePrinter(hPrinter, bytes, bytes.Length, out written) && written == bytes.Length;
                } finally { EndPagePrinter(hPrinter); }
            } finally { EndDocPrinter(hPrinter); }
        } finally { ClosePrinter(hPrinter); }
    }
}
"@

$targetPrinter = "${escposTargetPrinterName.replace(/"/g, '`"')}"
$bytes = [System.IO.File]::ReadAllBytes("${tempPrnPath.replace(/\\/g, '\\\\')}")

if (-not $targetPrinter) {
    Write-Error "No target printer resolved"
    exit 1
}

$ok = [RawPrinterHelper]::SendBytesToPrinter($targetPrinter, $bytes)
if (-not $ok) {
    Write-Error "WritePrinter failed for '$targetPrinter'"
    exit 1
}
`;
      const tempPs1 = path.join(tempDir, `print_job_${timestamp}_escpos.ps1`);
      fs.writeFileSync(tempPs1, psScript, 'utf8');

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { timeout: 15000 }, (err, out, stderr) => {
        try { fs.unlinkSync(tempPs1); } catch {}
        try { fs.unlinkSync(tempPrnPath); } catch {}
        if (err) {
          logDebug(`Branch ESC/POS failed: ${err.message} ${stderr}`);
          console.error('[Connector] ESC/POS raw print error:', err.message, stderr);
          reject(new Error(`Silent print failed: ${err.message}`));
        } else {
          logDebug('Branch ESC/POS succeeded');
          console.log(`[Connector] ESC/POS receipt (${rawBuffer.length} bytes) printed directly to "${escposTargetPrinterName}"`);
          resolve({ success: true, message: `Receipt printed silently to ${escposTargetPrinterName}` });
        }
      });
    });
  }

  // 1. Image-based print (pixel-perfect rendered receipt sheet, barcodes, labels)
  if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
    logDebug('Branch 1 (rendered image) selected');
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const tempImgPath = path.join(tempDir, `print_job_${timestamp}.png`);
    fs.writeFileSync(tempImgPath, imgBuffer);

    // The physical print width/height must match the REAL page the image was rendered for (a
    // receipt roll and a multi-label barcode sheet are very different widths), not a fixed
    // assumption - otherwise the whole image gets scaled to fit the wrong physical size, and on a
    // pre-die-cut label roll the printer's own gap sensor advances to the REAL label boundaries
    // regardless, so the (wrongly-scaled) content drifts further out of alignment with each row.
    // buildBarcodeSheetMarkup/renderPrintableHtmlToImageJob already compute the real intended
    // sheetWidthMm/sheetHeightMm and send them through as pageWidthMm/pageHeightMm on the label
    // payload - use them directly when present instead of the old fixed "80mm roll" guess.
    const mmToHundredthsInch = (mm) => Math.round((Number(mm) || 0) * 100 / 25.4);
    const explicitWidthHundredths = labelData?.pageWidthMm ? Math.max(50, mmToHundredthsInch(labelData.pageWidthMm)) : 0;
    const explicitHeightHundredths = labelData?.pageHeightMm ? Math.max(50, mmToHundredthsInch(labelData.pageHeightMm)) : 0;

    return new Promise((resolve, reject) => {
      if (isWindows) {
        // Silent print with StandardPrintController (NO Windows print popup/taskbar dialog)
        const psScript = `
Add-Type -AssemblyName System.Drawing

$targetPrinter = "${targetPrinterName.replace(/"/g, '`"')}"
$imgPath = "${tempImgPath.replace(/\\/g, '\\\\')}"

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController

if ($targetPrinter) {
    $doc.PrinterSettings.PrinterName = $targetPrinter
}

if (-not $doc.PrinterSettings.IsValid) {
    Write-Error "Invalid printer: $targetPrinter"
    exit 1
}

# GDI/the driver otherwise silently picks whatever resolution profile it defaults to (often a
# conservative "Normal"/lower-DPI preset, not the print head's real native maximum) - the app has
# to explicitly ask for the highest one the driver reports, or a print can look soft even with a
# high-resolution source image, since the actual dots on the page are capped by this setting
# regardless of source detail.
try {
    $bestRes = $doc.PrinterSettings.PrinterResolutions | Sort-Object X -Descending | Select-Object -First 1
    if ($bestRes) {
        $doc.DefaultPageSettings.PrinterResolution = $bestRes
    }
} catch {}

$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false

$image = [System.Drawing.Image]::FromFile($imgPath)

# Printable bounds (units: 1/100 inch) - use the real page size the image was rendered for when
# available (barcode sheets and receipts have very different widths), falling back to the old
# fixed 80mm-roll assumption only when the caller didn't provide one.
$printableW = ${explicitWidthHundredths || 275}
${explicitHeightHundredths
  ? `$pageH = ${explicitHeightHundredths}`
  : `$ratio = $image.Height / $image.Width\n$pageH = [int]($printableW * $ratio)`}

# The rendered content's own width can be a hair wider than what the printer's driver actually
# registers as its paper/print-head width (a "3 inch" roll's real printable area is very often
# narrower than the nominal 3.00in, e.g. this driver reports "80(76)mm" media as 2.83in) -
# requesting a custom page wider than that doesn't make the printer wider, it just prints past
# where the head can reach and the excess is lost, clipping the right edge. Cap to the driver's
# own reported maximum (with a small safety margin) instead of trusting the source content's width.
try {
    $maxPaperW = ($doc.PrinterSettings.PaperSizes | Measure-Object -Property Width -Maximum).Maximum
    if ($maxPaperW -gt 0 -and $printableW -gt ($maxPaperW - 3)) {
        $printableW = [int]($maxPaperW - 3)
    }
} catch {}

try {
    # Exact page size, no extra buffer - a previous "+8/+20 hundredths-inch bleed" attempt made the
    # driver think the page was larger than the real media, which (on gap-sensing label stock) was
    # the root cause of skipped labels; kept exact here for the same reason and because any padding
    # only makes the already-tight right-edge fit worse.
    $rollSize = New-Object System.Drawing.Printing.PaperSize("CustomReceipt", [int]$printableW, [int]$pageH)
    $doc.DefaultPageSettings.PaperSize = $rollSize
} catch {}

$doc.add_PrintPage({
    param($sender, $e)
    # See the label-print branch above for why: bicubic/smoothing is for photographic content,
    # but on 1-bit thermal output it turns crisp text/barcode edges into a blurred, dithered look.
    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $e.Graphics.DrawImage($image, 0, 0, [int]$printableW, [int]$pageH)
    $e.HasMorePages = $false
})

$doc.Print()
$image.Dispose()
$doc.Dispose()
`;
        const tempPs1 = path.join(tempDir, `print_job_${timestamp}.ps1`);
        fs.writeFileSync(tempPs1, psScript, 'utf8');

        exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { timeout: 25000 }, (err, stdout, stderr) => {
          try { fs.unlinkSync(tempPs1); } catch {}
          try { fs.unlinkSync(tempImgPath); } catch {}
          if (err) {
            console.error('[Connector] Silent image print error:', err.message, stderr);
            reject(new Error(`Silent print failed: ${err.message}`));
          } else {
            console.log(`[Connector] Pixel-perfect receipt printed directly to "${targetPrinterName}"`);
            resolve({ success: true, message: `Document printed silently to ${targetPrinterName}` });
          }
        });
      } else {
        const lpCmd = targetPrinterName ? `lp -d "${targetPrinterName}" "${tempImgPath}"` : `lp "${tempImgPath}"`;
        exec(lpCmd, (err) => {
          try { fs.unlinkSync(tempImgPath); } catch {}
          if (err) reject(new Error(`Silent print failed: ${err.message}`));
          else resolve({ success: true, message: `Document printed silently to ${targetPrinterName}` });
        });
      }
    });
  }

  // 2. Structured Receipt Print (Fallback)
  const receipt = payload.Receipt || payload.receipt || payload.receiptData;
  if (receipt && typeof receipt === 'object' && (Array.isArray(receipt.items) || Array.isArray(receipt.Items) || receipt.storeName || receipt.StoreName || receipt.billNo || receipt.BillNo)) {
    logDebug(`Branch 2 (structured GDI receipt) selected: storeName=${receipt.storeName || receipt.StoreName} billNo=${receipt.billNo || receipt.BillNo}`);
    return printReceiptViaGdi(receipt, targetPrinterName, timestamp, tempDir);
  }

  // 3. HTML content printing (A4, invoices, thermal receipts)
  const htmlContent = payload.Message || payload.message || '';
  if (htmlContent) {
    logDebug(`Branch 3 (HTML via headless browser/shell print) selected: htmlLen=${htmlContent.length}`);
    const tempHtmlPath = path.join(tempDir, `print_job_${timestamp}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

    return new Promise((resolve, reject) => {
      if (isWindows) {
        const browserPaths = [
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        ];
        const browserExe = browserPaths.find(p => p && fs.existsSync(p));

        if (browserExe && targetPrinterName) {
          const cmd = `"${browserExe}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-printer="${targetPrinterName}" "${tempHtmlPath}"`;
          exec(cmd, { timeout: 20000 }, (err) => {
            setTimeout(() => {
              try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch {}
            }, 3000);
            if (err) {
              console.error(`[Connector] Browser silent print notice: ${err.message}`);
              // Fallback to powershell print if browser failed
              fallbackWindowsPrint(tempHtmlPath, targetPrinterName, resolve, reject);
            } else {
              console.log(`[Connector] HTML receipt printed silently to "${targetPrinterName}"`);
              resolve({ success: true, message: `Document printed silently to ${targetPrinterName}` });
            }
          });
        } else {
          fallbackWindowsPrint(tempHtmlPath, targetPrinterName, resolve, reject);
        }
      } else {
        const lpCmd = targetPrinterName ? `lp -d "${targetPrinterName}" "${tempHtmlPath}"` : `lp "${tempHtmlPath}"`;
        exec(lpCmd, (err) => {
          try { fs.unlinkSync(tempHtmlPath); } catch {}
          if (err) reject(new Error(`Silent print failed: ${err.message}`));
          else resolve({ success: true, message: `Document printed silently to ${targetPrinterName}` });
        });
      }
    });
  }

  logDebug('No branch matched - empty print payload');
  return { success: true, message: 'Empty print payload received' };
}

function fallbackWindowsPrint(filePath, printerName, resolve, reject) {
  if (!fs.existsSync(filePath)) {
    resolve({ success: true, message: 'Print job dispatched' });
    return;
  }
  const psCmd = printerName 
    ? `powershell -NoProfile -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '${printerName}' -PassThru | Wait-Process -Timeout 10"`
    : `powershell -NoProfile -Command "Start-Process -FilePath '${filePath}' -Verb Print -PassThru | Wait-Process -Timeout 10"`;
  
  exec(psCmd, (err) => {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    if (err) {
      console.warn(`[Connector] Fallback notice: ${err.message}`);
      resolve({ success: true, message: 'Print command sent to Windows spooler' });
    } else {
      resolve({ success: true, message: 'Print job dispatched' });
    }
  });
}

function printReceiptViaGdi(receipt, targetPrinterName, timestamp, tempDir) {
  return new Promise((resolve, reject) => {
    if (!isWindows) {
      return resolve({ success: true, message: 'Non-Windows receipt print' });
    }

    const storeName = String(receipt.StoreName || receipt.storeName || 'GP RETAIL ERP').trim();
    const storeAddress = String(receipt.StoreAddress || receipt.storeAddress || '').trim();
    const storePhone = String(receipt.StorePhone || receipt.storePhone || '').trim();
    const storeGst = String(receipt.StoreGstNo || receipt.storeGstNo || '').trim();
    const billNo = String(receipt.BillNo || receipt.billNo || '').trim();
    const cashier = String(receipt.CashierName || receipt.cashierName || '').trim();
    const customer = String(receipt.CustomerName || receipt.customerName || 'Walking customer').trim();
    const payMode = String(receipt.PaymentMethod || receipt.paymentMethod || 'Cash').trim();
    const rawItems = receipt.Items || receipt.items || [];
    const items = Array.isArray(rawItems) ? rawItems : [];

    const gross = Number(receipt.SubTotal || receipt.subTotal || receipt.billAmount || receipt.BillAmount || 0) || 0;
    const discount = Number(receipt.DiscountAmount || receipt.discountAmount || 0) || 0;
    const tax = Number(receipt.TaxAmount || receipt.taxAmount || 0) || 0;
    const netTotal = Number(receipt.Total || receipt.total || receipt.grandTotal || (gross - discount + tax)) || 0;
    const paid = Number(receipt.PaidAmount || receipt.paidAmount || receipt.receivedAmount || receipt.ReceivedAmount || 0) || 0;
    const change = Number(receipt.ChangeAmount || receipt.changeAmount || 0) || 0;
    const message = String(receipt.Message || receipt.message || receipt.FooterNote || receipt.footerNote || '* Thank You! Visit Again *').trim();

    const psItemsCode = items.map(it => {
      const name = String(it.Name || it.name || it.productName || it.ProductName || 'Item').replace(/"/g, '`"');
      const qty = Number(it.Qty || it.qty || it.quantity || 1) || 1;
      const rate = Number(it.Rate || it.rate || it.price || it.Price || 0) || 0;
      const amount = Number(it.Amount || it.amount || (qty * rate) || 0) || 0;
      return `    [PSCustomObject]@{ Name = "${name}"; Qty = ${qty}; Rate = ${rate}; Amount = ${amount} }`;
    }).join(",\n");

    const psScript = `
Add-Type -AssemblyName System.Drawing

$targetPrinter = "${targetPrinterName.replace(/"/g, '`"')}"
$storeName = "${storeName.replace(/"/g, '`"')}"
$storeAddress = "${storeAddress.replace(/"/g, '`"')}"
$storePhone = "${storePhone.replace(/"/g, '`"')}"
$storeGst = "${storeGst.replace(/"/g, '`"')}"
$billNo = "${billNo.replace(/"/g, '`"')}"
$cashier = "${cashier.replace(/"/g, '`"')}"
$customer = "${customer.replace(/"/g, '`"')}"
$payMode = "${payMode.replace(/"/g, '`"')}"
$gross = ${gross}
$discount = ${discount}
$tax = ${tax}
$netTotal = ${netTotal}
$paid = ${paid}
$change = ${change}
$message = "${message.replace(/"/g, '`"').replace(/\n/g, '`n')}"

$items = @(
${psItemsCode}
)

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
if ($targetPrinter) { $doc.PrinterSettings.PrinterName = $targetPrinter }

$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$doc.OriginAtMargins = $false

$pageW = 283
$lineCount = $items.Count * 2 + 28
$pageH = [int]($lineCount * 18 + 140)

try {
    $rollSize = New-Object System.Drawing.Printing.PaperSize("CustomReceipt", [int]$pageW, [int]$pageH)
    $doc.DefaultPageSettings.PaperSize = $rollSize
} catch {}

$doc.add_PrintPage({
    param($sender, $e)
    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit

    $titleFont = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $boldFont = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Bold)
    $regFont = New-Object System.Drawing.Font("Arial", 8.5, [System.Drawing.FontStyle]::Regular)
    $smallFont = New-Object System.Drawing.Font("Arial", 7.5, [System.Drawing.FontStyle]::Regular)
    $brush = [System.Drawing.Brushes]::Black
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 1)
    $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

    $y = 10

    # Header
    $sfCenter = New-Object System.Drawing.StringFormat
    $sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $rectHeader = New-Object System.Drawing.RectangleF(0, $y, $pageW, 20)
    $g.DrawString($storeName, $titleFont, $brush, $rectHeader, $sfCenter)
    $y += 22

    if ($storeAddress) {
        $rectAddr = New-Object System.Drawing.RectangleF(5, $y, ($pageW - 10), 30)
        $g.DrawString($storeAddress, $smallFont, $brush, $rectAddr, $sfCenter)
        $y += 26
    }
    if ($storePhone -or $storeGst) {
        $metaLine = ""
        if ($storePhone) { $metaLine += "Ph: $storePhone  " }
        if ($storeGst) { $metaLine += "GST: $storeGst" }
        $rectMeta = New-Object System.Drawing.RectangleF(0, $y, $pageW, 16)
        $g.DrawString($metaLine, $smallFont, $brush, $rectMeta, $sfCenter)
        $y += 18
    }

    # Separator
    $g.DrawLine($pen, 5, $y, ($pageW - 5), $y)
    $y += 6

    # Bill Info
    $g.DrawString("Bill No: $billNo", $boldFont, $brush, 5, $y)
    $dateStr = (Get-Date -Format "dd/MM/yy hh:mm tt")
    $sfRight = New-Object System.Drawing.StringFormat
    $sfRight.Alignment = [System.Drawing.StringAlignment]::Far
    $g.DrawString($dateStr, $smallFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
    $y += 16

    if ($customer -and $customer -ne "-") {
        $g.DrawString("Customer: $customer", $smallFont, $brush, 5, $y)
    }
    if ($cashier) {
        $g.DrawString("Cashier: $cashier", $smallFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
    }
    $y += 18

    # Table Header
    $g.DrawLine($pen, 5, $y, ($pageW - 5), $y)
    $y += 5
    $g.DrawString("ITEM DESCRIPTION", $boldFont, $brush, 5, $y)
    $g.DrawString("QTY", $boldFont, $brush, 145, $y)
    $g.DrawString("RATE", $boldFont, $brush, 190, $y)
    $g.DrawString("TOTAL", $boldFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
    $y += 16
    $g.DrawLine($pen, 5, $y, ($pageW - 5), $y)
    $y += 6

    # Items
    foreach ($item in $items) {
        $iName = [string]$item.Name
        $iQty = [double]$item.Qty
        $iRate = [double]$item.Rate
        $iAmt = [double]$item.Amount

        $g.DrawString($iName, $regFont, $brush, 5, $y)
        $y += 14

        $qtyStr = $iQty.ToString("0.00")
        $rateStr = $iRate.ToString("0.00")
        $amtStr = $iAmt.ToString("0.00")

        $g.DrawString($qtyStr, $smallFont, $brush, 145, $y)
        $g.DrawString($rateStr, $smallFont, $brush, 190, $y)
        $g.DrawString($amtStr, $regFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 16
    }

    # Totals
    $g.DrawLine($pen, 5, $y, ($pageW - 5), $y)
    $y += 6

    if ($gross -gt 0 -and $gross -ne $netTotal) {
        $g.DrawString("Gross Amount:", $regFont, $brush, 5, $y)
        $g.DrawString($gross.ToString("0.00"), $regFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 16
    }

    if ($discount -gt 0) {
        $g.DrawString("Discount:", $regFont, $brush, 5, $y)
        $g.DrawString("-" + $discount.ToString("0.00"), $regFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 16
    }

    if ($tax -gt 0) {
        $g.DrawString("Tax Amount:", $regFont, $brush, 5, $y)
        $g.DrawString($tax.ToString("0.00"), $regFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 16
    }

    # Net Total
    $g.DrawString("NET TOTAL:", $titleFont, $brush, 5, $y)
    $g.DrawString("Rs. " + $netTotal.ToString("0.00"), $titleFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 20)), $sfRight)
    $y += 22

    if ($paid -gt 0) {
        $g.DrawString("Paid ($payMode):", $smallFont, $brush, 5, $y)
        $g.DrawString($paid.ToString("0.00"), $smallFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 15
    }

    if ($change -gt 0) {
        $g.DrawString("Change Returned:", $smallFont, $brush, 5, $y)
        $g.DrawString($change.ToString("0.00"), $smallFont, $brush, (New-Object System.Drawing.RectangleF(0, $y, ($pageW - 5), 16)), $sfRight)
        $y += 16
    }

    $g.DrawLine($pen, 5, $y, ($pageW - 5), $y)
    $y += 8

    # Thank you
    if ($message) {
        $rectThanks = New-Object System.Drawing.RectangleF(0, $y, $pageW, 40)
        $g.DrawString($message, $boldFont, $brush, $rectThanks, $sfCenter)
    }

    $e.HasMorePages = $false
})

$doc.Print()
$doc.Dispose()
`;

    const tempPs1 = path.join(tempDir, `receipt_gdi_${timestamp}.ps1`);
    fs.writeFileSync(tempPs1, psScript, 'utf8');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { timeout: 20000 }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tempPs1); } catch {}
      if (err) {
        console.error('[Connector] Receipt GDI print error:', err.message, stderr);
        reject(new Error(`Receipt print failed: ${err.message}`));
      } else {
        console.log(`[Connector] Receipt printed directly to "${targetPrinterName}" via GDI engine`);
        resolve({ success: true, message: `Receipt printed successfully to ${targetPrinterName}` });
      }
    });
  });
}

// Native Standalone WebSocket Server Implementation (RFC 6455)
class SimpleWebSocketConnection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    // Reassembly state for fragmented messages (FIN=0 frames followed by opcode 0x0 continuations).
    // Large payloads - e.g. the base64 print-image data barcode/receipt jobs send - can arrive
    // split across multiple frames. Without this, only the first fragment was ever read (and
    // handed to JSON.parse incomplete, so it always failed and silently fell through to the
    // generic "Acknowledged" reply below instead of actually attempting the print), while the
    // remaining fragments were dropped entirely.
    this.fragmentChunks = null;
    this.fragmentOpcode = null;

    socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.parseFrames();
    });

    socket.on('close', () => this.emit('close'));
    socket.on('error', (err) => this.emit('error', err));
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const isFin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const isMasked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this.buffer.length < offset + 2) return;
        payloadLen = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLen === 127) {
        if (this.buffer.length < offset + 8) return;
        payloadLen = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      let maskKey = null;
      if (isMasked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + payloadLen) return;

      const payload = this.buffer.slice(offset, offset + payloadLen);
      this.buffer = this.buffer.slice(offset + payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      // Handle Opcodes
      if (opcode === 0x8) {
        // Close
        this.socket.end();
        this.emit('close');
        return;
      } else if (opcode === 0x9) {
        // Ping -> Pong
        this.sendFrame(0xa, payload);
      } else if (opcode === 0x1 || opcode === 0x2) {
        // Start of a text/binary message
        if (isFin) {
          this.emit('message', payload.toString('utf8'));
        } else {
          this.fragmentChunks = [payload];
          this.fragmentOpcode = opcode;
        }
      } else if (opcode === 0x0) {
        // Continuation of a fragmented message
        if (this.fragmentChunks) {
          this.fragmentChunks.push(payload);
          if (isFin) {
            const full = Buffer.concat(this.fragmentChunks);
            this.fragmentChunks = null;
            this.fragmentOpcode = null;
            this.emit('message', full.toString('utf8'));
          }
        }
      }
    }
  }

  sendFrame(opcode, payloadBuf) {
    const len = payloadBuf.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      this.socket.write(Buffer.concat([header, payloadBuf]));
    } catch {}
  }

  send(data) {
    const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8');
    this.sendFrame(0x1, payload);
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/status' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      service: 'GP Retail ERP Silent Printer Connector',
      version: VERSION,
      platform: os.platform(),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Handle WebSocket Upgrade
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const digest = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${digest}`,
    '\r\n'
  ];

  socket.write(headers.join('\r\n'));

  const ws = new SimpleWebSocketConnection(socket);
  handleClientConnection(ws);
});

function handleClientConnection(ws) {
  ws.on('message', async (data) => {
    let message = {};
    try {
      message = JSON.parse(data.toString());
    } catch {
      message = { action: 'unknown' };
    }

    // Normalize away underscores/hyphens too: localPrinterService.js's action-candidate lists
    // include spellings like "print_label"/"print_receipt" that didn't match this comparison
    // before, silently falling through to the generic "Acknowledged" reply below instead of
    // actually attempting the print - and since the client stops at the first action that reports
    // Success:true, that fake acknowledgment was masking real print failures for every job whose
    // candidate list reaches an unrecognized spelling before a recognized one.
    const action = String(message.Action || message.action || '').trim().toLowerCase().replace(/[_-]/g, '');
    const requestId = message.RequestId || message.requestId || `resp-${Date.now()}`;

    // 1. Heartbeat Ping
    if (action === 'ping') {
      ws.send(JSON.stringify({
        Success: true,
        RequestId: requestId,
        ServiceVersion: VERSION,
        Message: 'pong',
      }));
      return;
    }

    // 2. Discover Printers
    if (action === 'getprinters' || action === 'listprinters' || action === 'printers') {
      const config = loadConfig();
      // Explicit user-initiated "list printers" action (Settings > Printing Configuration) - force
      // a fresh read so a newly-connected printer shows up immediately, unlike the print-job path
      // which deliberately uses the cache to avoid paying the ~1.3s WMI query on every print.
      const printers = await getSystemPrinters({ forceRefresh: true });

      ws.send(JSON.stringify({
        Success: true,
        RequestId: requestId,
        ServiceVersion: VERSION,
        Printers: printers,
        selectedPrinterName: config.selectedPrinterName || (printers.find(p => p.isDefault)?.name || ''),
        selectedPrinterNames: config.selectedPrinterNames || (config.selectedPrinterName ? [config.selectedPrinterName] : []),
        selectedTransport: config.selectedTransport || 'printer',
        selectedBluetoothDeviceName: config.selectedBluetoothDeviceName || '',
        printerRoutes: config.printerRoutes || [],
      }));
      return;
    }

    // 3. Save Printer Routing
    if (action === 'saveprinterrouting' || action === 'setprinterrouting') {
      const config = loadConfig();
      const routes = message.PrinterRoutes || message.printerRoutes || [];
      config.printerRoutes = routes;
      saveConfig(config);
      console.log('[Connector] Printer routing updated');

      ws.send(JSON.stringify({
        Success: true,
        RequestId: requestId,
        ServiceVersion: VERSION,
        Message: 'Printer routing saved successfully',
      }));
      return;
    }

    // 4. Silent Print (Receipt, Barcode, A4)
    if (action === 'print' || action === 'printreceipt' || action === 'printlabel') {
      console.log(`[Connector] Processing silent print job...`);
      try {
        const result = await executeSilentPrint(message);
        ws.send(JSON.stringify({
          Success: true,
          RequestId: requestId,
          ServiceVersion: VERSION,
          Message: result.message || 'Job printed silently',
        }));
      } catch (err) {
        console.error('[Connector] Silent print failed:', err.message);
        ws.send(JSON.stringify({
          Success: false,
          RequestId: requestId,
          ServiceVersion: VERSION,
          Error: err.message,
        }));
      }
      return;
    }

    // Default Unknown Action
    ws.send(JSON.stringify({
      Success: true,
      RequestId: requestId,
      ServiceVersion: VERSION,
      Message: 'Acknowledged',
    }));
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log('================================================================');
  console.log(`  GP Retail ERP Silent Printer Connector v${VERSION}`);
  console.log(`  WebSocket Server running on: ws://127.0.0.1:${PORT}`);
  console.log(`  Status: Ready for Silent Printing`);
  console.log('================================================================');
});
