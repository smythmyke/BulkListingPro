import { STORAGE_KEYS, CATEGORIES, CATEGORY_ATTRIBUTES, sanitizeListing, readSpreadsheetFile } from '../services/listingUtils.js';
import { renderListingCard, renderAllCards, createBlankListing } from './components/form-view.js';
import { validateListing, formatPrice, validateTag, autoformatTitle, autoformatDescription, autoformatListing, titleCaseTitle, validateAllListings } from './components/validator.js';
import { initGrid, destroyGrid, refreshGridData, getGridListings, addGridRow, deleteGridRows, updateCell, IMAGES_COL } from './components/grid-view.js';
import { openImageDB } from '../services/imageStore.js';
import { loadTagLibrary, mapFormCategoryToInternal, getSuggestionsForCategory, fetchCompetitorTags, getTagFrequency, importListingFromUrl } from './components/tag-manager.js';
import { processImageFiles, processImageURL, removeImage, removeAllImages, getFullResolutionImages, reorderImages, showLightbox, closeLightbox, processDigitalFile, removeDigitalFile, hasImage } from './components/image-handler.js';
import { generateForListing, bulkGenerate, evaluateListing, bulkEvaluate } from './components/ai-generator.js';
import { startEditorTour, shouldAutoStart, showTourIntro } from '../services/tourService.js';

let listings = [];
let expandedIds = new Set();
let saveTimeout = null;
let lastSaveTime = null;
let currentView = 'form';
let formScrollPos = 0;
let gridScrollPos = 0;

let tagLibrary = {};
let tagPanelListingId = null;
let aiPanelListingId = null;
let aiPanelField = null;
let bulkCancelFn = null;
let evalBulkCancelFn = null;

const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

const els = {
  listingCards: document.getElementById('listing-cards'),
  gridContainer: document.getElementById('grid-container'),
  listingCount: document.getElementById('listing-count'),
  addListingBtn: document.getElementById('add-listing-btn'),
  addListingBottomBtn: document.getElementById('add-listing-bottom-btn'),
  importBtn: document.getElementById('import-btn'),
  importFileInput: document.getElementById('import-file-input'),
  importZone: document.getElementById('import-zone'),
  sendToQueueBtn: document.getElementById('send-to-queue-btn'),
  sendToQueueBottomBtn: document.getElementById('send-to-queue-bottom-btn'),
  addCardArea: document.getElementById('add-card-area'),
  editorFooter: document.getElementById('editor-footer'),
  autosaveStatus: document.getElementById('autosave-status'),
  closeEditorBtn: document.getElementById('close-editor-btn'),
  toast: document.getElementById('toast'),
  viewToggle: document.getElementById('view-toggle'),
  moreActionsBtn: document.getElementById('more-actions-btn'),
  moreActionsMenu: document.getElementById('more-actions-menu'),
  searchInput: document.getElementById('search-input'),
  filterCategory: document.getElementById('filter-category'),
  filterStatus: document.getElementById('filter-status'),
  sortBy: document.getElementById('sort-by'),
  undoBtn: document.getElementById('undo-btn'),
  redoBtn: document.getElementById('redo-btn'),
  validationBadge: document.getElementById('validation-badge'),
  validationReport: document.getElementById('validation-report'),
  validationReportBackdrop: document.getElementById('validation-report-backdrop'),
  reportSummary: document.getElementById('report-summary'),
  reportList: document.getElementById('report-list'),
  reportClose: document.getElementById('report-close'),
  tagLibraryPanel: document.getElementById('tag-library-panel'),
  tagLibraryBackdrop: document.getElementById('tag-library-backdrop'),
  tagLibraryContent: document.getElementById('tag-library-content'),
  tagImportContent: document.getElementById('tag-import-content'),
  tagFrequencyContent: document.getElementById('tag-frequency-content'),
  tagLibraryClose: document.getElementById('tag-library-close'),
  applyTagsToSelected: document.getElementById('apply-tags-to-selected'),
  tagPanelFooter: document.getElementById('tag-panel-footer'),
  aiPanel: document.getElementById('ai-panel'),
  aiPanelBackdrop: document.getElementById('ai-panel-backdrop'),
  aiPanelTitle: document.getElementById('ai-panel-title'),
  aiPanelClose: document.getElementById('ai-panel-close'),
  aiResults: document.getElementById('ai-results'),
  aiLoading: document.getElementById('ai-loading'),
  aiError: document.getElementById('ai-error'),
  aiBulkModal: document.getElementById('ai-bulk-modal'),
  aiBulkBackdrop: document.getElementById('ai-bulk-backdrop'),
  aiBulkClose: document.getElementById('ai-bulk-close'),
  aiBulkStart: document.getElementById('ai-bulk-start'),
  aiBulkCancel: document.getElementById('ai-bulk-cancel'),
  aiBulkTitles: document.getElementById('ai-bulk-titles'),
  aiBulkDescriptions: document.getElementById('ai-bulk-descriptions'),
  aiBulkTags: document.getElementById('ai-bulk-tags'),
  aiBulkScope: document.getElementById('ai-bulk-scope'),
  aiBulkStyle: document.getElementById('ai-bulk-style'),
  aiBulkCost: document.getElementById('ai-bulk-cost'),
  aiBulkCreditWarning: document.getElementById('ai-bulk-credit-warning'),
  aiBulkProgress: document.getElementById('ai-bulk-progress'),
  aiProgressFill: document.getElementById('ai-progress-fill'),
  aiProgressText: document.getElementById('ai-progress-text'),
  evalBulkModal: document.getElementById('eval-bulk-modal'),
  evalBulkBackdrop: document.getElementById('eval-bulk-backdrop'),
  evalBulkClose: document.getElementById('eval-bulk-close'),
  evalBulkStart: document.getElementById('eval-bulk-start'),
  evalBulkCancel: document.getElementById('eval-bulk-cancel'),
  evalBulkScope: document.getElementById('eval-bulk-scope'),
  evalBulkCost: document.getElementById('eval-bulk-cost'),
  evalBulkCreditWarning: document.getElementById('eval-bulk-credit-warning'),
  evalBulkProgress: document.getElementById('eval-bulk-progress'),
  evalProgressFill: document.getElementById('eval-progress-fill'),
  evalProgressText: document.getElementById('eval-progress-text'),
  tourBtn: document.getElementById('tour-btn')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await openImageDB();
  } catch (e) {
    console.warn('IndexedDB unavailable, falling back to inline images:', e);
    idbAvailable = false;
  }
  await loadSavedState();
  tagLibrary = await loadTagLibrary();
  populateCategoryFilter();
  render();
  setupEventListeners();
  setupTabTracking();
  setupStorageListener();
  if (await shouldAutoStart('editor')) showTourIntro('editor');
}

function setupTabTracking() {
  window.addEventListener('beforeunload', () => {
    chrome.storage.local.remove(STORAGE_KEYS.EDITOR_TAB_ID);
  });
}

function closeEditor() {
  window.close();
}

async function loadSavedState() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.EDITOR_LISTINGS);
    const saved = data[STORAGE_KEYS.EDITOR_LISTINGS];
    if (saved && Array.isArray(saved) && saved.length > 0) {
      listings = saved;
      lastSaveTime = Date.now();
    }
  } catch (err) {
    console.warn('Failed to load editor state:', err);
  }
}

function populateCategoryFilter() {
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    els.filterCategory.appendChild(opt);
  });
}

function render() {
  if (currentView === 'form') {
    renderFormView();
  } else {
    renderGridView();
  }
  updateCounts();
  updateFooterVisibility();
  updateSendButtonState();
  updateAutosaveStatus();
  updateUndoRedoButtons();
  updateValidationBadge();
}

function renderFormView() {
  const filtered = getFilteredListings();
  renderAllCards(filtered, els.listingCards, expandedIds.size > 0 ? expandedIds : null);
  updateTagSuggestions();
}

function renderGridView() {
  initGrid(els.gridContainer, listings, handleGridChange);
}

function getFilteredListings() {
  const search = (els.searchInput.value || '').toLowerCase().trim();
  const catFilter = els.filterCategory.value;
  const statusFilter = els.filterStatus.value;
  const sortVal = els.sortBy.value;

  let filtered = [...listings];

  if (search) {
    filtered = filtered.filter(l =>
      (l.title || '').toLowerCase().includes(search) ||
      (l.description || '').toLowerCase().includes(search) ||
      (l.sku || '').toLowerCase().includes(search) ||
      (l.tags || []).some(t => t.toLowerCase().includes(search))
    );
  }

  if (catFilter) {
    filtered = filtered.filter(l => l.category === catFilter);
  }

  if (statusFilter) {
    filtered = filtered.filter(l => {
      const { valid, errors, warnings } = validateListing(l);
      const hasContent = l.title || l.description || l.price;
      if (statusFilter === 'valid') return valid && hasContent;
      if (statusFilter === 'errors') return errors.length > 0 && hasContent;
      if (statusFilter === 'warnings') return warnings.length > 0 && errors.length === 0 && hasContent;
      if (statusFilter === 'empty') return !hasContent;
      return true;
    });
  }

  if (sortVal) {
    filtered.sort((a, b) => {
      if (sortVal === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortVal === 'title-desc') return (b.title || '').localeCompare(a.title || '');
      if (sortVal === 'price-asc') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      if (sortVal === 'price-desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      if (sortVal === 'category') return (a.category || '').localeCompare(b.category || '');
      if (sortVal === 'status') {
        const scoreA = getValidationScore(a);
        const scoreB = getValidationScore(b);
        return scoreA - scoreB;
      }
      return 0;
    });
  }

  return filtered;
}

function getValidationScore(listing) {
  const hasContent = listing.title || listing.description || listing.price;
  if (!hasContent) return 3;
  const { valid, errors } = validateListing(listing);
  if (errors.length > 0) return 0;
  if (valid) return 2;
  return 1;
}

function updateCounts() {
  const count = listings.length;
  els.listingCount.textContent = `${count} listing${count !== 1 ? 's' : ''}`;
}

function updateFooterVisibility() {
  const show = listings.length > 0;
  els.addCardArea.style.display = show && currentView === 'form' ? '' : 'none';
  els.editorFooter.style.display = show ? '' : 'none';
}

function updateSendButtonState() {
  const allValid = listings.length > 0 && listings.every(l => validateListing(l).valid);
  els.sendToQueueBtn.disabled = !allValid;
  els.sendToQueueBottomBtn.disabled = !allValid;
}

function updateAutosaveStatus() {
  if (!lastSaveTime) {
    els.autosaveStatus.textContent = 'Not saved yet';
    els.autosaveStatus.className = 'autosave-status';
  } else {
    const ago = Math.round((Date.now() - lastSaveTime) / 1000);
    if (ago < 5) {
      els.autosaveStatus.textContent = 'Saved just now';
    } else if (ago < 60) {
      els.autosaveStatus.textContent = `Saved ${ago}s ago`;
    } else {
      els.autosaveStatus.textContent = `Saved ${Math.round(ago / 60)}m ago`;
    }
    els.autosaveStatus.className = 'autosave-status saved';
  }
}

setInterval(updateAutosaveStatus, 5000);

function scheduleSave() {
  els.autosaveStatus.textContent = 'Saving...';
  els.autosaveStatus.className = 'autosave-status saving';
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.EDITOR_LISTINGS]: listings });
      lastSaveTime = Date.now();
      updateAutosaveStatus();
    } catch (err) {
      console.warn('Autosave failed:', err);
      els.autosaveStatus.textContent = 'Save failed';
      els.autosaveStatus.className = 'autosave-status';
    }
  }, 500);
}

function pushUndo(description) {
  const snapshot = JSON.parse(JSON.stringify(listings));
  undoStack.push({ description, listings: snapshot });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  const current = JSON.parse(JSON.stringify(listings));
  const entry = undoStack.pop();
  redoStack.push({ description: entry.description, listings: current });
  listings = entry.listings;
  render();
  scheduleSave();
  showToast(`Undo: ${entry.description}`, 'success');
}

