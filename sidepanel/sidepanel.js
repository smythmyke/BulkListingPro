import { STORAGE_KEYS, CATEGORIES, CATEGORY_ATTRIBUTES, sanitizeListing, readSpreadsheetFile, isLocalFilePath, collectLocalFilePaths } from '../services/listingUtils.js';
import { applyCode, getReferralCode, getReferralStats, getAffiliateStatus, applyAffiliate, getStripeConnectUrl, getAffiliateDashboard } from '../services/affiliateService.js';
import { startSidepanelTour, shouldAutoStart, showTourIntro } from '../services/tourService.js';

const CREDITS_PER_LISTING = 2;

let user = null;
let credits = { available: 0, used: 0 };
let creditPacks = [];
let selectedPackId = 'standard';
let uploadQueue = [];
let uploadResults = [];
let isUploading = false;
let isPaused = false;
let listingImages = [];
let digitalFile = null;
let currentUploadIndex = 0;
let autoCheckInterval = null;

let setupState = {
  nativeHost: false,
  etsyLoggedIn: false
};

let researchClipboard = null;
let tagLibrary = {};
let selectedTags = new Set();
let lockedFields = new Set();


const elements = {
  setupSection: document.getElementById('setup-section'),
  authSection: document.getElementById('auth-section'),
  mainSection: document.getElementById('main-section'),
  stepNative: document.getElementById('step-native'),
  stepEtsy: document.getElementById('step-etsy'),
  nativeStatus: document.getElementById('native-status'),
  etsyStatus: document.getElementById('etsy-status'),
  downloadWindows: document.getElementById('download-windows'),
  checkSetupBtn: document.getElementById('check-setup-btn'),
  powerModeSection: document.getElementById('power-mode-section'),
  powerModeBadge: document.getElementById('power-mode-badge'),
  powerModeStatus: document.getElementById('power-mode-status'),
  signInBtn: document.getElementById('sign-in-btn'),
  signOutBtn: document.getElementById('sign-out-btn'),
  userAvatar: document.getElementById('user-avatar'),
  userEmail: document.getElementById('user-email'),
  creditBalance: document.getElementById('credit-balance'),
  pageStatus: document.getElementById('page-status'),
  statusText: document.getElementById('status-text'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  browseBtn: document.getElementById('browse-btn'),
  singleListingForm: document.getElementById('single-listing-form'),
  queueSection: document.getElementById('queue-section'),
  queueList: document.getElementById('queue-list'),
  queueCount: document.getElementById('queue-count'),
  startUploadBtn: document.getElementById('start-upload-btn'),
  listingStateSelect: document.getElementById('listing-state-select'),
  clearQueueBtn: document.getElementById('clear-queue-btn'),
  progressSection: document.getElementById('progress-section'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  currentListing: document.getElementById('current-listing'),
  pauseBtn: document.getElementById('pause-btn'),
  skipBtn: document.getElementById('skip-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  creditsModal: document.getElementById('credits-modal'),
  creditPacksContainer: document.getElementById('credit-packs'),
  buyCreditsBtn: document.getElementById('buy-credits-btn'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  resultsSection: document.getElementById('results-section'),
  resultsSuccess: document.getElementById('results-success'),
  resultsFailed: document.getElementById('results-failed'),
  resultsSkipped: document.getElementById('results-skipped'),
  resultsList: document.getElementById('results-list'),
  newUploadBtn: document.getElementById('new-upload-btn'),
  retryFailedBtn: document.getElementById('retry-failed-btn'),
  toast: document.getElementById('toast'),
  imageDropZone: document.getElementById('image-drop-zone'),
  imagePreviews: document.getElementById('image-previews'),
  imageDropPrompt: document.getElementById('image-drop-prompt'),
  imageBrowseBtn: document.getElementById('image-browse-btn'),
  imageFileInput: document.getElementById('image-file-input'),
  digitalFileZone: document.getElementById('digital-file-zone'),
  digitalFileInfo: document.getElementById('digital-file-info'),
  digitalFileName: document.getElementById('digital-file-name'),
  digitalFileRemove: document.getElementById('digital-file-remove'),
  digitalFileBrowseBtn: document.getElementById('digital-file-browse-btn'),
  digitalFileInput: document.getElementById('digital-file-input'),
  digitalFilePrompt: document.getElementById('digital-file-prompt'),
  selectAllCheckbox: document.getElementById('select-all-checkbox'),
  categorySelect: document.getElementById('category'),
  craftTypeGroup: document.getElementById('craft-type-group'),
  craftTypeSelect: document.getElementById('craft-type'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  researchClipboardBar: document.getElementById('research-clipboard-bar'),
  clipboardTitle: document.getElementById('clipboard-title'),
  clipboardMeta: document.getElementById('clipboard-meta'),
  clipboardClearBtn: document.getElementById('clipboard-clear-btn'),
  captureListingBtn: document.getElementById('capture-listing-btn'),
  captureEbayBtn: document.getElementById('capture-ebay-btn'),
  captureAmazonBtn: document.getElementById('capture-amazon-btn'),
  captureStatus: document.getElementById('capture-status'),
  capturedDataSection: document.getElementById('captured-data-section'),
  capturedTitle: document.getElementById('captured-title'),
  capturedTitleCount: document.getElementById('captured-title-count'),
  capturedPrice: document.getElementById('captured-price'),
  capturedCategory: document.getElementById('captured-category'),
  capturedCategoryField: document.getElementById('captured-category-field'),
  capturedTags: document.getElementById('captured-tags'),
  capturedTagsCount: document.getElementById('captured-tags-count'),
  capturedDescription: document.getElementById('captured-description'),
  capturedShop: document.getElementById('captured-shop'),
  capturedShopLink: document.getElementById('captured-shop-link'),
  capturedReviews: document.getElementById('captured-reviews'),
  capturedFavorites: document.getElementById('captured-favorites'),
  selectAllTagsBtn: document.getElementById('select-all-tags-btn'),
  clearTagsBtn: document.getElementById('clear-tags-btn'),
  copySelectedTagsBtn: document.getElementById('copy-selected-tags-btn'),
  toggleDescBtn: document.getElementById('toggle-desc-btn'),
  useAsTemplateBtn: document.getElementById('use-as-template-btn'),
  saveTagsBtn: document.getElementById('save-tags-btn'),
  tagLibraryList: document.getElementById('tag-library-list'),
  titleInput: document.getElementById('title'),
  descriptionInput: document.getElementById('description'),
  priceInput: document.getElementById('price'),
  tagsInput: document.getElementById('tags'),
  accountAvatar: document.getElementById('account-avatar'),
  accountEmail: document.getElementById('account-email'),
  accountMemberSince: document.getElementById('account-member-since'),
  accountSignOutBtn: document.getElementById('account-sign-out-btn'),
  accountCredits: document.getElementById('account-credits'),
  accountCreditsEstimate: document.getElementById('account-credits-estimate'),
  accountBuyCreditsBtn: document.getElementById('account-buy-credits-btn'),
  accountTagLibrary: document.getElementById('account-tag-library'),
  tagSuggestions: document.getElementById('tag-suggestions'),
  suggestionsContent: document.getElementById('suggestions-content'),
  hideSuggestionsBtn: document.getElementById('hide-suggestions-btn'),
  openEditorBtn: document.getElementById('open-editor-btn'),
  generateFullBtn: document.getElementById('generate-full-btn'),
  generateHint: document.getElementById('generate-hint')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('BulkListingPro sidepanel initializing...');
  setupEventListeners();
  await checkPageStatus();
  await loadResearchClipboard();
  await loadTagLibrary();

  const setupComplete = await checkSetup();
  if (!setupComplete) {
    showSetupSection();
    return;
  }

  await checkAuth();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('purchase') === 'success') {
    showToast('Purchase successful! Credits added.', 'success');
    await loadCredits(true);
    window.history.replaceState({}, '', window.location.pathname);
  }

  await checkForInterruptedUpload();
}

async function saveQueueToStorage() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: uploadQueue });
  } catch (err) {
    console.warn('Failed to save queue:', err);
  }
}

async function saveUploadState() {
  try {
    const state = {
      isUploading,
      isPaused,
      currentIndex: currentUploadIndex,
      totalListings: uploadQueue.filter(item => item.selected).length,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.UPLOAD_STATE]: state,
      [STORAGE_KEYS.UPLOAD_RESULTS]: uploadResults
    });
  } catch (err) {
    console.warn('Failed to save upload state:', err);
  }
}

async function clearUploadState() {
  try {
    await chrome.storage.local.remove([
      STORAGE_KEYS.QUEUE,
      STORAGE_KEYS.UPLOAD_STATE,
      STORAGE_KEYS.UPLOAD_RESULTS
    ]);
  } catch (err) {
    console.warn('Failed to clear upload state:', err);
  }
}

async function checkForInterruptedUpload() {
  try {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.QUEUE,
      STORAGE_KEYS.UPLOAD_STATE,
      STORAGE_KEYS.UPLOAD_RESULTS
    ]);

    const savedQueue = data[STORAGE_KEYS.QUEUE];
    const savedState = data[STORAGE_KEYS.UPLOAD_STATE];
    const savedResults = data[STORAGE_KEYS.UPLOAD_RESULTS];

    if (!savedQueue || savedQueue.length === 0) {
      return;
    }

    const staleThreshold = 24 * 60 * 60 * 1000;
    if (savedState?.timestamp && (Date.now() - savedState.timestamp) > staleThreshold) {
      await clearUploadState();
      return;
    }

    if (savedState?.isUploading) {
      const resumeChoice = await showResumeDialog(savedState, savedResults);

      if (resumeChoice === 'resume') {
        uploadQueue = savedQueue;
        uploadResults = savedResults || [];
        currentUploadIndex = savedState.currentIndex || 0;

        const remainingItems = uploadQueue.filter(item => item.selected);
        for (let i = 0; i < currentUploadIndex && i < remainingItems.length; i++) {
          remainingItems[i].selected = false;
          remainingItems[i].status = 'completed';
        }

        renderQueue();
        showToast(`Restored ${uploadQueue.length} listings. ${currentUploadIndex} already processed.`, 'success');
      } else {
        await clearUploadState();
        showToast('Previous session cleared', 'success');
      }
    } else if (savedQueue.length > 0) {
      uploadQueue = savedQueue;
      renderQueue();
      showToast(`Restored ${uploadQueue.length} queued listings`, 'success');
    }
  } catch (err) {
    console.warn('Error checking for interrupted upload:', err);
  }
}

