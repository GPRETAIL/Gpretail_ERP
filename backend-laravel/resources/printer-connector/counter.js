/**
 * Vynerix Counter client: billing keeps opening on this counter even when the main server PC is off.
 *
 * Serves the ERP web app from this computer (http://localhost:5050) and forwards /api and /files to the main
 * server, as the main server's own address does. When the main server cannot be reached it answers 502 with an
 * X-Proxy-Error header, exactly like the main server's proxy; the app then moves this counter to the cloud by
 * itself (runtimeRouting.js) and comes back when the main server is up and caught up.
 *
 * Configured by counter.json (written by Configure Local Server > Download counter installer):
 *   { "upstream": "http://mainserver:5173", "cloud_api": "https://dev.gpsoftware.in/api", "port": 5050 }
 * The app files live in ./app and are refreshed from the main server whenever it has a newer build.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const CONFIG_FILE = path.join(__dirname, 'counter.json');
const APP_DIR = path.join(__dirname, 'app');
const VERSION_FILE = path.join(APP_DIR, '.version');
const UPDATE_EVERY_MS = 10 * 60 * 1000;
// Windows' own tar (bsdtar) reads zip files; a tar found earlier on PATH (Git's GNU tar) does not.
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe') : 'tar';
const PROXY_TIMEOUT_MS = 30000;
// Reading an invoice with the AI service can take a minute or more.
const SLOW_PATHS = [{ prefix: '/api/v1/invoice-ai/', timeout: 180000 }];
const PROXIED = ['/api/', '/files/'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

function readConfig(file = CONFIG_FILE) {
  if (!fs.existsSync(file)) return null;
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!/^https?:\/\//i.test(config.upstream || '')) throw new Error('counter.json: "upstream" must be the main server address, e.g. http://mainserver:5173');
  return { port: 5050, ...config, upstream: config.upstream.replace(/\/+$/, '') };
}

/** The app's page with the cloud address remembered, so the counter can fail over even on a first start with the main server off. */
function indexHtml(appDir, cloudApi) {
  const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  if (!cloudApi) return html;
  const script = `<script>try{if(!localStorage.getItem("erp_onprem_cloud_api"))localStorage.setItem("erp_onprem_cloud_api",${JSON.stringify(cloudApi)})}catch(e){}</script>`;
  return html.includes('<head>') ? html.replace('<head>', `<head>${script}`) : script + html;
}

function serveStatic(req, res, config, appDir) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  if (!fs.existsSync(path.join(appDir, 'index.html'))) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('The billing app has not been copied to this counter yet. Keep the main server on for a minute and refresh.');
    return;
  }
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.normalize(path.join(appDir, urlPath));
  const inside = file.startsWith(appDir + path.sep);
  if (inside && fs.existsSync(file) && fs.statSync(file).isFile() && path.basename(file) !== 'index.html') {
    const immutable = urlPath.startsWith('/assets/');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
    return;
  }
  // Every other address is a page of the app (client-side routing).
  res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : indexHtml(appDir, config.cloud_api));
}

function proxy(req, res, config) {
  const target = new URL(req.url, config.upstream + '/');
  const client = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host };
  const timeout = (SLOW_PATHS.find((p) => req.url.startsWith(p.prefix)) || { timeout: PROXY_TIMEOUT_MS }).timeout;
  const upstream = client.request(target, { method: req.method, headers, timeout }, (answer) => {
    res.writeHead(answer.statusCode || 502, answer.headers);
    answer.pipe(res);
  });
  const fail = (err) => {
    if (res.headersSent) return res.destroy();
    // Same signal as the main server's own proxy: the app treats it as "main server down" and uses the cloud.
    res.writeHead(502, { 'Content-Type': 'application/json', 'X-Proxy-Error': (err && err.code) || 'PROXY_ERROR' });
    res.end(JSON.stringify({ success: false, message: 'The main server cannot be reached from this counter.' }));
  };
  upstream.on('timeout', () => upstream.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
  upstream.on('error', fail);
  req.pipe(upstream);
}

function createCounterServer(config, appDir = APP_DIR) {
  return http.createServer((req, res) => {
    if (PROXIED.some((prefix) => req.url.startsWith(prefix))) return proxy(req, res, config);
    return serveStatic(req, res, config, appDir);
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    (url.startsWith('https:') ? https : http).get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => (res.statusCode === 200 ? resolve(JSON.parse(body)) : reject(new Error(`HTTP ${res.statusCode}`))));
    }).on('error', reject).on('timeout', function onTimeout() { this.destroy(new Error('timeout')); });
  });
}

function download(url, file) {
  return new Promise((resolve, reject) => {
    (url.startsWith('https:') ? https : http).get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const out = fs.createWriteStream(file);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

/** Copies a newer app build from the main server; the current copy keeps serving until the new one is complete. */
async function updateApp(config, appDir = APP_DIR, log = console.log) {
  const remote = await getJson(`${config.upstream}/api/connector/app-version`);
  const version = remote && remote.data && remote.data.version;
  const current = fs.existsSync(path.join(appDir, '.version')) ? fs.readFileSync(path.join(appDir, '.version'), 'utf8').trim() : '';
  if (!version || version === current) return false;
  const zip = path.join(os.tmpdir(), `vynerix-app-${Date.now()}.zip`);
  const fresh = `${appDir}.new`;
  await download(`${config.upstream}/api/connector/app-bundle`, zip);
  fs.rmSync(fresh, { recursive: true, force: true });
  fs.mkdirSync(fresh, { recursive: true });
  // Windows 10+ ships tar (bsdtar), which reads zip files.
  await new Promise((resolve, reject) => execFile(TAR, ['-xf', zip, '-C', fresh], (err) => (err ? reject(err) : resolve())));
  if (!fs.existsSync(path.join(fresh, 'index.html'))) throw new Error('The app copy has no index.html');
  fs.writeFileSync(path.join(fresh, '.version'), version);
  fs.rmSync(`${appDir}.old`, { recursive: true, force: true });
  if (fs.existsSync(appDir)) fs.renameSync(appDir, `${appDir}.old`);
  fs.renameSync(fresh, appDir);
  fs.rmSync(`${appDir}.old`, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });
  log(`[counter] App updated to ${version}`);
  return true;
}

function startCounter(log = console.log) {
  const config = readConfig();
  if (!config) return null;
  const server = createCounterServer(config);
  server.listen(config.port, '127.0.0.1', () => log(`[counter] Billing app on http://localhost:${config.port} (main server ${config.upstream})`));
  const update = () => updateApp(config, APP_DIR, log).catch((err) => log(`[counter] App update skipped: ${err.message}`));
  update();
  setInterval(update, UPDATE_EVERY_MS).unref();
  return server;
}

module.exports = { createCounterServer, readConfig, indexHtml, updateApp, startCounter, TAR };

if (require.main === module) startCounter();
