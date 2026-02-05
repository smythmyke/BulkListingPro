class CDPService {
  constructor() {
    this.attachedTabId = null;
    this.debuggerVersion = '1.3';
  }

  static getInstance() {
    if (!CDPService.instance) {
      CDPService.instance = new CDPService();
    }
    return CDPService.instance;
  }

  async attach(tabId) {
    if (this.attachedTabId === tabId) {
      return { success: true, alreadyAttached: true };
    }

    if (this.attachedTabId) {
      await this.detach();
    }

    return new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, this.debuggerVersion, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.attachedTabId = tabId;
          this.setupDetachListener();
          resolve({ success: true, tabId });
        }
      });
    });
  }

  async detach() {
    if (!this.attachedTabId) {
      return { success: true, notAttached: true };
    }

    const tabId = this.attachedTabId;
    return new Promise((resolve) => {
      chrome.debugger.detach({ tabId }, () => {
        this.attachedTabId = null;
        resolve({ success: true });
      });
    });
  }

  setupDetachListener() {
    chrome.debugger.onDetach.addListener((source, reason) => {
      if (source.tabId === this.attachedTabId) {
        console.log('Debugger detached:', reason);
        this.attachedTabId = null;
        if (this.onDetachCallback) {
          this.onDetachCallback(reason);
        }
      }
    });
  }

  onDetach(callback) {
    this.onDetachCallback = callback;
  }

  isAttached() {
    return this.attachedTabId !== null;
  }

  async sendCommand(method, params = {}) {
    if (!this.attachedTabId) {
      throw new Error('Debugger not attached');
    }

    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId: this.attachedTabId },
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  async navigate(url) {
    await this.sendCommand('Page.navigate', { url });
    await this.waitForLoad();
  }

  async waitForLoad(timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.sendCommand('Runtime.evaluate', {
          expression: 'document.readyState',
          returnByValue: true
        });
        if (result.result.value === 'complete') {
          return true;
        }
      } catch (err) {
        // Page might be navigating
      }
      await this.delay(200);
    }
    throw new Error('Page load timeout');
  }

  async evaluate(expression) {
    const result = await this.sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Evaluation error');
    }

    return result.result.value;
  }

  async waitForSelector(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const found = await this.evaluate(`document.querySelector('${selector}') !== null`);
      if (found) {
        return true;
      }
      await this.delay(200);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async click(selector) {
    const box = await this.evaluate(`
      (() => {
        const el = document.querySelector('${selector}');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })()
    `);

    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: box.x,
      y: box.y,
      button: 'left',
      clickCount: 1
    });

    await this.delay(50);

    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: box.x,
      y: box.y,
      button: 'left',
      clickCount: 1
    });
  }

  async type(text, delay = 30) {
    for (const char of text) {
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char
      });
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char
      });
      await this.delay(delay);
    }
  }

  async setFileInputFromBase64(selector, files) {
    const result = await this.sendCommand('DOM.getDocument');
    const nodeResult = await this.sendCommand('DOM.querySelector', {
      nodeId: result.root.nodeId,
      selector: selector
    });

    if (!nodeResult.nodeId) {
      throw new Error(`File input not found: ${selector}`);
    }

    const filePaths = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.dataUrl) {
        const tempPath = await this.createTempFile(file.dataUrl, file.name || `file${i}`);
        filePaths.push(tempPath);
      } else if (file.path) {
        filePaths.push(file.path);
      }
    }

    await this.sendCommand('DOM.setFileInputFiles', {
      nodeId: nodeResult.nodeId,
      files: filePaths
    });
  }

  async createTempFile(dataUrl, filename) {
    // For chrome.debugger, we need to handle file uploads differently
    // We'll use a data URL approach or request the file through native host
    // This is a limitation - chrome.debugger can't create temp files directly
    // We'll need to either:
    // 1. Use native host for file operations (hybrid mode)
    // 2. Convert base64 to blob and use different upload approach
    throw new Error('Direct file upload requires Native Host - use hybrid mode');
  }

  async scrollIntoView(selector) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector('${selector}');
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      })()
    `);
    await this.delay(300);
  }

  async getElementText(selector) {
    return await this.evaluate(`
      (() => {
        const el = document.querySelector('${selector}');
        return el ? el.textContent.trim() : null;
      })()
    `);
  }

  async elementExists(selector) {
    return await this.evaluate(`document.querySelector('${selector}') !== null`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

CDPService.instance = null;

export const cdpService = CDPService.getInstance();