function showResumeDialog(savedState, savedResults) {
  return new Promise((resolve) => {
    const completed = savedResults?.length || 0;
    const total = savedState.totalListings || 0;
    const remaining = total - completed;

    const dialog = document.createElement('div');
    dialog.className = 'resume-dialog-overlay';
    dialog.innerHTML = `
      <div class="resume-dialog">
        <h3>Resume Interrupted Upload?</h3>
        <p>Found an interrupted upload session:</p>
        <ul>
          <li><strong>${completed}</strong> listings completed</li>
          <li><strong>${remaining}</strong> listings remaining</li>
        </ul>
        <div class="resume-dialog-buttons">
          <button class="btn btn-primary" id="resume-btn">Resume Upload</button>
          <button class="btn btn-secondary" id="clear-btn">Start Fresh</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('#resume-btn').addEventListener('click', () => {
      dialog.remove();
      resolve('resume');
    });

    dialog.querySelector('#clear-btn').addEventListener('click', () => {
      dialog.remove();
      resolve('clear');
    });
  });
}

function setupEventListeners() {
  elements.checkSetupBtn.addEventListener('click', recheckSetup);
  elements.downloadWindows.addEventListener('click', handleDownload);
  elements.signInBtn.addEventListener('click', signIn);
  elements.signOutBtn.addEventListener('click', signOut);
  elements.creditBalance.addEventListener('click', showCreditsModal);
  elements.buyCreditsBtn.addEventListener('click', purchaseCredits);
  elements.closeModalBtn.addEventListener('click', hideCreditsModal);
  elements.creditsModal.addEventListener('click', (e) => {
    if (e.target === elements.creditsModal) hideCreditsModal();
  });
  elements.browseBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.singleListingForm.addEventListener('submit', handleSingleListing);
  elements.categorySelect.addEventListener('change', handleCategoryChange);
  elements.startUploadBtn.addEventListener('click', startUpload);
  elements.clearQueueBtn.addEventListener('click', clearQueue);
  elements.pauseBtn.addEventListener('click', pauseUpload);
  elements.skipBtn.addEventListener('click', skipListing);
  elements.cancelBtn.addEventListener('click', cancelUpload);
  elements.newUploadBtn.addEventListener('click', resetToQueue);
  elements.retryFailedBtn.addEventListener('click', retryFailed);
  elements.imageDropZone.addEventListener('dragover', handleImageDragOver);
  elements.imageDropZone.addEventListener('dragleave', handleImageDragLeave);
  elements.imageDropZone.addEventListener('drop', handleImageDrop);
  elements.imageBrowseBtn.addEventListener('click', () => elements.imageFileInput.click());
  elements.imageFileInput.addEventListener('change', handleImageFileSelect);
  elements.digitalFileBrowseBtn.addEventListener('click', () => elements.digitalFileInput.click());
  elements.digitalFileInput.addEventListener('change', handleDigitalFileSelect);
  elements.digitalFileRemove.addEventListener('click', clearDigitalFile);
  elements.selectAllCheckbox.addEventListener('change', toggleSelectAll);
  elements.tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  elements.clipboardClearBtn.addEventListener('click', clearResearchClipboard);
  elements.captureListingBtn.addEventListener('click', captureListingData);
  elements.captureEbayBtn.addEventListener('click', captureEbayListingData);
  elements.captureAmazonBtn.addEventListener('click', captureAmazonListingData);
  elements.selectAllTagsBtn.addEventListener('click', selectAllTags);
  elements.clearTagsBtn.addEventListener('click', clearTagSelection);
  elements.copySelectedTagsBtn.addEventListener('click', copySelectedTags);
  elements.toggleDescBtn.addEventListener('click', toggleDescription);
  elements.useAsTemplateBtn.addEventListener('click', useAsTemplate);
  elements.saveTagsBtn.addEventListener('click', showSaveTagsModal);
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyField(btn.dataset.copy));
  });
  elements.accountSignOutBtn.addEventListener('click', signOut);
  elements.accountBuyCreditsBtn.addEventListener('click', showCreditsModal);
  elements.hideSuggestionsBtn.addEventListener('click', hideSuggestions);
  elements.tagsInput.addEventListener('focus', () => showSuggestionsForCategory(elements.categorySelect.value));
  elements.tagsInput.addEventListener('input', updateSuggestionStates);
  elements.openEditorBtn.addEventListener('click', openEditor);
  elements.generateFullBtn.addEventListener('click', handleGenerateFullListing);
  elements.titleInput.addEventListener('input', updateGenerateButton);
  elements.descriptionInput.addEventListener('input', updateGenerateButton);
  document.querySelectorAll('.field-lock').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      btn.classList.toggle('locked');
      if (btn.classList.contains('locked')) {
        lockedFields.add(field);
        btn.title = 'Unlock field for AI generation';
      } else {
        lockedFields.delete(field);
        btn.title = 'Lock field from AI generation';
      }
    });
  });
  document.getElementById('take-tour-link').addEventListener('click', (e) => {
    e.preventDefault();
    startSidepanelTour();
  });
}

const ETSY_PATTERNS = [
  'etsy.com/your/shops',
  'etsy.com/listing-editor',
  'etsy.com/your/listings'
];

function isEtsyPage(url) {
  if (!url) return false;
  return url.includes('etsy.com') && ETSY_PATTERNS.some(pattern => url.includes(pattern));
}

async function checkPageStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    updatePageStatus(tab?.url);
  } catch (err) {
    console.log('Error checking page status:', err);
    updatePageStatus(null);
  }
}

function updatePageStatus(url) {
  const isEtsy = isEtsyPage(url);

  if (isEtsy) {
    elements.pageStatus.classList.remove('disconnected');
    elements.pageStatus.classList.add('connected');
    if (url.includes('listing-editor')) {
      elements.statusText.textContent = 'Ready - Listing Editor';
    } else if (url.includes('/your/listings')) {
      elements.statusText.textContent = 'Connected - Listings Page';
    } else {
      elements.statusText.textContent = 'Connected to Etsy';
    }
  } else {
    elements.pageStatus.classList.remove('connected');
    elements.pageStatus.classList.add('disconnected');
    elements.statusText.textContent = url?.includes('etsy.com')
      ? 'Navigate to Listing Editor'
      : 'Not on Etsy';
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkPageStatus();
    if (autoCheckInterval && tab?.url?.includes('etsy.com')) {
      const wasLoggedIn = setupState.etsyLoggedIn;
      setupState.etsyLoggedIn = await checkEtsyLoggedIn();
      if (!wasLoggedIn && setupState.etsyLoggedIn) {
        stopAutoCheck();
        setupState.nativeHost = await checkNativeHost();
        updateSetupUI();
        if (setupState.nativeHost) {
          showToast('Ready! Power Mode enabled for local file paths.', 'success');
        } else {
          showToast('Logged in! Ready to upload.', 'success');
        }
        await checkAuth();
      }
    }
  }
});

chrome.tabs.onActivated.addListener(() => {
  checkPageStatus();
});

async function checkAuth() {
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });

  if (response.authenticated) {
    user = response.user;
    showMainSection();
    await loadCredits();
    loadReferralInfo();
    loadAffiliateSection();
    await checkWelcomeFlow();
  } else {
    showAuthSection();
  }
}

async function checkWelcomeFlow() {
  try {
    const { bulklistingpro_welcome_state } = await chrome.storage.local.get('bulklistingpro_welcome_state');
    if (bulklistingpro_welcome_state === 'needs_welcome') {
      showWelcomeModal();
    } else if (bulklistingpro_welcome_state === 'needs_tour') {
      showTourIntro('sidepanel');
    } else if (await shouldAutoStart('sidepanel')) {
      showTourIntro('sidepanel');
    }
  } catch (err) {
    console.warn('Error checking welcome flow:', err);
  }
}

function showWelcomeModal() {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-modal-overlay';
  overlay.innerHTML = `
    <div class="welcome-modal">
      <h3>Welcome to BulkListingPro!</h3>
      <p>You received <strong>10 free credits</strong> to get started.</p>
      <div class="welcome-code-section">
        <label>Have a referral or affiliate code?</label>
        <input type="text" id="welcome-code-input" placeholder="Enter code (e.g. AFF1234)" maxlength="20">
        <span class="welcome-code-error" id="welcome-code-error"></span>
      </div>
      <div class="welcome-modal-buttons">
        <button class="btn btn-primary" id="welcome-apply-btn">Apply Code</button>
        <button class="btn btn-secondary" id="welcome-skip-btn">Skip</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const codeInput = overlay.querySelector('#welcome-code-input');
  const applyBtn = overlay.querySelector('#welcome-apply-btn');
  const skipBtn = overlay.querySelector('#welcome-skip-btn');
  const errorSpan = overlay.querySelector('#welcome-code-error');

  async function handleApply() {
    const code = codeInput.value.trim();
    if (!code) {
      errorSpan.textContent = 'Please enter a code';
      return;
    }

    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying...';
    errorSpan.textContent = '';

    try {
      const result = await applyCode(code);
      if (result.success) {
        overlay.remove();
        await chrome.storage.local.set({ bulklistingpro_welcome_state: 'needs_tour' });
        showToast(`${result.creditsAwarded} bonus credits added!`, 'success');
        await loadCredits(true);
        showTourIntro('sidepanel');
      } else {
        errorSpan.textContent = result.error || 'Invalid code';
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Code';
      }
    } catch (err) {
      errorSpan.textContent = 'Failed to apply code. Try again later.';
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply Code';
    }
  }

  applyBtn.addEventListener('click', handleApply);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleApply();
  });

  skipBtn.addEventListener('click', async () => {
    overlay.remove();
    await chrome.storage.local.set({ bulklistingpro_welcome_state: 'needs_tour' });
    showToast('Welcome! You received 10 free credits to get started!', 'success');
    showTourIntro('sidepanel');
  });
}

async function signIn() {
  elements.signInBtn.classList.add('btn-loading');
  elements.signInBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN' });

    if (response.success) {
      user = response.user;
      showMainSection();
      await loadCredits();
      showToast('Signed in successfully!', 'success');
    } else {
      showToast(response.error || 'Sign in failed', 'error');
    }
  } catch (error) {
    showToast('Sign in failed: ' + error.message, 'error');
  } finally {
    elements.signInBtn.classList.remove('btn-loading');
    elements.signInBtn.disabled = false;
  }
}

async function signOut() {
  try {
    await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
    user = null;
    credits = { available: 0, used: 0 };
    showAuthSection();
    showToast('Signed out', 'success');
  } catch (error) {
    showToast('Sign out failed', 'error');
  }
}

function showAuthSection() {
  elements.setupSection.classList.add('hidden');
  elements.authSection.classList.remove('hidden');
  elements.mainSection.classList.add('hidden');
}

function showMainSection() {
  elements.setupSection.classList.add('hidden');
  elements.authSection.classList.add('hidden');
  elements.mainSection.classList.remove('hidden');

  if (user) {
    elements.userEmail.textContent = user.email;
    elements.userAvatar.src = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>';

    elements.accountEmail.textContent = user.email;
    elements.accountAvatar.src = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>';
    elements.accountMemberSince.textContent = 'BulkListingPro User';
  }
}

async function loadCredits(forceRefresh = false) {
  elements.creditBalance.classList.add('loading');

  const response = await chrome.runtime.sendMessage({ type: 'CHECK_CREDITS' });

  elements.creditBalance.classList.remove('loading');

  if (response.success) {
    const oldCredits = credits.available;
    credits = response.credits;
    updateCreditsDisplay(oldCredits);
    updateGenerateButton();
  }
}

function updateCreditsDisplay(oldValue) {
  const newValue = credits.available;
  const creditsSpan = elements.creditBalance.querySelector('.credits');

  creditsSpan.textContent = newValue;

  elements.accountCredits.textContent = newValue;
  const listingsEstimate = Math.floor(newValue / CREDITS_PER_LISTING);
  elements.accountCreditsEstimate.textContent = `(~${listingsEstimate} listings)`;

  if (oldValue !== undefined && oldValue !== newValue) {
    elements.creditBalance.classList.remove('animate-pop', 'animate-deduct');
    void elements.creditBalance.offsetWidth;

    if (newValue > oldValue) {
      elements.creditBalance.classList.add('animate-pop');
    } else {
      elements.creditBalance.classList.add('animate-deduct');
    }

    setTimeout(() => {
      elements.creditBalance.classList.remove('animate-pop', 'animate-deduct');
    }, 500);
  }

  updateStartButton();
}

function updateStartButton() {
  const selectedCount = uploadQueue.filter(item => item.selected).length;
  const requiredCredits = selectedCount * CREDITS_PER_LISTING;
  elements.startUploadBtn.disabled = selectedCount === 0 || credits.available < requiredCredits;

  if (selectedCount > 0 && credits.available < requiredCredits) {
    elements.startUploadBtn.textContent = `Need ${requiredCredits - credits.available} more credits`;
  } else {
    elements.startUploadBtn.textContent = `Start Upload (${requiredCredits} credits)`;
  }
}