function redo() {
  if (redoStack.length === 0) return;
  const current = JSON.parse(JSON.stringify(listings));
  const entry = redoStack.pop();
  undoStack.push({ description: entry.description, listings: current });
  listings = entry.listings;
  render();
  scheduleSave();
  showToast(`Redo: ${entry.description}`, 'success');
}

function updateUndoRedoButtons() {
  els.undoBtn.disabled = undoStack.length === 0;
  els.redoBtn.disabled = redoStack.length === 0;
}

function setupEventListeners() {
  els.addListingBtn.addEventListener('click', addListing);
  els.addListingBottomBtn.addEventListener('click', addListing);
  els.importBtn.addEventListener('click', () => els.importFileInput.click());
  els.importFileInput.addEventListener('change', handleImportFile);
  els.sendToQueueBtn.addEventListener('click', sendToQueue);
  els.sendToQueueBottomBtn.addEventListener('click', sendToQueue);
  els.closeEditorBtn.addEventListener('click', closeEditor);
  els.tourBtn.addEventListener('click', startEditorTour);
  els.undoBtn.addEventListener('click', undo);
  els.redoBtn.addEventListener('click', redo);
  els.validationBadge.addEventListener('click', runBatchValidation);
  els.reportClose.addEventListener('click', closeValidationReport);
  els.validationReportBackdrop.addEventListener('click', closeValidationReport);
  els.reportList.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-jump-id]');
    if (jumpBtn) jumpToListing(jumpBtn.dataset.jumpId);
  });

  els.viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-toggle-btn');
    if (!btn || btn.classList.contains('active')) return;
    switchView(btn.dataset.view);
  });

  els.moreActionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.moreActionsMenu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    els.moreActionsMenu.classList.remove('open');
  });

  els.moreActionsMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    els.moreActionsMenu.classList.remove('open');
    handleMenuAction(btn.dataset.action);
  });

  els.searchInput.addEventListener('input', debounce(applyFilters, 250));
  els.filterCategory.addEventListener('change', applyFilters);
  els.filterStatus.addEventListener('change', applyFilters);
  els.sortBy.addEventListener('change', applyFilters);

  const importFileInput = document.getElementById('import-file-input');

  els.importZone.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });
  importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importFile(e.target.files[0]);
    }
  });
  els.importZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.importZone.classList.add('drag-over');
  });
  els.importZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    els.importZone.classList.remove('drag-over');
  });
  els.importZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.importZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      importFile(e.dataTransfer.files[0]);
    }
  });

  els.listingCards.addEventListener('input', handleFieldInput);
  els.listingCards.addEventListener('change', handleFieldChange);
  els.listingCards.addEventListener('click', handleCardClick);
  els.listingCards.addEventListener('keydown', handleTagKeydown);
  els.listingCards.addEventListener('paste', handlePricePaste);
  els.listingCards.addEventListener('blur', handleFieldBlur, true);
  els.listingCards.addEventListener('mouseover', clampTooltipPosition);

  els.listingCards.addEventListener('dragstart', handleDragStart);
  els.listingCards.addEventListener('dragover', handleDragOver);
  els.listingCards.addEventListener('dragleave', handleDragLeave);
  els.listingCards.addEventListener('drop', handleDrop);
  els.listingCards.addEventListener('dragend', handleDragEnd);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.evalBulkModal.style.display !== 'none') {
        closeEvalBulkModal();
        return;
      }
      if (els.aiPanel.style.display !== 'none') {
        closeAiPanel();
        return;
      }
      if (els.aiBulkModal.style.display !== 'none') {
        closeAiBulkModal();
        return;
      }
      if (els.tagLibraryPanel.style.display !== 'none') {
        closeTagLibraryPanel();
        return;
      }
      if (els.validationReport.style.display !== 'none') {
        closeValidationReport();
        return;
      }
      closeLightbox();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });

  els.tagLibraryClose.addEventListener('click', closeTagLibraryPanel);
  els.tagLibraryBackdrop.addEventListener('click', closeTagLibraryPanel);

  els.tagLibraryPanel.querySelector('.panel-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;
    handlePanelTabClick(tab.dataset.panelTab);
  });

  els.tagLibraryContent.addEventListener('click', handleLibraryContentClick);
  els.tagImportContent.addEventListener('click', handleImportContentClick);

  els.aiPanelClose.addEventListener('click', closeAiPanel);
  els.aiPanelBackdrop.addEventListener('click', closeAiPanel);
  els.aiResults.addEventListener('click', handleAiResultsClick);
  els.aiBulkClose.addEventListener('click', closeAiBulkModal);
  els.aiBulkBackdrop.addEventListener('click', closeAiBulkModal);
  els.aiBulkStart.addEventListener('click', startBulkGenerate);
  els.aiBulkCancel.addEventListener('click', cancelBulkGenerate);
  els.aiBulkTitles.addEventListener('change', updateBulkCost);
  els.aiBulkDescriptions.addEventListener('change', updateBulkCost);
  els.aiBulkTags.addEventListener('change', updateBulkCost);
  els.aiBulkScope.addEventListener('change', updateBulkCost);

  els.evalBulkClose.addEventListener('click', closeEvalBulkModal);
  els.evalBulkBackdrop.addEventListener('click', closeEvalBulkModal);
  els.evalBulkStart.addEventListener('click', startBulkEvaluate);
  els.evalBulkCancel.addEventListener('click', cancelBulkEvaluate);
  els.evalBulkScope.addEventListener('change', updateEvalBulkCost);

  const lightboxEl = document.getElementById('lightbox');
  if (lightboxEl) {
    lightboxEl.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function switchView(view) {
  if (view === currentView) return;

  if (currentView === 'grid') {
    const updated = getGridListings(listings);
    if (updated.length > 0) {
      listings = updated;
    }
    gridScrollPos = els.gridContainer.scrollTop || 0;
    destroyGrid();
  } else {
    formScrollPos = window.scrollY;
  }

  currentView = view;
  els.viewToggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'form') {
    document.body.classList.remove('grid-active');
    els.listingCards.style.display = '';
    els.gridContainer.style.display = 'none';
    els.addCardArea.style.display = listings.length > 0 ? '' : 'none';
    renderFormView();
    window.scrollTo(0, formScrollPos);
  } else {
    document.body.classList.add('grid-active');
    els.listingCards.style.display = 'none';
    els.gridContainer.style.display = '';
    els.addCardArea.style.display = 'none';
    renderGridView();
  }

  updateFooterVisibility();
  scheduleSave();
}

function handleGridChange(type, detail) {
  if (type === 'cell') {
    const { x, y, value } = detail;
    if (listings[y]) {
      const fields = ['_selected', 'title', 'description', 'price', 'category', 'tags', 'who_made', 'what_is_it', 'ai_content', 'when_made', 'renewal', 'listing_state', 'materials', 'quantity', 'sku', '_images'];
      const field = fields[x];
      if (field === '_images') return;
      if (field === '_selected') {
        listings[y]._selected = value === true || value === 'true';
        return;
      }
      pushUndo('edit cell');
      const updated = getGridListings(listings);
      if (updated.length > 0) listings = updated;
      else if (listings[y]) {
        if (field === 'tags') listings[y].tags = value.split(',').map(t => t.trim()).filter(t => t).slice(0, 13);
        else if (field === 'materials') listings[y].materials = value.split(',').map(m => m.trim()).filter(m => m);
        else if (field === 'price') listings[y].price = parseFloat(value) || '';
        else if (field === 'quantity') listings[y].quantity = parseInt(value) || 999;
        else if (field) listings[y][field] = value;
      }
      updateSendButtonState();
      scheduleSave();
    }
  } else if (type === 'insertRow') {
    pushUndo('insert row');
    const blank = createBlankListing();
    listings.splice(detail.rowNumber + 1, 0, blank);
    scheduleSave();
  } else if (type === 'deleteRow') {
    pushUndo('delete row');
    listings.splice(detail.rowNumber, detail.numRows || 1);
    updateCounts();
    updateSendButtonState();
    scheduleSave();
  } else if (type === 'paste') {
    pushUndo('paste');
    const updated = getGridListings(listings);
    const blankCount = updated.length - listings.length;
    if (blankCount > 0) {
      for (let i = 0; i < blankCount; i++) {
        listings.push(createBlankListing());
      }
    }
    const merged = getGridListings(listings);
    if (merged.length > 0) listings = merged;
    updateCounts();
    updateSendButtonState();
    scheduleSave();
  } else if (type === 'imageClick') {
    const rowIndex = detail.y;
    if (!listings[rowIndex]) return;
    let gridFileInput = document.getElementById('grid-image-input');
    if (!gridFileInput) {
      gridFileInput = document.createElement('input');
      gridFileInput.type = 'file';
      gridFileInput.id = 'grid-image-input';
      gridFileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
      gridFileInput.multiple = true;
      gridFileInput.hidden = true;
      gridFileInput.addEventListener('change', handleGridImageInput);
      document.body.appendChild(gridFileInput);
    }
    gridFileInput.dataset.rowIndex = rowIndex;
    gridFileInput.click();
  }
}

function applyFilters() {
  if (currentView === 'form') {
    renderFormView();
  }
}

function handleMenuAction(action) {
  if (action === 'duplicate-selected') duplicateSelected();
  else if (action === 'delete-selected') deleteSelected();
  else if (action === 'select-all') selectAll(true);
  else if (action === 'select-none') selectAll(false);
  else if (action === 'export-xlsx') exportXlsx();
  else if (action === 'export-csv') exportCsv();
  else if (action === 'validate-all') runBatchValidation();
  else if (action === 'autoformat-all') runAutoformatAll();
  else if (action === 'titlecase-all') runTitleCaseAll();
  else if (action === 'ai-generate-all') showAiBulkModal();
  else if (action === 'evaluate-all') showEvalBulkModal();
  else if (action === 'add-tags-to-selected') addBatchTags();
  else if (action === 'remove-tag-from-all') removeBatchTag();
  else if (action === 'import-from-url') showImportFromUrlModal();
}

function getSelectedIds() {
  return listings.filter(l => l._selected).map(l => l.id);
}

function selectAll(select) {
  listings.forEach(l => l._selected = select);
  if (currentView === 'form') render();
  showToast(select ? 'All selected' : 'All deselected', 'success');
}

