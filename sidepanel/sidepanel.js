const CREDITS_PER_LISTING = 2;

let user = null;
let credits = { available: 0, used: 0 };
let creditPacks = [];
let selectedPackId = 'standard';
let uploadQueue = [];
let isUploading = false;
let isPaused = false;
let nativeConnected = false;

let setupState = {
  nativeHost: false,
  chromeDebug: false,
  etsyLoggedIn: false
};

const elements = {
  setupSection: document.getElementById('setup-section'),
  authSection: document.getElementById('auth-section'),
  mainSection: document.getElementById('main-section'),
  stepNative: document.getElementById('step-native'),
  stepChrome: document.getElementById('step-chrome'),
  stepEtsy: document.getElementById('step-etsy'),
  nativeStatus: document.getElementById('native-status'),
  chromeStatus: document.getElementById('chrome-status'),
  etsyStatus: document.getElementById('etsy-status'),
  downloadWindows: document.getElementById('download-windows'),
  copyCommand: document.getElementById('copy-command'),
  chromeCommand: document.getElementById('chrome-command'),
  checkSetupBtn: document.getElementById('check-setup-btn'),
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
  toast: document.getElementById('toast')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('BulkListingPro sidepanel initializing...');
  setupEventListeners();
  await checkPageStatus();

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
}