async function loadReferralInfo() {
  const section = document.getElementById('referral-section');
  if (!section) return;

  try {
    const [codeResult, statsResult] = await Promise.allSettled([
      getReferralCode(),
      getReferralStats()
    ]);

    const code = codeResult.status === 'fulfilled' ? codeResult.value?.code : null;
    const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;

    if (!code) {
      section.innerHTML = '<p class="referral-loading">No referral code yet. Share BulkListingPro to earn credits!</p>';
      return;
    }

    const referralCount = stats?.totalReferrals || 0;
    const creditsEarned = stats?.creditsEarned || 0;

    section.innerHTML = `
      <div class="referral-code-row">
        <span class="referral-code-display">${code}</span>
        <button class="referral-copy-btn" id="copy-referral-btn">Copy</button>
      </div>
      <div class="referral-stats">${referralCount} referral${referralCount !== 1 ? 's' : ''} &bull; ${creditsEarned} credits earned</div>
    `;

    section.querySelector('#copy-referral-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        showToast('Referral code copied!', 'success');
      });
    });
  } catch (err) {
    console.warn('[Referral] Failed to load referral info:', err);
    section.innerHTML = '<p class="referral-loading">Could not load referral info</p>';
  }
}

async function loadAffiliateSection() {
  const wrapper = document.getElementById('affiliate-section-wrapper');
  if (!wrapper) return;

  try {
    const status = await getAffiliateStatus();
    wrapper.style.display = '';

    const applyDiv = document.getElementById('affiliate-apply');
    const pendingDiv = document.getElementById('affiliate-pending');
    const activeDiv = document.getElementById('affiliate-active');

    applyDiv.style.display = 'none';
    pendingDiv.style.display = 'none';
    activeDiv.style.display = 'none';

    if (!status.isAffiliate) {
      applyDiv.style.display = '';
    } else if (status.status === 'pending_stripe') {
      pendingDiv.style.display = '';
    } else if (status.status === 'active') {
      activeDiv.style.display = '';

      const codeEl = document.getElementById('affiliate-code');
      if (codeEl) codeEl.textContent = status.affiliateCode || 'N/A';

      try {
        const dashboard = await getAffiliateDashboard();
        const countEl = document.getElementById('affiliate-referral-count');
        const earningsEl = document.getElementById('affiliate-earnings');
        if (countEl) countEl.textContent = dashboard.stats?.totalReferrals || 0;
        if (earningsEl) earningsEl.textContent = '$' + ((dashboard.stats?.totalEarnings || 0) / 100).toFixed(2);
      } catch (err) {
        console.warn('[Affiliate] Dashboard stats unavailable:', err.message);
      }
    }

    initAffiliateEventListeners();
  } catch (error) {
    console.error('[Affiliate] Error loading section:', error);
    wrapper.style.display = 'none';
  }
}

function initAffiliateEventListeners() {
  const applyBtn = document.getElementById('affiliate-apply-btn');
  if (applyBtn && !applyBtn._initialized) {
    applyBtn._initialized = true;
    applyBtn.onclick = async () => {
      try {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';
        const result = await applyAffiliate();
        if (result.success) {
          showToast('Application submitted! Now connect your Stripe account.', 'success');
          await loadAffiliateSection();
        } else {
          showToast(result.error || 'Failed to apply', 'error');
        }
      } catch (error) {
        console.error('[Affiliate] Error applying:', error);
        showToast('Failed to apply', 'error');
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Become an Affiliate';
      }
    };
  }

  const connectBtn = document.getElementById('affiliate-connect-stripe-btn');
  if (connectBtn && !connectBtn._initialized) {
    connectBtn._initialized = true;
    connectBtn.onclick = async () => {
      try {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        const result = await getStripeConnectUrl();
        if (result.url) {
          window.open(result.url, '_blank');
          showToast('Complete setup in the new tab, then return here.', 'info');
        } else {
          showToast('Failed to get Stripe Connect URL', 'error');
        }
      } catch (error) {
        console.error('[Affiliate] Error getting Stripe URL:', error);
        showToast('Failed to connect Stripe', 'error');
      } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Stripe Account';
      }
    };
  }

  const copyBtn = document.getElementById('copy-affiliate-code');
  if (copyBtn && !copyBtn._initialized) {
    copyBtn._initialized = true;
    copyBtn.onclick = async () => {
      const code = document.getElementById('affiliate-code')?.textContent;
      if (code && code !== '...' && code !== 'N/A') {
        try {
          await navigator.clipboard.writeText(code);
          showToast('Affiliate code copied!', 'success');
        } catch (err) {
          console.error('[Affiliate] Failed to copy:', err);
        }
      }
    };
  }

  const dashboardBtn = document.getElementById('view-affiliate-dashboard');
  if (dashboardBtn && !dashboardBtn._initialized) {
    dashboardBtn._initialized = true;
    dashboardBtn.onclick = () => showAffiliateDashboard();
  }
}

