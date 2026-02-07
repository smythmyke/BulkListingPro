import { CATEGORIES } from '../../services/listingUtils.js';

let gridInstance = null;
let onChangeCallback = null;
let suppressEvents = false;

const WHO_MADE_OPTIONS = ['i_did', 'member', 'another'];
const WHO_MADE_LABELS = { i_did: 'I did', member: 'A member of my shop', another: 'Another company or person' };
const WHAT_IS_IT_OPTIONS = ['finished_product', 'supply'];
const WHAT_IS_IT_LABELS = { finished_product: 'A finished product', supply: 'A supply or tool to make things' };
const AI_CONTENT_OPTIONS = ['original', 'ai_gen'];
const AI_CONTENT_LABELS = { original: 'Created by me', ai_gen: 'With an AI generator' };
const WHEN_MADE_OPTIONS = ['made_to_order', '2020_2026', '2010_2019', '2007_2009', 'before_2007'];
const WHEN_MADE_LABELS = { made_to_order: 'Made to order', '2020_2026': '2020 - 2026', '2010_2019': '2010 - 2019', '2007_2009': '2007 - 2009', before_2007: 'Before 2007' };
const RENEWAL_OPTIONS = ['automatic', 'manual'];
const RENEWAL_LABELS = { automatic: 'Automatic', manual: 'Manual' };
const STATE_OPTIONS = ['draft', 'active'];
const STATE_LABELS = { draft: 'Draft', active: 'Published' };

const COLUMN_TOOLTIPS = [
  'Select rows for batch actions',
  'Listing title (required, max 140 chars)',
  'Listing description (required)',
  'Price in USD (min $0.20)',
  'Product category',
  'Comma-separated tags (max 13, each max 20 chars)',
  'Who made this item',
  'Product or supply',
  'Original or AI-generated content',
  'When the item was made',
  'Auto or manual renewal ($0.20/renewal)',
  'Draft or published',
  'Comma-separated materials',
  'Available quantity',
  'Stock keeping unit (optional)',
  'Click to add images (0/5 to 5/5)',
];

const COLUMNS = [
  { type: 'checkbox', title: 'Sel', width: 40, name: '_selected' },
  { type: 'text', title: 'Title', width: 250, name: 'title', wordWrap: true },
  { type: 'text', title: 'Description', width: 300, name: 'description', wordWrap: true },
  { type: 'numeric', title: 'Price ($)', width: 80, name: 'price', mask: '#,##0.00', decimal: '.' },
  { type: 'dropdown', title: 'Category', width: 180, name: 'category', source: CATEGORIES },
  { type: 'text', title: 'Tags (comma sep)', width: 250, name: 'tags' },
  { type: 'dropdown', title: 'Who Made', width: 150, name: 'who_made', source: WHO_MADE_OPTIONS },
  { type: 'dropdown', title: 'What Is It', width: 150, name: 'what_is_it', source: WHAT_IS_IT_OPTIONS },
  { type: 'dropdown', title: 'AI Content', width: 130, name: 'ai_content', source: AI_CONTENT_OPTIONS },
  { type: 'dropdown', title: 'When Made', width: 130, name: 'when_made', source: WHEN_MADE_OPTIONS },
  { type: 'dropdown', title: 'Renewal', width: 100, name: 'renewal', source: RENEWAL_OPTIONS },
  { type: 'dropdown', title: 'State', width: 100, name: 'listing_state', source: STATE_OPTIONS },
  { type: 'text', title: 'Materials', width: 180, name: 'materials' },
  { type: 'numeric', title: 'Qty', width: 60, name: 'quantity' },
  { type: 'text', title: 'SKU', width: 100, name: 'sku' },
  { type: 'text', title: 'Imgs', width: 55, name: '_images', readOnly: true },
];

export const IMAGES_COL = COLUMNS.length - 1;

function countImages(listing) {
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    if (listing[`image_${i}`]) count++;
  }
  return count;
}

function listingsToRows(listings) {
  return listings.map(l => [
    l._selected ? true : false,
    l.title || '',
    l.description || '',
    l.price || '',
    l.category || '',
    (l.tags || []).join(', '),
    l.who_made || 'i_did',
    l.what_is_it || 'finished_product',
    l.ai_content || 'original',
    l.when_made || 'made_to_order',
    l.renewal || 'automatic',
    l.listing_state || 'draft',
    (l.materials || []).join(', '),
    l.quantity || 999,
    l.sku || '',
    `${countImages(l)}/5`
  ]);
}

function rowToListingUpdate(rowData) {
  return {
    _selected: rowData[0] === true || rowData[0] === 'true',
    title: rowData[1] || '',
    description: rowData[2] || '',
    price: parseFloat(rowData[3]) || '',
    category: rowData[4] || 'Digital Prints',
    tags: (rowData[5] || '').split(',').map(t => t.trim()).filter(t => t).slice(0, 13),
    who_made: rowData[6] || 'i_did',
    what_is_it: rowData[7] || 'finished_product',
    ai_content: rowData[8] || 'original',
    when_made: rowData[9] || 'made_to_order',
    renewal: rowData[10] || 'automatic',
    listing_state: rowData[11] || 'draft',
    materials: (rowData[12] || '').split(',').map(m => m.trim()).filter(m => m),
    quantity: parseInt(rowData[13]) || 999,
    sku: rowData[14] || ''
  };
}

