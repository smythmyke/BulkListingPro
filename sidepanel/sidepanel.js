const CREDITS_PER_LISTING = 2;
const STORAGE_KEYS = {
  QUEUE: 'bulklistingpro_queue',
  UPLOAD_STATE: 'bulklistingpro_upload_state',
  UPLOAD_RESULTS: 'bulklistingpro_upload_results',
  RESEARCH_CLIPBOARD: 'bulklistingpro_research_clipboard',
  TAG_LIBRARY: 'bulklistingpro_tag_library'
};

const CATEGORY_ATTRIBUTES = {
  'Clip Art & Image Files': {
    craft_type: {
      required: true,
      options: ['Scrapbooking', 'Card making & stationery', 'Collage', "Kids' crafts"],
      default: 'Scrapbooking'
    }
  },
  'Fonts': {
    craft_type: {
      required: true,
      options: ['Scrapbooking', 'Card making & stationery', 'Collage', "Kids' crafts"],
      default: 'Scrapbooking'
    }
  }
};

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
  hideSuggestionsBtn: document.getElementById('hide-suggestions-btn')
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
    await checkWelcomeBonus();
  } else {
    showAuthSection();
  }
}

async function checkWelcomeBonus() {
  try {
    const { bulklistingpro_welcome_bonus } = await chrome.storage.local.get('bulklistingpro_welcome_bonus');
    if (bulklistingpro_welcome_bonus) {
      await chrome.storage.local.remove('bulklistingpro_welcome_bonus');
      showToast('Welcome! You received 10 free credits to get started!', 'success');
    }
  } catch (err) {
    console.warn('Error checking welcome bonus:', err);
  }
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

function sanitizeListing(row, rowIndex) {
  const warnings = [];

  let title = (row.title || row.Title || '').toString().trim();
  if (!title) {
    warnings.push(`Row ${rowIndex}: empty title, skipping`);
    return { listing: null, warnings };
  }
  if (title.length > 140) {
    warnings.push(`Row ${rowIndex}: title truncated from ${title.length} to 140 chars`);
    title = title.substring(0, 140);
  }

  let priceRaw = (row.price || row.Price || '').toString().replace(/[$,\s]/g, '');
  let price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0.20) {
    warnings.push(`Row ${rowIndex}: invalid price "${row.price || row.Price || ''}", skipping`);
    return { listing: null, warnings };
  }

  let category = (row.category || row.Category || '').toString().trim();
  if (!category) {
    category = 'Digital Prints';
  }

  let tags = extractTags(row);
  const seenTags = new Set();
  const dedupedTags = [];
  for (const tag of tags) {
    const lower = tag.toLowerCase().trim();
    if (!lower || seenTags.has(lower)) continue;
    seenTags.add(lower);
    let t = tag.trim();
    if (t.length > 20) {
      warnings.push(`Row ${rowIndex}: tag "${t}" truncated to 20 chars`);
      t = t.substring(0, 20);
    }
    dedupedTags.push(t);
  }
  tags = dedupedTags.slice(0, 13);

  const WHO_MADE_FRIENDLY = { 'i did': 'i_did', 'a member of my shop': 'member', 'another company or person': 'another' };
  const WHAT_IS_IT_FRIENDLY = { 'a finished product': 'finished_product', 'a supply or tool to make things': 'supply' };
  const AI_CONTENT_FRIENDLY = { 'created by me': 'original', 'with an ai generator': 'ai_gen' };
  const WHEN_MADE_FRIENDLY = { 'made to order': 'made_to_order', '2020 - 2026': '2020_2026', '2010 - 2019': '2010_2019', '2007 - 2009': '2007_2009', 'before 2007': 'before_2007' };
  const RENEWAL_FRIENDLY = { 'automatic': 'automatic', 'manual': 'manual' };
  const LISTING_STATE_FRIENDLY = { 'draft': 'draft', 'active': 'active', 'published': 'active' };

  const VALID_WHO_MADE = ['i_did', 'member', 'another'];
  const VALID_WHAT_IS_IT = ['finished_product', 'supply'];
  const VALID_AI_CONTENT = ['original', 'ai_gen'];
  const VALID_WHEN_MADE = ['made_to_order', '2020_2026', '2010_2019', '2007_2009', 'before_2007'];
  const VALID_RENEWAL = ['automatic', 'manual'];

  function resolveField(raw, friendlyMap, validCodes, fallback) {
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (friendlyMap[lower]) return friendlyMap[lower];
    if (validCodes.includes(lower)) return lower;
    return fallback;
  }

  const whoMadeRaw = (row.who_made || row.WhoMade || row['Who Made'] || '').toString().trim();
  const whatIsItRaw = (row.what_is_it || row.WhatIsIt || row['What Is It'] || '').toString().trim();
  const aiContentRaw = (row.ai_content || row.AiContent || row['AI Content'] || '').toString().trim();
  const whenMadeRaw = (row.when_made || row.WhenMade || row['When Made'] || '').toString().trim();
  const renewalRaw = (row.renewal || row.Renewal || row.auto_renew || '').toString().trim();
  const listingStateRaw = (row.listing_state || row.ListingState || row['Listing State'] || '').toString().trim();
  const materialsRaw = (row.materials || row.Materials || '').toString().trim();
  const materials = materialsRaw ? materialsRaw.split(',').map(m => m.trim()).filter(m => m) : [];
  const quantity = parseInt(row.quantity || row.Quantity || '999') || 999;
  const sku = (row.sku || row.SKU || '').toString().trim();

  const listing = {
    id: String(Date.now() + rowIndex),
    title,
    description: (row.description || row.Description || '').toString(),
    price,
    category,
    tags,
    who_made: resolveField(whoMadeRaw, WHO_MADE_FRIENDLY, VALID_WHO_MADE, 'i_did'),
    what_is_it: resolveField(whatIsItRaw, WHAT_IS_IT_FRIENDLY, VALID_WHAT_IS_IT, 'finished_product'),
    ai_content: resolveField(aiContentRaw, AI_CONTENT_FRIENDLY, VALID_AI_CONTENT, 'original'),
    when_made: resolveField(whenMadeRaw, WHEN_MADE_FRIENDLY, VALID_WHEN_MADE, 'made_to_order'),
    renewal: resolveField(renewalRaw, RENEWAL_FRIENDLY, VALID_RENEWAL, 'automatic'),
    listing_state: resolveField(listingStateRaw, LISTING_STATE_FRIENDLY, ['draft', 'active'], 'draft'),
    materials,
    quantity,
    sku,
    image_1: row.image_1 || row.Image1 || row['Image 1'] || '',
    image_2: row.image_2 || row.Image2 || row['Image 2'] || '',
    image_3: row.image_3 || row.Image3 || row['Image 3'] || '',
    image_4: row.image_4 || row.Image4 || row['Image 4'] || '',
    image_5: row.image_5 || row.Image5 || row['Image 5'] || '',
    digital_file_1: row.digital_file_1 || row.DigitalFile || row['Digital File'] || '',
    status: 'pending',
    selected: true
  };

  const categoryAttrs = CATEGORY_ATTRIBUTES[category];
  if (categoryAttrs?.craft_type) {
    const craftType = (row.craft_type || row.CraftType || row['Craft Type'] || '').toString().trim();
    if (craftType && categoryAttrs.craft_type.options.includes(craftType)) {
      listing.craft_type = craftType;
    } else {
      listing.craft_type = categoryAttrs.craft_type.default;
      if (craftType) {
        warnings.push(`Row ${rowIndex}: invalid craft_type "${craftType}", using default "${categoryAttrs.craft_type.default}"`);
      }
    }
  }

  return { listing, warnings };
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

function isLocalFilePath(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('data:')) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  if (value.match(/^[A-Za-z]:[\\\/]/) || value.startsWith('/') || value.startsWith('\\\\')) {
    return true;
  }
  return false;
}