async function showAffiliateDashboard() {
  try {
    const dashboard = await getAffiliateDashboard();

    const overlay = document.createElement('div');
    overlay.className = 'affiliate-dashboard-overlay';
    overlay.innerHTML = `
      <div class="affiliate-dashboard-modal">
        <h2>
          <span>Affiliate Dashboard</span>
          <button class="close-btn" id="close-affiliate-dashboard">&times;</button>
        </h2>
        <div class="dashboard-stats">
          <div class="dashboard-stat">
            <span class="dashboard-stat-value">${dashboard.stats?.totalReferrals || 0}</span>
            <span class="dashboard-stat-label">Total Referrals</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat-value">${dashboard.stats?.activeReferrals || 0}</span>
            <span class="dashboard-stat-label">Active (6mo)</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat-value">$${((dashboard.stats?.totalEarnings || 0) / 100).toFixed(2)}</span>
            <span class="dashboard-stat-label">Total Earned</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat-value">${dashboard.affiliateCode || 'N/A'}</span>
            <span class="dashboard-stat-label">Your Code</span>
          </div>
        </div>
        <div class="activity-section">
          <h3>Recent Commissions</h3>
          ${dashboard.recentCommissions?.length > 0 ? `
            <ul class="activity-list">
              ${dashboard.recentCommissions.map(c => `
                <li class="activity-item">
                  <span class="activity-date">${c.date}</span>
                  <span class="activity-amount">+$${(c.amount / 100).toFixed(2)}</span>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="activity-empty">No commissions yet</p>'}
        </div>
        <div class="activity-section">
          <h3>Recent Referrals</h3>
          ${dashboard.recentReferrals?.length > 0 ? `
            <ul class="activity-list">
              ${dashboard.recentReferrals.map(r => `
                <li class="activity-item">
                  <span class="activity-date">${r.date} - ${r.initials}</span>
                  <span style="color: ${r.isActive ? '#10b981' : '#999'}">${r.isActive ? 'Active' : 'Expired'}</span>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="activity-empty">No referrals yet</p>'}
        </div>
        <p class="dashboard-footer">Payouts are automatic via Stripe Connect.</p>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    document.getElementById('close-affiliate-dashboard').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEscape); }
    };
    document.addEventListener('keydown', onEscape);
  } catch (error) {
    console.error('[Affiliate] Error showing dashboard:', error);
    showToast('Failed to load dashboard', 'error');
  }
}

async function showCreditsModal() {
  elements.creditsModal.classList.remove('hidden');
  await loadCreditPacks();
}

function hideCreditsModal() {
  elements.creditsModal.classList.add('hidden');
}

async function loadCreditPacks() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_CREDIT_PACKS' });

  if (response.success && response.packs.length > 0) {
    creditPacks = response.packs;
  } else {
    creditPacks = [
      { id: 'starter', name: 'Starter Pack', credits: 50, price: 199, priceFormatted: '$1.99', badge: null },
      { id: 'standard', name: 'Standard Pack', credits: 150, price: 499, priceFormatted: '$4.99', badge: 'popular' },
      { id: 'pro', name: 'Pro Pack', credits: 400, price: 1199, priceFormatted: '$11.99', badge: null },
      { id: 'power', name: 'Power Pack', credits: 1000, price: 2499, priceFormatted: '$24.99', badge: 'best_value' }
    ];
  }

  renderCreditPacks();
}

function renderCreditPacks() {
  elements.creditPacksContainer.innerHTML = creditPacks.map((pack, index) => {
    const isSelected = pack.id === selectedPackId;
    const badgeHtml = pack.badge
      ? `<span class="pack-badge ${pack.badge === 'popular' ? 'popular' : 'best-value'}">${pack.badge === 'popular' ? 'Popular' : 'Best Value'}</span>`
      : '';
    const priceFormatted = pack.priceFormatted || `$${(pack.price / 100).toFixed(2)}`;
    const listingsCount = Math.floor(pack.credits / CREDITS_PER_LISTING);

    return `
      <label class="pack ${isSelected ? 'selected' : ''}" style="animation-delay: ${index * 0.1}s">
        <input type="radio" name="pack" value="${pack.id}" ${isSelected ? 'checked' : ''}>
        <span class="pack-info">
          <strong>${pack.name} ${badgeHtml}</strong>
          <span>${pack.credits} credits (~${listingsCount} listings)</span>
        </span>
        <span class="pack-price">${priceFormatted}</span>
      </label>
    `;
  }).join('');

  elements.creditPacksContainer.querySelectorAll('.pack').forEach(pack => {
    pack.addEventListener('click', () => {
      elements.creditPacksContainer.querySelectorAll('.pack').forEach(p => p.classList.remove('selected'));
      pack.classList.add('selected');
      selectedPackId = pack.querySelector('input').value;
    });
  });
}

async function purchaseCredits() {
  if (!selectedPackId) {
    showToast('Please select a credit pack', 'error');
    return;
  }

  elements.buyCreditsBtn.classList.add('btn-loading');
  elements.buyCreditsBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_CHECKOUT',
      payload: { packId: selectedPackId }
    });

    if (response.success && response.checkoutUrl) {
      window.open(response.checkoutUrl, '_blank');
      hideCreditsModal();
      showToast('Redirecting to checkout...', 'success');
    } else {
      showToast(response.error || 'Failed to create checkout', 'error');
    }
  } catch (error) {
    showToast('Purchase failed: ' + error.message, 'error');
  } finally {
    elements.buyCreditsBtn.classList.remove('btn-loading');
    elements.buyCreditsBtn.disabled = false;
  }
}

function handleDragOver(e) {
  e.preventDefault();
  elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processSpreadsheet(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processSpreadsheet(files[0]);
  }
  e.target.value = '';
}


async function processSpreadsheet(file) {
  console.log('Processing spreadsheet:', file.name);
  showToast(`Processing ${file.name}...`, 'success');

  try {
    const data = await readSpreadsheetFile(file);
    if (data.length === 0) {
      showToast('No listings found in spreadsheet', 'error');
      return;
    }

    const allWarnings = [];
    const listings = [];

    data.forEach((row, index) => {
      const { listing, warnings } = sanitizeListing(row, index + 2);
      allWarnings.push(...warnings);
      if (listing) listings.push(listing);
    });

    if (listings.length === 0) {
      showToast('No valid listings found (title and valid price required)', 'error');
      return;
    }

    const localPaths = collectLocalFilePaths(listings);
    if (localPaths.length > 0) {
      if (setupState.nativeHost) {
        showToast(`Resolving ${localPaths.length} local file paths...`, 'success');
        const resolvedCount = await resolveLocalFilePaths(listings, localPaths);
        if (resolvedCount > 0) {
          showToast(`Resolved ${resolvedCount} files`, 'success');
        }
      } else {
        allWarnings.push(`Found ${localPaths.length} local file paths but Native Host not installed - files will be skipped`);
      }
    }

    uploadQueue = listings;
    renderQueue();
    await saveQueueToStorage();

    if (allWarnings.length > 0) {
      console.warn(`BulkListingPro: ${allWarnings.length} sanitization warning(s):`);
      allWarnings.forEach(w => console.warn('  ' + w));
      showToast(`Loaded ${uploadQueue.length} listings (${allWarnings.length} warnings — check console)`, 'success');
    } else {
      showToast(`Loaded ${uploadQueue.length} listings`, 'success');
    }
  } catch (error) {
    console.error('Spreadsheet error:', error);
    showToast('Failed to parse spreadsheet: ' + error.message, 'error');
  }
}


async function resolveLocalFilePaths(listings, paths) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NATIVE_READ_FILES',
      payload: { paths }
    });

    if (!response.success) {
      console.warn('Failed to read files:', response.error);
      return 0;
    }

    const pathToData = new Map();
    for (const result of response.results) {
      if (result.data && !result.error) {
        pathToData.set(result.path, result.data);
      } else if (result.error) {
        console.warn(`Failed to read ${result.path}: ${result.error}`);
      }
    }

    const fileFields = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'digital_file_1'];
    let resolvedCount = 0;

    for (const listing of listings) {
      for (const field of fileFields) {
        const value = listing[field];
        if (pathToData.has(value)) {
          listing[field] = pathToData.get(value);
          resolvedCount++;
        }
      }
    }

    return resolvedCount;
  } catch (err) {
    console.error('Error resolving file paths:', err);
    return 0;
  }
}


function handleCategoryChange() {
  const category = elements.categorySelect.value;
  const attrs = CATEGORY_ATTRIBUTES[category];

  if (attrs?.craft_type) {
    elements.craftTypeGroup.classList.remove('hidden');
  } else {
    elements.craftTypeGroup.classList.add('hidden');
  }

  showSuggestionsForCategory(category);
}

function showSuggestionsForCategory(category) {
  const suggestions = getSuggestionsForCategory(category);

  if (suggestions.sets.length === 0 && suggestions.recentTags.length === 0) {
    elements.tagSuggestions.classList.add('hidden');
    return;
  }

  let html = '';

  if (suggestions.sets.length > 0) {
    suggestions.sets.forEach(set => {
      html += `
        <div class="suggestion-group">
          <div class="suggestion-group-title">From "${escapeHtml(set.name)}"</div>
          <div class="suggestion-tags">
            ${set.tags.slice(0, 10).map(tag => `
              <span class="suggestion-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
        </div>
      `;
    });
  }

  if (suggestions.recentTags.length > 0) {
    html += `
      <div class="suggestion-group">
        <div class="suggestion-group-title">Recently used</div>
        <div class="suggestion-tags">
          ${suggestions.recentTags.slice(0, 10).map(tag => `
            <span class="suggestion-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  elements.suggestionsContent.innerHTML = html;
  elements.tagSuggestions.classList.remove('hidden');

  elements.suggestionsContent.querySelectorAll('.suggestion-tag').forEach(tag => {
    tag.addEventListener('click', () => addSuggestionTag(tag));
  });

  updateSuggestionStates();
}

function getSuggestionsForCategory(formCategory) {
  const internalCategory = mapFormCategoryToInternal(formCategory);

  const result = { sets: [], recentTags: [] };

  if (internalCategory && tagLibrary[internalCategory]) {
    const catData = tagLibrary[internalCategory];
    result.sets = catData.sets || [];
    result.recentTags = catData.recentTags || [];
  }

  return result;
}

function mapFormCategoryToInternal(formCategory) {
  const mapping = {
    'Cutting Machine Files': 'Cutting Machine Files',
    'Clip Art & Image Files': 'Clip Art & Image Files',
    'Planners & Templates': 'Planners & Templates',
    'Fonts': 'Fonts',
    'Embroidery Machine Files': 'Embroidery Machine Files',
    'Digital Prints': 'Digital Prints',
    'Digital Patterns': 'Digital Patterns',
    '3D Printer Files': '3D Printer Files',
    'Photography': 'Photography',
    'Social Media Templates': 'Planners & Templates',
    'Resume Templates': 'Planners & Templates',
    'Greeting Card Templates': 'Planners & Templates',
    'Menu Templates': 'Planners & Templates',
    'Event Program Templates': 'Planners & Templates',
    'Newsletter Templates': 'Planners & Templates',
    'Personal Finance Templates': 'Planners & Templates',
    'Bookkeeping Templates': 'Planners & Templates',
    'Contract & Agreement Templates': 'Planners & Templates',
    'Guides & How Tos': 'Digital Prints',
    'Drawing & Illustration': 'Clip Art & Image Files',
    'Flashcards': 'Digital Prints',
    'Study Guides': 'Digital Prints',
    'Worksheets': 'Planners & Templates',
    'Knitting Machine Files': 'Embroidery Machine Files'
  };
  return mapping[formCategory] || null;
}

function addSuggestionTag(tagElement) {
  const tag = tagElement.dataset.tag;
  const currentTags = elements.tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t);

  if (currentTags.length >= 13) {
    showToast('Maximum 13 tags allowed', 'error');
    return;
  }

  if (currentTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
    showToast('Tag already added', 'error');
    return;
  }

  currentTags.push(tag);
  elements.tagsInput.value = currentTags.join(', ');

  tagElement.classList.add('added');
  updateSuggestionStates();
}

function updateSuggestionStates() {
  const currentTags = elements.tagsInput.value
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t);

  elements.suggestionsContent.querySelectorAll('.suggestion-tag').forEach(tag => {
    const tagText = tag.dataset.tag.toLowerCase();
    if (currentTags.includes(tagText)) {
      tag.classList.add('added');
    } else {
      tag.classList.remove('added');
    }
  });
}

function hideSuggestions() {
  elements.tagSuggestions.classList.add('hidden');
}

function downscaleImage(dataUrl, maxDim = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
        return;
      }
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function updateGenerateButton() {
  const total = countWords(elements.titleInput.value) + countWords(elements.descriptionInput.value);
  const hasWords = total >= 5;
  const hasCredits = credits.available >= 2;

  elements.generateFullBtn.disabled = !(hasWords && hasCredits);

  if (!hasCredits) {
    elements.generateHint.textContent = 'Need 2 credits to generate';
    elements.generateHint.classList.remove('ready');
  } else if (!hasWords) {
    elements.generateHint.textContent = `Enter at least 5 words in title or description (${total}/5)`;
    elements.generateHint.classList.remove('ready');
  } else {
    elements.generateHint.textContent = 'Ready to generate';
    elements.generateHint.classList.add('ready');
  }
}

async function handleGenerateFullListing() {
  const total = countWords(elements.titleInput.value) + countWords(elements.descriptionInput.value);
  if (total < 5) {
    showToast('Enter at least 5 words in title or description', 'error');
    return;
  }
  if (credits.available < 2) {
    showToast('Need 2 credits to generate', 'error');
    return;
  }

  const btn = elements.generateFullBtn;
  const originalText = btn.textContent;
  btn.classList.add('btn-loading');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const images = await Promise.all(
      listingImages.slice(0, 3).map(img => downscaleImage(img.dataUrl))
    );
    const tags = elements.tagsInput.value.split(',').map(t => t.trim()).filter(t => t);

    const result = await generateFullListing({
      category: elements.categorySelect.value,
      title: elements.titleInput.value,
      description: elements.descriptionInput.value,
      tags,
      images,
      lockedFields: Array.from(lockedFields),
      style: 'descriptive'
    });

    if (result.title && !lockedFields.has('title')) {
      elements.titleInput.value = result.title;
    }
    if (result.description && !lockedFields.has('description')) {
      elements.descriptionInput.value = result.description;
    }
    if (result.tags && !lockedFields.has('tags')) {
      elements.tagsInput.value = result.tags.join(', ');
    }
    if (result.price?.suggested) {
      document.getElementById('price').value = result.price.suggested.toFixed(2);
    }
    if (result.materials) {
      document.getElementById('materials').value = result.materials.join(', ');
    }

    if (result.creditsRemaining !== undefined) {
      const oldCredits = credits.available;
      credits.available = result.creditsRemaining;
      updateCreditsDisplay(oldCredits);
    }

    showToast('Listing generated!', 'success');
  } catch (err) {
    if (err.error === 'not_authenticated') {
      showToast('Sign in required to generate', 'error');
    } else if (err.error === 'insufficient_credits') {
      showToast('Not enough credits', 'error');
      showCreditsModal();
    } else if (err.error === 'unavailable') {
      showToast('AI service temporarily unavailable', 'error');
    } else {
      showToast(err.message || 'Generation failed', 'error');
    }
  } finally {
    btn.classList.remove('btn-loading');
    btn.textContent = originalText;
    updateGenerateButton();
  }
}

async function generateFullListing(payload) {
  const result = await chrome.storage.local.get(['bulklistingpro_token', 'authToken', 'sessionToken']);
  const token = result.bulklistingpro_token || result.authToken || result.sessionToken || null;
  if (!token) {
    throw { error: 'not_authenticated', message: 'Sign in required' };
  }

  const API_BASE = 'https://business-search-api-815700675676.us-central1.run.app';
  const response = await fetch(`${API_BASE}/api/v1/generate-full-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Extension-Id': chrome.runtime.id || 'bulklistingpro',
      'X-Extension-Version': chrome.runtime.getManifest?.()?.version || '1.0.0'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let data = {};
    try { data = await response.json(); } catch (e) {}

    if (response.status === 401) {
      throw { error: 'not_authenticated', message: 'Sign in required' };
    }
    if (response.status === 402) {
      throw { error: 'insufficient_credits', message: data.message || 'Not enough credits', creditsRemaining: data.creditsRemaining || 0 };
    }
    if (response.status === 503) {
      throw { error: 'unavailable', message: 'AI service temporarily unavailable' };
    }
    throw { error: 'api_error', message: data.message || 'Generation failed' };
  }

  return await response.json();
}

function handleSingleListing(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const category = formData.get('category');
  const listing = {
    id: Date.now().toString(),
    title: formData.get('title'),
    category: category,
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t),
    who_made: formData.get('who_made') || 'i_did',
    what_is_it: formData.get('what_is_it') || 'finished_product',
    ai_content: formData.get('ai_content') || 'original',
    when_made: formData.get('when_made') || 'made_to_order',
    renewal: formData.get('renewal') || 'automatic',
    shop_section: formData.get('shop_section') || '',
    materials: (formData.get('materials') || '').split(',').map(m => m.trim()).filter(m => m),
    quantity: parseInt(formData.get('quantity')) || 999,
    sku: formData.get('sku') || '',
    primary_color: formData.get('primary_color') || '',
    secondary_color: formData.get('secondary_color') || '',
    personalization_instructions: formData.get('personalization_instructions') || '',
    personalization_char_limit: parseInt(formData.get('personalization_char_limit')) || '',
    personalization_required: formData.get('personalization_required') === 'true',
    listing_type: 'digital',
    featured: formData.get('featured') === 'true',
    etsy_ads: formData.get('etsy_ads') === 'true',
    status: 'pending',
    selected: true
  };

  if (CATEGORY_ATTRIBUTES[category]?.craft_type) {
    listing.craft_type = formData.get('craft_type');
  }

  listingImages.forEach((img, i) => {
    listing[`image_${i + 1}`] = img.dataUrl;
  });

  if (digitalFile) {
    listing.digital_file_1 = digitalFile.dataUrl;
  }

  uploadQueue.push(listing);
  renderQueue();
  saveQueueToStorage();

  if (listing.tags.length > 0) {
    trackRecentTags(category, listing.tags);
  }

  e.target.reset();
  handleCategoryChange();
  listingImages = [];
  renderImagePreviews();
  digitalFile = null;
  clearDigitalFile();
  lockedFields.clear();
  document.querySelectorAll('.field-lock').forEach(btn => {
    btn.classList.remove('locked');
    btn.title = 'Lock field from AI generation';
  });
  updateGenerateButton();
  showToast('Listing added to queue', 'success');
}

async function trackRecentTags(formCategory, tags) {
  const internalCategory = mapFormCategoryToInternal(formCategory);
  if (!internalCategory) return;

  if (!tagLibrary[internalCategory]) {
    tagLibrary[internalCategory] = { sets: [], recentTags: [] };
  }

  const existing = new Set(tagLibrary[internalCategory].recentTags.map(t => t.toLowerCase()));
  const newTags = tags.filter(t => !existing.has(t.toLowerCase()));

  tagLibrary[internalCategory].recentTags = [
    ...newTags,
    ...tagLibrary[internalCategory].recentTags
  ].slice(0, 20);

  await chrome.storage.sync.set({ [STORAGE_KEYS.TAG_LIBRARY]: tagLibrary });
}

function handleImageDragOver(e) {
  e.preventDefault();
  elements.imageDropZone.classList.add('drag-over');
}

function handleImageDragLeave(e) {
  e.preventDefault();
  elements.imageDropZone.classList.remove('drag-over');
}

function handleImageDrop(e) {
  e.preventDefault();
  elements.imageDropZone.classList.remove('drag-over');
  addImages(e.dataTransfer.files);
}

function handleImageFileSelect(e) {
  addImages(e.target.files);
  e.target.value = '';
}

function addImages(files) {
  const remaining = 5 - listingImages.length;
  if (remaining <= 0) {
    showToast('Maximum 5 images allowed', 'error');
    return;
  }

  const validFiles = [...files].filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    showToast('Please select image files', 'error');
    return;
  }

  const toAdd = validFiles.slice(0, remaining);
  if (validFiles.length > remaining) {
    showToast(`Only ${remaining} more image(s) allowed, extras ignored`, 'error');
  }

  let loaded = 0;
  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      listingImages.push({ file, dataUrl: e.target.result });
      loaded++;
      if (loaded === toAdd.length) {
        renderImagePreviews();
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  elements.imagePreviews.innerHTML = listingImages.map((img, i) => `
    <div class="image-preview">
      <img src="${img.dataUrl}" alt="Image ${i + 1}">
      <button type="button" class="remove-image" data-index="${i}">&times;</button>
    </div>
  `).join('');

  elements.imagePreviews.querySelectorAll('.remove-image').forEach(btn => {
    btn.addEventListener('click', () => removeImage(parseInt(btn.dataset.index)));
  });

  if (listingImages.length >= 5) {
    elements.imageDropPrompt.classList.add('hidden');
  } else {
    elements.imageDropPrompt.classList.remove('hidden');
  }
}

function removeImage(index) {
  listingImages.splice(index, 1);
  renderImagePreviews();
}

function handleDigitalFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    digitalFile = { file, dataUrl: ev.target.result, name: file.name };
    elements.digitalFileName.textContent = file.name;
    elements.digitalFileInfo.classList.remove('hidden');
    elements.digitalFilePrompt.classList.add('hidden');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function clearDigitalFile() {
  digitalFile = null;
  elements.digitalFileInfo.classList.add('hidden');
  elements.digitalFilePrompt.classList.remove('hidden');
}

function renderQueue() {
  if (uploadQueue.length === 0) {
    elements.queueSection.classList.add('hidden');
    return;
  }

  elements.queueSection.classList.remove('hidden');
  elements.queueCount.textContent = uploadQueue.length;
  updateStartButton();

  elements.queueList.innerHTML = uploadQueue.map((item, index) => `
    <div class="queue-item${item.selected ? '' : ' deselected'}" data-id="${item.id}" style="animation-delay: ${index * 0.05}s">
      <input type="checkbox" ${item.selected ? 'checked' : ''} data-index="${index}">
      <span class="title">${item.title}</span>
      <span class="status ${item.status}">${item.status}</span>
    </div>
  `).join('');

  elements.queueList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index);
      uploadQueue[idx].selected = e.target.checked;
      e.target.closest('.queue-item').classList.toggle('deselected', !e.target.checked);
      syncSelectAll();
      updateStartButton();
      saveQueueToStorage();
    });
  });
}

function clearQueue() {
  uploadQueue = [];
  renderQueue();
  clearUploadState();
  showToast('Queue cleared', 'success');
}

function toggleSelectAll() {
  const checked = elements.selectAllCheckbox.checked;
  uploadQueue.forEach(item => item.selected = checked);
  renderQueue();
  saveQueueToStorage();
}

function syncSelectAll() {
  const allSelected = uploadQueue.length > 0 && uploadQueue.every(item => item.selected);
  elements.selectAllCheckbox.checked = allSelected;
}

async function startUpload() {
  const selectedItems = uploadQueue.filter(item => item.selected);
  const requiredCredits = selectedItems.length * CREDITS_PER_LISTING;

  if (selectedItems.length === 0) return;
  if (credits.available < requiredCredits) {
    showCreditsModal();
    return;
  }

  isUploading = true;
  isPaused = false;
  uploadResults = [];
  currentUploadIndex = 0;
  elements.queueSection.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');
  elements.pauseBtn.textContent = 'Pause';

  const total = selectedItems.length;
  updateProgress(0, total);
  await saveUploadState();

  const listingState = elements.listingStateSelect.value;

  const listings = selectedItems.map(item => ({
    title: item.title,
    description: item.description || '',
    price: String(item.price),
    category: item.category || 'Digital Prints',
    listing_state: item.listing_state || listingState,
    who_made: item.who_made || 'i_did',
    what_is_it: item.what_is_it || 'finished_product',
    ai_content: item.ai_content || 'original',
    when_made: item.when_made || 'made_to_order',
    renewal: item.renewal || 'automatic',
    shop_section: item.shop_section || '',
    materials: item.materials || [],
    quantity: String(item.quantity || 999),
    sku: item.sku || '',
    primary_color: item.primary_color || '',
    secondary_color: item.secondary_color || '',
    personalization_instructions: item.personalization_instructions || '',
    personalization_char_limit: item.personalization_char_limit || '',
    personalization_required: item.personalization_required || false,
    listing_type: item.listing_type || 'digital',
    featured: item.featured || false,
    etsy_ads: item.etsy_ads || false,
    image_1: item.image_1 || '',
    image_2: item.image_2 || '',
    image_3: item.image_3 || '',
    image_4: item.image_4 || '',
    image_5: item.image_5 || '',
    digital_file_1: item.digital_file_1 || '',
    tag_1: item.tags?.[0],
    tag_2: item.tags?.[1],
    tag_3: item.tags?.[2],
    tag_4: item.tags?.[3],
    tag_5: item.tags?.[4],
    tag_6: item.tags?.[5],
    tag_7: item.tags?.[6],
    tag_8: item.tags?.[7],
    tag_9: item.tags?.[8],
    tag_10: item.tags?.[9],
    tag_11: item.tags?.[10],
    tag_12: item.tags?.[11],
    tag_13: item.tags?.[12]
  }));

  await runUpload(listings);

  isUploading = false;
  await loadCredits(true);
}

async function findOrOpenEtsyTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.url?.includes('etsy.com')) return activeTab;

  const etsyTabs = await chrome.tabs.query({ url: '*://*.etsy.com/*' });
  if (etsyTabs.length > 0) {
    await chrome.tabs.update(etsyTabs[0].id, { active: true });
    return etsyTabs[0];
  }

  const newTab = await chrome.tabs.create({ url: 'https://www.etsy.com/your/shops/me/listing-editor/create' });
  await new Promise(resolve => {
    function listener(tabId, info) {
      if (tabId === newTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
  return newTab;
}

async function runUpload(listings) {
  elements.currentListing.textContent = 'Finding Etsy tab...';

  try {
    const tab = await findOrOpenEtsyTab();
    if (!tab) {
      throw new Error('Could not open Etsy tab');
    }

    elements.currentListing.textContent = 'Starting upload...';

    const response = await chrome.runtime.sendMessage({
      type: 'DIRECT_UPLOAD',
      payload: { listings, tabId: tab.id }
    });

    if (response.success) {
      showResults();
    } else {
      throw new Error(response.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast('Upload failed: ' + error.message, 'error');
    if (uploadResults.length > 0) {
      showResults();
    } else {
      elements.progressSection.classList.add('hidden');
      elements.queueSection.classList.remove('hidden');
    }
  }
}

async function pauseUpload() {
  if (!isUploading) return;

  if (!isPaused) {
    await chrome.runtime.sendMessage({ type: 'DIRECT_PAUSE' });
    isPaused = true;
    elements.pauseBtn.textContent = 'Resume';
    elements.skipBtn.disabled = false;
    showToast('Upload paused', 'success');
  } else {
    await chrome.runtime.sendMessage({ type: 'DIRECT_RESUME' });
    isPaused = false;
    elements.pauseBtn.textContent = 'Pause';
    elements.skipBtn.disabled = true;
    showToast('Upload resumed', 'success');
  }
}

async function skipListing() {
  if (!isUploading || !isPaused) return;

  await chrome.runtime.sendMessage({ type: 'DIRECT_SKIP' });
  elements.skipBtn.disabled = true;
  elements.pauseBtn.textContent = 'Pause';
  isPaused = false;
  showToast('Skipping current listing...', 'success');
}

async function cancelUpload() {
  if (!isUploading) return;

  await chrome.runtime.sendMessage({ type: 'DIRECT_CANCEL' });
  isUploading = false;
  isPaused = false;

  if (uploadResults.length > 0) {
    showResults();
  } else {
    elements.progressSection.classList.add('hidden');
    elements.queueSection.classList.remove('hidden');
  }
  showToast('Upload cancelled', 'success');
  await loadCredits(true);
}

function updateProgress(completed, total) {
  const percent = total > 0 ? (completed / total) * 100 : 0;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `${completed} of ${total} listings`;
}

function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CREDITS_UPDATED':
      const oldCredits = credits.available;
      credits = message.credits;
      updateCreditsDisplay(oldCredits);
      break;

    case 'UPLOAD_PROGRESS':
      if (message.status === 'started') {
        elements.currentListing.textContent = `Uploading: ${message.title}`;
      } else if (message.status === 'complete') {
        elements.currentListing.textContent = `Completed: ${message.title}`;
        const listing = uploadQueue.filter(l => l.selected)[message.index];
        uploadResults.push({ title: message.title, status: 'success', listing });
        currentUploadIndex = message.index + 1;
        saveUploadState();
        if (message.creditsRemaining !== undefined) {
          const oldCreds = credits.available;
          credits.available = message.creditsRemaining;
          updateCreditsDisplay(oldCreds);
        }
      } else if (message.status === 'error') {
        elements.currentListing.textContent = `Failed: ${message.title} - ${message.error}`;
        const listing = uploadQueue.filter(l => l.selected)[message.index];
        uploadResults.push({ title: message.title, status: 'error', error: message.error, errorCategory: message.errorCategory, listing });
        currentUploadIndex = message.index + 1;
        saveUploadState();
      } else if (message.status === 'skipped') {
        elements.currentListing.textContent = `Skipped: ${message.title}`;
        const listing = uploadQueue.filter(l => l.selected)[message.index];
        uploadResults.push({ title: message.title, status: 'skipped', listing });
        currentUploadIndex = message.index + 1;
        saveUploadState();
      } else if (message.status === 'retrying') {
        elements.currentListing.textContent = `Retrying ${message.retryCount} failed listing(s)...`;
        updateProgress(0, message.retryCount);
      } else if (message.status === 'verification_required') {
        elements.currentListing.textContent = 'Etsy verification required - complete it in browser';
        isPaused = true;
        elements.pauseBtn.textContent = 'Resume';
        showToast('Etsy requires verification. Complete it in the browser, then click Resume.', 'error');
      } else if (message.status === 'debugger_detached') {
        elements.currentListing.textContent = 'Browser debugging stopped';
        showToast('Debugging was stopped. Upload paused.', 'error');
        isPaused = true;
        elements.pauseBtn.textContent = 'Resume';
      } else if (message.status === 'out_of_credits') {
        if (message.creditsRemaining !== undefined) {
          const oldCreds = credits.available;
          credits.available = message.creditsRemaining;
          updateCreditsDisplay(oldCreds);
        }
        showToast('Upload stopped — ran out of credits', 'error');
        showCreditsModal();
        showResults();
      } else if (message.status === 'cancelled') {
        showResults();
      }
      if (message.index !== undefined) {
        updateProgress(message.index + 1, message.total);
      }
      break;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.bulklistingpro_credits) {
    const oldCredits = credits.available;
    credits = changes.bulklistingpro_credits.newValue || { available: 0, used: 0 };
    updateCreditsDisplay(oldCredits);
  }
  if (areaName === 'local' && changes[STORAGE_KEYS.QUEUE]) {
    const newQueue = changes[STORAGE_KEYS.QUEUE].newValue || [];
    if (newQueue.length > uploadQueue.length) {
      const added = newQueue.length - uploadQueue.length;
      uploadQueue = newQueue;
      elements.resultsSection.classList.add('hidden');
      elements.progressSection.classList.add('hidden');
      renderQueue();
      showToast(`${added} listing(s) received from editor`, 'success');
    }
  }
});

function showResults() {
  elements.progressSection.classList.add('hidden');
  elements.resultsSection.classList.remove('hidden');

  const successCount = uploadResults.filter(r => r.status === 'success').length;
  const failedCount = uploadResults.filter(r => r.status === 'error').length;
  const skippedCount = uploadResults.filter(r => r.status === 'skipped').length;

  elements.resultsSuccess.textContent = successCount;
  elements.resultsFailed.textContent = failedCount;
  elements.resultsSkipped.textContent = skippedCount;

  if (failedCount > 0) {
    elements.retryFailedBtn.classList.remove('hidden');
  } else {
    elements.retryFailedBtn.classList.add('hidden');
  }

  renderResultsList();
  clearUploadState();
}

function retryFailed() {
  const failedListings = uploadResults
    .filter(r => r.status === 'error')
    .map(r => r.listing)
    .filter(Boolean);

  if (failedListings.length === 0) {
    showToast('No failed listings to retry', 'error');
    return;
  }

  uploadQueue = failedListings;
  uploadResults = [];

  elements.resultsSection.classList.add('hidden');
  elements.retryFailedBtn.classList.add('hidden');

  renderQueue();
  showToast(`${failedListings.length} listing(s) queued for retry`, 'success');
}

function renderResultsList() {
  const categoryLabels = {
    verification: 'Verification Required',
    timeout: 'Timeout',
    network: 'Network Error',
    dom: 'Page Changed',
    unknown: 'Error'
  };

  elements.resultsList.innerHTML = uploadResults.map((item, index) => {
    const statusLabel = item.status === 'error' ? 'failed' : item.status;
    const categoryLabel = item.errorCategory ? categoryLabels[item.errorCategory] || 'Error' : '';
    const errorHtml = item.error
      ? `<details class="error-details">
           <summary class="error-summary">${categoryLabel}</summary>
           <div class="error-detail">${item.error}</div>
         </details>`
      : '';
    return `
      <div class="result-item" style="animation-delay: ${index * 0.05}s">
        <span class="title">${item.title}</span>
        <span class="status ${item.status}">${statusLabel}</span>
        ${errorHtml}
      </div>
    `;
  }).join('');
}

function resetToQueue() {
  elements.resultsSection.classList.add('hidden');
  uploadResults = [];
  uploadQueue = [];
  currentUploadIndex = 0;
  renderQueue();
  clearUploadState();
}

async function checkSetup() {
  setupState.nativeHost = await checkNativeHost();
  setupState.etsyLoggedIn = await checkEtsyLoggedIn();

  updateSetupUI();

  return setupState.etsyLoggedIn;
}

async function checkNativeHost() {
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'NATIVE_CHECK' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    return response.success && response.nativeHost;
  } catch (err) {
    return false;
  }
}


async function checkEtsyLoggedIn() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('etsy.com')) return false;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return document.querySelector('[data-user-id]') !== null ||
               document.querySelector('.user-nav') !== null ||
               document.querySelector('[href*="/your/shops"]') !== null;
      }
    });
    return results?.[0]?.result || false;
  } catch (err) {
    return false;
  }
}

function updateSetupUI() {
  if (setupState.etsyLoggedIn) {
    elements.stepEtsy.classList.add('complete');
    elements.etsyStatus.textContent = 'Logged in';
  } else {
    elements.stepEtsy.classList.remove('complete');
    elements.etsyStatus.textContent = 'Not logged in';
  }

  if (setupState.nativeHost) {
    elements.stepNative.classList.add('complete');
    elements.nativeStatus.textContent = 'Installed';
  } else {
    elements.stepNative.classList.remove('complete');
    elements.nativeStatus.textContent = 'Not installed';
  }

  updatePowerModeSection();
}

function updatePowerModeSection() {
  const badge = elements.powerModeBadge;
  const statusEl = elements.powerModeStatus;

  if (setupState.nativeHost) {
    badge.textContent = 'Enabled';
    badge.className = 'power-mode-badge enabled';
    statusEl.textContent = 'Power Mode active! Spreadsheet imports with local file paths enabled.';
    statusEl.className = 'power-mode-status success';
    statusEl.classList.remove('hidden');
  } else {
    badge.textContent = 'Optional';
    badge.className = 'power-mode-badge';
    statusEl.classList.add('hidden');
  }
}

function showSetupSection() {
  elements.setupSection.classList.remove('hidden');
  elements.authSection.classList.add('hidden');
  elements.mainSection.classList.add('hidden');
  startAutoCheck();
}

function startAutoCheck() {
  stopAutoCheck();
  autoCheckInterval = setInterval(async () => {
    const wasLoggedIn = setupState.etsyLoggedIn;
    setupState.etsyLoggedIn = await checkEtsyLoggedIn();

    if (!wasLoggedIn && setupState.etsyLoggedIn) {
      stopAutoCheck();
      setupState.nativeHost = await checkNativeHost();
      updateSetupUI();

      if (setupState.nativeHost) {
        showToast('Ready! Power Mode enabled for local file paths.', 'success');
      } else {
        showToast('Logged in! Ready to upload.', 'success');
      }
      await checkAuth();
    }
  }, 2000);
}

function stopAutoCheck() {
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
  }
}

async function recheckSetup() {
  elements.checkSetupBtn.classList.add('btn-loading');
  elements.checkSetupBtn.disabled = true;

  const setupComplete = await checkSetup();

  elements.checkSetupBtn.classList.remove('btn-loading');
  elements.checkSetupBtn.disabled = false;

  if (setupComplete) {
    stopAutoCheck();
    if (setupState.nativeHost) {
      showToast('Ready! Power Mode enabled for local file paths.', 'success');
    } else {
      showToast('Ready! Upload via form or spreadsheet with URLs.', 'success');
    }
    await checkAuth();
  } else {
    if (!setupState.etsyLoggedIn) {
      showToast('Please log into Etsy first', 'error');
    }
  }
}

function handleDownload(e) {
  showToast('Downloading installer... Run it when complete', 'success');
}

function switchTab(tabName) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  if (tabName === 'research') {
    loadTagLibrary();
  } else if (tabName === 'account') {
    updateAccountTab();
  }
}

function updateAccountTab() {
  if (user) {
    elements.accountEmail.textContent = user.email || 'user@email.com';
    elements.accountAvatar.src = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>';
    elements.accountMemberSince.textContent = 'BulkListingPro User';
  }

  elements.accountCredits.textContent = credits.available || 0;
  const listingsEstimate = Math.floor((credits.available || 0) / CREDITS_PER_LISTING);
  elements.accountCreditsEstimate.textContent = `(~${listingsEstimate} listings)`;

  loadTagLibrary();
}

async function sendMessageWithInject(tabId, message, scriptFile) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    if (e.message?.includes('Receiving end does not exist') || e.message?.includes('Could not establish connection')) {
      await chrome.scripting.executeScript({ target: { tabId }, files: [scriptFile] });
      await new Promise(r => setTimeout(r, 500));
      return await chrome.tabs.sendMessage(tabId, message);
    }
    throw e;
  }
}

async function captureListingData() {
  elements.captureListingBtn.classList.add('btn-loading');
  elements.captureListingBtn.disabled = true;
  elements.captureStatus.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('etsy.com/listing/')) {
      showCaptureStatus('Please navigate to an Etsy listing page first.', 'error');
      return;
    }

    const response = await sendMessageWithInject(tab.id, { type: 'EXTRACT_LISTING_DATA' }, 'content/etsy-scraper.js');

    if (response.success) {
      response.data._source_platform = 'etsy';
      researchClipboard = response.data;
      await saveResearchClipboard();
      await addCapturedToEditor(response.data);
      updateClipboardBar();
      showCaptureStatus('Listing added to editor!', 'success');
      openEditor();
    } else {
      showCaptureStatus(response.error || 'Failed to extract data', 'error');
    }
  } catch (error) {
    console.error('Capture error:', error);
    showCaptureStatus('Failed to capture data. Make sure you\'re on an Etsy listing page.', 'error');
  } finally {
    elements.captureListingBtn.classList.remove('btn-loading');
    elements.captureListingBtn.disabled = false;
  }
}

async function captureEbayListingData() {
  elements.captureEbayBtn.classList.add('btn-loading');
  elements.captureEbayBtn.disabled = true;
  elements.captureStatus.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('ebay.com/itm/')) {
      showCaptureStatus('Please navigate to an eBay listing page first.', 'error');
      return;
    }

    const response = await sendMessageWithInject(tab.id, { type: 'EXTRACT_EBAY_LISTING' }, 'content/ebay-scraper.js');

    if (response.success) {
      const ebayData = response.data;
      const mapped = {
        url: ebayData.url,
        title: ebayData.title,
        price: ebayData.price,
        currency: ebayData.currency || 'USD',
        description: ebayData.description,
        tags: ebayData.tags || [],
        images: ebayData.images || [],
        shopName: ebayData.seller?.name || '',
        category: '',
        _source_platform: 'ebay',
        _item_specifics: ebayData.itemSpecifics || {},
        _condition: ebayData.condition || ''
      };

      researchClipboard = mapped;
      await saveResearchClipboard();
      await addCapturedToEditor(mapped);
      updateClipboardBar();
      showCaptureStatus('eBay listing added to editor!', 'success');
      openEditor();
    } else {
      showCaptureStatus(response.error || 'Failed to extract eBay data', 'error');
    }
  } catch (error) {
    console.error('eBay capture error:', error);
    showCaptureStatus('Failed to capture data. Make sure you\'re on an eBay listing page.', 'error');
  } finally {
    elements.captureEbayBtn.classList.remove('btn-loading');
    elements.captureEbayBtn.disabled = false;
  }
}

async function captureAmazonListingData() {
  elements.captureAmazonBtn.classList.add('btn-loading');
  elements.captureAmazonBtn.disabled = true;
  elements.captureStatus.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('amazon.com/')) {
      showCaptureStatus('Please navigate to an Amazon product page first.', 'error');
      return;
    }

    const response = await sendMessageWithInject(tab.id, { type: 'EXTRACT_AMAZON_LISTING' }, 'content/amazon-scraper.js');

    if (response.success) {
      const amazonData = response.data;
      const mapped = {
        url: amazonData.url,
        title: amazonData.title,
        price: amazonData.price,
        currency: amazonData.currency || 'USD',
        description: amazonData.description,
        tags: amazonData.tags || [],
        images: amazonData.images || [],
        shopName: amazonData.seller?.brand || '',
        category: '',
        _source_platform: 'amazon',
        _product_details: amazonData.productDetails || {},
        _feature_bullets: amazonData.featureBullets || []
      };

      researchClipboard = mapped;
      await saveResearchClipboard();
      await addCapturedToEditor(mapped);
      updateClipboardBar();
      showCaptureStatus('Amazon listing added to editor!', 'success');
      openEditor();
    } else {
      showCaptureStatus(response.error || 'Failed to extract Amazon data', 'error');
    }
  } catch (error) {
    console.error('Amazon capture error:', error);
    showCaptureStatus('Failed to capture data. Make sure you\'re on an Amazon product page.', 'error');
  } finally {
    elements.captureAmazonBtn.classList.remove('btn-loading');
    elements.captureAmazonBtn.disabled = false;
  }
}

function showCaptureStatus(message, type) {
  elements.captureStatus.textContent = message;
  elements.captureStatus.className = `capture-status ${type}`;
  elements.captureStatus.classList.remove('hidden');

  setTimeout(() => {
    elements.captureStatus.classList.add('hidden');
  }, 5000);
}

function displayCapturedData(data) {
  elements.capturedDataSection.classList.remove('hidden');

  elements.capturedTitle.textContent = data.title || '';
  elements.capturedTitleCount.textContent = `${(data.title || '').length}/140`;

  const priceDisplay = data.currency === 'USD' ? `$${data.price}` :
                       data.currency === 'EUR' ? `€${data.price}` :
                       data.currency === 'GBP' ? `£${data.price}` : data.price;
  elements.capturedPrice.textContent = priceDisplay || '';

  console.log('Captured category:', data.category);
  if (data.category) {
    const mappedCategory = mapEtsyCategoryToInternal(data.category);
    console.log('Mapped category:', mappedCategory);
    elements.capturedCategory.textContent = mappedCategory || data.category;
    elements.capturedCategoryField.classList.remove('hidden');
  } else {
    elements.capturedCategoryField.classList.add('hidden');
  }

  elements.capturedDescription.textContent = data.description || '';
  elements.capturedDescription.classList.add('collapsed');
  elements.toggleDescBtn.textContent = 'Show more';

  elements.capturedShop.textContent = data.shopName || 'Unknown Shop';
  elements.capturedShopLink.href = data.shopUrl || '#';

  const shopCard = elements.capturedShopLink.closest('.shop-info-card');
  if (shopCard) {
    shopCard.classList.toggle('hidden', !data.shopName && !data.shopUrl);
  }

  elements.capturedReviews.textContent = data.reviews?.count
    ? `⭐ ${data.reviews.rating} (${data.reviews.count.toLocaleString()})`
    : '';

  elements.capturedFavorites.textContent = data.favorites
    ? `❤️ ${data.favorites.toLocaleString()}`
    : '';

  renderCapturedTags(data.tags || []);
}

function renderCapturedTags(tags) {
  selectedTags = new Set(tags);
  elements.capturedTagsCount.textContent = tags.length;

  elements.capturedTags.innerHTML = tags.map(tag => `
    <div class="tag-chip selected" data-tag="${escapeHtml(tag)}">
      <span class="tag-check">✓</span>
      <span class="tag-text">${escapeHtml(tag)}</span>
    </div>
  `).join('');

  elements.capturedTags.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => toggleTagSelection(chip));
  });
}

function toggleTagSelection(chip) {
  const tag = chip.dataset.tag;
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
    chip.classList.remove('selected');
    chip.querySelector('.tag-check').textContent = '';
  } else {
    selectedTags.add(tag);
    chip.classList.add('selected');
    chip.querySelector('.tag-check').textContent = '✓';
  }
}

function selectAllTags() {
  if (!researchClipboard?.tags) return;
  selectedTags = new Set(researchClipboard.tags);
  elements.capturedTags.querySelectorAll('.tag-chip').forEach(chip => {
    chip.classList.add('selected');
    chip.querySelector('.tag-check').textContent = '✓';
  });
}

function clearTagSelection() {
  selectedTags.clear();
  elements.capturedTags.querySelectorAll('.tag-chip').forEach(chip => {
    chip.classList.remove('selected');
    chip.querySelector('.tag-check').textContent = '';
  });
}

async function copySelectedTags() {
  if (selectedTags.size === 0) {
    showToast('No tags selected', 'error');
    return;
  }
  const tagsText = Array.from(selectedTags).join(', ');
  await navigator.clipboard.writeText(tagsText);
  showToast(`${selectedTags.size} tag(s) copied!`, 'success');
}

function toggleDescription() {
  const desc = elements.capturedDescription;
  const isCollapsed = desc.classList.contains('collapsed');
  desc.classList.toggle('collapsed');
  elements.toggleDescBtn.textContent = isCollapsed ? 'Show less' : 'Show more';
}

async function copyField(field) {
  if (!researchClipboard) return;

  let text = '';
  switch (field) {
    case 'title':
      text = researchClipboard.title || '';
      break;
    case 'price':
      text = researchClipboard.price || '';
      break;
    case 'description':
      text = researchClipboard.description || '';
      break;
  }

  if (!text) {
    showToast('Nothing to copy', 'error');
    return;
  }

  await navigator.clipboard.writeText(text);

  const btn = document.querySelector(`.copy-btn[data-copy="${field}"]`);
  if (btn) {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1000);
  }

  showToast('Copied to clipboard!', 'success');
}

function useAsTemplate() {
  if (!researchClipboard) {
    showToast('No data captured', 'error');
    return;
  }

  switchTab('upload');

  const singleListingDetails = document.querySelector('.single-listing');
  if (singleListingDetails) {
    singleListingDetails.open = true;
  }

  if (elements.titleInput && researchClipboard.title) {
    elements.titleInput.value = researchClipboard.title;
  }

  if (elements.descriptionInput && researchClipboard.description) {
    elements.descriptionInput.value = researchClipboard.description;
  }

  if (elements.priceInput && researchClipboard.price) {
    elements.priceInput.value = researchClipboard.price;
  }

  if (elements.tagsInput && selectedTags.size > 0) {
    elements.tagsInput.value = Array.from(selectedTags).join(', ');
  }

  if (researchClipboard.category && elements.categorySelect) {
    const mappedCategory = mapEtsyCategoryToInternal(researchClipboard.category);
    const formCategory = mapInternalCategoryToForm(mappedCategory);
    if (formCategory) {
      const option = Array.from(elements.categorySelect.options).find(
        opt => opt.value === formCategory || opt.textContent.includes(formCategory)
      );
      if (option) {
        elements.categorySelect.value = option.value;
        handleCategoryChange();
      }
    }
  }

  showToast('Data applied to form!', 'success');
}

function showSaveTagsModal() {
  if (selectedTags.size === 0) {
    showToast('No tags selected to save', 'error');
    return;
  }

  const detectedCategory = researchClipboard?.category || '';
  const mappedCategory = mapEtsyCategoryToInternal(detectedCategory);

  const internalCategories = [
    'Cutting Machine Files',
    'Clip Art & Image Files',
    'Digital Prints',
    'Digital Patterns',
    'Planners & Templates',
    'Fonts',
    'Embroidery Machine Files',
    '3D Printer Files',
    'Photography',
    'Guides & How Tos',
    'Other'
  ];

  const categoryOptions = internalCategories.map(cat => {
    const selected = cat === mappedCategory ? 'selected' : '';
    return `<option value="${cat}" ${selected}>${cat}</option>`;
  }).join('');

  const detectedHint = detectedCategory
    ? `<span class="detected-category-hint">Detected: ${escapeHtml(detectedCategory.split(' > ').slice(0, 2).join(' > '))}</span>`
    : '';

  const modal = document.createElement('div');
  modal.className = 'save-tags-modal';
  modal.innerHTML = `
    <div class="save-tags-content">
      <h3>Save Tags to Library</h3>
      <div class="save-tags-field">
        <label for="tag-set-name">Name</label>
        <input type="text" id="tag-set-name" placeholder="e.g., SVG Bundle Tags" autofocus>
      </div>
      <div class="save-tags-field">
        <label for="tag-set-category">Category</label>
        <select id="tag-set-category">
          ${categoryOptions}
        </select>
        ${detectedHint}
      </div>
      <div class="save-tags-actions">
        <button class="btn btn-secondary" id="cancel-save-tags">Cancel</button>
        <button class="btn btn-primary" id="confirm-save-tags">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const nameInput = modal.querySelector('#tag-set-name');
  const categorySelect = modal.querySelector('#tag-set-category');
  const cancelBtn = modal.querySelector('#cancel-save-tags');
  const confirmBtn = modal.querySelector('#confirm-save-tags');

  cancelBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  confirmBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter a name', 'error');
      return;
    }

    const selectedCategory = categorySelect.value;
    await saveTagsToLibrary(name, Array.from(selectedTags), selectedCategory);
    modal.remove();
    showToast('Tags saved to library!', 'success');
    loadTagLibrary();
  });

  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
  });
}

