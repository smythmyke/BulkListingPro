import { authService } from '../services/auth.js';
import { creditsService } from '../services/credits.js';
import { nativeHostService } from '../services/nativeHost.js';
import { cdpService } from '../services/cdp.js';
import { etsyAutomationService, AbortError } from '../services/etsyAutomation.js';
import { etsyShopScraperService } from '../services/etsyShopScraper.js';
import { etsyStorefrontScraperService } from '../services/etsyStorefrontScraper.js';
import { etsyEditPageScraperService } from '../services/etsyEditPageScraper.js';

console.log('BulkListingPro service worker loaded');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const CREDITS_PER_LISTING = 2;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('SW received message:', message.type);

  switch (message.type) {
    case 'CONTENT_SCRIPT_READY':
      sendResponse({ success: true });
      return true;

    case 'CHECK_AUTH':
      handleCheckAuth(sendResponse);
      return true;

    case 'SIGN_IN':
      handleSignIn(sendResponse);
      return true;

    case 'SIGN_OUT':
      handleSignOut(sendResponse);
      return true;

    case 'CHECK_CREDITS':
      handleCheckCredits(sendResponse);
      return true;

    case 'GET_CREDIT_PACKS':
      handleGetCreditPacks(sendResponse);
      return true;

    case 'CREATE_CHECKOUT':
      handleCreateCheckout(message.payload, sendResponse);
      return true;

    case 'GET_SUBSCRIPTION_PLANS':
      handleGetSubscriptionPlans(sendResponse);
      return true;

    case 'CREATE_SUBSCRIPTION_CHECKOUT':
      handleCreateSubscriptionCheckout(message.payload, sendResponse);
      return true;

    case 'OPEN_CUSTOMER_PORTAL':
      handleOpenCustomerPortal(sendResponse);
      return true;

    case 'ENABLE_SHOP_LANGUAGES':
      handleEnableShopLanguages(message.payload, sendResponse);
      return true;

    case 'DEDUCT_CREDITS':
      handleDeductCredits(message.payload, sendResponse);
      return true;

    case 'START_UPLOAD':
      handleStartUpload(message.payload, sendResponse);
      return true;

    case 'LISTING_COMPLETE':
      handleListingComplete(message.payload, sendResponse);
      return true;

    case 'LISTING_ERROR':
      handleListingError(message.payload, sendResponse);
      return true;

    case 'NATIVE_CHECK':
      handleNativeCheck(sendResponse);
      return true;

    case 'NATIVE_DISCONNECT':
      handleNativeDisconnect(sendResponse);
      return true;

    case 'NATIVE_STATUS':
      sendResponse({ connected: nativeHostService.isConnected() });
      return true;

    case 'NATIVE_READ_FILE':
      handleNativeReadFile(message.payload, sendResponse);
      return true;

    case 'NATIVE_READ_FILES':
      handleNativeReadFiles(message.payload, sendResponse);
      return true;

    case 'DIRECT_UPLOAD':
      handleDirectUpload(message.payload, sendResponse);
      return true;

    case 'DIRECT_PAUSE':
      etsyAutomationService.pause();
      sendResponse({ success: true });
      return true;

    case 'DIRECT_RESUME':
      etsyAutomationService.resume();
      sendResponse({ success: true });
      return true;

    case 'DIRECT_CANCEL':
      etsyAutomationService.cancel();
      sendResponse({ success: true });
      return true;

    case 'DIRECT_SKIP':
      etsyAutomationService.skip();
      sendResponse({ success: true });
      return true;

    case 'CHECK_DEBUGGER':
      handleCheckDebugger(sendResponse);
      return true;

    case 'SCRAPE_LISTINGS':
      handleScrapeListings(message.payload, sendResponse);
      return true;

    case 'BACKFILL_LISTINGS':
      handleBackfillListings(message.payload, sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});


async function handleCheckAuth(sendResponse) {
  try {
    const result = await authService.checkAuth();
    sendResponse(result);
  } catch (error) {
    sendResponse({ authenticated: false, user: null, error: error.message });
  }
}

