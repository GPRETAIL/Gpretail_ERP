const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { createCounterServer, updateApp, TAR } = require('../counter');

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(resolve));
const get = (port, url, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ hostname: '127.0.0.1', port, path: url, method }, (res) => {
    let body = '';
    res.on('data', (c) => { body += c; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  });
  req.on('error', reject);
  req.end();
});

function appDir(files = { 'index.html': '<html><head><title>ERP</title></head><body></body></html>', 'assets/app.js': 'console.log(1)' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'counter-app-'));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

test('serves the app from this counter, any page address falls back to the app, and the cloud address is remembered', async () => {
  const dir = appDir();
  const server = createCounterServer({ upstream: 'http://127.0.0.1:9', cloud_api: 'https://dev.gpsoftware.in/api' }, dir);
  const port = await listen(server);
  try {
    const asset = await get(port, '/assets/app.js');
    assert.equal(asset.status, 200);
    assert.match(asset.headers['content-type'], /javascript/);
    const page = await get(port, '/sales/pos-sales');
    assert.equal(page.status, 200);
    assert.match(page.body, /<title>ERP<\/title>/);
    assert.match(page.body, /erp_onprem_cloud_api","https:\/\/dev.gpsoftware.in\/api"/);
    assert.equal((await get(port, '/../../secret.txt')).status, 200, 'a path outside the app is just the app page');
  } finally {
    await close(server);
  }
});

test('passes /api to the main server, and answers 502 with X-Proxy-Error when it is off', async () => {
  const main = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ path: req.url, method: req.method })));
  const mainPort = await listen(main);
  const up = createCounterServer({ upstream: `http://127.0.0.1:${mainPort}` }, appDir());
  const upPort = await listen(up);
  try {
    const answer = await get(upPort, '/api/connector/web-config?x=1');
    assert.equal(answer.status, 200);
    assert.deepEqual(JSON.parse(answer.body), { path: '/api/connector/web-config?x=1', method: 'GET' });
  } finally {
    await close(up);
    await close(main);
  }

  const down = createCounterServer({ upstream: `http://127.0.0.1:${mainPort}` }, appDir());
  const downPort = await listen(down);
  try {
    const answer = await get(downPort, '/api/pos-sales', 'POST');
    assert.equal(answer.status, 502);
    assert.ok(answer.headers['x-proxy-error'], 'the app reads this as "main server down" and moves to the cloud');
    assert.equal((await get(downPort, '/')).status, 200, 'the app itself still opens');
  } finally {
    await close(down);
  }
});

test('copies a newer app build from the main server and keeps it', async () => {
  const build = appDir({ 'index.html': '<html><head></head><body>v2</body></html>', 'assets/v2.js': '2' });
  const zip = path.join(os.tmpdir(), `bundle-${Date.now()}.zip`);
  execFileSync(TAR, ['-a', '-cf', zip, '-C', build, '.']);
  const main = http.createServer((req, res) => {
    if (req.url === '/api/connector/app-version') return res.writeHead(200).end(JSON.stringify({ data: { version: 'v2' } }));
    if (req.url === '/api/connector/app-bundle') return fs.createReadStream(zip).pipe(res.writeHead(200));
    return res.writeHead(404).end();
  });
  const port = await listen(main);
  const target = appDir({ 'index.html': 'v1' });
  try {
    assert.equal(await updateApp({ upstream: `http://127.0.0.1:${port}` }, target, () => {}), true);
    assert.match(fs.readFileSync(path.join(target, 'index.html'), 'utf8'), /v2/);
    assert.equal(fs.readFileSync(path.join(target, '.version'), 'utf8'), 'v2');
    assert.equal(await updateApp({ upstream: `http://127.0.0.1:${port}` }, target, () => {}), false, 'same version: nothing copied');
  } finally {
    await close(main);
  }
});