function duplicateSelected() {
  const selected = listings.filter(l => l._selected);
  if (selected.length === 0) {
    showToast('No listings selected', 'error');
    return;
  }
  pushUndo('duplicate');
  selected.forEach(l => {
    const copy = { ...JSON.parse(JSON.stringify(l)) };
    copy.id = `editor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    copy._selected = false;
    copy.sku = l.sku ? incrementSku(l.sku) : '';
    listings.push(copy);
  });
  render();
  scheduleSave();
  showToast(`Duplicated ${selected.length} listing(s)`, 'success');
}

function incrementSku(sku) {
  const match = sku.match(/^(.*?)(\d+)$/);
  if (match) {
    const num = parseInt(match[2]) + 1;
    return match[1] + String(num).padStart(match[2].length, '0');
  }
  return sku + '-copy';
}

async function deleteSelected() {
  const selected = listings.filter(l => l._selected);
  if (selected.length === 0) {
    showToast('No listings selected', 'error');
    return;
  }
  if (!confirm(`Delete ${selected.length} selected listing(s)?`)) return;
  pushUndo('batch delete');
  const ids = new Set(selected.map(l => l.id));
  listings = listings.filter(l => !ids.has(l.id));
  ids.forEach(id => expandedIds.delete(id));
  await Promise.all([...ids].map(id => removeAllImages(id)));
  render();
  scheduleSave();
  showToast(`Deleted ${selected.length} listing(s)`, 'success');
}

function exportXlsx() {
  if (listings.length === 0) {
    showToast('No listings to export', 'error');
    return;
  }
  const wb = XLSX.utils.book_new();
  const rows = [getExportHeaders()];
  listings.forEach(l => rows.push(getExportRow(l)));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Listings');
  XLSX.writeFile(wb, `BulkListingPro-${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast(`Exported ${listings.length} listings as XLSX`, 'success');
}

function exportCsv() {
  if (listings.length === 0) {
    showToast('No listings to export', 'error');
    return;
  }
  const rows = [getExportHeaders()];
  listings.forEach(l => rows.push(getExportRow(l)));
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BulkListingPro-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${listings.length} listings as CSV`, 'success');
}

function getExportHeaders() {
  return ['title', 'description', 'price', 'category', 'tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5', 'tag_6', 'tag_7', 'tag_8', 'tag_9', 'tag_10', 'tag_11', 'tag_12', 'tag_13', 'who_made', 'what_is_it', 'ai_content', 'when_made', 'renewal', 'listing_state', 'materials', 'quantity', 'sku'];
}

function getExportRow(l) {
  const tags = l.tags || [];
  return [
    l.title || '',
    l.description || '',
    l.price || '',
    l.category || '',
    ...Array.from({ length: 13 }, (_, i) => tags[i] || ''),
    l.who_made || 'i_did',
    l.what_is_it || 'finished_product',
    l.ai_content || 'original',
    l.when_made || 'made_to_order',
    l.renewal || 'automatic',
    l.listing_state || 'draft',
    (l.materials || []).join(', '),
    l.quantity || 999,
    l.sku || ''
  ];
}

function findListingById(id) {
  return listings.find(l => l.id === id);
}

function findListingIndex(id) {
  return listings.findIndex(l => l.id === id);
}

function handleFieldInput(e) {
  const field = e.target.dataset.field;
  const id = e.target.dataset.listingId;
  if (!field || !id) return;

  const listing = findListingById(id);
  if (!listing) return;

  if (field === 'tag_input') return;

  if (field === 'title') {
    listing.title = e.target.value;
    const card = e.target.closest('.listing-card');
    const preview = card.querySelector('.card-title-preview');
    preview.textContent = listing.title ? listing.title.substring(0, 60) : 'Untitled listing';
    preview.classList.toggle('empty', !listing.title);
    const counter = e.target.parentElement.querySelector('.char-counter');
    const len = listing.title.length;
    counter.textContent = `${len}/140`;
    counter.className = `char-counter ${len > 140 ? 'over' : len > 120 ? 'warn' : ''}`;
  } else if (field === 'description') {
    listing.description = e.target.value;
    const descCounter = e.target.parentElement.querySelector('.desc-counter');
    if (descCounter) {
      const len = (e.target.value || '').length;
      descCounter.textContent = `${len}/4800`;
      descCounter.className = `desc-counter char-counter ${len > 4800 ? 'over' : len > 4200 ? 'warn' : ''}`;
    }
  } else if (field === 'price') {
    listing.price = e.target.value;
  } else if (field === 'materials') {
    listing.materials = e.target.value.split(',').map(m => m.trim()).filter(m => m);
  } else if (field === 'quantity') {
    listing.quantity = parseInt(e.target.value) || 999;
  } else if (field === 'sku') {
    listing.sku = e.target.value;
  } else if (field === '_digital_display_name') {
    listing._digital_display_name = e.target.value;
  } else if (field === 'personalization_instructions') {
    listing.personalization_instructions = e.target.value;
  } else if (field === 'personalization_char_limit') {
    listing.personalization_char_limit = parseInt(e.target.value) || '';
  }

  updateCardValidation(id);
  scheduleSave();
}

function handleFieldChange(e) {
  if (e.target.classList.contains('image-slot-input')) {
    handleImageSlotChange(e.target);
    return;
  }
  if (e.target.classList.contains('digital-file-input')) {
    handleDigitalFileChange(e.target);
    return;
  }
  if (e.target.classList.contains('card-select')) {
    const id = e.target.dataset.listingId;
    const listing = findListingById(id);
    if (listing) listing._selected = e.target.checked;
    return;
  }

  const field = e.target.dataset.field;
  const id = e.target.dataset.listingId;
  if (!field || !id) return;

  const listing = findListingById(id);
  if (!listing) return;

  if (field === 'category') {
    listing.category = e.target.value;
    const craftGroup = els.listingCards.querySelector(`[data-craft-type-group="${id}"]`);
    if (craftGroup) {
      const hasCraft = CATEGORY_ATTRIBUTES[listing.category]?.craft_type;
      craftGroup.style.display = hasCraft ? '' : 'none';
      if (hasCraft && !listing.craft_type) {
        listing.craft_type = CATEGORY_ATTRIBUTES[listing.category].craft_type.default;
      }
    }
    updateTagSuggestions(id);
  } else if (field === 'craft_type') {
    listing.craft_type = e.target.value;
  } else if (field === 'who_made') {
    listing.who_made = e.target.value;
  } else if (field === 'what_is_it') {
    listing.what_is_it = e.target.value;
  } else if (field === 'ai_content') {
    listing.ai_content = e.target.value;
  } else if (field === 'when_made') {
    listing.when_made = e.target.value;
  } else if (field === 'renewal') {
    listing.renewal = e.target.value;
  } else if (field === 'listing_state') {
    listing.listing_state = e.target.value;
  } else if (field === 'primary_color') {
    listing.primary_color = e.target.value;
  } else if (field === 'secondary_color') {
    listing.secondary_color = e.target.value;
  } else if (field === 'personalization_required') {
    listing.personalization_required = e.target.checked;
  } else if (field === 'listing_type') {
    listing.listing_type = e.target.value;
  } else if (field === 'featured') {
    listing.featured = e.target.checked;
  } else if (field === 'etsy_ads') {
    listing.etsy_ads = e.target.checked;
  } else if (field === 'price') {
    const formatted = formatPrice(e.target.value);
    if (formatted) {
      e.target.value = formatted;
      listing.price = parseFloat(formatted);
    }
  }

  updateCardValidation(id);
  scheduleSave();
}

function handleCardClick(e) {
  if (e.target.classList.contains('card-select')) return;

  if (e.target.dataset.action === 'remove') {
    e.stopPropagation();
    const id = e.target.dataset.listingId;
    removeListing(id);
    return;
  }

  const header = e.target.closest('[data-action="toggle"]');
  if (header && !e.target.closest('.card-remove') && !e.target.closest('.card-select') && !e.target.closest('.eval-btn')) {
    const id = header.dataset.listingId;
    toggleCard(id);
    return;
  }

  if (e.target.classList.contains('tag-remove') || e.target.closest('.tag-remove')) {
    const removeBtn = e.target.classList.contains('tag-remove') ? e.target : e.target.closest('.tag-remove');
    const tagIndex = parseInt(removeBtn.dataset.tagIndex);
    const card = removeBtn.closest('.listing-card');
    const id = card.dataset.listingId;
    removeTag(id, tagIndex);
    return;
  }

  if (e.target.classList.contains('image-slot-remove') || e.target.closest('.image-slot-remove')) {
    const btn = e.target.classList.contains('image-slot-remove') ? e.target : e.target.closest('.image-slot-remove');
    handleImageRemove(btn);
    return;
  }

  const imageSlot = e.target.closest('.image-slot');
  if (imageSlot) {
    if (imageSlot.classList.contains('has-image') && !e.target.closest('.image-slot-remove')) {
      const lid = imageSlot.dataset.listingId;
      const slotIdx = parseInt(imageSlot.dataset.imageIndex);
      const listing = findListingById(lid);
      if (listing) showLightbox(listing, slotIdx);
    } else if (!imageSlot.classList.contains('has-image')) {
      handleImageSlotClick(imageSlot);
    }
    return;
  }

  if (e.target.classList.contains('image-url-paste')) {
    const lid = e.target.dataset.listingId;
    const listing = findListingById(lid);
    if (!listing) return;
    const url = prompt('Enter image URL:');
    if (!url || !url.trim()) return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      showToast('Enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    pushUndo('add image from URL');
    processImageURL(trimmed, listing, null, {
      onError: (msg) => showToast(msg, 'error'),
      onComplete: (results) => {
        rerenderCard(lid);
        scheduleSave();
        if (results.length > 0) showToast('Image added from URL', 'success');
      }
    });
    return;
  }

  if (e.target.classList.contains('digital-file-browse') || e.target.closest('.digital-file-browse')) {
    const btn = e.target.classList.contains('digital-file-browse') ? e.target : e.target.closest('.digital-file-browse');
    handleDigitalFileBrowse(btn);
    return;
  }

  if (e.target.classList.contains('digital-file-remove') || e.target.closest('.digital-file-remove')) {
    const btn = e.target.classList.contains('digital-file-remove') ? e.target : e.target.closest('.digital-file-remove');
    handleDigitalFileRemove(btn);
    return;
  }

  if (e.target.classList.contains('ai-gen-btn')) {
    if (e.target.disabled || e.target.classList.contains('disabled')) return;
    const lid = e.target.dataset.listingId;
    const field = e.target.dataset.aiField;
    handleAiGenerate(lid, field, e.target);
    return;
  }

  if (e.target.classList.contains('eval-btn')) {
    if (e.target.disabled || e.target.classList.contains('disabled')) return;
    handleEvaluateListing(e.target.dataset.listingId, e.target);
    return;
  }

  const evalSwap = e.target.closest('[data-eval-action="swap-tag"]');
  if (evalSwap) {
    applyEvalTagSwap(evalSwap);
    return;
  }

  if (e.target.classList.contains('tag-library-btn')) {
    const lid = e.target.dataset.listingId;
    showTagLibraryPanel(lid);
    return;
  }

  const suggChip = e.target.closest('.suggestion-chip:not(.added)');
  if (suggChip) {
    handleSuggestionClick(suggChip);
    return;
  }

  const wrapper = e.target.closest('.tags-input-wrapper');
  if (wrapper) {
    const input = wrapper.querySelector('.tag-input-field');
    if (input) input.focus();
  }
}

function handleTagKeydown(e) {
  if (e.target.dataset.field !== 'tag_input') return;

  const id = e.target.dataset.listingId;
  const listing = findListingById(id);
  if (!listing) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    const value = e.target.value.trim();
    if (!value) return;

    if ((listing.tags || []).length >= 13) {
      showToast('Maximum 13 tags allowed', 'error');
      return;
    }

    const { valid, tag, reason } = validateTag(value);
    if (!valid) {
      showToast(`Invalid tag: ${reason}`, 'error');
      return;
    }

    const duplicate = (listing.tags || []).some(t => t.toLowerCase() === tag.toLowerCase());
    if (duplicate) {
      showToast('Duplicate tag', 'error');
      return;
    }

    pushUndo('add tag');
    if (!listing.tags) listing.tags = [];
    listing.tags.push(tag);
    e.target.value = '';
    rerenderCard(id);
    scheduleSave();
  } else if (e.key === 'Backspace' && !e.target.value) {
    if (listing.tags && listing.tags.length > 0) {
      pushUndo('remove tag');
      listing.tags.pop();
      rerenderCard(id);
      scheduleSave();
    }
  }
}

function handlePricePaste(e) {
  if (e.target.dataset.field !== 'price') return;
  const pasted = (e.clipboardData || window.clipboardData).getData('text');
  if (pasted && /[$,]/.test(pasted)) {
    e.preventDefault();
    const cleaned = pasted.replace(/[$,\s]/g, '');
    e.target.value = cleaned;
    e.target.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function handleImageSlotClick(slot) {
  const input = slot.querySelector('.image-slot-input');
  if (input) input.click();
}

function countListingImages(listing) {
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    if (listing[`image_${i}`]) count++;
  }
  return count;
}

async function handleGridImageInput(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  const rowIndex = parseInt(e.target.dataset.rowIndex);
  const listing = listings[rowIndex];
  if (!listing) return;

  pushUndo('add image');
  await processImageFiles(files, listing, null, {
    onError: (msg) => showToast(msg, 'error'),
    onComplete: (results) => {
      updateCell(IMAGES_COL, rowIndex, `${countListingImages(listing)}/5`);
      scheduleSave();
      if (results.length > 0) showToast(`Added ${results.length} image(s)`, 'success');
    }
  });
  e.target.value = '';
}

async function handleImageSlotChange(input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  const id = input.dataset.listingId;
  const startSlot = parseInt(input.dataset.imageIndex);
  const listing = findListingById(id);
  if (!listing) return;

  if (!idbAvailable) {
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      listing[`image_${startSlot}`] = e.target.result;
      rerenderCard(id);
      scheduleSave();
    };
    reader.readAsDataURL(file);
    input.value = '';
    return;
  }

  pushUndo('add image');
  await processImageFiles(files, listing, startSlot, {
    onSlotLoading: (lid, slot) => {
      const slotEl = els.listingCards.querySelector(`.image-slot[data-listing-id="${lid}"][data-image-index="${slot}"]`);
      if (slotEl) slotEl.classList.add('loading');
    },
    onError: (msg) => showToast(msg, 'error'),
    onComplete: () => {
      rerenderCard(id);
      scheduleSave();
    }
  });
  input.value = '';
}

async function handleImageRemove(btn) {
  const id = btn.dataset.listingId;
  const idx = parseInt(btn.dataset.imageIndex);
  const listing = findListingById(id);
  if (!listing) return;
  pushUndo('remove image');
  await removeImage(listing, idx);
  rerenderCard(id);
  scheduleSave();
}

function handleDigitalFileBrowse(btn) {
  const id = btn.dataset.listingId;
  const card = els.listingCards.querySelector(`[data-listing-id="${id}"]`);
  if (!card) return;
  const input = card.querySelector(`.digital-file-input[data-listing-id="${id}"]`);
  if (input) input.click();
}

async function handleDigitalFileChange(input) {
  const file = input.files[0];
  if (!file) return;
  const id = input.dataset.listingId;
  const listing = findListingById(id);
  if (!listing) return;

  if (!idbAvailable) {
    const reader = new FileReader();
    reader.onload = (e) => {
      listing.digital_file_1 = e.target.result;
      listing._digital_file_name = file.name;
      listing._digital_file_size = file.size;
      rerenderCard(id);
      scheduleSave();
    };
    reader.readAsDataURL(file);
    input.value = '';
    return;
  }

  pushUndo('add digital file');
  await processDigitalFile(file, listing, {
    onError: (msg) => showToast(msg, 'error'),
    onComplete: () => {
      rerenderCard(id);
      scheduleSave();
    }
  });
  input.value = '';
}

async function handleDigitalFileRemove(btn) {
  const id = btn.dataset.listingId;
  const listing = findListingById(id);
  if (!listing) return;
  pushUndo('remove digital file');
  await removeDigitalFile(listing);
  rerenderCard(id);
  scheduleSave();
}

function removeTag(id, tagIndex) {
  const listing = findListingById(id);
  if (!listing || !listing.tags) return;
  pushUndo('remove tag');
  listing.tags.splice(tagIndex, 1);
  rerenderCard(id);
  scheduleSave();
}

function rerenderCard(id) {
  const index = findListingIndex(id);
  if (index === -1) return;
  const card = els.listingCards.querySelector(`[data-listing-id="${id}"]`);
  if (!card) return;
  const collapsed = !expandedIds.has(id) && expandedIds.size > 0;
  const temp = document.createElement('div');
  temp.innerHTML = renderListingCard(listings[index], index, collapsed);
  const newCard = temp.firstElementChild;
  card.replaceWith(newCard);
  const tagInput = newCard.querySelector(`[data-field="tag_input"][data-listing-id="${id}"]`);
  if (tagInput) tagInput.focus();
  updateTagSuggestions(id);
  updateSendButtonState();
}

function updateCardValidation(id) {
  const listing = findListingById(id);
  if (!listing) return;
  const { valid, errors, warnings } = validateListing(listing);
  const card = els.listingCards.querySelector(`[data-listing-id="${id}"]`);
  if (!card) return;

  card.classList.remove('has-errors', 'has-warnings', 'is-valid');
  const hasAnyContent = listing.title || listing.description || listing.price;
  if (hasAnyContent) {
    if (errors.length > 0) card.classList.add('has-errors');
    else if (warnings.length > 0) card.classList.add('has-warnings');
    else if (valid) card.classList.add('is-valid');
  }

  let badgeClass = 'empty';
  if (hasAnyContent) {
    badgeClass = valid ? 'valid' : (errors.length > 0 ? 'error' : 'warning');
  }
  const badge = card.querySelector('.validation-badge');
  if (badge) badge.className = `validation-badge ${badgeClass}`;

  if (hasAnyContent) {
    const titleInput = card.querySelector('[data-field="title"]');
    const descInput = card.querySelector('[data-field="description"]');
    const priceInput = card.querySelector('[data-field="price"]');
    if (titleInput) titleInput.classList.toggle('field-error', !listing.title);
    if (descInput) descInput.classList.toggle('field-error', !listing.description);
    if (priceInput) {
      const p = parseFloat(listing.price);
      priceInput.classList.toggle('field-error', !listing.price || isNaN(p) || p < 0.20);
    }
  } else {
    card.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  }

  let errDiv = card.querySelector('.validation-errors');
  let warnDiv = card.querySelector('.validation-warnings');

  if (errors.length > 0) {
    if (!errDiv) {
      errDiv = document.createElement('div');
      errDiv.className = 'validation-errors';
      card.appendChild(errDiv);
    }
    errDiv.innerHTML = `<ul>${errors.map(e => `<li>${escapeHtmlSimple(e)}</li>`).join('')}</ul>`;
  } else if (errDiv) {
    errDiv.remove();
  }

  if (warnings.length > 0) {
    if (!warnDiv) {
      warnDiv = document.createElement('div');
      warnDiv.className = 'validation-warnings';
      card.appendChild(warnDiv);
    }
    warnDiv.innerHTML = `<ul>${warnings.map(w => `<li>${escapeHtmlSimple(w)}</li>`).join('')}</ul>`;
  } else if (warnDiv) {
    warnDiv.remove();
  }

  updateSendButtonState();
}

function escapeHtmlSimple(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let draggedListingId = null;
let draggedImageInfo = null;
let idbAvailable = true;

function handleDragStart(e) {
  const imageSlot = e.target.closest('.image-slot.has-image');
  if (imageSlot) {
    const lid = imageSlot.dataset.listingId;
    const idx = parseInt(imageSlot.dataset.imageIndex);
    draggedImageInfo = { listingId: lid, slotIndex: idx };
    imageSlot.classList.add('image-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `image:${lid}:${idx}`);
    return;
  }

  const card = e.target.closest('.listing-card');
  if (!card) return;
  const handle = e.target.closest('.drag-handle');
  if (!handle) {
    e.preventDefault();
    return;
  }
  draggedListingId = card.dataset.listingId;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedListingId);
}

function handleDragOver(e) {
  e.preventDefault();

  if (draggedImageInfo) {
    e.dataTransfer.dropEffect = 'move';
    clearImageDragIndicators();
    const targetSlot = e.target.closest('.image-slot');
    if (targetSlot && targetSlot.dataset.listingId === draggedImageInfo.listingId) {
      targetSlot.classList.add('image-drag-target');
    }
    return;
  }

  const hasFiles = e.dataTransfer.types.includes('Files');
  if (hasFiles && !draggedListingId) {
    e.dataTransfer.dropEffect = 'copy';
    const slotsContainer = e.target.closest('.image-slots');
    const digitalSlot = e.target.closest('[data-drop-zone="digital"]');
    if (slotsContainer) {
      slotsContainer.classList.add('image-drag-over');
    } else if (digitalSlot) {
      digitalSlot.classList.add('digital-drag-over');
    }
    return;
  }

  e.dataTransfer.dropEffect = 'move';
  const card = e.target.closest('.listing-card');
  if (!card || card.dataset.listingId === draggedListingId) return;

  clearDragIndicators();
  const rect = card.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  if (e.clientY < midY) {
    card.classList.add('drag-over-above');
  } else {
    card.classList.add('drag-over-below');
  }
}

function handleDragLeave(e) {
  const card = e.target.closest('.listing-card');
  if (card) {
    card.classList.remove('drag-over-above', 'drag-over-below');
  }
  const slot = e.target.closest('.image-slot');
  if (slot) slot.classList.remove('image-drag-target');
  const slotsContainer = e.target.closest('.image-slots');
  if (slotsContainer && !slotsContainer.contains(e.relatedTarget)) {
    slotsContainer.classList.remove('image-drag-over');
  }
  const digitalSlot = e.target.closest('[data-drop-zone="digital"]');
  if (digitalSlot && !digitalSlot.contains(e.relatedTarget)) {
    digitalSlot.classList.remove('digital-drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();

  if (draggedImageInfo) {
    const targetSlot = e.target.closest('.image-slot');
    if (targetSlot && targetSlot.dataset.listingId === draggedImageInfo.listingId) {
      const toSlot = parseInt(targetSlot.dataset.imageIndex);
      const listing = findListingById(draggedImageInfo.listingId);
      if (listing && toSlot !== draggedImageInfo.slotIndex) {
        pushUndo('reorder images');
        reorderImages(listing, draggedImageInfo.slotIndex, toSlot);
        rerenderCard(listing.id);
        scheduleSave();
      }
    }
    clearImageDragIndicators();
    draggedImageInfo = null;
    return;
  }

  const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0;

  if (hasFiles && !draggedListingId) {
    const digitalSlot = e.target.closest('[data-drop-zone="digital"]');
    if (digitalSlot) {
      digitalSlot.classList.remove('digital-drag-over');
      const lid = digitalSlot.dataset.listingId;
      const listing = findListingById(lid);
      if (listing && idbAvailable) {
        pushUndo('add digital file');
        await processDigitalFile(e.dataTransfer.files[0], listing, {
          onError: (msg) => showToast(msg, 'error'),
          onComplete: () => { rerenderCard(lid); scheduleSave(); }
        });
      }
      return;
    }

    const slotsContainer = e.target.closest('.image-slots');
    if (slotsContainer) {
      slotsContainer.classList.remove('image-drag-over');
      const lid = slotsContainer.dataset.listingId;
      const listing = findListingById(lid);
      if (listing) {
        const targetSlot = e.target.closest('.image-slot');
        const startSlot = targetSlot ? parseInt(targetSlot.dataset.imageIndex) : null;
        pushUndo('add image');
        await processImageFiles(Array.from(e.dataTransfer.files), listing, startSlot, {
          onError: (msg) => showToast(msg, 'error'),
          onComplete: () => { rerenderCard(lid); scheduleSave(); }
        });
      }
      return;
    }
    return;
  }

  const targetCard = e.target.closest('.listing-card');
  if (!targetCard || !draggedListingId) return;

  const targetId = targetCard.dataset.listingId;
  if (targetId === draggedListingId) return;

  const fromIdx = findListingIndex(draggedListingId);
  let toIdx = findListingIndex(targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  const rect = targetCard.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const insertBelow = e.clientY >= midY;

  pushUndo('reorder');
  const [moved] = listings.splice(fromIdx, 1);
  toIdx = findListingIndex(targetId);
  if (insertBelow) toIdx += 1;
  listings.splice(toIdx, 0, moved);

  clearDragIndicators();
  renderFormView();
  updateCounts();
  scheduleSave();
}

function handleDragEnd() {
  draggedListingId = null;
  draggedImageInfo = null;
  clearDragIndicators();
  clearImageDragIndicators();
  els.listingCards.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

function clearDragIndicators() {
  els.listingCards.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
    el.classList.remove('drag-over-above', 'drag-over-below');
  });
}

function clearImageDragIndicators() {
  els.listingCards.querySelectorAll('.image-dragging, .image-drag-target, .image-drag-over').forEach(el => {
    el.classList.remove('image-dragging', 'image-drag-target', 'image-drag-over');
  });
}

function addListing() {
  pushUndo('add listing');
  const blank = createBlankListing();
  listings.push(blank);

  if (currentView === 'form') {
    expandedIds = new Set([blank.id]);
    render();
    const newCard = els.listingCards.querySelector(`[data-listing-id="${blank.id}"]`);
    if (newCard) {
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const titleInput = newCard.querySelector('[data-field="title"]');
      if (titleInput) setTimeout(() => titleInput.focus(), 300);
    }
  } else {
    addGridRow();
    updateCounts();
  }

  scheduleSave();
}

async function removeListing(id) {
  const index = findListingIndex(id);
  if (index === -1) return;
  const listing = listings[index];
  const hasContent = listing.title || listing.description || listing.price;
  if (hasContent && !confirm(`Remove listing #${index + 1}${listing.title ? ' "' + listing.title.substring(0, 40) + '"' : ''}?`)) {
    return;
  }
  pushUndo('remove listing');
  listings.splice(index, 1);
  expandedIds.delete(id);
  await removeAllImages(id);
  render();
  scheduleSave();
}

function toggleCard(id) {
  const card = els.listingCards.querySelector(`[data-listing-id="${id}"]`);
  if (!card) return;
  const isCollapsed = card.classList.contains('collapsed');

  if (isCollapsed) {
    expandedIds.add(id);
    card.classList.remove('collapsed');
    const chevron = card.querySelector('.card-chevron');
    if (chevron) chevron.innerHTML = '&#9660;';
    card.querySelector('.card-body').style.display = '';
    const errDiv = card.querySelector('.validation-errors');
    const warnDiv = card.querySelector('.validation-warnings');
    if (errDiv) errDiv.style.display = '';
    if (warnDiv) warnDiv.style.display = '';
  } else {
    expandedIds.delete(id);
    card.classList.add('collapsed');
    const chevron = card.querySelector('.card-chevron');
    if (chevron) chevron.innerHTML = '&#9654;';
  }
}

async function sendToQueue() {
  if (currentView === 'grid') {
    const updated = getGridListings(listings);
    if (updated.length > 0) listings = updated;
  }

  const selected = listings.filter(l => l._selected);
  const toSend = selected.length > 0 ? selected : listings;

  const invalid = toSend.filter(l => !validateListing(l).valid);
  if (invalid.length > 0) {
    showToast(`${invalid.length} listing(s) have errors — fix them first`, 'error');
    if (currentView === 'form') {
      const firstInvalid = els.listingCards.querySelector(`[data-listing-id="${invalid[0].id}"]`);
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (toSend.length === 0) {
    showToast('No listings to send', 'error');
    return;
  }

  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
    const existingQueue = data[STORAGE_KEYS.QUEUE] || [];

    const queueListings = await Promise.all(toSend.map(async l => {
      const fullImages = idbAvailable ? await getFullResolutionImages(l) : {};
      const entry = {
        ...l,
        ...fullImages,
        id: String(Date.now() + Math.random()),
        price: parseFloat(l.price) || 0,
        status: 'pending',
        selected: true
      };
      for (let i = 1; i <= 5; i++) {
        delete entry[`_image_${i}_ref`];
        delete entry[`_image_${i}_meta`];
      }
      delete entry._digital_file_size;
      Object.keys(entry).forEach(k => {
        if (k.startsWith('_eval_') || k.startsWith('_source_') || k.startsWith('_captured_') || k.startsWith('_import_') || k.startsWith('_product_') || k.startsWith('_feature_') || k.startsWith('_item_')) delete entry[k];
      });
      return entry;
    }));

    const merged = [...existingQueue, ...queueListings];
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: merged });

    try {
      await chrome.runtime.sendMessage({ type: 'EDITOR_QUEUE_UPDATED', count: queueListings.length });
    } catch (e) {}

    showToast(`${queueListings.length} listing(s) sent to queue!`, 'success');
    showClearPrompt();
  } catch (err) {
    showToast('Failed to send to queue: ' + err.message, 'error');
  }
}

function showClearPrompt() {
  const toast = els.toast;
  toast.innerHTML = `
    Sent to queue!
    <button id="clear-editor-btn" style="margin-left:12px;padding:4px 10px;border:1px solid white;background:transparent;color:white;border-radius:4px;cursor:pointer;">Clear Editor</button>
    <button id="keep-editing-btn" style="margin-left:6px;padding:4px 10px;border:none;background:rgba(255,255,255,0.2);color:white;border-radius:4px;cursor:pointer;">Keep Editing</button>
  `;
  toast.className = 'toast success show';

  toast.querySelector('#clear-editor-btn').addEventListener('click', async () => {
    if (idbAvailable) {
      const { clearAllImages } = await import('../services/imageStore.js');
      await clearAllImages();
    }
    listings = [];
    await chrome.storage.local.remove(STORAGE_KEYS.EDITOR_LISTINGS);
    lastSaveTime = null;
    if (currentView === 'grid') destroyGrid();
    render();
    hideToast();
  });

  toast.querySelector('#keep-editing-btn').addEventListener('click', hideToast);

  setTimeout(hideToast, 10000);
}

function hideToast() {
  els.toast.classList.remove('show');
  setTimeout(() => { els.toast.innerHTML = ''; }, 300);
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  await importFile(file);
  e.target.value = '';
}

async function importFile(file) {
  showToast(`Importing ${file.name}...`, 'success');

  try {
    const data = await readSpreadsheetFile(file);
    if (data.length === 0) {
      showToast('No listings found in file', 'error');
      return;
    }

    pushUndo('import');
    const allWarnings = [];
    const imported = [];

    data.forEach((row, index) => {
      const { listing, warnings } = sanitizeListing(row, index + 2);
      allWarnings.push(...warnings);
      if (listing) imported.push(listing);
    });

    if (imported.length === 0) {
      showToast('No valid listings found (title and valid price required)', 'error');
      return;
    }

    listings = [...listings, ...imported];
    render();
    scheduleSave();

    if (allWarnings.length > 0) {
      console.warn(`Import: ${allWarnings.length} warning(s):`, allWarnings);
      showToast(`Imported ${imported.length} listings (${allWarnings.length} warnings)`, 'success');
    } else {
      showToast(`Imported ${imported.length} listings`, 'success');
    }
  } catch (err) {
    showToast('Import failed: ' + err.message, 'error');
  }
}

function updateValidationBadge() {
  if (listings.length === 0) {
    els.validationBadge.style.display = 'none';
    return;
  }
  const { summary } = validateAllListings(listings);
  els.validationBadge.style.display = '';
  els.validationBadge.className = 'validation-summary-badge';
  if (summary.errorListings > 0) {
    els.validationBadge.classList.add('has-errors');
    els.validationBadge.textContent = `${summary.totalErrors} error${summary.totalErrors !== 1 ? 's' : ''}, ${summary.totalWarnings} warning${summary.totalWarnings !== 1 ? 's' : ''}`;
  } else if (summary.warningListings > 0) {
    els.validationBadge.classList.add('has-warnings');
    els.validationBadge.textContent = `${summary.totalWarnings} warning${summary.totalWarnings !== 1 ? 's' : ''}`;
  } else {
    els.validationBadge.classList.add('all-clean');
    els.validationBadge.textContent = 'All clean';
  }
}

function runBatchValidation() {
  if (listings.length === 0) {
    showToast('No listings to validate', 'error');
    return;
  }
  const result = validateAllListings(listings);
  showValidationReport(result);
}

function showValidationReport(result) {
  const { results, summary } = result;

  els.reportSummary.innerHTML = `
    <span class="report-stat"><span class="dot red"></span>${summary.errorListings} with errors</span>
    <span class="report-stat"><span class="dot orange"></span>${summary.warningListings} with warnings</span>
    <span class="report-stat"><span class="dot green"></span>${summary.cleanListings} clean</span>
  `;

  const issueResults = results.filter(r => r.errors.length > 0 || r.warnings.length > 0);
  const cleanResults = results.filter(r => r.errors.length === 0 && r.warnings.length === 0);

  let html = '';
  for (const r of issueResults) {
    const cls = r.errors.length > 0 ? 'has-errors' : 'has-warnings';
    html += `<div class="report-item ${cls}">
      <div class="report-item-header" data-jump-id="${r.listingId}">
        <span><span class="report-item-number">#${r.index + 1}</span>${escapeHtmlSimple(r.listingTitle)}</span>
        <button class="report-item-jump" data-jump-id="${r.listingId}">Go to</button>
      </div>`;
    if (r.errors.length > 0) {
      html += `<ul class="report-item-errors">${r.errors.map(e => `<li>${escapeHtmlSimple(e)}</li>`).join('')}</ul>`;
    }
    if (r.warnings.length > 0) {
      html += `<ul class="report-item-warnings">${r.warnings.map(w => `<li>${escapeHtmlSimple(w)}</li>`).join('')}</ul>`;
    }
    html += '</div>';
  }

  if (cleanResults.length > 0) {
    html += `<div class="report-item is-clean" style="text-align:center;color:#28a745;font-size:13px;padding:12px;">
      ${cleanResults.length} listing${cleanResults.length !== 1 ? 's' : ''} passed all checks
    </div>`;
  }

  els.reportList.innerHTML = html;
  els.validationReport.style.display = '';
  els.validationReportBackdrop.style.display = '';
}

function closeValidationReport() {
  els.validationReport.style.display = 'none';
  els.validationReportBackdrop.style.display = 'none';
}

function jumpToListing(listingId) {
  closeValidationReport();
  if (currentView === 'grid') {
    switchView('form');
  }
  expandedIds.add(listingId);
  renderFormView();

  requestAnimationFrame(() => {
    const card = els.listingCards.querySelector(`[data-listing-id="${listingId}"]`);
    if (!card) return;
    if (card.classList.contains('collapsed')) {
      toggleCard(listingId);
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('report-item-highlight');
    setTimeout(() => card.classList.remove('report-item-highlight'), 1500);
  });
}

function runAutoformatAll() {
  if (listings.length === 0) {
    showToast('No listings to autoformat', 'error');
    return;
  }
  pushUndo('autoformat all');
  listings = listings.map(l => autoformatListing(l));
  render();
  scheduleSave();
  showToast(`Autoformatted ${listings.length} listing(s)`, 'success');
}

function runTitleCaseAll() {
  if (listings.length === 0) {
    showToast('No listings to title case', 'error');
    return;
  }
  pushUndo('title case all');
  listings.forEach(l => {
    if (l.title) l.title = titleCaseTitle(l.title);
  });
  render();
  scheduleSave();
  showToast(`Title-cased ${listings.length} listing(s)`, 'success');
}

function handleFieldBlur(e) {
  const field = e.target.dataset.field;
  const id = e.target.dataset.listingId;
  if (!field || !id) return;
  const listing = findListingById(id);
  if (!listing) return;

  if (field === 'title' && listing.title) {
    const formatted = autoformatTitle(listing.title);
    if (formatted !== listing.title) {
      listing.title = formatted;
      e.target.value = formatted;
      const card = e.target.closest('.listing-card');
      const preview = card.querySelector('.card-title-preview');
      preview.textContent = formatted ? formatted.substring(0, 60) : 'Untitled listing';
      updateCardValidation(id);
      scheduleSave();
    }
  } else if (field === 'description' && listing.description) {
    const formatted = autoformatDescription(listing.description);
    if (formatted !== listing.description) {
      listing.description = formatted;
      e.target.value = formatted;
      updateCardValidation(id);
      scheduleSave();
    }
  }
}

function escapeHtmlTag(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function updateTagSuggestions(listingId) {
  const containers = listingId
    ? [els.listingCards.querySelector(`[data-suggestions-for="${listingId}"]`)]
    : Array.from(els.listingCards.querySelectorAll('.tag-suggestions'));

  for (const container of containers) {
    if (!container) continue;
    const lid = container.dataset.suggestionsFor;
    const listing = findListingById(lid);
    if (!listing) { container.innerHTML = ''; continue; }

    const { sets, recentTags } = getSuggestionsForCategory(listing.category, tagLibrary);
    const existingTags = new Set((listing.tags || []).map(t => t.toLowerCase()));

    let html = '';

    if (sets.length > 0) {
      for (const set of sets.slice(0, 3)) {
        const chips = (set.tags || []).map(tag => {
          const isAdded = existingTags.has(tag.toLowerCase());
          return `<span class="suggestion-chip${isAdded ? ' added' : ''}" data-suggestion-tag="${escapeHtmlTag(tag)}" data-listing-id="${lid}">${escapeHtmlTag(tag)}</span>`;
        }).join('');
        html += `<div class="suggestion-group"><div class="suggestion-group-title">${escapeHtmlTag(set.name)}</div>${chips}</div>`;
      }
    }

    if (recentTags && recentTags.length > 0) {
      const recentChips = recentTags.slice(0, 10).map(tag => {
        const isAdded = existingTags.has(tag.toLowerCase());
        return `<span class="suggestion-chip${isAdded ? ' added' : ''}" data-suggestion-tag="${escapeHtmlTag(tag)}" data-listing-id="${lid}">${escapeHtmlTag(tag)}</span>`;
      }).join('');
      html += `<div class="suggestion-group"><div class="suggestion-group-title">Recent</div>${recentChips}</div>`;
    }

    container.innerHTML = html;
  }
}

function handleSuggestionClick(chip) {
  const tag = chip.dataset.suggestionTag;
  const lid = chip.dataset.listingId;
  const listing = findListingById(lid);
  if (!listing) return;

  if ((listing.tags || []).length >= 13) {
    showToast('Maximum 13 tags allowed', 'error');
    return;
  }
  if ((listing.tags || []).some(t => t.toLowerCase() === tag.toLowerCase())) return;

  pushUndo('add tag from suggestion');
  if (!listing.tags) listing.tags = [];
  listing.tags.push(tag);
  rerenderCard(lid);
  scheduleSave();
}

function showTagLibraryPanel(listingId) {
  tagPanelListingId = listingId;
  const listing = findListingById(listingId);
  if (listing && listings.some(l => l._selected)) {
    els.tagPanelFooter.style.display = '';
  } else {
    els.tagPanelFooter.style.display = 'none';
  }
  els.applyTagsToSelected.checked = false;
  renderTagLibraryContent(listingId);
  handlePanelTabClick('library');
  els.tagLibraryPanel.style.display = '';
  els.tagLibraryBackdrop.style.display = '';
}

function closeTagLibraryPanel() {
  els.tagLibraryPanel.style.display = 'none';
  els.tagLibraryBackdrop.style.display = 'none';
  tagPanelListingId = null;
}

function handlePanelTabClick(tabName) {
  els.tagLibraryPanel.querySelectorAll('.panel-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panelTab === tabName);
  });
  els.tagLibraryContent.style.display = tabName === 'library' ? '' : 'none';
  els.tagImportContent.style.display = tabName === 'import' ? '' : 'none';
  els.tagFrequencyContent.style.display = tabName === 'frequency' ? '' : 'none';

  if (tabName === 'import') renderTagImportContent();
  if (tabName === 'frequency') renderTagFrequencyContent();
}

function renderTagLibraryContent(listingId) {
  const lid = listingId || tagPanelListingId;
  const listing = lid ? findListingById(lid) : null;
  const existingTags = listing ? new Set((listing.tags || []).map(t => t.toLowerCase())) : new Set();

  const categories = Object.entries(tagLibrary);
  if (categories.length === 0) {
    els.tagLibraryContent.innerHTML = '<div class="tag-library-empty">No tag sets saved yet. Capture tags from Etsy listings in the sidepanel.</div>';
    return;
  }

  const internal = listing ? mapFormCategoryToInternal(listing.category) : null;
  const sorted = [...categories].sort((a, b) => {
    if (internal) {
      if (a[0] === internal && b[0] !== internal) return -1;
      if (b[0] === internal && a[0] !== internal) return 1;
    }
    return a[0].localeCompare(b[0]);
  });

  let html = '';
  for (const [category, data] of sorted) {
    if (!data.sets || data.sets.length === 0) continue;
    html += `<div class="tag-set-category">${escapeHtmlTag(category)}${category === internal ? ' (matches listing)' : ''}</div>`;
    for (const set of data.sets) {
      const chips = (set.tags || []).map(tag => {
        const inListing = existingTags.has(tag.toLowerCase());
        return `<span class="tag-set-chip${inListing ? ' in-listing' : ''}" data-lib-tag="${escapeHtmlTag(tag)}">${escapeHtmlTag(tag)}</span>`;
      }).join('');
      html += `<div class="tag-set-card">
        <div class="tag-set-header"><span class="tag-set-name">${escapeHtmlTag(set.name)} (${(set.tags || []).length})</span><button class="tag-set-apply" data-set-id="${set.id}" data-set-category="${escapeHtmlTag(category)}">Apply All</button></div>
        <div class="tag-set-chips">${chips}</div>
      </div>`;
    }
  }

  els.tagLibraryContent.innerHTML = html;
}

function handleLibraryContentClick(e) {
  const applyBtn = e.target.closest('.tag-set-apply');
  if (applyBtn) {
    const setId = applyBtn.dataset.setId;
    const setCat = applyBtn.dataset.setCategory;
    const catData = tagLibrary[setCat];
    if (!catData) return;
    const set = catData.sets.find(s => s.id === setId);
    if (!set) return;
    applyTagsToListings(set.tags);
    return;
  }

  const chip = e.target.closest('.tag-set-chip:not(.in-listing)');
  if (chip) {
    const tag = chip.dataset.libTag;
    applyTagsToListings([tag]);
    return;
  }
}

function applyTagsToListings(tags) {
  const applyToSelected = els.applyTagsToSelected.checked;
  const targetListings = applyToSelected
    ? listings.filter(l => l._selected)
    : (tagPanelListingId ? [findListingById(tagPanelListingId)] : []);

  if (targetListings.length === 0 || !targetListings[0]) return;

  pushUndo('apply tags from library');
  let addedCount = 0;
  for (const listing of targetListings) {
    if (!listing.tags) listing.tags = [];
    for (const tag of tags) {
      if (listing.tags.length >= 13) break;
      if (listing.tags.some(t => t.toLowerCase() === tag.toLowerCase())) continue;
      listing.tags.push(tag);
      addedCount++;
    }
  }

  if (addedCount === 0) {
    showToast('All tags already present', 'error');
    return;
  }

  renderTagLibraryContent();
  if (currentView === 'form') {
    for (const listing of targetListings) rerenderCard(listing.id);
  }
  scheduleSave();
  showToast(`Added ${addedCount} tag(s) to ${targetListings.length} listing(s)`, 'success');
}

function renderTagImportContent() {
  if (els.tagImportContent.querySelector('.import-url-row')) return;
  els.tagImportContent.innerHTML = `
    <div class="import-url-row">
      <input type="text" class="import-url-input" placeholder="https://www.etsy.com/listing/..." id="tag-import-url">
      <button class="import-fetch-btn" id="tag-import-fetch">Fetch</button>
    </div>
    <div class="import-results" id="tag-import-results"></div>
  `;
}

async function handleImportFetch() {
  const urlInput = els.tagImportContent.querySelector('#tag-import-url');
  const resultsDiv = els.tagImportContent.querySelector('#tag-import-results');
  const url = (urlInput.value || '').trim();
  if (!url) { showToast('Enter a URL', 'error'); return; }

  resultsDiv.innerHTML = '<div class="import-spinner">Fetching tags...</div>';
  const fetchBtn = els.tagImportContent.querySelector('#tag-import-fetch');
  fetchBtn.disabled = true;

  const result = await fetchCompetitorTags(url);
  fetchBtn.disabled = false;

  if (result.error) {
    resultsDiv.innerHTML = `<div class="import-spinner">Failed: ${escapeHtmlTag(result.error)}</div>`;
    return;
  }

  if (result.tags.length === 0) {
    resultsDiv.innerHTML = '<div class="import-spinner">No tags found on this page.</div>';
    return;
  }

  const listing = tagPanelListingId ? findListingById(tagPanelListingId) : null;
  const existingTags = listing ? new Set((listing.tags || []).map(t => t.toLowerCase())) : new Set();

  let html = '';
  if (result.title || result.price) {
    html += `<div class="import-listing-info"><strong>${escapeHtmlTag(result.title)}</strong>${result.price ? `$${escapeHtmlTag(result.price)}` : ''}</div>`;
  }

  html += '<div class="import-tag-list">';
  for (const tag of result.tags) {
    const inListing = existingTags.has(tag.toLowerCase());
    html += `<span class="import-tag-chip${inListing ? ' in-listing' : ''}" data-import-tag="${escapeHtmlTag(tag)}">${escapeHtmlTag(tag)}</span>`;
  }
  html += '</div>';
  html += `<div class="import-actions">
    <button class="import-add-selected" id="import-add-selected">Add Selected</button>
    <button class="import-add-all" id="import-add-all">Add All</button>
  </div>`;

  resultsDiv.innerHTML = html;
}

function handleImportContentClick(e) {
  if (e.target.id === 'tag-import-fetch') {
    handleImportFetch();
    return;
  }

  const chip = e.target.closest('.import-tag-chip:not(.in-listing)');
  if (chip) {
    chip.classList.toggle('selected');
    return;
  }

  if (e.target.id === 'import-add-selected') {
    const selected = Array.from(els.tagImportContent.querySelectorAll('.import-tag-chip.selected:not(.in-listing)'))
      .map(c => c.dataset.importTag);
    if (selected.length === 0) { showToast('No tags selected', 'error'); return; }
    applyTagsToListings(selected);
    return;
  }

  if (e.target.id === 'import-add-all') {
    const all = Array.from(els.tagImportContent.querySelectorAll('.import-tag-chip:not(.in-listing)'))
      .map(c => c.dataset.importTag);
    if (all.length === 0) { showToast('All tags already added', 'error'); return; }
    applyTagsToListings(all);
    return;
  }
}

function renderTagFrequencyContent() {
  const freq = getTagFrequency(listings);
  if (freq.length === 0) {
    els.tagFrequencyContent.innerHTML = '<div class="tag-library-empty">No tags in any listing yet.</div>';
    return;
  }

  const maxCount = freq[0].count;
  let html = '';
  for (const { tag, count } of freq) {
    const pct = Math.round((count / maxCount) * 100);
    html += `<div class="freq-row">
      <span class="freq-tag">${escapeHtmlTag(tag)}</span>
      <span class="freq-count">${count}</span>
      <div class="freq-bar-wrap"><div class="freq-bar" style="width:${pct}%"></div></div>
    </div>`;
  }
  els.tagFrequencyContent.innerHTML = html;
}

function addBatchTags() {
  const selected = listings.filter(l => l._selected);
  if (selected.length === 0) {
    showToast('No listings selected', 'error');
    return;
  }
  const input = prompt('Enter tags to add (comma separated):');
  if (!input) return;
  const newTags = input.split(',').map(t => t.trim()).filter(t => t && t.length <= 20);
  if (newTags.length === 0) { showToast('No valid tags entered', 'error'); return; }

  pushUndo('batch add tags');
  let totalAdded = 0;
  for (const listing of selected) {
    if (!listing.tags) listing.tags = [];
    for (const tag of newTags) {
      if (listing.tags.length >= 13) break;
      if (listing.tags.some(t => t.toLowerCase() === tag.toLowerCase())) continue;
      listing.tags.push(tag);
      totalAdded++;
    }
  }

  render();
  scheduleSave();
  showToast(`Added ${totalAdded} tag(s) across ${selected.length} listing(s)`, 'success');
}

function removeBatchTag() {
  const input = prompt('Enter tag to remove from all listings:');
  if (!input) return;
  const target = input.trim().toLowerCase();
  if (!target) return;

  let found = 0;
  for (const listing of listings) {
    if (!listing.tags) continue;
    if (listing.tags.some(t => t.toLowerCase() === target)) found++;
  }

  if (found === 0) {
    showToast(`Tag "${input.trim()}" not found in any listing`, 'error');
    return;
  }

  pushUndo('batch remove tag');
  let removed = 0;
  for (const listing of listings) {
    if (!listing.tags) continue;
    const before = listing.tags.length;
    listing.tags = listing.tags.filter(t => t.toLowerCase() !== target);
    removed += before - listing.tags.length;
  }

  render();
  scheduleSave();
  showToast(`Removed "${input.trim()}" from ${removed} listing(s)`, 'success');
}

function mergeExternalListings(storedListings) {
  if (!Array.isArray(storedListings)) return;
  const currentIds = new Set(listings.map(l => l.id));
  const newListings = storedListings.filter(l => !currentIds.has(l.id));
  if (newListings.length === 0) return;
  listings.push(...newListings);
  render();
  scheduleSave();
  showToast(`Captured listing${newListings.length > 1 ? 's' : ''} added`, 'success');
}

function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEYS.TAG_LIBRARY]) {
      tagLibrary = changes[STORAGE_KEYS.TAG_LIBRARY].newValue || {};
      if (currentView === 'form') updateTagSuggestions();
    }
    if (area === 'local' && changes[STORAGE_KEYS.EDITOR_LISTINGS]) {
      mergeExternalListings(changes[STORAGE_KEYS.EDITOR_LISTINGS].newValue);
    }
  });
}

