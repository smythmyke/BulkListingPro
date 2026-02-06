const NATIVE_HOST_NAME = 'com.bulklistingpro.host';

class NativeHostService {
  constructor() {
    this.port = null;
    this.connected = false;
    this.listeners = new Map();
    this.requestId = 0;
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

  sendAndWait(message, responseType, errorType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(responseType, onResponse);
        if (errorType) this.off(errorType, onError);
        reject(new Error(`Timeout waiting for ${responseType}`));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timer);
        this.off(responseType, onResponse);
        if (errorType) this.off(errorType, onError);
      };

      const onResponse = (response) => {
        if (message.payload?.requestId && response.requestId !== message.payload.requestId) {
          return;
        }
        cleanup();
        resolve(response);
      };

      const onError = (response) => {
        if (message.payload?.requestId && response.requestId !== message.payload.requestId) {
          return;
        }
        cleanup();
        reject(new Error(response.error || 'Operation failed'));
      };

      this.on(responseType, onResponse);
      if (errorType) this.on(errorType, onError);

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

  getNextRequestId() {
    return ++this.requestId;
  }

  async readFile(filePath) {
    const requestId = this.getNextRequestId();
    const response = await this.sendAndWait(
      { type: 'READ_FILE', payload: { path: filePath, requestId } },
      'FILE_DATA',
      'FILE_ERROR',
      30000
    );
    return {
      path: response.path,
      data: response.data,
      mimeType: response.mimeType,
      size: response.size
    };
  }

  async readFiles(paths) {
    const requestId = this.getNextRequestId();
    const response = await this.sendAndWait(
      { type: 'READ_FILES', payload: { paths, requestId } },
      'FILES_DATA',
      'FILES_ERROR',
      60000
    );
    return response.results;
  }

  async readSpreadsheet(filePath) {
    const requestId = this.getNextRequestId();
    const response = await this.sendAndWait(
      { type: 'READ_SPREADSHEET', payload: { path: filePath, requestId } },
      'SPREADSHEET_DATA',
      'SPREADSHEET_ERROR',
      30000
    );
    return response.rows;
  }

  async listDirectory(dirPath, filter = null) {
    const requestId = this.getNextRequestId();
    const response = await this.sendAndWait(
      { type: 'LIST_DIRECTORY', payload: { path: dirPath, filter, requestId } },
      'DIRECTORY_DATA',
      'DIRECTORY_ERROR',
      30000
    );
    return response.files;
  }

  isConnected() {
    return this.connected;
  }
}

NativeHostService.instance = null;

export const nativeHostService = NativeHostService.getInstance();