function setupEventListeners() {
  elements.checkSetupBtn.addEventListener('click', recheckSetup);
  elements.copyCommand.addEventListener('click', copyCommandToClipboard);
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
  elements.startUploadBtn.addEventListener('click', startUpload);
  elements.clearQueueBtn.addEventListener('click', clearQueue);
  elements.pauseBtn.addEventListener('click', pauseUpload);
  elements.skipBtn.addEventListener('click', skipListing);
  elements.cancelBtn.addEventListener('click', cancelUpload);
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkPageStatus();
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
  } else {
    showAuthSection();
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
  const requiredCredits = uploadQueue.length * CREDITS_PER_LISTING;
  elements.startUploadBtn.disabled = uploadQueue.length === 0 || credits.available < requiredCredits;

  if (uploadQueue.length > 0 && credits.available < requiredCredits) {
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

    uploadQueue = data.map((row, index) => ({
      id: String(Date.now() + index),
      title: row.title || row.Title || '',
      description: row.description || row.Description || '',
      price: parseFloat(row.price || row.Price || 0),
      category: row.category || row.Category || 'Digital Prints',
      tags: extractTags(row),
      image_1: row.image_1 || row.Image1 || row['Image 1'] || '',
      image_2: row.image_2 || row.Image2 || row['Image 2'] || '',
      image_3: row.image_3 || row.Image3 || row['Image 3'] || '',
      digital_file_1: row.digital_file_1 || row.DigitalFile || row['Digital File'] || '',
      status: 'pending'
    })).filter(item => item.title);

    if (uploadQueue.length === 0) {
      showToast('No valid listings found (title required)', 'error');
      return;
    }

    renderQueue();
    showToast(`Loaded ${uploadQueue.length} listings`, 'success');
  } catch (error) {
    console.error('Spreadsheet error:', error);
    showToast('Failed to parse spreadsheet: ' + error.message, 'error');
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

function handleSingleListing(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const listing = {
    id: Date.now().toString(),
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t),
    status: 'pending'
  };

  uploadQueue.push(listing);
  renderQueue();
  e.target.reset();
  showToast('Listing added to queue', 'success');
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
    <div class="queue-item" data-id="${item.id}" style="animation-delay: ${index * 0.05}s">
      <span class="title">${item.title}</span>
      <span class="status ${item.status}">${item.status}</span>
    </div>
  `).join('');
}

function clearQueue() {
  uploadQueue = [];
  renderQueue();
  showToast('Queue cleared', 'success');
}

async function startUpload() {
  const requiredCredits = uploadQueue.length * CREDITS_PER_LISTING;

  if (uploadQueue.length === 0) return;
  if (credits.available < requiredCredits) {
    showCreditsModal();
    return;
  }

  isUploading = true;
  isPaused = false;
  elements.queueSection.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');
  elements.pauseBtn.textContent = 'Pause';

  const total = uploadQueue.length;
  elements.currentListing.textContent = 'Connecting to native host...';
  updateProgress(0, total);

  try {
    const connectResponse = await chrome.runtime.sendMessage({ type: 'NATIVE_CONNECT' });
    if (!connectResponse.success) {
      throw new Error(connectResponse.error || 'Failed to connect to native host');
    }
    nativeConnected = true;

    elements.currentListing.textContent = 'Starting upload...';

    const listings = uploadQueue.map(item => ({
      title: item.title,
      description: item.description || '',
      price: String(item.price),
      category: item.category || 'Digital Prints',
      listing_state: 'draft',
      image_1: item.image_1 || '',
      image_2: item.image_2 || '',
      image_3: item.image_3 || '',
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

    const response = await chrome.runtime.sendMessage({
      type: 'NATIVE_UPLOAD',
      payload: { listings }
    });

    if (response.success) {
      const results = response.results || { success: 0, failed: 0 };
      showToast(`Upload complete: ${results.success} succeeded, ${results.failed} failed`,
        results.failed === 0 ? 'success' : 'error');
    } else {
      throw new Error(response.error || 'Upload failed');
    }

  } catch (error) {
    console.error('Upload error:', error);
    showToast('Upload failed: ' + error.message, 'error');
  }

  isUploading = false;
  await loadCredits(true);
}

async function pauseUpload() {
  if (!isUploading) return;

  if (!isPaused) {
    await chrome.runtime.sendMessage({ type: 'NATIVE_PAUSE' });
    isPaused = true;
    elements.pauseBtn.textContent = 'Resume';
    elements.skipBtn.disabled = false;
    showToast('Upload paused', 'success');
  } else {
    await chrome.runtime.sendMessage({ type: 'NATIVE_RESUME' });
    isPaused = false;
    elements.pauseBtn.textContent = 'Pause';
    elements.skipBtn.disabled = true;
    showToast('Upload resumed', 'success');
  }
}

async function skipListing() {
  if (!isUploading || !isPaused) return;

  await chrome.runtime.sendMessage({ type: 'NATIVE_SKIP' });
  elements.skipBtn.disabled = true;
  elements.pauseBtn.textContent = 'Pause';
  isPaused = false;
  showToast('Skipping current listing...', 'success');
}

async function cancelUpload() {
  if (!isUploading) return;

  await chrome.runtime.sendMessage({ type: 'NATIVE_CANCEL' });
  isUploading = false;
  isPaused = false;
  elements.progressSection.classList.add('hidden');
  elements.queueSection.classList.remove('hidden');
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
        if (message.creditsRemaining !== undefined) {
          const oldCreds = credits.available;
          credits.available = message.creditsRemaining;
          updateCreditsDisplay(oldCreds);
        }
      } else if (message.status === 'error') {
        elements.currentListing.textContent = `Failed: ${message.title} - ${message.error}`;
      } else if (message.status === 'skipped') {
        elements.currentListing.textContent = `Skipped: ${message.title}`;
      }
      updateProgress(message.index + 1, message.total);
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

async function checkSetup() {
  setupState.nativeHost = await checkNativeHost();
  setupState.chromeDebug = await checkChromeDebug();
  setupState.etsyLoggedIn = await checkEtsyLoggedIn();

  updateSetupUI();

  return setupState.nativeHost && setupState.chromeDebug && setupState.etsyLoggedIn;
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

async function checkChromeDebug() {
  if (!setupState.nativeHost) return false;

  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'NATIVE_CONNECT' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    nativeConnected = response.success;
    return response.success;
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
  if (setupState.nativeHost) {
    elements.stepNative.classList.add('complete');
    elements.nativeStatus.textContent = 'Installed';
  } else {
    elements.stepNative.classList.remove('complete');
    elements.nativeStatus.textContent = 'Not installed';
  }

  if (setupState.chromeDebug) {
    elements.stepChrome.classList.add('complete');
    elements.chromeStatus.textContent = 'Connected';
  } else {
    elements.stepChrome.classList.remove('complete');
    elements.chromeStatus.textContent = 'Not connected';
  }

  if (setupState.etsyLoggedIn) {
    elements.stepEtsy.classList.add('complete');
    elements.etsyStatus.textContent = 'Logged in';
  } else {
    elements.stepEtsy.classList.remove('complete');
    elements.etsyStatus.textContent = 'Not logged in';
  }
}

function showSetupSection() {
  elements.setupSection.classList.remove('hidden');
  elements.authSection.classList.add('hidden');
  elements.mainSection.classList.add('hidden');
}

async function recheckSetup() {
  elements.checkSetupBtn.classList.add('btn-loading');
  elements.checkSetupBtn.disabled = true;

  const setupComplete = await checkSetup();

  elements.checkSetupBtn.classList.remove('btn-loading');
  elements.checkSetupBtn.disabled = false;

  if (setupComplete) {
    showToast('Setup complete!', 'success');
    await checkAuth();
  } else {
    const missing = [];
    if (!setupState.nativeHost) missing.push('helper app');
    if (!setupState.chromeDebug) missing.push('debug mode');
    if (!setupState.etsyLoggedIn) missing.push('Etsy login');
    showToast(`Still need: ${missing.join(', ')}`, 'error');
  }
}

function copyCommandToClipboard() {
  const command = elements.chromeCommand.textContent;
  navigator.clipboard.writeText(command).then(() => {
    showToast('Command copied!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function handleDownload(e) {
  // Let the link work naturally (opens GitHub release download)
  showToast('Downloading... Extract and run install.bat', 'success');
}
