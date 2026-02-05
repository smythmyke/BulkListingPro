const NATIVE_HOST_NAME = 'com.bulklistingpro.host';

class NativeHostService {
  constructor() {
    this.port = null;
    this.connected = false;
    this.listeners = new Map();
    this.messageQueue = [];
  }

  static getInstance() {
    if (!NativeHostService.instance) {
      NativeHostService.instance = new NativeHostService();
    }
    return NativeHostService.instance;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.port) {
        resolve({ success: true, alreadyConnected: true });
        return;
      }

      let readyTimeout;
      let resolved = false;

      try {
        this.port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        this.port.onMessage.addListener((message) => {
          this.handleMessage(message);
        });

        this.port.onDisconnect.addListener(() => {
          const error = chrome.runtime.lastError?.message || 'Native host disconnected';
          console.error('Native host disconnected:', error);
          this.connected = false;
          this.port = null;
          this.notifyListeners('DISCONNECTED', { error });

          if (!resolved) {
            resolved = true;
            clearTimeout(readyTimeout);
            reject(new Error(error));
          }
        });

        readyTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Native host did not respond. Is it installed?'));
          }
        }, 5000);

        this.once('READY', (message) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(readyTimeout);
            this.connected = true;
            resolve({ success: true, version: message.version });
          }
        });

      } catch (err) {
        reject(new Error(`Failed to connect: ${err.message}`));
      }
    });
  }

  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.connected = false;
  }

  send(message) {
    if (!this.port) {
      throw new Error('Not connected to native host');
    }
    this.port.postMessage(message);
  }

  sendAndWait(message, responseType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${responseType}`));
      }, timeout);

      this.once(responseType, (response) => {
        clearTimeout(timer);
        resolve(response);
      });

      this.send(message);
    });
  }

  handleMessage(message) {
    const { type } = message;
    this.notifyListeners(type, message);
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push({ callback, once: false });
  }

  once(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push({ callback, once: true });
  }

  off(type, callback) {
    if (!this.listeners.has(type)) return;
    const listeners = this.listeners.get(type);
    this.listeners.set(type, listeners.filter(l => l.callback !== callback));
  }

  notifyListeners(type, message) {
    if (!this.listeners.has(type)) return;

    const listeners = this.listeners.get(type);
    const remaining = [];

    for (const listener of listeners) {
      listener.callback(message);
      if (!listener.once) {
        remaining.push(listener);
      }
    }

    this.listeners.set(type, remaining);
  }

  async connectToChrome(options = {}) {
    const { host = 'localhost', port = 9222 } = options;

    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        this.off('CONNECTED', onConnected);
        this.off('CONNECTION_ERROR', onError);
        clearTimeout(timer);
      };

      const onConnected = (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      };

      const onError = (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(response.error || 'CDP connection failed'));
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Timeout connecting to Chrome debug port. Is Chrome running with --remote-debugging-port=9222?'));
      }, 10000);

      this.on('CONNECTED', onConnected);
      this.on('CONNECTION_ERROR', onError);

      this.send({ type: 'CONNECT', payload: { host, port } });
    });
  }

  async startUpload(listings) {
    return new Promise((resolve, reject) => {
      const results = {
        total: listings.length,
        success: 0,
        failed: 0,
        details: []
      };

      this.on('LISTING_COMPLETE', (msg) => {
        results.success++;
        results.details.push({
          index: msg.index,
          title: msg.title,
          status: 'success'
        });
      });

      this.on('LISTING_ERROR', (msg) => {
        results.failed++;
        results.details.push({
          index: msg.index,
          title: msg.title,
          status: 'failed',
          error: msg.error
        });
      });

      this.once('UPLOAD_COMPLETE', (msg) => {
        resolve(msg.results);
      });

      this.once('UPLOAD_CANCELLED', (msg) => {
        resolve(msg.results);
      });

      this.send({ type: 'START_UPLOAD', payload: { listings } });
    });
  }

  pause() {
    this.send({ type: 'PAUSE' });
  }

  resume() {
    this.send({ type: 'RESUME' });
  }

  cancel() {
    this.send({ type: 'CANCEL' });
  }

  skip() {
    this.send({ type: 'SKIP' });
  }

  isConnected() {
    return this.connected;
  }
}

NativeHostService.instance = null;

export const nativeHostService = NativeHostService.getInstance();