async function handleSignIn(sendResponse) {
  try {
    const user = await authService.signIn();
    sendResponse({ success: true, user });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSignOut(sendResponse) {
  try {
    await authService.signOut();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCheckCredits(sendResponse) {
  try {
    const balance = await creditsService.getBalance();
    sendResponse({ success: true, credits: balance });
  } catch (error) {
    sendResponse({ success: false, credits: { available: 0, used: 0 }, error: error.message });
  }
}

async function handleGetCreditPacks(sendResponse) {
  try {
    const packs = await creditsService.getCreditPacks();
    sendResponse({ success: true, packs });
  } catch (error) {
    sendResponse({ success: false, packs: [], error: error.message });
  }
}

async function handleCreateCheckout(payload, sendResponse) {
  try {
    const { packId } = payload;
    const result = await creditsService.createCheckoutSession(packId);
    sendResponse({ success: true, ...result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetSubscriptionPlans(sendResponse) {
  try {
    const plans = await creditsService.getSubscriptionPlans();
    sendResponse({ success: true, plans });
  } catch (error) {
    sendResponse({ success: false, plans: [], error: error.message });
  }
}

async function handleCreateSubscriptionCheckout(payload, sendResponse) {
  try {
    const { planId } = payload;
    const result = await creditsService.createSubscriptionCheckout(planId);
    sendResponse({ success: true, ...result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleOpenCustomerPortal(sendResponse) {
  try {
    const result = await creditsService.openCustomerPortal();
    sendResponse({ success: true, ...result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEnableShopLanguages(payload, sendResponse) {
  const { tabId } = payload || {};
  if (!tabId) {
    sendResponse({ success: false, error: 'No Etsy tab provided' });
    return;
  }

  try {
    await cdpService.attach(tabId);
    const result = await etsyAutomationService.enableShopLanguages();
    sendResponse({ success: true, ...result });
  } catch (error) {
    console.error('ENABLE_SHOP_LANGUAGES error:', error);
    sendResponse({ success: false, error: error.message || 'Unknown error' });
  }
}

async function handleDeductCredits(payload, sendResponse) {
  try {
    const { amount = CREDITS_PER_LISTING, feature = 'etsy_listing' } = payload || {};
    const result = await creditsService.useCredits(amount, feature);

    if (result.success) {
      broadcastCreditsUpdate(result.creditsRemaining);
    }

    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function broadcastCreditsUpdate(available) {
  const balance = await creditsService.getBalance(true);
  chrome.runtime.sendMessage({
    type: 'CREDITS_UPDATED',
    credits: balance
  }).catch(() => {});
}

async function handleStartUpload(payload, sendResponse) {
  sendResponse({ success: true, message: 'Upload started' });
}

async function handleListingComplete(payload, sendResponse) {
  try {
    const result = await creditsService.useCredits(CREDITS_PER_LISTING, 'etsy_listing');
    if (result.success) {
      broadcastCreditsUpdate(result.creditsRemaining);
    }
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleListingError(payload, sendResponse) {
  console.error('Listing error:', payload);
  sendResponse({ success: true });
}

async function handleNativeCheck(sendResponse) {
  try {
    const connectResult = await nativeHostService.connect();
    sendResponse({ success: true, nativeHost: true, version: connectResult.version });
  } catch (error) {
    sendResponse({ success: false, nativeHost: false, error: error.message });
  }
}

async function handleNativeDisconnect(sendResponse) {
  try {
    nativeHostService.disconnect();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleNativeReadFile(payload, sendResponse) {
  try {
    if (!nativeHostService.isConnected()) {
      await nativeHostService.connect();
    }
    const result = await nativeHostService.readFile(payload.path);
    sendResponse({ success: true, ...result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleNativeReadFiles(payload, sendResponse) {
  try {
    if (!nativeHostService.isConnected()) {
      await nativeHostService.connect();
    }
    const results = await nativeHostService.readFiles(payload.paths);
    sendResponse({ success: true, results });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCheckDebugger(sendResponse) {
  sendResponse({ success: true, available: true });
}

async function handleScrapeListings(payload, sendResponse) {
  try {
    const tabId = payload?.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' });
      return;
    }
    const listings = await etsyShopScraperService.scrapeCurrentPage(tabId);
    sendResponse({ success: true, listings });
  } catch (err) {
    sendResponse({ success: false, error: err.message || 'Scrape failed' });
  }
}

const EDITOR_LISTINGS_KEY = 'bulklistingpro_editor_listings';
const BACKFILL_CONCURRENCY = 3;
const BACKFILL_INTER_BATCH_DELAY_MS = 250;

async function handleBackfillListings(payload, sendResponse) {
  sendResponse({ success: true, started: true });

  const tabId = payload?.tabId;
  const etsyIds = Array.isArray(payload?.etsyListingIds) ? payload.etsyListingIds : [];
  if (!tabId || etsyIds.length === 0) {
    console.warn('[edit-import] backfill skipped: missing tabId or empty ids');
    return;
  }
  console.log('[edit-import] backfill start', { tabId, count: etsyIds.length });

  let succeeded = 0;
  let failed = 0;
  let blocked = false;
  let editPageWins = 0;
  let storefrontFallbacks = 0;

  for (let i = 0; i < etsyIds.length; i += BACKFILL_CONCURRENCY) {
    const batch = etsyIds.slice(i, i + BACKFILL_CONCURRENCY);
    const results = await Promise.all(batch.map(async (etsyId) => {
      try {
        const editR = await etsyEditPageScraperService.scrapeListing(tabId, etsyId);
        if (editR.success) {
          return { etsyId, source: 'edit_page', ...editR };
        }
        console.warn('[edit-import] edit-page failed, trying storefront', { etsyId, error: editR.error, status: editR.status });
        const sfR = await etsyStorefrontScraperService.scrapeListing(tabId, etsyId);
        if (sfR.success) {
          return { etsyId, source: 'storefront', ...sfR, editPageError: editR.error };
        }
        return { etsyId, source: null, success: false, error: 'both sources failed', editPageError: editR.error, storefrontError: sfR.error, blocked: editR.blocked || sfR.blocked };
      } catch (err) {
        return { etsyId, source: null, success: false, error: err?.message || String(err) };
      }
    }));

    for (const r of results) {
      if (r.success) {
        succeeded++;
        if (r.source === 'edit_page') editPageWins++;
        else if (r.source === 'storefront') storefrontFallbacks++;
      } else {
        failed++;
        if (r.blocked) blocked = true;
        console.warn('[edit-import] backfill listing failed', { etsyId: r.etsyId, editPageError: r.editPageError, storefrontError: r.storefrontError });
      }
    }

    await applyBackfillResultsToStorage(results);

    if (blocked) {
      console.warn('[edit-import] backfill halted due to DataDome block');
      break;
    }
    if (i + BACKFILL_CONCURRENCY < etsyIds.length) {
      await new Promise(res => setTimeout(res, BACKFILL_INTER_BATCH_DELAY_MS));
    }
  }

  console.log('[edit-import] backfill done', { succeeded, failed, blocked, editPageWins, storefrontFallbacks });
}

async function applyBackfillResultsToStorage(results) {
  const data = await chrome.storage.local.get(EDITOR_LISTINGS_KEY);
  const listings = Array.isArray(data[EDITOR_LISTINGS_KEY]) ? data[EDITOR_LISTINGS_KEY] : [];
  let changed = false;

  for (const r of results) {
    if (!r.success || !r.data) {
      // Even failures get marked so the user can retry later
      const failTarget = listings.find(l => l && l.etsy_listing_id === r.etsyId);
      if (failTarget && !failTarget._backfill_failed) {
        failTarget._backfill_failed = true;
        failTarget._backfill_error = (r.editPageError || r.error || 'unknown').slice(0, 200);
        changed = true;
      }
      continue;
    }
    const target = listings.find(l => l && l.etsy_listing_id === r.etsyId);
    if (!target) continue;
    const d = r.data;
    const source = r.source || 'unknown';

    // Common to both sources
    if (d.description && !target.description) { target.description = d.description; changed = true; }
    if (d.price && !target.price) { target.price = d.price; changed = true; }
    if (d.quantity && !target.quantity) {
      target.quantity = typeof d.quantity === 'number' ? String(d.quantity) : d.quantity;
      changed = true;
    }

    // Storefront-only fields
    if (d.currency && !target._storefront_currency) { target._storefront_currency = d.currency; changed = true; }
    if (d.category && !target._storefront_category) { target._storefront_category = d.category; changed = true; }

    // Edit-page-only fields
    if (Array.isArray(d.tags) && d.tags.length > 0 && (!Array.isArray(target.tags) || target.tags.length === 0)) {
      target.tags = d.tags.slice(0, 13);
      changed = true;
    }
    if (Array.isArray(d.materials) && d.materials.length > 0 && (!Array.isArray(target.materials) || target.materials.length === 0)) {
      target.materials = d.materials.slice(0, 13);
      changed = true;
    }
    if (d.sku && !target.sku) { target.sku = d.sku; changed = true; }
    if (d.whoMade && !target.who_made) { target.who_made = d.whoMade; changed = true; }
    if (d.whenMade && !target.when_made) { target.when_made = d.whenMade; changed = true; }
    if (typeof d.isSupply === 'boolean' && target.is_supply == null) { target.is_supply = d.isSupply; changed = true; }
    if (d.shopSectionId != null && !target.shop_section_id) { target.shop_section_id = String(d.shopSectionId); changed = true; }
    if (typeof d.shouldAutoRenew === 'boolean' && !target.renewal) {
      target.renewal = d.shouldAutoRenew ? 'automatic' : 'manual';
      changed = true;
    }
    if (typeof d.isPersonalizable === 'boolean' && target.personalization == null) {
      target.personalization = d.isPersonalizable;
      changed = true;
    }
    if (typeof d.state === 'number' && target._etsy_state == null) { target._etsy_state = d.state; changed = true; }
    if (d.listingType && !target.listing_type) { target.listing_type = d.listingType; changed = true; }

    // Images — upgrade from index thumb if we have better ones
    if (Array.isArray(d.images) && d.images.length > 0) {
      const isIndexThumb = target._image_source === 'etsy_index';
      const isStorefront = target._image_source === 'etsy_storefront';
      const upgradable = (slotVal) => !slotVal || isIndexThumb || (isStorefront && source === 'edit_page');
      for (let i = 0; i < Math.min(d.images.length, 5); i++) {
        const slot = 'image_' + (i + 1);
        if (upgradable(target[slot])) {
          target[slot] = d.images[i];
          changed = true;
        }
      }
      target._image_source = source === 'edit_page' ? 'etsy_edit_page' : 'etsy_storefront';
    }

    if (Array.isArray(d.altTexts)) {
      for (let i = 0; i < Math.min(d.altTexts.length, 5); i++) {
        const k = '_alt_' + (i + 1);
        if (d.altTexts[i] && !target[k]) { target[k] = d.altTexts[i]; changed = true; }
      }
    }

    target._backfill_source = source;
    target._backfill_failed = false;
    target._backfill_error = null;
    target._storefront_fetched_at = new Date().toISOString();
  }

  if (changed) {
    await chrome.storage.local.set({ [EDITOR_LISTINGS_KEY]: listings });
  }
}

async function handleDirectUpload(payload, sendResponse) {
  const { listings, tabId } = payload;

  if (!listings || !Array.isArray(listings) || listings.length === 0) {
    sendResponse({ success: false, error: 'No listings provided' });
    return;
  }

  etsyAutomationService.reset();

  const results = {
    total: listings.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  try {
    await cdpService.attach(tabId);

    cdpService.onDetach((reason) => {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        status: 'debugger_detached',
        reason
      }).catch(() => {});
    });

    etsyAutomationService.onVerification((type) => {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        status: 'verification_required',
        verificationType: type
      }).catch(() => {});
    });

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];

      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        index: i,
        total: listings.length,
        title: listing.title,
        status: 'started'
      }).catch(() => {});

      try {
        const result = await etsyAutomationService.createListing(listing);

        if (result.success) {
          results.success++;
          results.details.push({ index: i, title: listing.title, status: 'success' });

          const creditResult = await creditsService.useCredits(CREDITS_PER_LISTING, 'etsy_listing');

          if (!creditResult.success) {
            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              index: i,
              total: listings.length,
              title: listing.title,
              status: 'complete',
              creditsRemaining: creditResult.creditsRemaining || 0
            }).catch(() => {});

            for (let j = i + 1; j < listings.length; j++) {
              results.failed++;
              results.details.push({ index: j, title: listings[j].title, status: 'failed', error: 'Insufficient credits' });
            }
            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              status: 'out_of_credits',
              creditsRemaining: creditResult.creditsRemaining || 0
            }).catch(() => {});
            break;
          }

          chrome.runtime.sendMessage({
            type: 'UPLOAD_PROGRESS',
            index: i,
            total: listings.length,
            title: listing.title,
            status: 'complete',
            creditsRemaining: creditResult.creditsRemaining
          }).catch(() => {});
        } else {
          results.failed++;
          results.details.push({ index: i, title: listing.title, status: 'failed', error: result.error, errorCategory: result.errorCategory });

          chrome.runtime.sendMessage({
            type: 'UPLOAD_PROGRESS',
            index: i,
            total: listings.length,
            title: listing.title,
            status: 'error',
            error: result.error,
            errorCategory: result.errorCategory
          }).catch(() => {});
        }
      } catch (err) {
        if (err instanceof AbortError) {
          if (err.reason === 'skip') {
            results.skipped++;
            results.details.push({ index: i, title: listing.title, status: 'skipped' });
            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              index: i,
              total: listings.length,
              title: listing.title,
              status: 'skipped'
            }).catch(() => {});
            continue;
          } else if (err.reason === 'cancel') {
            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              status: 'cancelled'
            }).catch(() => {});
            break;
          }
        }

        results.failed++;
        results.details.push({ index: i, title: listing.title, status: 'failed', error: err.message });
        chrome.runtime.sendMessage({
          type: 'UPLOAD_PROGRESS',
          index: i,
          total: listings.length,
          title: listing.title,
          status: 'error',
          error: err.message
        }).catch(() => {});
      }

      if (i < listings.length - 1 && !etsyAutomationService.isCancelled) {
        const jitter = Math.random() * 2000;
        try {
          await etsyAutomationService.interruptibleDelay(4000 + jitter);
        } catch (abortErr) {
          if (abortErr instanceof AbortError && abortErr.reason === 'cancel') {
            break;
          }
        }
      }
    }

    const retryable = results.details.filter(
      d => d.status === 'failed' && d.error !== 'Insufficient credits'
    );

    if (retryable.length > 0 && !etsyAutomationService.isCancelled) {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        status: 'retrying',
        retryCount: retryable.length
      }).catch(() => {});

      etsyAutomationService.reset();

      try {
        await etsyAutomationService.interruptibleDelay(5000);
      } catch (abortErr) {
        if (abortErr instanceof AbortError && abortErr.reason === 'cancel') {
          await cdpService.detach();
          sendResponse({ success: true, results });
          return;
        }
      }

      for (let r = 0; r < retryable.length; r++) {
        const entry = retryable[r];
        const listing = listings[entry.index];

        chrome.runtime.sendMessage({
          type: 'UPLOAD_PROGRESS',
          index: r,
          total: retryable.length,
          title: listing.title,
          status: 'started'
        }).catch(() => {});

        try {
          const result = await etsyAutomationService.createListing(listing);

          if (result.success) {
            results.success++;
            results.failed--;
            const detailIdx = results.details.findIndex(
              d => d.index === entry.index && d.status === 'failed'
            );
            if (detailIdx !== -1) {
              results.details[detailIdx].status = 'success';
              delete results.details[detailIdx].error;
              delete results.details[detailIdx].errorCategory;
            }

            const creditResult = await creditsService.useCredits(CREDITS_PER_LISTING, 'etsy_listing');

            if (!creditResult.success) {
              chrome.runtime.sendMessage({
                type: 'UPLOAD_PROGRESS',
                status: 'out_of_credits',
                creditsRemaining: creditResult.creditsRemaining || 0
              }).catch(() => {});
              break;
            }

            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              index: r,
              total: retryable.length,
              title: listing.title,
              status: 'complete',
              creditsRemaining: creditResult.creditsRemaining
            }).catch(() => {});
          } else {
            chrome.runtime.sendMessage({
              type: 'UPLOAD_PROGRESS',
              index: r,
              total: retryable.length,
              title: listing.title,
              status: 'error',
              error: result.error,
              errorCategory: result.errorCategory
            }).catch(() => {});
          }
        } catch (err) {
          if (err instanceof AbortError && err.reason === 'cancel') {
            break;
          }
        }

        if (r < retryable.length - 1 && !etsyAutomationService.isCancelled) {
          const jitter = Math.random() * 2000;
          try {
            await etsyAutomationService.interruptibleDelay(4000 + jitter);
          } catch (abortErr) {
            if (abortErr instanceof AbortError && abortErr.reason === 'cancel') {
              break;
            }
          }
        }
      }
    }

    await cdpService.detach();
    sendResponse({ success: true, results });
  } catch (error) {
    await cdpService.detach();
    sendResponse({ success: false, error: error.message, results });
  }
}
