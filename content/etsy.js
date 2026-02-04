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

// Import selectors (will be defined in services/etsySelectors.js)
// For now, inline basic selectors
const SELECTORS = {
  titleInput: 'input[name="title"], [data-test-id="title-input"] input',
  descriptionInput: 'textarea[name="description"]',
  priceInput: 'input[name="price"]',
  quantityInput: 'input[name="quantity"]',
  tagInput: 'input[placeholder*="tag"]',
  saveAsDraft: 'button:has-text("Save as draft")',
  successToast: '[data-test-id="toast-success"], :has-text("successfully")'
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
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Fill a listing form with provided data
 */
async function fillListing(data) {
  console.log('Filling listing:', data.title);

  try {
    // Wait for form to be ready
    await waitForElement(SELECTORS.titleInput);

    // Fill title
    if (data.title) {
      await fillInput(SELECTORS.titleInput, data.title);
    }

    // Fill description
    if (data.description) {
      await fillInput(SELECTORS.descriptionInput, data.description);
    }

    // Fill price
    if (data.price) {
      await fillInput(SELECTORS.priceInput, data.price.toString());
    }

    // Fill quantity
    if (data.quantity) {
      await fillInput(SELECTORS.quantityInput, data.quantity.toString());
    }

    // Add tags
    if (data.tags && data.tags.length > 0) {
      await addTags(data.tags);
    }

    // Upload images (TODO)
    // Upload digital files (TODO)

    // Save as draft
    // await clickButton(SELECTORS.saveAsDraft);

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
async function addTags(tags) {
  for (const tag of tags.slice(0, 13)) { // Max 13 tags
    const input = await waitForElement(SELECTORS.tagInput);
    input.focus();
    input.value = tag;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Press Enter to add tag
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await delay(200);
  }
}

/**
 * Click a button
 */
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
