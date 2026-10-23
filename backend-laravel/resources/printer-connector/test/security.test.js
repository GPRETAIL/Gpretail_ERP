const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { server, isAllowedOrigin, SimpleWebSocketConnection, MAX_WS_PAYLOAD_BYTES } = require('../server');

test('permits ERP, configured local and store LAN origins while rejecting unrelated sites', () => {
  for (const origin of ['https://dev.gpsoftware.in', 'https://company.gpsoftware.in', 'http://localhost:5173', 'http://127.0.0.1:8130', 'http://192.168.1.20:8080', 'http://10.0.0.1', 'https://172.31.1.2', undefined]) assert.equal(isAllowedOrigin(origin), true, origin);
  for (const origin of ['https://evil.example', 'https://dev.gpsoftware.in.evil.example', 'https://172.32.1.1', 'null', 'file://test']) assert.equal(isAllowedOrigin(origin), false, origin);
});

test('HTTP and WebSocket handshakes reject untrusted browser origins', async () => {
  const sockets = new Set();
  const track = socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); };
  server.on('connection', track);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const request = (origin, upgrade = false) => new Promise((resolve, reject) => {
      const req = http.get({ hostname: '127.0.0.1', port: server.address().port, path: '/health', headers: { Origin: origin, ...(upgrade ? { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' } : {}) } });
      req.on('response', res => { res.resume(); resolve(res.statusCode); });
      req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode); });
      req.on('error', reject);
    });
    assert.equal(await request('https://evil.example'), 403);
    assert.equal(await request('https://evil.example', true), 403);
    assert.equal(await request('https://dev.gpsoftware.in'), 200);
    assert.equal(await request('https://dev.gpsoftware.in', true), 101);
  } finally { for (const socket of sockets) socket.destroy(); server.off('connection', track); await new Promise(resolve => server.close(resolve)); }
});

class Socket extends EventEmitter {
  writes = [];
  ended = false;
  write(data) { this.writes.push(data); }
  end() { this.ended = true; }
}
function frame(payload, opcode = 1, fin = true) {
  const header = Buffer.alloc(10);
  header[0] = (fin ? 128 : 0) | opcode; header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}
test('preserves normal fragmented messages and closes excessive frame declarations with 1009', () => {
  const socket = new Socket(); const ws = new SimpleWebSocketConnection(socket); const messages = [];
  ws.on('message', msg => messages.push(msg));
  socket.emit('data', frame(Buffer.from('hel'), 1, false));
  socket.emit('data', frame(Buffer.from('lo'), 0));
  assert.deepEqual(messages, ['hello']);
  const header = Buffer.alloc(10); header[0] = 129; header[1] = 127;
  header.writeBigUInt64BE(BigInt(MAX_WS_PAYLOAD_BYTES + 1), 2);
  socket.emit('data', header);
  assert.equal(socket.ended, true);
  assert.equal(socket.writes.at(-1).readUInt16BE(2), 1009);
  assert.equal(ws.buffer.length, 0);
});
test('caps fragmented message totals independently of individual frame lengths', () => {
  const socket = new Socket(); const ws = new SimpleWebSocketConnection(socket);
  socket.emit('data', frame(Buffer.alloc(9 * 1024 * 1024), 1, false));
  socket.emit('data', frame(Buffer.alloc(8 * 1024 * 1024), 0));
  assert.equal(socket.ended, true);
  assert.equal(socket.writes.at(-1).readUInt16BE(2), 1009);
  assert.equal(ws.fragmentChunks, null);
});

test('PowerShell receives receipt text and printer names through JSON metadata, never script interpolation', async () => {
  const files = new Map(); const jobs = [];
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const fakeFs = { existsSync: p => files.has(p), readFileSync: p => files.get(p), writeFileSync: (p, data) => files.set(p, data), unlinkSync: p => files.delete(p), appendFileSync: () => {} };
  const mockRequire = name => {
    if (name === 'fs') return fakeFs;
    if (name === 'child_process') return { execFile: (file, args, options, callback) => {
      if (args.includes('-File')) {
        jobs.push({ file, args, script: files.get(args.at(-2)), meta: JSON.parse(files.get(args.at(-1))) });
        callback(null, '', '');
      } else callback(null, '[]', '');
    } };
    return require(name);
  };
  const context = { require: mockRequire, module: { exports: {} }, __dirname: path.join(__dirname, '..'), process, Buffer, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
  vm.runInNewContext(source + '\nmodule.exports.printReceiptViaGdi = printReceiptViaGdi; module.exports.fallbackWindowsPrint = fallbackWindowsPrint;', context);
  const attack = '"; $(Write-Output INJECTION); #';
  await context.module.exports.printReceiptViaGdi({ StoreName: attack, Items: [{ Name: attack, Qty: 1, Rate: 1, Amount: 1 }] }, attack, 'test', '/temp');
  // GDI is Windows-only; exercise the metadata helper through fallback on every platform as well.
  files.set('/temp/test.html', '<html>sample</html>');
  await new Promise((resolve, reject) => context.module.exports.fallbackWindowsPrint('/temp/test.html', attack, resolve, reject));
  assert.ok(jobs.length > 0);
  for (const job of jobs) {
    assert.equal(job.file, 'powershell');
    assert.ok(job.args.includes('-File'));
    assert.ok(!job.script.includes(attack));
    assert.ok(!job.args.includes(attack));
    assert.ok(JSON.stringify(job.meta).includes('INJECTION'));
    assert.ok(job.script.includes('Get-Content -LiteralPath $args[0]'));
  }
  assert.equal(files.size, 0);
});