async function saveTagsToLibrary(name, tags, category = null) {
  const categoryName = category || mapEtsyCategoryToInternal(researchClipboard?.category) || 'Uncategorized';

  const entry = {
    id: `lib_${Date.now()}`,
    name,
    tags,
    source: 'captured',
    sourceUrl: researchClipboard?.url || null,
    createdAt: new Date().toISOString()
  };

  if (!tagLibrary[categoryName]) {
    tagLibrary[categoryName] = { sets: [], recentTags: [] };
  }

  tagLibrary[categoryName].sets.push(entry);

  if (tagLibrary[categoryName].sets.length > 20) {
    tagLibrary[categoryName].sets = tagLibrary[categoryName].sets.slice(-20);
  }

  await chrome.storage.sync.set({ [STORAGE_KEYS.TAG_LIBRARY]: tagLibrary });
}

function mapEtsyCategoryToInternal(etsyCategory) {
  if (!etsyCategory) return null;
  const lower = etsyCategory.toLowerCase();

  // Digital file types (most specific first)
  if (lower.includes('svg') || lower.includes('cut file') || lower.includes('cutting machine')) {
    return 'Cutting Machine Files (SVG)';
  }
  if (lower.includes('embroidery')) {
    return 'Embroidery Machine Files';
  }
  if (lower.includes('font')) {
    return 'Fonts';
  }
  if (lower.includes('3d print') || lower.includes('stl')) {
    return '3D Printer Files';
  }
  if (lower.includes('clip art') || lower.includes('clipart')) {
    return 'Clip Art & Image Files';
  }
  if (lower.includes('planner') || lower.includes('calendar') || lower.includes('spreadsheet')) {
    return 'Planners & Templates';
  }
  if (lower.includes('template') || lower.includes('invitation') || lower.includes('resume') || lower.includes('card')) {
    return 'Planners & Templates';
  }
  if (lower.includes('pattern') && !lower.includes('sewing pattern')) {
    return 'Digital Patterns';
  }
  if (lower.includes('photo') || lower.includes('stock image') || lower.includes('photography')) {
    return 'Photography';
  }

  // Etsy top-level categories
  if (lower.includes('art & collectibles') || lower.includes('art and collectibles')) {
    return 'Digital Prints';
  }
  if (lower.includes('craft supplies') || lower.includes('craft supply')) {
    return 'Clip Art & Image Files';
  }
  if (lower.includes('paper & party') || lower.includes('paper and party')) {
    return 'Planners & Templates';
  }
  if (lower.includes('digital download') || lower.includes('instant download')) {
    return 'Digital Prints';
  }

  // Subcategories
  if (lower.includes('print') || lower.includes('wall art') || lower.includes('poster') || lower.includes('artwork')) {
    return 'Digital Prints';
  }
  if (lower.includes('coins') || lower.includes('collectibles') || lower.includes('memorabilia')) {
    return 'Digital Prints';
  }
  if (lower.includes('drawing') || lower.includes('illustration')) {
    return 'Clip Art & Image Files';
  }
  if (lower.includes('graphic') || lower.includes('logo') || lower.includes('design')) {
    return 'Clip Art & Image Files';
  }
  if (lower.includes('journal') || lower.includes('notebook') || lower.includes('worksheet')) {
    return 'Planners & Templates';
  }
  if (lower.includes('sticker') || lower.includes('label')) {
    return 'Clip Art & Image Files';
  }

  // Return the raw category if no mapping (better than "Uncategorized")
  // This preserves the original category for the user to see
  return etsyCategory.split(' > ')[0] || 'Uncategorized';
}

