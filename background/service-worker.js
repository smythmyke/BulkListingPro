import { authService } from '../services/auth.js';
import { creditsService } from '../services/credits.js';
import { nativeHostService } from '../services/nativeHost.js';
import { cdpService } from '../services/cdp.js';
import { etsyAutomationService, AbortError } from '../services/etsyAutomation.js';

console.log('BulkListingPro service worker loaded');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const ETSY_PATTERNS = [
  'etsy.com/your/shops',
  'etsy.com/listing-editor',
  'etsy.com/your/listings'
];

const CREDITS_PER_LISTING = 2;

function isEtsyPage(url) {
  if (!url) return false;
  return url.includes('etsy.com') && ETSY_PATTERNS.some(pattern => url.includes(pattern));
}

async function openSidePanelForTab(tabId, windowId) {
  try {
    await chrome.sidePanel.open({ tabId });
  } catch (err) {
    try {
      await chrome.sidePanel.open({ windowId });
    } catch (err2) {
      console.log('Could not auto-open sidepanel:', err2.message);
    }
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isEtsyPage(tab.url)) {
    await openSidePanelForTab(tabId, tab.windowId);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && isEtsyPage(tab.url)) {
      await openSidePanelForTab(activeInfo.tabId, tab.windowId);
    }
  } catch (err) {
    console.log('Error checking activated tab:', err.message);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('SW received message:', message.type);

  switch (message.type) {
    case 'CONTENT_SCRIPT_READY':
      if (sender.tab && isEtsyPage(sender.tab.url)) {
        openSidePanelForTab(sender.tab.id, sender.tab.windowId);
      }
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

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
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

    await cdpService.detach();
    sendResponse({ success: true, results });
  } catch (error) {
    await cdpService.detach();
    sendResponse({ success: false, error: error.message, results });
  }
}