async function handleAiGenerate(listingId, field, btn) {
  const listing = findListingById(listingId);
  if (!listing) return;

  const available = await getAvailableCredits();
  if (available < 1) {
    showToast('Not enough credits. Buy more from the sidepanel Account tab.', 'error');
    return;
  }

  btn.classList.add('loading');
  btn.textContent = '...';

  try {
    const result = await generateForListing(listing, [field]);
    btn.classList.remove('loading');
    btn.textContent = 'AI \u00b7 1 credit';
    await decrementLocalCredits(1);
    showAiResults(listingId, field, result);
  } catch (err) {
    btn.classList.remove('loading');
    btn.textContent = 'AI \u00b7 1 credit';
    handleAiError(err);
  }
}

function showAiResults(listingId, field, result) {
  aiPanelListingId = listingId;
  aiPanelField = field;

  els.aiLoading.style.display = 'none';
  els.aiError.style.display = 'none';

  const listing = findListingById(listingId);
  const index = findListingIndex(listingId);
  const prefix = listing ? `#${index + 1} ` : '';

  if (field === 'title') {
    els.aiPanelTitle.textContent = `${prefix}AI Titles`;
    const titles = result.titles || [];
    els.aiResults.innerHTML = titles.map((t, i) => `
      <div class="ai-title-option" data-ai-action="apply-title" data-title-index="${i}">
        <div class="ai-title-text">${escapeHtmlSimple(t)}</div>
        <div class="ai-title-meta">${t.length}/140 characters</div>
      </div>
    `).join('') || '<div class="ai-error">No titles generated</div>';
  } else if (field === 'description') {
    els.aiPanelTitle.textContent = `${prefix}AI Description`;
    const desc = result.description || '';
    els.aiResults.innerHTML = `
      <div class="ai-desc-preview">${escapeHtmlSimple(desc)}</div>
      <button class="ai-desc-apply" data-ai-action="apply-description">Use This Description</button>
    `;
  } else if (field === 'tags') {
    els.aiPanelTitle.textContent = `${prefix}AI Tags`;
    const tags = result.tags || [];
    const existingTags = new Set((listing?.tags || []).map(t => t.toLowerCase()));
    els.aiResults.innerHTML = `
      <div class="ai-tag-chips">
        ${tags.map(t => {
          const isExisting = existingTags.has(t.toLowerCase());
          return `<span class="ai-tag-chip${isExisting ? ' existing' : ' selected'}" data-ai-tag="${escapeHtmlSimple(t)}">${escapeHtmlSimple(t)}</span>`;
        }).join('')}
      </div>
      <button class="ai-tags-apply" data-ai-action="apply-tags">Apply Selected Tags</button>
    `;
  }

  els.aiPanel.style.display = '';
  els.aiPanelBackdrop.style.display = '';
}

