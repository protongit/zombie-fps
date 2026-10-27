const WS_PATH = '/ws';

function wsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}${WS_PATH}`;
}

export class GameNet {
  constructor() {
    this.ws = null;
    this.id = null;
    this.code = null;
    this.room = null;
    this.isHost = false;
    this.peerId = null;
    this.latency = 0;
    this.connected = false;
    this.listeners = new Map();
    this._pinger = null;
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  emit(type, detail) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(detail); } catch (err) { console.error(`net:${type}`, err); }
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl());
      this.ws = ws;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch {}
        reject(new Error('No se pudo conectar con el servidor.'));
      }, 8000);

      ws.addEventListener('open', () => {
        clearTimeout(timer);
        settled = true;
        this.connected = true;
        this._startPing();
        this.emit('open');
        resolve();
      });
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        this.connected = false;
        this._stopPing();
        this.emit('close');
        if (!settled) {
          settled = true;
          reject(new Error('No se pudo conectar con el servidor.'));
        }
      });
      ws.addEventListener('error', () => {
        if (!settled) {
          clearTimeout(timer);
          settled = true;
          reject(new Error('Error de conexión con el servidor.'));
        }
      });
      ws.addEventListener('message', ev => this._receive(ev));
    });
  }

  _startPing() {
    this._stopPing();
    this._pinger = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: 'ping', ts: Date.now() });
    }, 5000);
  }

  _stopPing() {
    if (this._pinger) clearInterval(this._pinger);
    this._pinger = null;
  }

  _receive(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'welcome') {
      this.id = msg.id;
      this.emit('welcome', msg);
      return;
    }
    if (msg.t === 'created') {
      this.code = msg.code;
      this.isHost = true;
      this.emit('created', msg);
      return;
    }
    if (msg.t === 'room') {
      this.code = msg.code;
      this.room = msg;
      const me = msg.players.find(p => p.id === this.id);
      this.isHost = !!me?.isHost;
      this.peerId = msg.players.find(p => p.id !== this.id)?.id || null;
      this.emit('room', msg);
      return;
    }
    if (msg.t === 'start') {
      this.emit('start', msg);
      return;
    }
    if (msg.t === 'msg') {
      this.emit('game', msg.data, msg.from);
      return;
    }
    if (msg.t === 'pong') {
      if (typeof msg.ts === 'number') this.latency = Math.max(0, Date.now() - msg.ts);
      this.emit('pong', this.latency);
      return;
    }
    if (msg.t === 'peerLeft') {
      this.emit('peerLeft', msg);
      return;
    }
    if (msg.t === 'roomClosed') {
      this.emit('roomClosed', msg);
      return;
    }
    if (msg.t === 'error') {
      this.emit('error', msg);
      return;
    }
    if (msg.t === 'left') {
      this.code = null;
      this.room = null;
      this.isHost = false;
      this.peerId = null;
      this.emit('left');
      return;
    }
    this.emit('unknown', msg);
  }

  send(message) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  sendGame(data) {
    return this.send({ t: 'msg', data });
  }

  async createRoom(name, difficulty) {
    await this.connect();
    this.isHost = true;
    this.send({ t: 'create', name, difficulty });
  }

  async joinRoom(code, name) {
    await this.connect();
    this.isHost = false;
    this.send({ t: 'join', code, name });
  }

  setReady(ready) {
    this.send({ t: 'ready', ready });
  }

  setDifficulty(difficulty) {
    this.send({ t: 'difficulty', difficulty });
  }

  start() {
    this.send({ t: 'start' });
  }

  leave() {
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: 'leave' });
  }

  close() {
    this._stopPing();
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    this.ws = null;
    this.connected = false;
    this.id = null;
    this.code = null;
    this.room = null;
    this.isHost = false;
    this.peerId = null;
  }
}

export const net = new GameNet();