async function loadTagLibrary() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.TAG_LIBRARY);
    const stored = data[STORAGE_KEYS.TAG_LIBRARY];

    if (Array.isArray(stored)) {
      tagLibrary = { 'Uncategorized': { sets: stored, recentTags: [] } };
      await chrome.storage.sync.set({ [STORAGE_KEYS.TAG_LIBRARY]: tagLibrary });
    } else {
      tagLibrary = stored || {};
    }

    renderTagLibrary();
    renderAccountTagLibrary();
  } catch (err) {
    console.warn('Failed to load tag library:', err);
    tagLibrary = {};
  }
}

function renderTagLibrary() {
  const allSets = getAllTagSets();

  if (allSets.length === 0) {
    elements.tagLibraryList.innerHTML = '<p class="empty-library">No saved tags yet. Capture a listing to save tags.</p>';
    return;
  }

  elements.tagLibraryList.innerHTML = allSets.slice(0, 5).map(item => `
    <div class="tag-library-item" data-id="${item.id}" data-category="${escapeHtml(item.category)}">
      <div class="library-item-info">
        <span class="library-item-name">${escapeHtml(item.name)}</span>
        <span class="library-item-meta">${item.tags.length} tags • ${item.category}</span>
      </div>
      <div class="library-item-actions">
        <button class="btn btn-small apply-library-tags" data-id="${item.id}" data-category="${escapeHtml(item.category)}">Apply</button>
        <button class="btn btn-small delete-library-tags" data-id="${item.id}" data-category="${escapeHtml(item.category)}">✕</button>
      </div>
    </div>
  `).join('');

  if (allSets.length > 5) {
    elements.tagLibraryList.innerHTML += `<p class="library-more-hint">View all ${allSets.length} tag sets in Account tab</p>`;
  }

  elements.tagLibraryList.querySelectorAll('.apply-library-tags').forEach(btn => {
    btn.addEventListener('click', () => applyLibraryTags(btn.dataset.id, btn.dataset.category));
  });

  elements.tagLibraryList.querySelectorAll('.delete-library-tags').forEach(btn => {
    btn.addEventListener('click', () => deleteLibraryTags(btn.dataset.id, btn.dataset.category));
  });
}