function handleAiResultsClick(e) {
  const titleOption = e.target.closest('[data-ai-action="apply-title"]');
  if (titleOption) {
    const titleText = titleOption.querySelector('.ai-title-text')?.textContent || '';
    applyAiTitle(titleText);
    return;
  }

  if (e.target.dataset.aiAction === 'apply-description') {
    const preview = els.aiResults.querySelector('.ai-desc-preview');
    if (preview) applyAiDescription(preview.textContent);
    return;
  }

  const tagChip = e.target.closest('.ai-tag-chip:not(.existing)');
  if (tagChip) {
    tagChip.classList.toggle('selected');
    return;
  }

  if (e.target.dataset.aiAction === 'apply-tags') {
    applyAiTags();
    return;
  }
}

function applyAiTitle(title) {
  console.log('[AI] applyAiTitle called, listingId:', aiPanelListingId, 'title:', title);
  if (!aiPanelListingId || !title) return;
  const lid = aiPanelListingId;
  const listing = findListingById(lid);
  if (!listing) { console.warn('[AI] listing not found for id:', lid); return; }
  pushUndo('AI title');
  listing.title = title;
  console.log('[AI] title set, closing panel, rerendering card:', lid);
  closeAiPanel();
  rerenderCard(lid);
  scheduleSave();
}

