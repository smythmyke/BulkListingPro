import { cdpService } from './cdp.js';

const ETSY_URLS = {
  newListing: 'https://www.etsy.com/your/shops/me/listing-editor/create'
};

const DELAYS = {
  short: 300,
  medium: 500,
  long: 1000,
  typing: 30,
  betweenListings: 4000,
  jitter: 2000
};

class EtsyAutomationService {
  constructor() {
    this.isPaused = false;
    this.isCancelled = false;
    this.skipCurrent = false;
    this.onProgressCallback = null;
    this.onVerificationCallback = null;
  }

  static getInstance() {
    if (!EtsyAutomationService.instance) {
      EtsyAutomationService.instance = new EtsyAutomationService();
    }
    return EtsyAutomationService.instance;
  }

  reset() {
    this.isPaused = false;
    this.isCancelled = false;
    this.skipCurrent = false;
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  cancel() { this.isCancelled = true; }
  skip() { this.skipCurrent = true; this.isPaused = false; }

  onProgress(callback) { this.onProgressCallback = callback; }
  onVerification(callback) { this.onVerificationCallback = callback; }

  async interruptibleDelay(ms) {
    const interval = 100;
    let elapsed = 0;
    while (elapsed < ms) {
      if (this.isCancelled) throw new AbortError('cancel');
      if (this.skipCurrent) throw new AbortError('skip');
      while (this.isPaused && !this.isCancelled && !this.skipCurrent) {
        await this.delay(interval);
      }
      await this.delay(interval);
      elapsed += interval;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkForVerification() {
    try {
      const hasVerification = await cdpService.evaluate(`
        (() => {
          const selectors = [
            '[data-captcha]', '.captcha-container', '#captcha',
            'iframe[src*="captcha"]', 'iframe[src*="recaptcha"]',
            'iframe[src*="hcaptcha"]', '.g-recaptcha', '.h-captcha'
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) return { found: true, type: 'captcha' };
          }
          const verifyTexts = ['verify you are human', 'are you a robot', 'security check'];
          const bodyText = document.body?.innerText?.toLowerCase() || '';
          for (const text of verifyTexts) {
            if (bodyText.includes(text)) return { found: true, type: 'text' };
          }
          return { found: false };
        })()
      `);
      return hasVerification;
    } catch (err) {
      return { found: false };
    }
  }

  async waitForVerificationCleared(maxWait = 300000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const check = await this.checkForVerification();
      if (!check.found) return true;
      await this.delay(2000);
    }
    return false;
  }

  async createListing(listing) {
    console.log(`Creating listing: ${listing.title?.substring(0, 50)}...`);

    try {
      await cdpService.navigate(ETSY_URLS.newListing);
      await this.interruptibleDelay(2000);

      let verifyCheck = await this.checkForVerification();
      if (verifyCheck.found) {
        if (this.onVerificationCallback) this.onVerificationCallback(verifyCheck.type);
        const cleared = await this.waitForVerificationCleared();
        if (!cleared) throw new Error('Verification not completed');
        await this.delay(1000);
      }

      await this.selectCategory(listing.category || 'Digital Prints');
      await this.fillItemDetails(listing);
      await this.fillAboutTab(listing);
      await this.fillPriceTab(listing);
      await this.fillTags(listing);
      await this.saveListing(listing.listing_state !== 'active');

      return { success: true, title: listing.title };
    } catch (error) {
      if (error instanceof AbortError) throw error;
      console.error(`Failed to create listing: ${error.message}`);
      return { success: false, error: error.message, title: listing.title };
    }
  }

  async selectCategory(categoryName) {
    await this.interruptibleDelay(DELAYS.medium);

    await cdpService.evaluate(`
      (() => {
        const input = document.querySelector('#wt-portals #category-field-search') ||
                      document.querySelector('input[placeholder*="Search for a category"]');
        if (input) { input.click(); input.focus(); }
      })()
    `);
    await this.interruptibleDelay(200);

    await cdpService.type(categoryName, DELAYS.typing);
    await this.interruptibleDelay(DELAYS.medium);

    await cdpService.evaluate(`
      (() => {
        const option = document.querySelector('#wt-portals li[role="option"]');
        if (option) option.click();
      })()
    `);
    await this.interruptibleDelay(200);

    await this.clickByText('Continue', '#wt-portals');
    await this.interruptibleDelay(DELAYS.medium);
  }

  async fillItemDetails(listing) {
    await this.clickByText('Digital files');
    await this.interruptibleDelay(DELAYS.medium);

    await this.clickByText('I did');
    await this.interruptibleDelay(DELAYS.short);

    await this.clickByText('A finished product');
    await this.interruptibleDelay(DELAYS.short);

    await cdpService.evaluate(`
      (() => {
        const select = document.querySelector('#when-made-select');
        if (select) {
          select.value = '2020_2026';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await this.interruptibleDelay(DELAYS.short);

    await this.clickByText('Created by me');
    await this.interruptibleDelay(DELAYS.short);

    await this.clickByText('Continue');
    await this.interruptibleDelay(DELAYS.long);
  }

  async fillAboutTab(listing) {
    if (listing.title) {
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('input[name="title"]') ||
                        document.querySelector('textarea[name="title"]');
          if (input) { input.value = ''; input.focus(); }
        })()
      `);
      await cdpService.type(listing.title, DELAYS.typing);
      await this.interruptibleDelay(DELAYS.short);
    }

    await this.uploadPhotos(listing);
    await this.uploadDigitalFile(listing);

    if (listing.description) {
      await cdpService.evaluate(`
        (() => {
          const desc = document.querySelector('textarea[name="description"]');
          if (desc) { desc.scrollIntoView({ block: 'center' }); desc.focus(); }
        })()
      `);
      await this.interruptibleDelay(DELAYS.medium);

      await cdpService.evaluate(`
        (() => {
          const desc = document.querySelector('textarea[name="description"]');
          if (desc) {
            desc.value = ${JSON.stringify(listing.description)};
            desc.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }
  }

  async uploadPhotos(listing) {
    const images = [];
    for (let i = 1; i <= 5; i++) {
      const img = listing[`image_${i}`];
      if (img) images.push({ data: img, index: i });
    }

    if (images.length === 0) return;

    for (const img of images) {
      if (img.data.startsWith('data:')) {
        await this.uploadBase64Image(img.data, `image_${img.index}`);
      } else if (img.data.startsWith('http://') || img.data.startsWith('https://')) {
        try {
          const base64 = await this.fetchImageAsBase64(img.data);
          await this.uploadBase64Image(base64, `image_${img.index}`);
        } catch (err) {
          console.warn(`Failed to fetch image from URL: ${err.message}`);
        }
      }
    }
    await this.interruptibleDelay(3000);
  }

  async fetchImageAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async uploadBase64Image(dataUrl, name) {
    const result = await cdpService.evaluate(`
      (() => {
        return new Promise((resolve) => {
          const input = document.querySelector('input[type="file"][accept*="image"]') ||
                        document.querySelector('input[type="file"]');
          if (!input) { resolve({ error: 'No file input found' }); return; }

          const base64 = ${JSON.stringify(dataUrl)};
          const arr = base64.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--) u8arr[n] = bstr.charCodeAt(n);
          const file = new File([u8arr], '${name}.jpg', { type: mime });

          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          resolve({ success: true });
        });
      })()
    `);

    if (result?.error) {
      console.warn('Image upload warning:', result.error);
    }
    await this.interruptibleDelay(1000);
  }

  async uploadDigitalFile(listing) {
    let digitalFile = listing.digital_file_1;
    if (!digitalFile) return;

    if (digitalFile.startsWith('http://') || digitalFile.startsWith('https://')) {
      try {
        digitalFile = await this.fetchImageAsBase64(digitalFile);
      } catch (err) {
        console.warn(`Failed to fetch digital file from URL: ${err.message}`);
        return;
      }
    }

    if (digitalFile.startsWith('data:')) {
      await cdpService.evaluate(`
        (() => {
          const section = [...document.querySelectorAll('*')].find(el =>
            el.textContent.includes('Digital files') && el.tagName !== 'SCRIPT'
          );
          if (section) section.scrollIntoView({ block: 'center' });
        })()
      `);
      await this.interruptibleDelay(DELAYS.medium);

      const result = await cdpService.evaluate(`
        (() => {
          return new Promise((resolve) => {
            const inputs = document.querySelectorAll('input[type="file"]');
            const input = inputs.length > 1 ? inputs[inputs.length - 1] : inputs[0];
            if (!input) { resolve({ error: 'No file input found' }); return; }

            const base64 = ${JSON.stringify(digitalFile)};
            const arr = base64.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) u8arr[n] = bstr.charCodeAt(n);
            const file = new File([u8arr], 'digital_file.zip', { type: mime });

            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            resolve({ success: true });
          });
        })()
      `);

      if (result?.error) {
        console.warn('Digital file upload warning:', result.error);
      }
      await this.interruptibleDelay(3000);
    }
  }

  async fillPriceTab(listing) {
    await this.clickByText('Price');
    await this.interruptibleDelay(DELAYS.long);

    if (listing.price) {
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('input[name="price"]') ||
                        document.querySelector('input[id*="price"]');
          if (input) { input.value = ''; input.focus(); }
        })()
      `);
      await cdpService.type(String(listing.price), DELAYS.typing);
      await this.interruptibleDelay(DELAYS.short);
    }

