import { cdpService } from './cdp.js';

const ETSY_URLS = {
  newListing: 'https://www.etsy.com/your/shops/me/listing-editor/create',
  shopLanguages: 'https://www.etsy.com/your/shops/me/languages-translations'
};

const TRANSLATION_LANGUAGES = ['nl', 'fr', 'de', 'it', 'ja', 'pl', 'pt', 'ru', 'es', 'sv'];

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
    this.translationsVerified = false;
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
    this.translationsVerified = false;
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
      await this.interruptibleDelay(1000);
      await this.waitForCategoryInput();

      let verifyCheck = await this.checkForVerification();
      if (verifyCheck.found) {
        if (this.onVerificationCallback) this.onVerificationCallback(verifyCheck.type);
        const cleared = await this.waitForVerificationCleared();
        if (!cleared) throw new Error('Verification not completed');
        await this.delay(1000);
      }

      if (!listing.category || !String(listing.category).trim()) {
        throw new Error('Category is required — set the "category" column to an Etsy taxonomy leaf');
      }

      const needsTranslations = Array.isArray(listing.translate_languages) && listing.translate_languages.length > 0;
      if (needsTranslations && !this.translationsVerified) {
        const sectionPresent = await cdpService.evaluate(`
          (() => !!document.querySelector('#field-translations'))()
        `);
        if (sectionPresent) {
          this.translationsVerified = true;
          console.log('Translation section present — shop languages already enabled');
        } else {
          console.log('Translation section missing — running shop language enable');
          if (this.onProgressCallback) {
            this.onProgressCallback({ status: 'enabling_languages', message: 'Enabling translation languages on your shop (one-time setup)...' });
          }
          await this.enableShopLanguages();
          this.translationsVerified = true;
          await cdpService.navigate(ETSY_URLS.newListing);
          await this.interruptibleDelay(1000);
          await this.waitForCategoryInput();
        }
      }

      await this.selectCategory(String(listing.category).trim());
      await this.fillItemDetails(listing);
      await this.fillAboutTab(listing);
      await this.fillPriceTab(listing);
      await this.fillCategoryAttributes(listing);
      await this.fillColors(listing);
      await this.fillPersonalization(listing);
      await this.fillTags(listing);
      await this.fillMaterials(listing);
      await this.fillTranslations(listing);
      await this.fillSettingsTab(listing);
      await this.fillToggles(listing);
      await this.saveListing(listing.listing_state !== 'active');

      return { success: true, title: listing.title };
    } catch (error) {
      if (error instanceof AbortError) throw error;
      console.error(`Failed to create listing: ${error.message}`);
      const errorCategory = this.categorizeError(error.message);
      return { success: false, error: error.message, errorCategory, title: listing.title };
    }
  }

  categorizeError(message) {
    const msg = message.toLowerCase();
    if (msg.includes('verification') || msg.includes('captcha')) {
      return 'verification';
    } else if (msg.includes('save confirmation') || msg.includes('not detected')) {
      return 'timeout';
    } else if (msg.includes('http') || msg.includes('network') || msg.includes('fetch')) {
      return 'network';
    } else if (msg.includes('not found') || msg.includes('selector') || msg.includes('element')) {
      return 'dom';
    }
    return 'unknown';
  }

  async waitForCategoryInput(maxWait = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const found = await cdpService.evaluate(`
        (() => !!document.querySelector('input#category-field-search'))()
      `);
      if (found) return true;
      await this.delay(300);
    }
    return false;
  }

  async selectCategory(categoryName) {
    const focused = await cdpService.evaluate(`
      (() => {
        const input = document.querySelector('input#category-field-search');
        if (!input) return false;
        input.scrollIntoView({ block: 'center' });
        input.click();
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);
    if (!focused) throw new Error('Category search input not found');
    await this.interruptibleDelay(200);

    await cdpService.type(categoryName, DELAYS.typing);

    const optionsAppeared = await this.waitForCategoryOptions(3000);
    if (!optionsAppeared) {
      throw new Error(`Category typeahead returned no results for "${categoryName}"`);
    }

    const maxRetries = 3;
    let lastReason = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const clicked = await cdpService.evaluate(`
        (() => {
          const target = ${JSON.stringify(categoryName.trim().toLowerCase())};
          const options = [...document.querySelectorAll('ul[role="listbox"][id^="category-search-options"] li[role="option"]')];
          if (!options.length) return { success: false, reason: 'no options rendered' };

          const candidates = options.map(li => {
            const leafEl = li.querySelector('p.wt-text-body');
            const pathSpans = [...li.querySelectorAll('span[data-test-id="seller-taxonomy-path-name"]')];
            return {
              li,
              leaf: (leafEl?.textContent || '').trim().toLowerCase(),
              path: pathSpans.map(s => s.textContent.trim()).join(' > ').toLowerCase()
            };
          });

          let match = candidates.find(c => c.leaf === target);
          if (!match) match = candidates.find(c => c.leaf.includes(target) || target.includes(c.leaf));
          if (!match) match = candidates.find(c => c.path.includes(target));

          if (!match) return { success: false, reason: 'no match', leaves: candidates.map(c => c.leaf) };

          match.li.scrollIntoView({ block: 'center' });
          match.li.click();
          return { success: true, leaf: match.leaf, path: match.path };
        })()
      `);

      if (clicked?.success) {
        await this.interruptibleDelay(DELAYS.short);
        const committed = await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('input#category-field-search');
            const stillInvalid = input?.getAttribute('aria-invalid') === 'true';
            const selectedOption = document.querySelector('ul[role="listbox"][id^="category-search-options"] li[aria-selected="true"]');
            return { invalid: stillInvalid, hasSelected: !!selectedOption };
          })()
        `);

        if (!committed.invalid || committed.hasSelected) {
          console.log(`Category selected: ${clicked.path || clicked.leaf}`);
          await this.interruptibleDelay(DELAYS.medium);
          return;
        }
        lastReason = 'click did not commit';
      } else {
        lastReason = clicked?.reason || 'unknown';
        if (clicked?.leaves) lastReason += ` (available: ${clicked.leaves.join(', ')})`;
      }

      if (attempt < maxRetries) {
        console.log(`Category selection attempt ${attempt} failed: ${lastReason}, retrying...`);
        await this.interruptibleDelay(DELAYS.medium);
      }
    }

    throw new Error(`Could not select category "${categoryName}": ${lastReason}`);
  }

  async waitForCategoryOptions(maxWait = 3000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const count = await cdpService.evaluate(`
        (() => document.querySelectorAll('ul[role="listbox"][id^="category-search-options"] li[role="option"]').length)()
      `);
      if (count > 0) return true;
      await this.delay(200);
    }
    return false;
  }

  async fillCategoryAttributes(listing) {
    const category = String(listing.category || '').trim();
    if (!category) return;
    const categoriesWithCraftType = ['Clip Art & Image Files', 'Fonts'];

    if (categoriesWithCraftType.includes(category)) {
      const craftType = listing.craft_type || 'Scrapbooking';

      await cdpService.evaluate(`
        (() => {
          const attributesHeader = [...document.querySelectorAll('h2, h3, p, div')].find(el =>
            el.textContent.trim() === 'Attributes' || el.textContent.includes('Craft type')
          );
          if (attributesHeader) {
            attributesHeader.scrollIntoView({ block: 'center' });
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.medium);

      const opened = await cdpService.evaluate(`
        (() => {
          const craftTypeSection = [...document.querySelectorAll('[data-attribute-wrapper="true"]')].find(wrapper => {
            const label = wrapper.querySelector('label');
            return label && label.textContent.toLowerCase().includes('craft type');
          });
          if (!craftTypeSection) return { found: false, reason: 'no craft type section' };

          craftTypeSection.scrollIntoView({ block: 'center' });

          const trigger = craftTypeSection.querySelector('input[placeholder="Type to search…"]') ||
                          craftTypeSection.querySelector('input.wt-input');
          if (!trigger) return { found: false, reason: 'no trigger input' };

          trigger.scrollIntoView({ block: 'center' });
          trigger.click();
          trigger.focus();
          return { found: true };
        })()
      `);

      if (opened?.found) {
        await this.interruptibleDelay(DELAYS.medium);

        const selected = await cdpService.evaluate(`
          (() => {
            const craftTypeValue = ${JSON.stringify(craftType.toLowerCase())};
            const checkboxes = document.querySelectorAll('input[type="checkbox"][role="checkbox"]');
            for (const cb of checkboxes) {
              const label = document.querySelector(\`label[for="\${cb.id}"]\`);
              if (label && label.textContent.toLowerCase().includes(craftTypeValue)) {
                if (!cb.checked) {
                  label.click();
                }
                return { selected: true, value: label.textContent.trim() };
              }
            }
            return { selected: false };
          })()
        `);

        if (selected?.selected) {
          console.log(`Craft type selected: ${selected.value}`);
        } else {
          console.warn('Could not select craft type checkbox');
        }

        await this.interruptibleDelay(DELAYS.short);

        await cdpService.evaluate(`
          (() => {
            document.body.click();
          })()
        `);
        await this.interruptibleDelay(DELAYS.short);
      } else {
        console.warn(`Craft type dropdown not found: ${opened?.reason}`);
      }
    }
  }

  async fillItemDetails(listing) {
    const listingType = listing.listing_type || 'digital';
    if (listingType === 'digital') {
      await this.clickByText('Digital files');
    } else {
      await this.clickByText('A physical item');
    }
    await this.interruptibleDelay(DELAYS.medium);

    const hasDialog = await cdpService.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog && dialog.textContent.includes('change your listing type')) {
          const confirmBtn = [...dialog.querySelectorAll('button')].find(b =>
            b.textContent.includes('Change type') || b.textContent.includes('Yes')
          );
          if (confirmBtn) { confirmBtn.click(); return true; }
        }
        return false;
      })()
    `);
    if (hasDialog) await this.interruptibleDelay(DELAYS.long);

    const whoMadeText = { i_did: 'I did', member: 'A member of my shop', another: 'Another company or person' };
    await this.clickByText(whoMadeText[listing.who_made] || 'I did');
    await this.interruptibleDelay(DELAYS.short);

    const whatIsItText = { finished_product: 'A finished product', supply: 'A supply or tool to make things' };
    await this.clickByText(whatIsItText[listing.what_is_it] || 'A finished product');
    await this.interruptibleDelay(DELAYS.short);

    const whenMade = listing.when_made || 'made_to_order';
    await cdpService.evaluate(`
      (() => {
        const select = document.querySelector('#when-made-select');
        if (select) {
          select.value = ${JSON.stringify(whenMade)};
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await this.interruptibleDelay(DELAYS.short);

    const aiContentText = { original: 'Created by me', ai_gen: 'With an AI generator' };
    await this.clickByText(aiContentText[listing.ai_content] || 'Created by me');
    await this.interruptibleDelay(DELAYS.short);

    await this.clickByText('Continue');
    await this.interruptibleDelay(DELAYS.long);
  }

  async fillAboutTab(listing) {
    if (listing.title) {
      const ok = await this.setFieldValue('input[name="title"], textarea[name="title"]', listing.title);
      if (!ok) {
        await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('input[name="title"]') ||
                          document.querySelector('textarea[name="title"]');
            if (input) { input.value = ''; input.focus(); }
          })()
        `);
        await cdpService.type(listing.title, DELAYS.typing);
      }
      await this.interruptibleDelay(DELAYS.short);
    }

    await this.uploadPhotos(listing);
    await this.uploadDigitalFile(listing);

    if (listing.description) {
      const ok = await this.setFieldValue('textarea[name="description"]', listing.description);
      if (!ok) {
        await cdpService.evaluate(`
          (() => {
            const desc = document.querySelector('textarea[name="description"]');
            if (desc) { desc.scrollIntoView({ block: 'center' }); desc.focus(); }
          })()
        `);
        await this.interruptibleDelay(DELAYS.medium);
        await cdpService.type(listing.description, DELAYS.typing);
      }
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
      const priceOk = await this.setFieldValue('input[name="price"], input[id*="price"]', String(listing.price));
      if (!priceOk) {
        await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('input[name="price"]') ||
                          document.querySelector('input[id*="price"]');
            if (input) { input.value = ''; input.focus(); }
          })()
        `);
        await cdpService.type(String(listing.price), DELAYS.typing);
      }
      await this.interruptibleDelay(DELAYS.short);
    }

    const quantity = listing.quantity || 999;
    const qtyOk = await this.setFieldValue('#listing-quantity-input, input[name="quantity"]', String(quantity));
    if (!qtyOk) {
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#listing-quantity-input') ||
                        document.querySelector('input[name="quantity"]');
          if (input) { input.focus(); input.select(); }
        })()
      `);
      await this.interruptibleDelay(100);
      await cdpService.type(String(quantity), DELAYS.typing);
    }
    await this.interruptibleDelay(DELAYS.short);

    if (listing.sku) {
      await this.clickByText('Add SKU');
      await this.interruptibleDelay(DELAYS.medium);
      const skuOk = await this.setFieldValue('#listing-sku-input, input[name="sku"]', listing.sku);
      if (!skuOk) {
        await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('#listing-sku-input') ||
                          document.querySelector('input[name="sku"]');
            if (input) { input.focus(); }
          })()
        `);
        await this.interruptibleDelay(100);
        await cdpService.type(listing.sku, DELAYS.typing);
      }
      await this.interruptibleDelay(DELAYS.short);
    }
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
      const ok = await this.setFieldValue('#listing-tags-input, input[placeholder*="tag"]', tag);
      if (!ok) {
        await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('#listing-tags-input') ||
                          document.querySelector('input[placeholder*="tag"]');
            if (input) { input.focus(); input.value = ''; }
          })()
        `);
        await this.interruptibleDelay(100);
        await cdpService.type(tag, DELAYS.typing);
      }

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

  async fillMaterials(listing) {
    const materials = listing.materials || [];
    if (materials.length === 0) return;

    await cdpService.evaluate(`
      (() => {
        const input = document.querySelector('#listing-materials-input');
        if (input) input.scrollIntoView({ block: 'center' });
      })()
    `);
    await this.interruptibleDelay(DELAYS.medium);

    for (const material of materials.slice(0, 13)) {
      const ok = await this.setFieldValue('#listing-materials-input', material);
      if (!ok) {
        await cdpService.evaluate(`
          (() => {
            const input = document.querySelector('#listing-materials-input');
            if (input) { input.focus(); input.value = ''; }
          })()
        `);
        await this.interruptibleDelay(100);
        await cdpService.type(material, DELAYS.typing);
      }

      await cdpService.evaluate(`
        (() => {
          const btn = document.querySelector('#listing-materials-button');
          if (btn) {
            btn.click();
          } else {
            const input = document.querySelector('#listing-materials-input');
            if (input) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }
  }

  async enableShopLanguages() {
    console.log('Enabling all shop languages on Etsy...');
    await cdpService.navigate(ETSY_URLS.shopLanguages);
    await this.interruptibleDelay(DELAYS.long * 2);

    const onLoginPage = await cdpService.evaluate(`
      (() => location.pathname.startsWith('/signin') || location.pathname.startsWith('/sell'))()
    `);
    if (onLoginPage) {
      throw new Error('Etsy redirected to login. Please sign in to Etsy in this Chrome window first.');
    }

    const opened = await cdpService.evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-controls="shop-languages-overlay"]');
        if (!btn) return { ok: false, reason: 'trigger button not found' };
        btn.scrollIntoView({ block: 'center' });
        btn.click();
        return { ok: true };
      })()
    `);
    if (!opened?.ok) {
      throw new Error(`Could not open shop languages modal: ${opened?.reason || 'unknown'}`);
    }
    await this.interruptibleDelay(DELAYS.long);

    const toggleResult = await cdpService.evaluate(`
      (() => {
        const langs = ${JSON.stringify(TRANSLATION_LANGUAGES)};
        const enabled = [];
        const skipped = [];
        const missing = [];
        for (const iso of langs) {
          const input = document.querySelector('input#language-' + iso);
          if (!input) { missing.push(iso); continue; }
          if (input.checked) {
            skipped.push(iso);
          } else {
            const wrapper = input.closest('label, .wt-switch, [role="switch"]') || input;
            wrapper.click();
            enabled.push(iso);
          }
        }
        return { enabled, skipped, missing };
      })()
    `);
    console.log(`Languages: enabled=[${toggleResult.enabled.join(',')}] already-on=[${toggleResult.skipped.join(',')}] missing=[${toggleResult.missing.join(',')}]`);
    await this.interruptibleDelay(DELAYS.short);

    if (toggleResult.enabled.length === 0) {
      const allAlreadyOn = toggleResult.skipped.length === TRANSLATION_LANGUAGES.length;
      if (allAlreadyOn) {
        await cdpService.evaluate(`
          (() => {
            const overlay = document.querySelector('#shop-languages-overlay');
            const cancel = overlay && [...overlay.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel');
            if (cancel) cancel.click();
          })()
        `);
        return { enabled: [], alreadyEnabled: toggleResult.skipped, missing: toggleResult.missing };
      }
    }

    const saved = await cdpService.evaluate(`
      (() => {
        const overlay = document.querySelector('#shop-languages-overlay');
        if (!overlay) return { ok: false, reason: 'overlay closed' };
        const buttons = [...overlay.querySelectorAll('button')];
        const save = buttons.find(b => /save changes/i.test(b.textContent.trim()));
        if (!save) return { ok: false, reason: 'save button not found' };
        save.scrollIntoView({ block: 'center' });
        save.click();
        return { ok: true };
      })()
    `);
    if (!saved?.ok) {
      throw new Error(`Could not save shop languages: ${saved?.reason || 'unknown'}`);
    }
    await this.interruptibleDelay(DELAYS.long * 2);

    return {
      enabled: toggleResult.enabled,
      alreadyEnabled: toggleResult.skipped,
      missing: toggleResult.missing
    };
  }

  async fillTranslations(listing) {
    const requested = Array.isArray(listing.translate_languages) ? listing.translate_languages : [];
    const translations = listing.translations || {};

    const langsToFill = requested
      .map(l => String(l).toLowerCase())
      .filter(l => translations[l] && (translations[l].title || translations[l].description || (translations[l].tags && translations[l].tags.length)));

    if (langsToFill.length === 0) return;

    const sectionInfo = await cdpService.evaluate(`
      (() => {
        const section = document.querySelector('#field-translations');
        if (!section) return { found: false };
        section.scrollIntoView({ block: 'center' });
        const tabs = [...section.querySelectorAll('button[id$="-translation-tab"]')];
        const tabOrder = tabs.map(t => {
          const m = t.id.match(/^([a-z]{2})-translation-tab$/);
          return m ? m[1] : null;
        }).filter(Boolean);
        return { found: true, tabOrder };
      })()
    `);

    if (!sectionInfo?.found) {
      console.warn('Translations section not found on listing page — shop languages may not be enabled. Skipping translations.');
      return;
    }

    const tabOrder = sectionInfo.tabOrder || [];
    if (tabOrder.length === 0) {
      console.warn('No translation tabs rendered — skipping translations.');
      return;
    }

    await this.interruptibleDelay(DELAYS.medium);

    for (const lang of langsToFill) {
      const N = tabOrder.indexOf(lang);
      if (N === -1) {
        console.warn(`Language ${lang} not enabled at shop level — skipping`);
        continue;
      }

      const t = translations[lang];

      const tabClicked = await cdpService.evaluate(`
        (() => {
          const tab = document.getElementById('${lang}-translation-tab');
          if (!tab) return false;
          tab.scrollIntoView({ block: 'center' });
          tab.click();
          return true;
        })()
      `);
      if (!tabClicked) {
        console.warn(`Could not click tab for ${lang}`);
        continue;
      }
      await this.interruptibleDelay(DELAYS.short);

      if (t.title && String(t.title).trim()) {
        const titleSelector = `textarea[name="translations.${N}.title"]`;
        const ok = await this.setFieldValue(titleSelector, String(t.title).substring(0, 140));
        if (!ok) {
          await cdpService.evaluate(`
            (() => {
              const ta = document.querySelector('textarea[name="translations.${N}.title"]');
              if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); ta.select(); }
            })()
          `);
          await cdpService.type(String(t.title).substring(0, 140), DELAYS.typing);
        }
        await this.interruptibleDelay(DELAYS.short);
      }

      if (t.description && String(t.description).trim()) {
        const descSelector = `textarea[name="translations.${N}.description"]`;
        const ok = await this.setFieldValue(descSelector, String(t.description));
        if (!ok) {
          await cdpService.evaluate(`
            (() => {
              const ta = document.querySelector('textarea[name="translations.${N}.description"]');
              if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); ta.select(); }
            })()
          `);
          await cdpService.type(String(t.description), DELAYS.typing);
        }
        await this.interruptibleDelay(DELAYS.short);
      }

      const tags = Array.isArray(t.tags) ? t.tags.filter(x => x && String(x).trim()).slice(0, 13) : [];
      const tagSelector = `[id="listing-translations.${N}.tags-input"]`;
      for (const tag of tags) {
        const tagText = String(tag).substring(0, 30);
        const ok = await this.setFieldValue(tagSelector, tagText);
        if (!ok) {
          const inputReady = await cdpService.evaluate(`
            (() => {
              const input = document.querySelector('[id="listing-translations.${N}.tags-input"]');
              if (!input) return false;
              input.focus();
              input.value = '';
              return true;
            })()
          `);
          if (!inputReady) break;
          await cdpService.type(tagText, DELAYS.typing);
        }

        await cdpService.evaluate(`
          (() => {
            const btn = document.querySelector('[id="listing-translations.${N}.tags-button"]');
            if (btn) {
              btn.click();
            } else {
              const input = document.querySelector('[id="listing-translations.${N}.tags-input"]');
              if (input) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            }
          })()
        `);
        await this.interruptibleDelay(DELAYS.short);
      }

      console.log(`Filled translation for ${lang} (tab index ${N})`);
    }
  }

  async fillColors(listing) {
    if (!listing.primary_color && !listing.secondary_color) return;

    const colors = [
      { field: 'primary_color', label: 'primary color' },
      { field: 'secondary_color', label: 'secondary color' }
    ];

    const displayNames = {
      beige: 'Beige', black: 'Black', blue: 'Blue', bronze: 'Bronze',
      brown: 'Brown', clear: 'Clear', copper: 'Copper', gold: 'Gold',
      gray: 'Gray', green: 'Green', orange: 'Orange', pink: 'Pink',
      purple: 'Purple', red: 'Red', rose_gold: 'Rose gold', silver: 'Silver',
      white: 'White', yellow: 'Yellow', rainbow: 'Rainbow'
    };

    for (const { field, label } of colors) {
      const colorValue = listing[field];
      if (!colorValue) continue;

      const displayName = displayNames[colorValue] || colorValue;

      const opened = await cdpService.evaluate(`
        (() => {
          const wrappers = document.querySelectorAll('[data-attribute-wrapper="true"]');
          for (const wrapper of wrappers) {
            if (wrapper.textContent.toLowerCase().includes(${JSON.stringify(label)})) {
              wrapper.scrollIntoView({ block: 'center' });
              const trigger = wrapper.querySelector('input.wt-input') ||
                              wrapper.querySelector('input[type="text"]');
              if (!trigger) return { found: false, reason: 'no input in wrapper' };
              trigger.scrollIntoView({ block: 'center' });
              trigger.click();
              trigger.focus();
              return { found: true };
            }
          }
          return { found: false, reason: 'no color wrapper' };
        })()
      `);

      if (!opened?.found) {
        console.log('Color field "' + label + '" not found, skipping (' + (opened?.reason || 'unknown') + ')');
        continue;
      }

      await this.interruptibleDelay(DELAYS.long);

      let selected = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        selected = await cdpService.evaluate(`
          (() => {
            const colorName = ${JSON.stringify(displayName.toLowerCase())};
            const menuItems = document.querySelectorAll('button[role="menuitemradio"]');
            for (const item of menuItems) {
              if (item.textContent.trim().toLowerCase().includes(colorName)) {
                item.scrollIntoView({ block: 'center' });
                item.click();
                return { selected: true, value: item.textContent.trim() };
              }
            }
            return { selected: false, menuCount: menuItems.length };
          })()
        `);
        if (selected?.selected) break;
        console.log('Color attempt ' + attempt + ': ' + (selected?.menuCount || 0) + ' menu items found');
        await this.interruptibleDelay(DELAYS.long);
      }

      if (selected?.selected) {
        console.log(label + ': ' + selected.value);
      } else {
        console.warn('Could not select color "' + displayName + '" for ' + label);
      }

      await this.interruptibleDelay(DELAYS.short);
      await cdpService.evaluate(`document.body.click()`);
      await this.interruptibleDelay(DELAYS.short);
    }
  }

  async fillPersonalization(listing) {
    if (!listing.personalization_instructions) return;

    const expanded = await cdpService.evaluate(`
      (() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent.includes('Add personalization')) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
        }
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
          if (ta.name && ta.name.includes('personalization')) return true;
          const label = ta.closest('.wt-mb-xs-2, .wt-mb-xs-3, [class*="personalization"]');
          if (label) return true;
        }
        return false;
      })()
    `);

    if (!expanded) {
      console.warn('Personalization section not found');
      return;
    }
    await this.interruptibleDelay(DELAYS.long);

    await cdpService.evaluate(`
      (() => {
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
          const nearby = ta.closest('[class*="personalization"]') ||
                         ta.parentElement?.parentElement;
          const label = nearby?.querySelector('label');
          if (label && label.textContent.toLowerCase().includes('instruction')) {
            ta.scrollIntoView({ block: 'center' });
            ta.focus();
            ta.value = ${JSON.stringify(listing.personalization_instructions)};
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        }
        const ta = document.querySelector('textarea[name*="personalization"], textarea[id*="personalization"]');
        if (ta) {
          ta.focus();
          ta.value = ${JSON.stringify(listing.personalization_instructions)};
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `);
    await this.interruptibleDelay(DELAYS.short);

    if (listing.personalization_char_limit) {
      await cdpService.evaluate(`
        (() => {
          const input = document.getElementById('field-personalization-personalizationCharCountMax');
          if (input) {
            input.scrollIntoView({ block: 'center' });
            input.focus();
            input.value = ${JSON.stringify(String(listing.personalization_char_limit))};
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }

    const wantOptional = !listing.personalization_required;
    await cdpService.evaluate(`
      (() => {
        const cb = document.getElementById('field-personalization-personalizationIsRequired');
        if (!cb) return false;
        const isOptional = cb.checked;
        const wantOptional = ${JSON.stringify(wantOptional)};
        if (isOptional !== wantOptional) {
          const label = document.querySelector('label[for="field-personalization-personalizationIsRequired"]');
          if (label) label.click();
          else cb.click();
        }
        return true;
      })()
    `);
    await this.interruptibleDelay(DELAYS.short);
  }

  async fillToggles(listing) {
    if (!listing.featured && !listing.etsy_ads) return;

    await cdpService.evaluate(`
      (() => {
        const fieldset = document.getElementById('field-featuredRank') ||
                         document.getElementById('field-shouldAdvertise');
        if (fieldset) fieldset.scrollIntoView({ block: 'center' });
      })()
    `);
    await this.interruptibleDelay(DELAYS.medium);

    if (listing.featured) {
      await cdpService.evaluate(`
        (() => {
          const cb = document.getElementById('listing-featured-rank-checkbox');
          if (cb && !cb.checked) {
            const label = document.querySelector('label[for="listing-featured-rank-checkbox"]');
            if (label) label.click();
            else cb.click();
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }

    if (listing.etsy_ads) {
      await cdpService.evaluate(`
        (() => {
          const cb = document.getElementById('listing-is-promoted-checkbox');
          if (cb && !cb.checked) {
            const label = document.querySelector('label[for="listing-is-promoted-checkbox"]');
            if (label) label.click();
            else cb.click();
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }
  }

  async fillSettingsTab(listing) {
    const hasRenewal = listing.renewal && listing.renewal !== 'automatic';
    const hasShopSection = listing.shop_section;
    if (!hasRenewal && !hasShopSection) return;

    await cdpService.evaluate(`
      (() => {
        const settingsTab = document.querySelector('a[href*="#settings"]');
        if (settingsTab) settingsTab.click();
      })()
    `);
    await this.interruptibleDelay(DELAYS.long);

    if (hasShopSection) {
      await cdpService.evaluate(`
        (() => {
          const select = document.querySelector('#shop-section-select');
          if (!select) return;
          const sectionName = ${JSON.stringify(listing.shop_section)}.toLowerCase();
          const option = [...select.options].find(o => o.textContent.trim().toLowerCase() === sectionName);
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `);
      await this.interruptibleDelay(DELAYS.short);
    }

    if (hasRenewal) {
      const renewalText = listing.renewal === 'manual' ? 'Manual' : 'Automatic';
      await this.clickByText(renewalText);
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

  // Fast field-fill via native value setter + synthetic React events.
  // Use for non-typeahead fields. Skips per-character keystrokes — populates the
  // entire string in one CDP round-trip. Works on React-controlled inputs because
  // we use the native value setter (React intercepts the prototype setter).
  // Falls back to typing if the synthetic events don't take.
  async setFieldValue(selector, text, options = {}) {
    const result = await cdpService.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return { ok: false, reason: 'no element' };
        el.scrollIntoView({ block: 'center' });
        el.focus();
        const proto = el instanceof window.HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, ${JSON.stringify(String(text))});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: el.value };
      })()
    `);
    if (!result?.ok && options.fallbackToTyping !== false) {
      console.warn(`setFieldValue failed for "${selector}": ${result?.reason} — falling back to simulated typing`);
      return false;
    }
    return result?.ok || false;
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
