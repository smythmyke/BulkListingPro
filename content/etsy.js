/**
 * BulkListingPro Content Script for Etsy
 *
 * Injected into etsy.com pages to automate listing creation.
 *
 * Responsibilities:
 * - Detect page type (listing editor, shop manager, etc.)
 * - Fill listing forms with provided data
 * - Handle image and file uploads
 * - Report progress back to background script
 */

console.log('BulkListingPro content script loaded on:', window.location.href);

const WHO_MADE_MAP = { i_did: 0, member: 1, another: 2 };
const WHAT_IS_IT_MAP = { finished_product: 0, supply: 1 };
const RENEWAL_MAP = { automatic: 0, manual: 1 };
const SELECTORS = {
  titleInput: 'textarea#listing-title-input, textarea[name="title"]',
  descriptionInput: 'textarea#listing-description-textarea, textarea[name="description"]',
  priceInput: 'input#listing-price-input, input[name="variations.configuration.price"]',
  quantityInput: 'input#listing-quantity-input, input[name="quantity"]',
  skuInput: 'input#listing-sku-input, input[name="sku"]',
  tagInput: 'input#listing-tags-input',
  tagButton: 'button#listing-tags-button',
  materialsInput: 'input#listing-materials-input',
  materialsButton: 'button#listing-materials-button',
  categoryInput: 'input#category-field-search',
  whoMade: 'input[name="whoMade"]',
  isSupply: 'input[name="isSupply"]',
  whatContent: 'input[name="whatContent"]',
  whenMade: 'select#when-made-select',
  listingType: 'input[name="listing_type_options_group"]',
  shouldAutoRenew: 'input[name="shouldAutoRenew"]',
  shopSection: 'select#shop-section-select',
  saveDraft: 'button[data-testid="save"], button#shop-manager--listing-save',
  publish: 'button[data-testid="publish"]',
  successToast: '[data-test-id="toast-success"], [role="alert"]'
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received:', message.type);

  switch (message.type) {
    case 'FILL_LISTING':
      fillListing(message.payload)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // async response

    case 'GET_PAGE_STATE':
      sendResponse({
        success: true,
        url: window.location.href,
        isListingEditor: window.location.href.includes('listing-editor')
      });
      break;

    default:
      // Don't respond to unknown messages - let other content scripts handle them
      return false;
  }
});

/**
 * Fill a listing form with provided data
 */
async function fillListing(data) {
  console.log('Filling listing:', data.title);

  try {
    await waitForElement(SELECTORS.titleInput);

    if (data.who_made) {
      await selectRadioByIndex(SELECTORS.whoMade, WHO_MADE_MAP[data.who_made] ?? 0);
    }

    if (data.what_is_it) {
      await selectRadioByIndex(SELECTORS.isSupply, WHAT_IS_IT_MAP[data.what_is_it] ?? 0);
    }

    if (data.ai_content) {
      await selectRadioByValue(SELECTORS.whatContent, data.ai_content);
    }

    if (data.when_made) {
      await selectDropdownValue(SELECTORS.whenMade, data.when_made);
    }

    if (data.title) {
      await fillInput(SELECTORS.titleInput, data.title);
    }

    if (data.description) {
      await fillInput(SELECTORS.descriptionInput, data.description);
    }

    if (data.price) {
      await fillInput(SELECTORS.priceInput, data.price.toString());
    }

    if (data.quantity) {
      await fillInput(SELECTORS.quantityInput, data.quantity.toString());
    }

    if (data.sku) {
      await fillInput(SELECTORS.skuInput, data.sku);
    }

    if (data.tags && data.tags.length > 0) {
      await addChipItems(SELECTORS.tagInput, SELECTORS.tagButton, data.tags.slice(0, 13));
    }

    if (data.materials && data.materials.length > 0) {
      await addChipItems(SELECTORS.materialsInput, SELECTORS.materialsButton, data.materials.slice(0, 13));
    }

    if (data.renewal) {
      await selectRadioByIndex(SELECTORS.shouldAutoRenew, RENEWAL_MAP[data.renewal] ?? 0);
    }

    if (data.shop_section) {
      await selectDropdownByText(SELECTORS.shopSection, data.shop_section);
    }

    return { message: 'Listing filled successfully' };
  } catch (error) {
    console.error('Error filling listing:', error);
    throw error;
  }
}

/**
 * Wait for an element to appear in DOM
 */
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for: ${selector}`));
    }, timeout);
  });
}

/**
 * Fill an input field with human-like typing
 */
async function fillInput(selector, value) {
  const input = await waitForElement(selector);
  input.focus();
  input.value = '';

  // Simulate typing
  for (const char of value) {
    input.value += char;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(10 + Math.random() * 20); // Random delay between chars
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
}

/**
 * Add tags one by one
 */
async function selectRadioByIndex(selector, index) {
  const radios = document.querySelectorAll(selector);
  if (radios[index]) {
    radios[index].click();
    radios[index].dispatchEvent(new Event('change', { bubbles: true }));
    await delay(100);
  }
}

async function selectRadioByValue(selector, value) {
  const radio = document.querySelector(`${selector}[value="${value}"]`);
  if (radio) {
    radio.click();
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(100);
  }
}

async function selectDropdownValue(selector, value) {
  const select = await waitForElement(selector);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(100);
}

async function selectDropdownByText(selector, text) {
  const select = await waitForElement(selector);
  const option = Array.from(select.options).find(o =>
    o.textContent.trim().toLowerCase() === text.toLowerCase()
  );
  if (option) {
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await delay(100);
}

async function addChipItems(inputSelector, buttonSelector, items) {
  for (const item of items) {
    const input = await waitForElement(inputSelector);
    input.focus();
    input.value = item;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    const btn = document.querySelector(buttonSelector);
    if (btn) {
      btn.click();
    } else {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    await delay(200);
  }
}

async function clickButton(selector) {
  const button = await waitForElement(selector);
  button.click();
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Notify background that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY', url: window.location.href });