function getAllTagSets() {
  const allSets = [];
  for (const [category, data] of Object.entries(tagLibrary)) {
    if (data.sets) {
      for (const set of data.sets) {
        allSets.push({ ...set, category });
      }
    }
  }
  return allSets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderAccountTagLibrary() {
  const categories = Object.keys(tagLibrary).filter(cat => tagLibrary[cat].sets?.length > 0);

  if (categories.length === 0) {
    elements.accountTagLibrary.innerHTML = '<p class="empty-library">No saved tags yet. Capture listings to build your library.</p>';
    return;
  }

  elements.accountTagLibrary.innerHTML = categories.map(category => {
    const data = tagLibrary[category];
    const setCount = data.sets.length;
    return `
      <div class="category-group" data-category="${escapeHtml(category)}">
        <div class="category-header">
          <div class="category-title">
            <span class="category-toggle">▶</span>
            <span>${escapeHtml(category)}</span>
            <span class="category-count">(${setCount} set${setCount !== 1 ? 's' : ''})</span>
          </div>
        </div>
        <div class="category-sets">
          ${data.sets.map(set => `
            <div class="tag-set-item" data-id="${set.id}">
              <div class="tag-set-info">
                <span class="tag-set-name">${escapeHtml(set.name)}</span>
                <span class="tag-set-meta">${set.tags.length} tags</span>
              </div>
              <div class="tag-set-actions">
                <button class="btn btn-small apply-set-btn" data-id="${set.id}" data-category="${escapeHtml(category)}">Apply</button>
                <button class="btn btn-small delete-set-btn" data-id="${set.id}" data-category="${escapeHtml(category)}">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  elements.accountTagLibrary.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.category-group').classList.toggle('expanded');
    });
  });

  elements.accountTagLibrary.querySelectorAll('.apply-set-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyLibraryTags(btn.dataset.id, btn.dataset.category);
    });
  });

  elements.accountTagLibrary.querySelectorAll('.delete-set-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLibraryTags(btn.dataset.id, btn.dataset.category);
    });
  });
}