function applyAiDescription(desc) {
  console.log('[AI] applyAiDescription called, listingId:', aiPanelListingId);
  if (!aiPanelListingId || !desc) return;
  const lid = aiPanelListingId;
  const listing = findListingById(lid);
  if (!listing) { console.warn('[AI] listing not found for id:', lid); return; }
  pushUndo('AI description');
  listing.description = desc;
  console.log('[AI] description set, closing panel, rerendering card:', lid);
  closeAiPanel();
  rerenderCard(lid);
  scheduleSave();
}

function applyAiTags() {
  console.log('[AI] applyAiTags called, listingId:', aiPanelListingId);
  if (!aiPanelListingId) return;
  const lid = aiPanelListingId;
  const listing = findListingById(lid);
  if (!listing) { console.warn('[AI] listing not found for id:', lid); return; }

  const selected = Array.from(els.aiResults.querySelectorAll('.ai-tag-chip.selected:not(.existing)'))
    .map(c => c.dataset.aiTag)
    .filter(Boolean);

  console.log('[AI] selected tags:', selected);
  if (selected.length === 0) {
    showToast('No tags selected', 'error');
    return;
  }

  pushUndo('AI tags');
  if (!listing.tags) listing.tags = [];
  for (const tag of selected) {
    if (listing.tags.length >= 13) break;
    if (listing.tags.some(t => t.toLowerCase() === tag.toLowerCase())) continue;
    listing.tags.push(tag);
  }
  console.log('[AI] tags applied, closing panel, rerendering card:', lid);
  closeAiPanel();
  rerenderCard(lid);
  scheduleSave();
}

