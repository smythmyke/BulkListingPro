const CDP = require('chrome-remote-interface');

let client = null;
let Page = null;
let Runtime = null;
let DOM = null;
let Input = null;

async function connectCDP(options = {}) {
  const { host = 'localhost', port = 9222 } = options;

  const targets = await CDP.List({ host, port });
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('etsy.com'));

  if (!pageTarget) {
    const anyPage = targets.find(t => t.type === 'page');
    if (!anyPage) {
      throw new Error('No browser tabs found. Open a tab in Chrome first.');
    }
    client = await CDP({ host, port, target: anyPage });
  } else {
    client = await CDP({ host, port, target: pageTarget });
  }

  Page = client.Page;
  Runtime = client.Runtime;
  DOM = client.DOM;
  Input = client.Input;

  await Page.enable();
  await DOM.enable();
  await Runtime.enable();

  return {
    client,
    Page,
    Runtime,
    DOM,
    Input,
    navigate,
    evaluate,
    click,
    type,
    waitForSelector,
    waitForNavigation,
    setFileInput,
    screenshot
  };
}

async function disconnectCDP(cdpClient) {
  if (cdpClient && cdpClient.client) {
    await cdpClient.client.close();
  }
  client = null;
}

async function navigate(url) {
  await Page.navigate({ url });
  await Page.loadEventFired();
}

async function evaluate(expression) {
  const result = await Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Evaluation failed');
  }

  return result.result.value;
}

async function waitForSelector(selector, timeout = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const found = await evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        return el !== null;
      })()
    `);

    if (found) return true;
    await delay(100);
  }

  throw new Error(`Timeout waiting for selector: ${selector}`);
}

async function click(selector) {
  const coords = await evaluate(`
    (() => {
      const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    })()
  `);

  if (!coords) {
    const textMatch = selector.match(/:has-text\("([^"]+)"\)/);
    if (textMatch) {
      const text = textMatch[1];
      const coordsByText = await evaluate(`
        (() => {
          const elements = [...document.querySelectorAll('button, label, a, div[role="button"]')];
          const el = elements.find(e => e.textContent.includes('${text.replace(/'/g, "\\'")}'));
          if (!el) return null;
          el.scrollIntoView({ block: 'center' });
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
        })()
      `);
      if (coordsByText) {
        await delay(100);
        await Input.dispatchMouseEvent({ type: 'mousePressed', x: coordsByText.x, y: coordsByText.y, button: 'left', clickCount: 1 });
        await Input.dispatchMouseEvent({ type: 'mouseReleased', x: coordsByText.x, y: coordsByText.y, button: 'left', clickCount: 1 });
        return;
      }
    }
    throw new Error(`Element not found: ${selector}`);
  }

  await delay(100);
  await Input.dispatchMouseEvent({ type: 'mousePressed', x: coords.x, y: coords.y, button: 'left', clickCount: 1 });
  await Input.dispatchMouseEvent({ type: 'mouseReleased', x: coords.x, y: coords.y, button: 'left', clickCount: 1 });
}

async function type(selector, text, options = {}) {
  const { delay: typeDelay = 30 } = options;

  await click(selector);
  await delay(100);

  await evaluate(`
    (() => {
      const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
      if (el) {
        el.value = '';
        el.focus();
      }
    })()
  `);

  for (const char of text) {
    await Input.dispatchKeyEvent({ type: 'keyDown', text: char });
    await Input.dispatchKeyEvent({ type: 'keyUp', text: char });
    await delay(typeDelay);
  }
}

async function waitForNavigation(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Navigation timeout')), timeout);
    Page.loadEventFired().then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function setFileInput(selector, filePaths) {
  const { root } = await DOM.getDocument();
  const { nodeId } = await DOM.querySelector({ nodeId: root.nodeId, selector });

  if (!nodeId) {
    throw new Error(`File input not found: ${selector}`);
  }

  const files = Array.isArray(filePaths) ? filePaths : [filePaths];
  await DOM.setFileInputFiles({ nodeId, files });
}

async function screenshot(options = {}) {
  const { format = 'png', quality = 80 } = options;
  const result = await Page.captureScreenshot({ format, quality });
  return result.data;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  connectCDP,
  disconnectCDP
};