function applyLibraryTags(id, category) {
  const catData = tagLibrary[category];
  if (!catData) return;

  const item = catData.sets.find(t => t.id === id);
  if (!item) return;

  switchTab('upload');

  const singleListingDetails = document.querySelector('.single-listing');
  if (singleListingDetails) {
    singleListingDetails.open = true;
  }

  if (elements.tagsInput) {
    const currentTags = elements.tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    const mergedTags = [...new Set([...currentTags, ...item.tags])].slice(0, 13);
    elements.tagsInput.value = mergedTags.join(', ');
  }

  const internalCategory = mapInternalCategoryToForm(category);
  if (internalCategory && elements.categorySelect) {
    const option = Array.from(elements.categorySelect.options).find(
      opt => opt.value === internalCategory || opt.textContent.includes(internalCategory)
    );
    if (option) {
      elements.categorySelect.value = option.value;
      handleCategoryChange();
    }
  }

  showToast(`Applied ${item.tags.length} tags from "${item.name}"`, 'success');
}

function mapInternalCategoryToForm(category) {
  const mapping = {
    'Cutting Machine Files': 'Cutting Machine Files',
    'Clip Art & Image Files': 'Clip Art & Image Files',
    'Planners & Templates': 'Planners & Templates',
    'Fonts': 'Fonts',
    'Embroidery Machine Files': 'Embroidery Machine Files',
    'Digital Prints': 'Digital Prints',
    'Digital Patterns': 'Digital Patterns',
    '3D Printer Files': '3D Printer Files',
    'Photography': 'Photography'
  };
  return mapping[category] || null;
}

async function deleteLibraryTags(id, category) {
  if (!tagLibrary[category]) return;

  tagLibrary[category].sets = tagLibrary[category].sets.filter(t => t.id !== id);

  if (tagLibrary[category].sets.length === 0 && tagLibrary[category].recentTags.length === 0) {
    delete tagLibrary[category];
  }

  await chrome.storage.sync.set({ [STORAGE_KEYS.TAG_LIBRARY]: tagLibrary });
  renderTagLibrary();
  renderAccountTagLibrary();
  showToast('Deleted from library', 'success');
}

function updateClipboardBar() {
  if (!researchClipboard) {
    elements.researchClipboardBar.classList.add('hidden');
    return;
  }

  elements.researchClipboardBar.classList.remove('hidden');
  elements.clipboardTitle.textContent = truncateText(researchClipboard.title, 25) || 'Captured listing';

  const meta = [];
  if (researchClipboard.tags?.length) meta.push(`${researchClipboard.tags.length} tags`);
  if (researchClipboard.price) meta.push(`$${researchClipboard.price}`);
  elements.clipboardMeta.textContent = meta.join(' | ');
}

async function clearResearchClipboard() {
  researchClipboard = null;
  selectedTags.clear();
  await chrome.storage.local.remove(STORAGE_KEYS.RESEARCH_CLIPBOARD);
  elements.researchClipboardBar.classList.add('hidden');
  elements.capturedDataSection.classList.add('hidden');
  showToast('Clipboard cleared', 'success');
}

async function saveResearchClipboard() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.RESEARCH_CLIPBOARD]: researchClipboard });
  } catch (err) {
    console.warn('Failed to save research clipboard:', err);
  }
}

async function addCapturedToEditor(capturedData) {
  try {
    const mapped = mapEtsyCategoryToInternal(capturedData.category);
    const category = (mapped && CATEGORIES.includes(mapped)) ? mapped : 'Digital Prints';
    const tags = Array.isArray(capturedData.tags) ? capturedData.tags.slice(0, 13) : [];
    const parsedPrice = parseFloat(capturedData.price);

    const listing = {
      id: `captured_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: (capturedData.title || '').slice(0, 140),
      description: capturedData.description || '',
      price: Number.isNaN(parsedPrice) ? '' : String(parsedPrice),
      category,
      tags,
      who_made: 'i_did',
      what_is_it: 'finished_product',
      ai_content: 'original',
      when_made: 'made_to_order',
      renewal: 'automatic',
      listing_state: 'draft',
      materials: [],
      quantity: 999,
      sku: '',
      primary_color: '',
      secondary_color: '',
      personalization_instructions: '',
      personalization_char_limit: '',
      personalization_required: false,
      listing_type: 'digital',
      featured: false,
      etsy_ads: false,
      status: 'pending',
      selected: true,
      _source_url: capturedData.url || '',
      _source_shop: capturedData.shopName || '',
      _captured_at: new Date().toISOString()
    };

    let desc = listing.description;
    if (capturedData._item_specifics && Object.keys(capturedData._item_specifics).length > 0) {
      const specsText = Object.entries(capturedData._item_specifics).map(([k, v]) => `${k}: ${v}`).join('\n');
      desc = desc ? desc + '\n\n--- Item Specifics ---\n' + specsText : specsText;
    }
    if (capturedData._condition) {
      desc = desc ? `Condition: ${capturedData._condition}\n\n${desc}` : `Condition: ${capturedData._condition}`;
    }
    if (capturedData._product_details && Object.keys(capturedData._product_details).length > 0) {
      const detailsText = Object.entries(capturedData._product_details).map(([k, v]) => `${k}: ${v}`).join('\n');
      desc = desc ? desc + '\n\n--- Product Details ---\n' + detailsText : detailsText;
    }
    listing.description = desc;
    if (capturedData._source_platform) listing._import_source = capturedData._source_platform;

    const images = capturedData.images || [];
    for (let i = 0; i < Math.min(images.length, 10); i++) {
      listing[`image_${i + 1}`] = images[i];
    }

    const data = await chrome.storage.local.get(STORAGE_KEYS.EDITOR_LISTINGS);
    const existing = data[STORAGE_KEYS.EDITOR_LISTINGS] || [];
    existing.push(listing);
    await chrome.storage.local.set({ [STORAGE_KEYS.EDITOR_LISTINGS]: existing });
    showToast('Listing added to editor', 'success');
  } catch (err) {
    console.warn('Failed to add captured listing to editor:', err);
  }
}

async function loadResearchClipboard() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.RESEARCH_CLIPBOARD);
    researchClipboard = data[STORAGE_KEYS.RESEARCH_CLIPBOARD] || null;
    if (researchClipboard) {
      updateClipboardBar();
    }
  } catch (err) {
    console.warn('Failed to load research clipboard:', err);
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function openEditor() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.EDITOR_TAB_ID);
    const savedTabId = data[STORAGE_KEYS.EDITOR_TAB_ID];

    if (savedTabId) {
      try {
        const tab = await chrome.tabs.get(savedTabId);
        if (tab) {
          await chrome.tabs.update(savedTabId, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
          return;
        }
      } catch (e) {}
    }

    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('editor/editor.html')
    });
    await chrome.storage.local.set({ [STORAGE_KEYS.EDITOR_TAB_ID]: tab.id });
  } catch (err) {
    showToast('Failed to open editor', 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
