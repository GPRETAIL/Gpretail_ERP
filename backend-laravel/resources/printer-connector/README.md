# GP Retail ERP - Silent Printer Connector

The Silent Printer Connector enables **instant, silent printing** from GP Retail ERP directly to local thermal receipt printers, barcode label printers, and A4 printers without showing browser print preview popups.

## How To Use

### On Windows:
1. Double-click `run.bat` to start the connector service.
2. (Optional) Run `run.bat configure` in terminal to select which printer to use.
3. Open ERP Settings -> **Printing Configuration** (`/settings/printing-configuration`) to verify the "Connected" green badge.

### On macOS / Linux:
1. Open Terminal, navigate to this folder, and run:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```
2. (Optional) Configure:
   ```bash
   ./run.sh configure
   ```

## WebSocket Protocol Details
- **Address**: `ws://127.0.0.1:5001` or `ws://localhost:5001`
- **Actions Supported**:
  - `ping`: Health-check ping
  - `getPrinters`: Discovers system USB & Network printers
  - `print` / `printReceipt` / `printLabel`: Performs direct silent print
  - `savePrinterRouting`: Persists printer routing rules