function closeAiPanel() {
  els.aiPanel.style.display = 'none';
  els.aiPanelBackdrop.style.display = 'none';
  els.aiResults.innerHTML = '';
  aiPanelListingId = null;
  aiPanelField = null;
}

function handleAiError(err) {
  if (err.error === 'not_authenticated') {
    showToast('Sign in required to use AI generation', 'error');
  } else if (err.error === 'insufficient_credits') {
    showToast(`Not enough credits (${err.creditsRemaining || 0} remaining). Buy more from the sidepanel Account tab.`, 'error');
  } else if (err.error === 'unavailable') {
    showToast('AI service temporarily unavailable', 'error');
  } else {
    showToast(err.message || 'AI generation failed', 'error');
  }
}

function showAiBulkModal() {
  if (listings.length === 0) {
    showToast('No listings to generate for', 'error');
    return;
  }
  els.aiBulkTitles.checked = true;
  els.aiBulkDescriptions.checked = true;
  els.aiBulkTags.checked = true;
  els.aiBulkScope.value = 'all';
  els.aiBulkStyle.value = 'descriptive';
  els.aiBulkProgress.style.display = 'none';
  els.aiBulkStart.style.display = '';
  els.aiBulkCancel.style.display = 'none';
  els.aiBulkStart.disabled = false;
  updateBulkCost();
  els.aiBulkModal.style.display = '';
  els.aiBulkBackdrop.style.display = '';
}

function closeAiBulkModal() {
  els.aiBulkModal.style.display = 'none';
  els.aiBulkBackdrop.style.display = 'none';
  bulkCancelFn = null;
}

function getBulkTargetListings() {
  const scope = els.aiBulkScope.value;
  if (scope === 'selected') return listings.filter(l => l._selected);
  if (scope === 'missing') {
    const fields = [];
    if (els.aiBulkTitles.checked) fields.push('title');
    if (els.aiBulkDescriptions.checked) fields.push('description');
    if (els.aiBulkTags.checked) fields.push('tags');
    return listings.filter(l =>
      fields.some(f => f === 'tags' ? (!l.tags || l.tags.length === 0) : !l[f])
    );
  }
  return [...listings];
}

async function getAvailableCredits() {
  try {
    const stored = await chrome.storage.local.get(['bulklistingpro_credits']);
    return (stored.bulklistingpro_credits && stored.bulklistingpro_credits.available) || 0;
  } catch (e) {
    return 0;
  }
}

async function decrementLocalCredits(amount) {
  const stored = await chrome.storage.local.get(['bulklistingpro_credits']);
  const credits = stored.bulklistingpro_credits || { available: 0, used: 0 };
  credits.available = Math.max(0, credits.available - amount);
  credits.used = (credits.used || 0) + amount;
  await chrome.storage.local.set({ bulklistingpro_credits: credits });
  chrome.runtime.sendMessage({ type: 'CHECK_CREDITS' }).catch(() => {});
}

async function updateBulkCost() {
  const target = getBulkTargetListings();
  const hasFields = els.aiBulkTitles.checked || els.aiBulkDescriptions.checked || els.aiBulkTags.checked;
  const count = hasFields ? target.length : 0;
  els.aiBulkCost.textContent = `Estimated cost: ${count} credit${count !== 1 ? 's' : ''} (${count} listing${count !== 1 ? 's' : ''})`;
  const available = await getAvailableCredits();
  if (count > 0 && count > available) {
    els.aiBulkCreditWarning.textContent = `Not enough credits (${available} available, ${count} needed). Buy more from the sidepanel Account tab.`;
    els.aiBulkCreditWarning.style.display = '';
    els.aiBulkStart.disabled = true;
  } else {
    els.aiBulkCreditWarning.style.display = 'none';
    els.aiBulkStart.disabled = false;
  }
}

async function startBulkGenerate() {
  const fields = [];
  if (els.aiBulkTitles.checked) fields.push('title');
  if (els.aiBulkDescriptions.checked) fields.push('description');
  if (els.aiBulkTags.checked) fields.push('tags');

  if (fields.length === 0) {
    showToast('Select at least one field', 'error');
    return;
  }

  const target = getBulkTargetListings();
  if (target.length === 0) {
    showToast('No listings match the selected scope', 'error');
    return;
  }

  pushUndo('AI bulk generate');

  els.aiBulkStart.style.display = 'none';
  els.aiBulkCancel.style.display = '';
  els.aiBulkProgress.style.display = '';
  els.aiProgressFill.style.width = '0%';
  els.aiProgressText.textContent = `0 / ${target.length}`;

  const style = els.aiBulkStyle.value;
  let applied = 0;
  let failed = 0;

  const results = await bulkGenerate(target, fields, { style }, (progress) => {
    if (progress.cancel) bulkCancelFn = progress.cancel;
    const pct = Math.round((progress.current / progress.total) * 100);
    els.aiProgressFill.style.width = `${pct}%`;
    els.aiProgressText.textContent = `${progress.current} / ${progress.total}`;
  });

  for (const r of results) {
    if (!r.success) { failed++; continue; }
    const listing = findListingById(r.listingId);
    if (!listing) continue;

    const scope = els.aiBulkScope.value;
    if (r.result.titles && r.result.titles.length > 0 && fields.includes('title')) {
      if (scope === 'missing' ? !listing.title : true) {
        listing.title = r.result.titles[0];
      }
    }
    if (r.result.description && fields.includes('description')) {
      if (scope === 'missing' ? !listing.description : true) {
        listing.description = r.result.description;
      }
    }
    if (r.result.tags && r.result.tags.length > 0 && fields.includes('tags')) {
      if (scope === 'missing' ? (!listing.tags || listing.tags.length === 0) : true) {
        if (!listing.tags) listing.tags = [];
        for (const tag of r.result.tags) {
          if (listing.tags.length >= 13) break;
          if (listing.tags.some(t => t.toLowerCase() === tag.toLowerCase())) continue;
          listing.tags.push(tag);
        }
      }
    }
    applied++;
  }

  render();
  scheduleSave();
  closeAiBulkModal();
  bulkCancelFn = null;

  if (applied > 0) await decrementLocalCredits(applied);

  const creditsFailed = results.some(r => !r.success && r.error && r.error.error === 'insufficient_credits');
  if (creditsFailed) {
    showToast(`Generated for ${applied} listing(s) — ran out of credits. Buy more from the sidepanel Account tab.`, 'error');
  } else if (failed > 0) {
    showToast(`Generated for ${applied} listing(s), ${failed} failed`, applied > 0 ? 'success' : 'error');
  } else {
    showToast(`Generated content for ${applied} listing(s)`, 'success');
  }
}

