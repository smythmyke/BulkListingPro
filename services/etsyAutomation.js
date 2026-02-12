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
      await this.interruptibleDelay(1000);
      await this.waitForCategoryInput();

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
      await this.fillCategoryAttributes(listing);
      await this.fillColors(listing);
      await this.fillPersonalization(listing);
      await this.fillTags(listing);
      await this.fillMaterials(listing);
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

  async waitForCategoryInput(maxWait = 3000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const found = await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#wt-portals #category-field-search') ||
                        document.querySelector('input[placeholder*="Search for a category"]');
          return !!input;
        })()
      `);
      if (found) return true;
      await this.delay(300);
    }
    return false;
  }

  async selectCategory(categoryName) {
    await cdpService.evaluate(`
      (() => {
        const input = document.querySelector('#wt-portals #category-field-search') ||
                      document.querySelector('input[placeholder*="Search for a category"]');
        if (input) { input.click(); input.focus(); }
      })()
    `);
    await this.interruptibleDelay(200);

    await cdpService.type(categoryName, DELAYS.typing);
    await this.interruptibleDelay(DELAYS.long);

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const clicked = await cdpService.evaluate(`
        (() => {
          const categoryName = ${JSON.stringify(categoryName.toLowerCase())};
          const options = document.querySelectorAll('#wt-portals li[role="option"]');
          for (const option of options) {
            const text = option.textContent.toLowerCase();
            if (text.includes(categoryName)) {
              option.scrollIntoView({ block: 'center' });
              option.click();
              return { success: true, text: option.textContent.trim() };
            }
          }
          if (options.length > 0) {
            options[0].scrollIntoView({ block: 'center' });
            options[0].click();
            return { success: true, text: options[0].textContent.trim(), fallback: true };
          }
          return { success: false, optionCount: options.length };
        })()
      `);

      if (clicked?.success) {
        console.log(`Category selected: ${clicked.text}${clicked.fallback ? ' (fallback)' : ''}`);
        break;
      }

      if (attempt < maxRetries) {
        console.log(`Category selection attempt ${attempt} failed, retrying...`);
        await this.interruptibleDelay(DELAYS.medium);
      } else {
        console.warn(`Failed to select category after ${maxRetries} attempts`);
      }
    }

    await this.interruptibleDelay(DELAYS.medium);
    await this.clickByText('Continue', '#wt-portals');
    await this.interruptibleDelay(DELAYS.medium);
  }

  async fillCategoryAttributes(listing) {
    const category = listing.category || 'Digital Prints';
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
        const input = document.querySelector('#listing-quantity-input') ||
                      document.querySelector('input[name="quantity"]');
        if (input) {
          input.focus();
          input.select();
        }
      })()
    `);
    await this.interruptibleDelay(100);
    await cdpService.type(String(quantity), DELAYS.typing);
    await this.interruptibleDelay(DELAYS.short);

    if (listing.sku) {
      await this.clickByText('Add SKU');
      await this.interruptibleDelay(DELAYS.medium);
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#listing-sku-input') ||
                        document.querySelector('input[name="sku"]');
          if (input) { input.focus(); }
        })()
      `);
      await this.interruptibleDelay(100);
      await cdpService.type(listing.sku, DELAYS.typing);
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
      await cdpService.evaluate(`
        (() => {
          const input = document.querySelector('#listing-materials-input');
          if (input) { input.focus(); input.value = ''; }
        })()
      `);
      await this.interruptibleDelay(100);
      await cdpService.type(material, DELAYS.typing);

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
