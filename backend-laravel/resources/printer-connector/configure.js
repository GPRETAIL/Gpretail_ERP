const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const CONFIG_FILE = path.join(__dirname, 'printer_config.json');

function getPrinters() {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      exec('powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json -Compress"', (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve([]);
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          const list = Array.isArray(parsed) ? parsed : [parsed];
          resolve(list.map(p => ({ name: String(p.Name || '').trim(), isDefault: Boolean(p.Default) })).filter(p => p.name));
        } catch {
          resolve([]);
        }
      });
    } else {
      exec('lpstat -p -d', (err, stdout) => {
        if (err || !stdout) {
          resolve([]);
          return;
        }
        const printers = [];
        stdout.split('\n').forEach(line => {
          const match = line.match(/^printer\s+([^\s]+)/);
          if (match && match[1]) printers.push({ name: match[1], isDefault: false });
        });
        resolve(printers);
      });
    }
  });
}

async function main() {
  console.log('====================================================');
  console.log('  GP Retail ERP - Printer Configuration Terminal');
  console.log('====================================================\n');
  console.log('Detecting installed printers on this machine...\n');

  const printers = await getPrinters();
  if (printers.length === 0) {
    console.log('No printers detected. Please make sure your printer is turned on and connected via USB/Network.');
    process.exit(0);
  }

  printers.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.name} ${p.isDefault ? '(Default)' : ''}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\nEnter number(s) of printers you want to use (e.g. 1 or 1,2): ', (answer) => {
    const indices = answer.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => !isNaN(i) && i >= 0 && i < printers.length);
    if (indices.length === 0) {
      console.log('No valid selection made. Keeping current configuration.');
      rl.close();
      return;
    }

    const selectedPrinters = indices.map(i => printers[i].name);
    const primaryPrinter = selectedPrinters[0];

    const currentConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {};
    const newConfig = {
      ...currentConfig,
      selectedPrinterName: primaryPrinter,
      selectedPrinterNames: selectedPrinters,
      selectedTransport: 'printer',
      lastConfiguredAt: new Date().toISOString(),
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    console.log(`\nConfigured successfully! Primary Printer: "${primaryPrinter}"`);
    console.log('You can now start the connector by running `run.bat` on Windows or `node server.js`.');
    rl.close();
  });
}

main();