function cancelBulkGenerate() {
  if (bulkCancelFn) bulkCancelFn();
}

async function handleEvaluateListing(lid, btn) {
  const listing = findListingById(lid);
  if (!listing) return;

  const available = await getAvailableCredits();
  if (available < 2) {
    showToast('Not enough credits (2 needed). Buy more from the sidepanel Account tab.', 'error');
    return;
  }

  btn.classList.add('loading');
  btn.textContent = '...';

  try {
    const result = await evaluateListing(listing);
    btn.classList.remove('loading');
    btn.textContent = 'Evaluate (2 credits)';
    await decrementLocalCredits(2);

    if (result.title) listing._eval_title = result.title;
    if (result.description) listing._eval_description = result.description;
    if (result.tags) listing._eval_tags = result.tags;
    if (result.price) listing._eval_price = result.price;
    if (result.images) listing._eval_images = result.images;
    listing._eval_timestamp = Date.now();

    rerenderCard(lid);
    scheduleSave();
    showToast('Listing evaluated', 'success');
  } catch (err) {
    btn.classList.remove('loading');
    btn.textContent = 'Evaluate (2 credits)';
    handleAiError(err);
  }
}

function applyEvalTagSwap(el) {
  const lid = el.dataset.listingId;
  const listing = findListingById(lid);
  if (!listing) return;
  const oldTag = el.dataset.oldTag;
  const newTag = el.dataset.newTag;
  if (!oldTag || !newTag) return;

  const tagIndex = (listing.tags || []).findIndex(t => t.toLowerCase() === oldTag.toLowerCase());
  if (tagIndex === -1) return;

  pushUndo('swap eval tag');
  listing.tags[tagIndex] = newTag;

  if (listing._eval_tags) {
    const evalTag = listing._eval_tags.find(t => t.tag.toLowerCase() === oldTag.toLowerCase());
    if (evalTag) {
      evalTag.tag = newTag;
      evalTag.replacement = null;
      evalTag.score = 8;
      evalTag.reason = 'Replaced per recommendation';
    }
  }

  rerenderCard(lid);
  scheduleSave();
  showToast(`Swapped "${oldTag}" → "${newTag}"`, 'success');
}

function showEvalBulkModal() {
  if (listings.length === 0) {
    showToast('No listings to evaluate', 'error');
    return;
  }
  els.evalBulkScope.value = 'all';
  els.evalBulkProgress.style.display = 'none';
  els.evalBulkStart.style.display = '';
  els.evalBulkCancel.style.display = 'none';
  els.evalBulkStart.disabled = false;
  updateEvalBulkCost();
  els.evalBulkModal.style.display = '';
  els.evalBulkBackdrop.style.display = '';
}

function closeEvalBulkModal() {
  els.evalBulkModal.style.display = 'none';
  els.evalBulkBackdrop.style.display = 'none';
  evalBulkCancelFn = null;
}

function getEvalBulkTargetListings() {
  const scope = els.evalBulkScope.value;
  if (scope === 'selected') return listings.filter(l => l._selected);
  if (scope === 'unevaluated') return listings.filter(l => !l._eval_timestamp);
  return [...listings];
}

async function updateEvalBulkCost() {
  const target = getEvalBulkTargetListings();
  const count = target.length;
  const cost = count * 2;
  els.evalBulkCost.textContent = `Estimated cost: ${cost} credit${cost !== 1 ? 's' : ''} (${count} listing${count !== 1 ? 's' : ''} x 2 credits)`;
  const available = await getAvailableCredits();
  if (cost > 0 && cost > available) {
    els.evalBulkCreditWarning.textContent = `Not enough credits (${available} available, ${cost} needed). Buy more from the sidepanel Account tab.`;
    els.evalBulkCreditWarning.style.display = '';
    els.evalBulkStart.disabled = true;
  } else {
    els.evalBulkCreditWarning.style.display = 'none';
    els.evalBulkStart.disabled = false;
  }
}

async function startBulkEvaluate() {
  const target = getEvalBulkTargetListings();
  if (target.length === 0) {
    showToast('No listings match the selected scope', 'error');
    return;
  }

  pushUndo('bulk evaluate');

  els.evalBulkStart.style.display = 'none';
  els.evalBulkCancel.style.display = '';
  els.evalBulkProgress.style.display = '';
  els.evalProgressFill.style.width = '0%';
  els.evalProgressText.textContent = `0 / ${target.length}`;

  let applied = 0;
  let failed = 0;

  const results = await bulkEvaluate(target, (progress) => {
    if (progress.cancel) evalBulkCancelFn = progress.cancel;
    const pct = Math.round((progress.current / progress.total) * 100);
    els.evalProgressFill.style.width = `${pct}%`;
    els.evalProgressText.textContent = `${progress.current} / ${progress.total}`;
  });

  for (const r of results) {
    if (!r.success) { failed++; continue; }
    const listing = findListingById(r.listingId);
    if (!listing) continue;

    if (r.result.title) listing._eval_title = r.result.title;
    if (r.result.description) listing._eval_description = r.result.description;
    if (r.result.tags) listing._eval_tags = r.result.tags;
    if (r.result.price) listing._eval_price = r.result.price;
    if (r.result.images) listing._eval_images = r.result.images;
    listing._eval_timestamp = Date.now();
    applied++;
  }

  render();
  scheduleSave();
  closeEvalBulkModal();
  evalBulkCancelFn = null;

  if (applied > 0) await decrementLocalCredits(applied * 2);

  const creditsFailed = results.some(r => !r.success && r.error && r.error.error === 'insufficient_credits');
  if (creditsFailed) {
    showToast(`Evaluated ${applied} listing(s) — ran out of credits. Buy more from the sidepanel Account tab.`, 'error');
  } else if (failed > 0) {
    showToast(`Evaluated ${applied} listing(s), ${failed} failed`, applied > 0 ? 'success' : 'error');
  } else {
    showToast(`Evaluated ${applied} listing(s)`, 'success');
  }
}

function cancelBulkEvaluate() {
  if (evalBulkCancelFn) evalBulkCancelFn();
}

function clampTooltipPosition(e) {
  const chip = e.target.closest('.eval-score-chip, .tag-chip');
  if (!chip) return;
  const tooltip = chip.querySelector('.eval-tooltip, .tag-eval-tooltip');
  if (!tooltip) return;
  tooltip.style.left = '';
  tooltip.style.right = '';
  tooltip.style.transform = '';
  requestAnimationFrame(() => {
    const rect = tooltip.getBoundingClientRect();
    if (rect.left < 4) {
      tooltip.style.left = '0';
      tooltip.style.transform = 'none';
    } else if (rect.right > window.innerWidth - 4) {
      tooltip.style.left = 'auto';
      tooltip.style.right = '0';
      tooltip.style.transform = 'none';
    }
  });
}

function showToast(message, type = 'success') {
  els.toast.textContent = message;
  els.toast.className = `toast ${type} show`;
  setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3000);
}

function showImportFromUrlModal() {
  let modal = document.getElementById('import-url-modal');
  if (modal) { modal.style.display = 'flex'; return; }

  modal = document.createElement('div');
  modal.id = 'import-url-modal';
  Object.assign(modal.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:'5000' });
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.2);width:440px;max-width:90vw;animation:fadeIn 0.2s ease-out">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:2px solid #F56400">
        <h3 style="margin:0;font-size:18px;color:#333">Import from URL</h3>
        <button class="modal-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999">&times;</button>
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 8px;color:#888;font-size:13px">Paste one or more listing URLs (one per line). Supports Etsy, eBay, and Amazon.</p>
        <textarea id="import-url-input" rows="4" placeholder="https://www.etsy.com/listing/123456789/...&#10;https://www.ebay.com/itm/315380320340...&#10;https://www.amazon.com/dp/B08ZK5C4LS..."
          style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;background:#fafafa;color:#333;font-size:13px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
        <p id="import-url-status" style="margin-top:8px;font-size:13px;color:#888;display:none"></p>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #eee">
        <button class="btn btn-secondary import-url-cancel">Cancel</button>
        <button class="btn btn-primary import-url-go">Import</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.style.display = 'none');
  modal.querySelector('.import-url-cancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  const input = modal.querySelector('#import-url-input');
  const status = modal.querySelector('#import-url-status');
  const goBtn = modal.querySelector('.import-url-go');

  goBtn.addEventListener('click', async () => {
    const urls = input.value.trim().split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) { showToast('Enter at least one URL', 'error'); return; }

    const isSupportedUrl = u => u.includes('etsy.com/listing/') || u.includes('ebay.com/itm/') || u.includes('amazon.com/');
    const invalidUrls = urls.filter(u => !isSupportedUrl(u));
    if (invalidUrls.length > 0) {
      showToast('Only Etsy, eBay, and Amazon listing URLs are supported', 'error');
      return;
    }

    goBtn.disabled = true;
    goBtn.textContent = 'Importing...';
    status.style.display = 'block';
    status.textContent = `Importing 0/${urls.length}...`;

    let imported = 0;
    pushUndo('import from URL');

    for (let i = 0; i < urls.length; i++) {
      status.textContent = `Importing ${i + 1}/${urls.length}...`;
      const result = await importListingFromUrl(urls[i]);

      if (result.error) {
        showToast(`Failed: ${result.error}`, 'error');
        continue;
      }

      const listing = createBlankListing();
      listing.title = result.title || '';
      listing.price = result.price || '';
      listing.tags = result.tags || [];
      for (let j = 0; j < Math.min((result.images || []).length, 10); j++) {
        listing[`image_${j + 1}`] = result.images[j];
      }

      let desc = result.description || '';
      if (result.itemSpecifics && Object.keys(result.itemSpecifics).length > 0) {
        const specsText = Object.entries(result.itemSpecifics).map(([k, v]) => `${k}: ${v}`).join('\n');
        desc = desc ? desc + '\n\n--- Item Specifics ---\n' + specsText : specsText;
      }
      if (result.condition) {
        desc = desc ? `Condition: ${result.condition}\n\n${desc}` : `Condition: ${result.condition}`;
      }
      if (result.productDetails && Object.keys(result.productDetails).length > 0) {
        const detailsText = Object.entries(result.productDetails).map(([k, v]) => `${k}: ${v}`).join('\n');
        desc = desc ? desc + '\n\n--- Product Details ---\n' + detailsText : detailsText;
      }
      listing.description = desc;

      if (result.source) listing._import_source = result.source;
      listings.push(listing);
      imported++;
    }

    goBtn.disabled = false;
    goBtn.textContent = 'Import';
    input.value = '';
    status.style.display = 'none';

    if (imported > 0) {
      const last = listings[listings.length - 1];
      expandedIds = new Set([last.id]);
      render();
      scheduleSave();
      modal.style.display = 'none';
      showToast(`Imported ${imported} listing${imported > 1 ? 's' : ''}`, 'success');
    }
  });
}