export function initGrid(container, listings, onChange) {
  onChangeCallback = onChange;
  destroyGrid();

  const data = listingsToRows(listings);
  if (data.length === 0) {
    data.push(Array(COLUMNS.length).fill(''));
  }

  gridInstance = jspreadsheet(container, {
    data: data,
    columns: COLUMNS,
    defaultColWidth: 120,
    tableOverflow: true,
    tableWidth: '100%',
    tableHeight: '100%',
    freezeColumns: 2,
    allowInsertRow: true,
    allowManualInsertRow: true,
    allowDeleteRow: true,
    allowInsertColumn: false,
    allowDeleteColumn: false,
    columnSorting: false,
    contextMenu: contextMenuHandler,
    onchange: handleCellChange,
    oninsertrow: handleRowInsert,
    ondeleterow: handleRowDelete,
    onpaste: handlePaste,
    style: {},
    nestedHeaders: null,
    minDimensions: [COLUMNS.length, 50],
  });

  applyHeaderTooltips(container);
  setupImageColumnClick(container);
  return gridInstance;
}

export function destroyGrid() {
  if (gridInstance) {
    try {
      const el = gridInstance.el || gridInstance.element;
      if (el && typeof jspreadsheet.destroy === 'function') {
        jspreadsheet.destroy(el);
      }
    } catch (e) {
      console.warn('Grid destroy error:', e);
    }
    gridInstance = null;
  }
  const container = document.getElementById('grid-container');
  if (container) container.innerHTML = '';
}

export function refreshGridData(listings) {
  if (!gridInstance) return;
  suppressEvents = true;
  const data = listingsToRows(listings);
  gridInstance.setData(data.length > 0 ? data : [Array(COLUMNS.length).fill('')]);
  suppressEvents = false;
}

export function getGridListings(existingListings) {
  if (!gridInstance) return existingListings;
  const data = gridInstance.getData();
  return data.map((row, i) => {
    const update = rowToListingUpdate(row);
    const existing = existingListings[i] || {};
    return { ...existing, ...update };
  }).filter(l => l.title || l.description || l.price);
}

export function addGridRow() {
  if (!gridInstance) return;
  gridInstance.insertRow();
}

export function deleteGridRows(rowIndices) {
  if (!gridInstance || rowIndices.length === 0) return;
  const sorted = [...rowIndices].sort((a, b) => b - a);
  sorted.forEach(i => gridInstance.deleteRow(i));
}

function setupImageColumnClick(container) {
  container.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    const tr = td.parentElement;
    const tbody = tr.closest('tbody');
    if (!tbody) return;
    const colIndex = td.cellIndex - 1;
    if (colIndex !== IMAGES_COL) return;
    const rowIndex = Array.from(tbody.children).indexOf(tr);
    if (rowIndex < 0 || !onChangeCallback) return;
    onChangeCallback('imageClick', { y: rowIndex });
  });
}

export function updateCell(col, row, value) {
  if (!gridInstance) return;
  suppressEvents = true;
  gridInstance.setValueFromCoords(col, row, value);
  suppressEvents = false;
}

function applyHeaderTooltips(container) {
  const headerCells = container.querySelectorAll('thead td');
  headerCells.forEach((td, i) => {
    if (COLUMN_TOOLTIPS[i]) {
      td.title = COLUMN_TOOLTIPS[i];
    }
  });
}

function handleCellChange(instance, cell, x, y, value) {
  if (suppressEvents || !onChangeCallback) return;
  onChangeCallback('cell', { x: parseInt(x), y: parseInt(y), value });
}

function handleRowInsert(instance, rowNumber, numRows) {
  if (suppressEvents || !onChangeCallback) return;
  onChangeCallback('insertRow', { rowNumber, numRows });
}

function handleRowDelete(instance, rowNumber, numRows) {
  if (suppressEvents || !onChangeCallback) return;
  onChangeCallback('deleteRow', { rowNumber, numRows });
}

function handlePaste(instance, data) {
  if (suppressEvents || !onChangeCallback) return;
  setTimeout(() => onChangeCallback('paste', {}), 50);
}

function contextMenuHandler(instance, x, y, e, items) {
  const custom = [];

  if (y !== null && y !== undefined) {
    custom.push({
      title: 'Insert row above',
      onclick: function () { instance.insertRow(1, y, true); }
    });
    custom.push({
      title: 'Insert row below',
      onclick: function () { instance.insertRow(1, y); }
    });
    custom.push({
      title: 'Duplicate row',
      onclick: function () {
        const data = instance.getRowData(y);
        instance.insertRow(1, y);
        const newRow = parseInt(y) + 1;
        data.forEach((val, col) => {
          instance.setValueFromCoords(col, newRow, val);
        });
      }
    });
    custom.push({ type: 'line' });
    custom.push({
      title: 'Delete row',
      onclick: function () { instance.deleteRow(y); }
    });
  }

  return custom;
}
