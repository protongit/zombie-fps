import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8123);
const HOST = process.env.HOST || '0.0.0.0';
const ROOM_CODE_LEN = 5;
const MAX_PLAYERS = 2;
const MAX_MESSAGE = 64 * 1024;
const DIFFICULTIES = new Set(['facil', 'normal', 'dificil', 'pesadilla']);
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.url': 'text/plain; charset=utf-8',
};
const TEXT_TYPES = new Set([
  'text/html; charset=utf-8',
  'text/css; charset=utf-8',
  'application/javascript; charset=utf-8',
  'application/json; charset=utf-8',
  'image/svg+xml',
  'text/plain; charset=utf-8',
]);

const rooms = new Map();
const clients = new Set();

function randomId(bytes = 12) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function randomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LEN; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

function uniqueCode() {
  for (let i = 0; i < 100; i++) {
    const code = randomCode();
    if (!rooms.has(code)) return code;
  }
  throw new Error('No se pudo generar un código de sala');
}

function cleanName(value, fallback = 'Jugador') {
  const name = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return name || fallback;
}

function send(ws, message) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(message));
}

function roomState(room) {
  return {
    t: 'room',
    code: room.code,
    state: room.state,
    difficulty: room.difficulty,
    maxPlayers: MAX_PLAYERS,
    players: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      isHost: p.isHost,
    })),
  };
}

function broadcastRoom(room) {
  for (const player of room.players.values()) send(player.ws, roomState(room));
}

function otherPlayer(room, client) {
  for (const player of room.players.values()) if (player !== client) return player;
  return null;
}

function leaveRoom(client, reason = 'left') {
  const room = client.room;
  if (!room) return;
  client.room = null;
  room.players.delete(client.id);

  if (client.isHost) {
    for (const player of room.players.values()) {
      player.room = null;
      send(player.ws, { t: 'roomClosed', reason: 'host-left' });
    }
    rooms.delete(room.code);
    return;
  }

  const host = [...room.players.values()].find(p => p.isHost) || null;
  if (host) {
    if (room.state === 'playing') {
      room.state = 'lobby';
      for (const player of room.players.values()) player.ready = false;
    }
    send(host.ws, { t: 'peerLeft', id: client.id, name: client.name, reason });
    broadcastRoom(room);
  }
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('ok');
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const fullPath = path.resolve(ROOT, `.${pathname}`);
  if (fullPath !== ROOT && !fullPath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const headers = {
      'content-type': type,
      'x-content-type-options': 'nosniff',
    };
    if (pathname === '/index.html') headers['cache-control'] = 'no-cache';
    else if (pathname.startsWith('/assets/') || pathname.startsWith('/lib/')) {
      headers['cache-control'] = 'public, max-age=604800';
    }

    const acceptsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');
    let body = data;
    if (acceptsGzip && TEXT_TYPES.has(type) && data.length > 1024) {
      body = zlib.gzipSync(data);
      headers['content-encoding'] = 'gzip';
      headers['vary'] = 'Accept-Encoding';
    }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });

function resetRate(client) {
  client.rate = 0;
  client.rateWindow = Date.now();
}

server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch {}
  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const client = {
    id: randomId(8),
    name: 'Jugador',
    ws,
    room: null,
    isHost: false,
    ready: false,
    messageCount: 0,
    rateWindow: Date.now(),
  };
  clients.add(client);
  send(ws, { t: 'welcome', id: client.id });

  ws.on('message', raw => {
    const now = Date.now();
    if (now - client.rateWindow > 1000) resetRate(client);
    client.rate++;
    if (client.rate > 300) {
      send(ws, { t: 'error', code: 'rate', message: 'Demasiados mensajes.' });
      ws.close(1008, 'rate');
      return;
    }

    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { send(ws, { t: 'error', code: 'bad-json', message: 'Mensaje inválido.' }); return; }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') {
      send(ws, { t: 'error', code: 'bad-message', message: 'Mensaje inválido.' });
      return;
    }

    if (msg.t === 'create') {
      if (client.room) leaveRoom(client);
      client.name = cleanName(msg.name);
      client.isHost = true;
      client.ready = true;
      const difficulty = DIFFICULTIES.has(msg.difficulty) ? msg.difficulty : 'normal';
      const room = {
        code: uniqueCode(),
        host: client,
        players: new Map(),
        difficulty,
        state: 'lobby',
        seed: 0,
        createdAt: Date.now(),
      };
      room.players.set(client.id, client);
      client.room = room;
      rooms.set(room.code, room);
      send(ws, { t: 'created', id: client.id, code: room.code });
      broadcastRoom(room);
      return;
    }

    if (msg.t === 'join') {
      const code = String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LEN);
      const room = rooms.get(code);
      if (!room) { send(ws, { t: 'error', code: 'not-found', message: 'No existe esa sala.' }); return; }
      if (room.state !== 'lobby') { send(ws, { t: 'error', code: 'in-progress', message: 'La partida ya ha empezado.' }); return; }
      if (room.players.size >= MAX_PLAYERS) { send(ws, { t: 'error', code: 'full', message: 'La sala está llena.' }); return; }
      if (client.room) leaveRoom(client);
      client.name = cleanName(msg.name);
      client.isHost = false;
      client.ready = false;
      room.players.set(client.id, client);
      client.room = room;
      broadcastRoom(room);
      return;
    }

    if (msg.t === 'ready') {
      if (!client.room || client.isHost) return;
      client.ready = !!msg.ready;
      broadcastRoom(client.room);
      return;
    }

    if (msg.t === 'difficulty') {
      if (!client.room || !client.isHost) return;
      if (client.room.state !== 'lobby') return;
      client.room.difficulty = DIFFICULTIES.has(msg.difficulty) ? msg.difficulty : 'normal';
      broadcastRoom(client.room);
      return;
    }

    if (msg.t === 'start') {
      const room = client.room;
      if (!room || !client.isHost || room.state !== 'lobby') return;
      const players = [...room.players.values()];
      if (players.length < 2) {
        send(ws, { t: 'error', code: 'need-player', message: 'Espera a que se una otro jugador.' });
        return;
      }
      if (!players.every(p => p.ready)) {
        send(ws, { t: 'error', code: 'not-ready', message: 'Todos deben estar listos.' });
        return;
      }
      room.state = 'playing';
      room.seed = crypto.randomInt(1, 0x7fffffff);
      for (const player of players) {
        send(player.ws, {
          t: 'start',
          seed: room.seed,
          difficulty: room.difficulty,
          players: players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
        });
      }
      return;
    }

    if (msg.t === 'msg') {
      if (!client.room || client.room.state !== 'playing') return;
      const peer = otherPlayer(client.room, client);
      if (!peer) return;
      send(peer.ws, { t: 'msg', from: client.id, data: msg.data });
      return;
    }

    if (msg.t === 'leave') {
      leaveRoom(client);
      send(ws, { t: 'left' });
      return;
    }

    if (msg.t === 'ping') {
      send(ws, { t: 'pong', ts: msg.ts ?? null });
      return;
    }

    send(ws, { t: 'error', code: 'unknown', message: 'Acción desconocida.' });
  });

  ws.on('close', () => {
    leaveRoom(client, 'disconnect');
    clients.delete(client);
  });
  ws.on('error', () => {});
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 30000);
heartbeat.unref?.();

server.listen(PORT, HOST, () => {
  console.log(`Calle Muerta disponible en http://${HOST}:${PORT}/`);
});

function shutdown(signal) {
  console.log(`Cerrando (${signal})...`);
  clearInterval(heartbeat);
  for (const ws of wss.clients) ws.close(1001, 'server shutdown');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
