import { STORAGE_KEYS, CATEGORIES, CATEGORY_ATTRIBUTES, sanitizeListing, readSpreadsheetFile } from '../services/listingUtils.js';
import { renderListingCard, renderAllCards, createBlankListing } from './components/form-view.js';
import { validateListing, formatPrice, validateTag } from './components/validator.js';
import { initGrid, destroyGrid, refreshGridData, getGridListings, addGridRow, deleteGridRows } from './components/grid-view.js';

let listings = [];
let expandedIds = new Set();
let saveTimeout = null;
let lastSaveTime = null;
let currentView = 'form';
let formScrollPos = 0;
let gridScrollPos = 0;

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
  redoBtn: document.getElementById('redo-btn')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSavedState();
  populateCategoryFilter();
  render();
  setupEventListeners();
  setupTabTracking();
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
}

function renderFormView() {
  const filtered = getFilteredListings();
  renderAllCards(filtered, els.listingCards, expandedIds.size > 0 ? expandedIds : null);
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
  els.undoBtn.addEventListener('click', undo);
  els.redoBtn.addEventListener('click', redo);

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

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });
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
      const fields = ['_selected', 'title', 'description', 'price', 'category', 'tags', 'who_made', 'what_is_it', 'ai_content', 'when_made', 'renewal', 'listing_state', 'materials', 'quantity', 'sku'];
      const field = fields[x];
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

function deleteSelected() {
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
      const lines = e.target.value ? e.target.value.split('\n').length : 0;
      descCounter.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    }
  } else if (field === 'price') {
    listing.price = e.target.value;
  } else if (field === 'materials') {
    listing.materials = e.target.value.split(',').map(m => m.trim()).filter(m => m);
  } else if (field === 'quantity') {
    listing.quantity = parseInt(e.target.value) || 999;
  } else if (field === 'sku') {
    listing.sku = e.target.value;
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
  if (header && !e.target.closest('.card-remove') && !e.target.closest('.card-select')) {
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
  if (imageSlot && !imageSlot.classList.contains('has-image')) {
    handleImageSlotClick(imageSlot);
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

function handleImageSlotChange(input) {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const id = input.dataset.listingId;
  const idx = input.dataset.imageIndex;
  const listing = findListingById(id);
  if (!listing) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    listing[`image_${idx}`] = e.target.result;
    rerenderCard(id);
    scheduleSave();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function handleImageRemove(btn) {
  const id = btn.dataset.listingId;
  const idx = btn.dataset.imageIndex;
  const listing = findListingById(id);
  if (!listing) return;
  listing[`image_${idx}`] = '';
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

function handleDigitalFileChange(input) {
  const file = input.files[0];
  if (!file) return;
  const id = input.dataset.listingId;
  const listing = findListingById(id);
  if (!listing) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    listing.digital_file_1 = e.target.result;
    listing._digital_file_name = file.name;
    rerenderCard(id);
    scheduleSave();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function handleDigitalFileRemove(btn) {
  const id = btn.dataset.listingId;
  const listing = findListingById(id);
  if (!listing) return;
  listing.digital_file_1 = '';
  listing._digital_file_name = '';
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

function removeListing(id) {
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

  const invalid = listings.filter(l => !validateListing(l).valid);
  if (invalid.length > 0) {
    showToast(`${invalid.length} listing(s) have errors — fix them first`, 'error');
    if (currentView === 'form') {
      const firstInvalid = els.listingCards.querySelector(`[data-listing-id="${invalid[0].id}"]`);
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (listings.length === 0) {
    showToast('No listings to send', 'error');
    return;
  }

  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
    const existingQueue = data[STORAGE_KEYS.QUEUE] || [];

    const queueListings = listings.map(l => ({
      ...l,
      id: String(Date.now() + Math.random()),
      price: parseFloat(l.price) || 0,
      status: 'pending',
      selected: true
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

function showToast(message, type = 'success') {
  els.toast.textContent = message;
  els.toast.className = `toast ${type} show`;
  setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3000);
}