function collectLocalFilePaths(listings) {
  const paths = new Set();
  const fileFields = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'digital_file_1'];

  for (const listing of listings) {
    for (const field of fileFields) {
      const value = listing[field];
      if (isLocalFilePath(value)) {
        paths.add(value);
      }
    }
  }

  return Array.from(paths);
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

async function readSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (err) => {
          reject(new Error(err.message));
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    }
  });
}

function extractTags(row) {
  const tags = [];
  for (let i = 1; i <= 13; i++) {
    const tag = row[`tag_${i}`] || row[`Tag${i}`] || row[`Tag ${i}`];
    if (tag) tags.push(tag);
  }
  if (tags.length === 0 && row.tags) {
    return row.tags.split(',').map(t => t.trim()).filter(t => t);
  }
  return tags;
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

async function runUpload(listings) {
  elements.currentListing.textContent = 'Attaching to browser...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url?.includes('etsy.com')) {
      throw new Error('Please navigate to Etsy first');
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

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_LISTING_DATA' });

    if (response.success) {
      researchClipboard = response.data;
      await saveResearchClipboard();
      displayCapturedData(researchClipboard);
      updateClipboardBar();
      showCaptureStatus('Listing data captured successfully!', 'success');
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
    return 'Cutting Machine Files';
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