    const quantity = listing.quantity || 999;
    await cdpService.evaluate(`
      (() => {
        const input = document.querySelector('input[name="quantity"]') ||
                      document.querySelector('input[id*="quantity"]');
        if (input) {
          input.value = '';
          input.focus();
          input.value = '${quantity}';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await this.interruptibleDelay(DELAYS.short);
  }

  async fillTags(listing) {
    const tags = [];
    for (let i = 1; i <= 13; i++) {
      const tag = listing[`tag_${i}`];
      if (tag) tags.push(tag);
    }

    if (tags.length === 0) return;

    await cdpService.evaluate(`
      (() => {
        const tagsLabel = [...document.querySelectorAll('*')].find(el =>
          el.textContent === 'Tags' && el.tagName !== 'SCRIPT'
        );
        if (tagsLabel) tagsLabel.scrollIntoView({ block: 'center' });
      })()
    `);
    await this.interruptibleDelay(DELAYS.medium);

    for (const tag of tags.slice(0, 13)) {
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#listing-tags-input') ||
                        document.querySelector('input[placeholder*="tag"]');
          if (input) { input.focus(); input.value = ''; }
        })()
      `);
      await this.interruptibleDelay(100);

      await cdpService.type(tag, DELAYS.typing);

      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#listing-tags-input') ||
                        document.querySelector('input[placeholder*="tag"]');
          if (input) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }
  }

  async saveListing(asDraft = true) {
    await cdpService.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll('button')].find(b =>
          b.textContent.includes('Save as draft')
        );
        if (btn) btn.scrollIntoView({ block: 'center' });
      })()
    `);
    await this.interruptibleDelay(DELAYS.medium);

    if (asDraft) {
      await this.clickByText('Save as draft');
    } else {
      await this.clickByText('Publish');
      await this.interruptibleDelay(DELAYS.long);
      await this.clickByText('Publish', '[role="dialog"]');
    }

    const confirmed = await this.waitForSuccessMessage(15000);
    if (!confirmed) {
      throw new Error('Save confirmation not detected');
    }
  }

  async waitForSuccessMessage(timeout = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const found = await cdpService.evaluate(`
        (() => {
          const paragraphs = document.querySelectorAll('p');
          for (const p of paragraphs) {
            if (p.textContent.includes('successfully updated') ||
                p.textContent.includes('successfully saved') ||
                p.textContent.includes('successfully published')) {
              return true;
            }
          }
          return false;
        })()
      `);
      if (found) return true;
      await this.delay(500);
    }
    return false;
  }

  async clickByText(text, container = '') {
    const clicked = await cdpService.evaluate(`
      (() => {
        const scope = ${container ? `document.querySelector('${container}')` : 'document'} || document;
        const elements = scope.querySelectorAll('button, label, a, div[role="button"], span');
        for (const el of elements) {
          if (el.textContent.trim().includes('${text.replace(/'/g, "\\'")}')) {
            el.scrollIntoView({ block: 'center' });
            el.click();
            return true;
          }
        }
        return false;
      })()
    `);

    if (!clicked) {
      console.warn(`Warning: Could not find element with text: ${text}`);
    }
    return clicked;
  }
}

class AbortError extends Error {
  constructor(reason) {
    super(`Aborted: ${reason}`);
    this.name = 'AbortError';
    this.reason = reason;
  }
}

EtsyAutomationService.instance = null;

export const etsyAutomationService = EtsyAutomationService.getInstance();
export { AbortError };
