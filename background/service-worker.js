import { authService } from '../services/auth.js';
import { creditsService } from '../services/credits.js';
import { nativeHostService } from '../services/nativeHost.js';

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

    case 'NATIVE_CONNECT':
      handleNativeConnect(sendResponse);
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

    case 'NATIVE_UPLOAD':
      handleNativeUpload(message.payload, sendResponse);
      return true;

    case 'NATIVE_PAUSE':
      nativeHostService.pause();
      sendResponse({ success: true });
      return true;

    case 'NATIVE_RESUME':
      nativeHostService.resume();
      sendResponse({ success: true });
      return true;

    case 'NATIVE_CANCEL':
      nativeHostService.cancel();
      sendResponse({ success: true });
      return true;

    case 'NATIVE_SKIP':
      nativeHostService.skip();
      sendResponse({ success: true });
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

async function handleNativeConnect(sendResponse) {
  console.log('handleNativeConnect: starting');
  try {
    console.log('handleNativeConnect: connecting to native host...');
    const connectResult = await nativeHostService.connect();
    console.log('handleNativeConnect: native host connected', connectResult);

    console.log('handleNativeConnect: connecting to Chrome CDP...');
    const cdpResult = await nativeHostService.connectToChrome({ port: 9222 });
    console.log('handleNativeConnect: CDP connected', cdpResult);

    sendResponse({ success: true });
  } catch (error) {
    console.error('handleNativeConnect: error', error.message);
    sendResponse({ success: false, error: error.message });
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

async function handleNativeUpload(payload, sendResponse) {
  try {
    const { listings } = payload;

    nativeHostService.on('LISTING_STARTED', (msg) => {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        index: msg.index,
        total: msg.total,
        title: msg.title,
        status: 'started'
      }).catch(() => {});
    });

    nativeHostService.on('LISTING_COMPLETE', async (msg) => {
      const result = await creditsService.useCredits(CREDITS_PER_LISTING, 'etsy_listing');
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        index: msg.index,
        total: msg.total,
        title: msg.title,
        status: 'complete',
        creditsRemaining: result.creditsRemaining
      }).catch(() => {});
    });

    nativeHostService.on('LISTING_ERROR', (msg) => {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        index: msg.index,
        total: msg.total,
        title: msg.title,
        status: 'error',
        error: msg.error
      }).catch(() => {});
    });

    nativeHostService.on('LISTING_SKIPPED', (msg) => {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_PROGRESS',
        index: msg.index,
        total: msg.total,
        title: msg.title,
        status: 'skipped'
      }).catch(() => {});
    });

    const results = await nativeHostService.startUpload(listings);
    sendResponse({ success: true, results });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
