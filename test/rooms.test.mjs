import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 19000 + Math.floor(Math.random() * 500);

function startServer() {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('server start timeout')); }, 5000);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Calle Muerta disponible')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`server exited ${code}`)); });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const queue = [];
    const waiters = [];
    ws.on('message', raw => {
      const msg = JSON.parse(String(raw));
      const wi = waiters.findIndex(w => w.pred(msg));
      if (wi >= 0) {
        const [w] = waiters.splice(wi, 1);
        clearTimeout(w.timer);
        w.resolve(msg);
      } else queue.push(msg);
    });
    ws.on('open', () => resolve({
      ws,
      send: obj => ws.send(JSON.stringify(obj)),
      next(pred, ms = 2500) {
        const qi = queue.findIndex(pred);
        if (qi >= 0) return Promise.resolve(queue.splice(qi, 1)[0]);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error('message timeout')), ms);
          waiters.push({ pred, resolve: res, timer });
        });
      },
      close: () => ws.close(),
    }));
    ws.on('error', reject);
  });
}

test('sirve salud y juego estático', async () => {
  const child = await startServer();
  try {
    const health = await fetch(`http://127.0.0.1:${PORT}/healthz`);
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');
    const index = await fetch(`http://127.0.0.1:${PORT}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Co-op online/);
  } finally { child.kill('SIGTERM'); }
});

test('crea sala, une jugador, inicia y retransmite', async () => {
  const child = await startServer();
  const a = await connect();
  const b = await connect();
  try {
    a.send({ t: 'create', name: 'Host', difficulty: 'normal' });
    const created = await a.next(m => m.t === 'created');
    assert.equal(created.code.length, 5);

    b.send({ t: 'join', code: created.code, name: 'Guest' });
    const fullRoom = await a.next(m => m.t === 'room' && m.players.length === 2);
    assert.equal(fullRoom.players[1].ready, false);

    b.send({ t: 'ready', ready: true });
    const readyRoom = await a.next(m => m.t === 'room' && m.players.length === 2 && m.players.every(p => p.ready));
    assert.equal(readyRoom.players.length, 2);

    a.send({ t: 'start' });
    const [startA, startB] = await Promise.all([
      a.next(m => m.t === 'start'),
      b.next(m => m.t === 'start'),
    ]);
    assert.equal(startA.seed, startB.seed);
    assert.equal(startA.players.length, 2);

    b.send({ t: 'msg', data: { k: 'st', x: 1 } });
    const relayed = await a.next(m => m.t === 'msg' && m.data?.k === 'st');
    assert.equal(relayed.data.x, 1);
    assert.equal(relayed.from, startB.players.find(p => p.name === 'Guest').id);
  } finally {
    a.close(); b.close(); child.kill('SIGTERM');
  }
});

test('rechaza una sala llena y avisa al host al salir el invitado', async () => {
  const child = await startServer();
  const a = await connect();
  const b = await connect();
  const c = await connect();
  try {
    a.send({ t: 'create', name: 'Host' });
    const { code } = await a.next(m => m.t === 'created');
    b.send({ t: 'join', code, name: 'Guest' });
    await a.next(m => m.t === 'room' && m.players.length === 2);

    c.send({ t: 'join', code, name: 'Third' });
    const err = await c.next(m => m.t === 'error');
    assert.equal(err.code, 'full');

    b.close();
    const peerLeft = await a.next(m => m.t === 'peerLeft' || (m.t === 'room' && m.players.length === 1));
    assert.ok(peerLeft);
  } finally {
    a.close(); c.close(); child.kill('SIGTERM');
  }
});
