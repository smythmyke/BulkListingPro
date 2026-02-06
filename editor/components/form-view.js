import { CATEGORIES, CATEGORY_ATTRIBUTES } from '../../services/listingUtils.js';
import { validateListing, getCharCountClass } from './validator.js';

let _idCounter = 0;

export function createBlankListing() {
  _idCounter++;
  return {
    id: `editor_${Date.now()}_${_idCounter}`,
    title: '',
    description: '',
    price: '',
    category: 'Digital Prints',
    tags: [],
    who_made: 'i_did',
    what_is_it: 'finished_product',
    ai_content: 'original',
    when_made: 'made_to_order',
    renewal: 'automatic',
    listing_state: 'draft',
    materials: [],
    quantity: 999,
    sku: '',
    status: 'pending',
    selected: true
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function categoryOptions(selected) {
  return CATEGORIES.map(cat => {
    const sel = cat === selected ? 'selected' : '';
    return `<option value="${escapeHtml(cat)}" ${sel}>${escapeHtml(cat)}</option>`;
  }).join('');
}

function craftTypeVisible(category) {
  return CATEGORY_ATTRIBUTES[category]?.craft_type ? '' : 'style="display:none"';
}

function craftTypeOptions(selected) {
  const opts = ['Scrapbooking', 'Card making & stationery', 'Collage', "Kids' crafts"];
  return opts.map(o => `<option value="${escapeHtml(o)}" ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
}

function selectOption(options, selected) {
  return options.map(([value, label]) => {
    const sel = value === selected ? 'selected' : '';
    return `<option value="${value}" ${sel}>${label}</option>`;
  }).join('');
}

function renderTagChips(tags) {
  if (!tags || tags.length === 0) return '';
  return tags.map((tag, i) => `<span class="tag-chip" data-tag-index="${i}">${escapeHtml(tag)} <button class="tag-remove" data-tag-index="${i}">&times;</button></span>`).join('');
}

function renderImageSlots(listing) {
  const slots = [];
  for (let i = 1; i <= 5; i++) {
    const key = `image_${i}`;
    const value = listing[key] || '';
    const hasImage = value && (value.startsWith('data:') || value.startsWith('http'));
    slots.push(`
      <div class="image-slot${hasImage ? ' has-image' : ''}" data-image-index="${i}" data-listing-id="${listing.id}">
        ${hasImage
          ? `<img src="${escapeHtml(value)}" alt="Image ${i}"><button class="image-slot-remove" data-image-index="${i}" data-listing-id="${listing.id}">&times;</button>`
          : `<span class="image-slot-placeholder">${i}</span>`
        }
        <input type="file" class="image-slot-input" data-image-index="${i}" data-listing-id="${listing.id}" accept="image/*" hidden>
      </div>
    `);
  }
  return slots.join('');
}

function renderDigitalFileSlot(listing) {
  const value = listing.digital_file_1 || '';
  const hasFile = !!value;
  const fileName = listing._digital_file_name || (hasFile ? 'Digital file attached' : '');
  return `
    <div class="digital-file-slot${hasFile ? ' has-file' : ''}" data-listing-id="${listing.id}">
      ${hasFile
        ? `<span class="digital-file-name">${escapeHtml(fileName)}</span><button class="digital-file-remove" data-listing-id="${listing.id}">&times;</button>`
        : `<button class="btn btn-small digital-file-browse" data-listing-id="${listing.id}">Choose File</button><span class="digital-file-hint">Optional digital download file</span>`
      }
      <input type="file" class="digital-file-input" data-listing-id="${listing.id}" hidden>
    </div>
  `;
}

function descLineCount(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

export function renderListingCard(listing, index, collapsed = false) {
  const { valid, errors, warnings } = validateListing(listing);
  let badgeClass = 'empty';
  if (listing.title || listing.description || listing.price) {
    badgeClass = valid ? 'valid' : (errors.length > 0 ? 'error' : 'warning');
  }

  const titlePreview = listing.title
    ? escapeHtml(listing.title.substring(0, 60))
    : 'Untitled listing';
  const titleClass = listing.title ? '' : 'empty';
  const titleLen = (listing.title || '').length;
  const titleCountClass = getCharCountClass(titleLen, 140, 120);

  const cardBorderClass = errors.length > 0 ? 'has-errors' : (warnings.length > 0 ? 'has-warnings' : (valid && listing.title ? 'is-valid' : ''));

  const tagsCount = (listing.tags || []).length;

  let validationHtml = '';
  if (errors.length > 0) {
    validationHtml += `<div class="validation-errors"><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
  }
  if (warnings.length > 0) {
    validationHtml += `<div class="validation-warnings"><ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>`;
  }

  const collapsedClass = collapsed ? ' collapsed' : '';

  return `
    <div class="listing-card ${cardBorderClass}${collapsedClass}" data-listing-id="${listing.id}" data-index="${index}">
      <div class="card-header" data-action="toggle" data-listing-id="${listing.id}">
        <input type="checkbox" class="card-select" data-listing-id="${listing.id}" ${listing._selected ? 'checked' : ''}>
        <span class="card-chevron">${collapsed ? '&#9654;' : '&#9660;'}</span>
        <span class="card-number">#${index + 1}</span>
        <span class="card-title-preview ${titleClass}">${titlePreview}</span>
        <span class="validation-badge ${badgeClass}"></span>
        <button class="card-remove" data-action="remove" data-listing-id="${listing.id}">&times;</button>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" data-field="title" data-listing-id="${listing.id}" value="${escapeHtml(listing.title)}" maxlength="140" placeholder="Listing title (required)" class="${!listing.title && (listing.description || listing.price) ? 'field-error' : ''}">
          <div class="char-counter ${titleCountClass}">${titleLen}/140</div>
        </div>
        <div class="form-group">
          <label>Description <span class="required">*</span></label>
          <textarea data-field="description" data-listing-id="${listing.id}" rows="8" placeholder="Listing description (required)" class="${!listing.description && (listing.title || listing.price) ? 'field-error' : ''}">${escapeHtml(listing.description)}</textarea>
          <div class="desc-counter">${descLineCount(listing.description)} line${descLineCount(listing.description) !== 1 ? 's' : ''}</div>
        </div>
        <div class="form-row">
          <div class="form-group-half">
            <label>Price ($) <span class="required">*</span></label>
            <input type="number" data-field="price" data-listing-id="${listing.id}" value="${listing.price}" step="0.01" min="0.20" placeholder="0.00" class="${!listing.price && (listing.title || listing.description) ? 'field-error' : ''}">
          </div>
          <div class="form-group-half">
            <label>Category <span class="required">*</span></label>
            <select data-field="category" data-listing-id="${listing.id}">
              ${categoryOptions(listing.category)}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Images (up to 5)</label>
          <div class="image-slots" data-listing-id="${listing.id}">
            ${renderImageSlots(listing)}
          </div>
        </div>
        <div class="form-group">
          <label>Digital File</label>
          ${renderDigitalFileSlot(listing)}
        </div>
        <div class="form-group" data-craft-type-group="${listing.id}" ${craftTypeVisible(listing.category)}>
          <label>Craft Type</label>
          <select data-field="craft_type" data-listing-id="${listing.id}">
            ${craftTypeOptions(listing.craft_type)}
          </select>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <div class="tags-input-wrapper" data-tags-wrapper="${listing.id}">
            ${renderTagChips(listing.tags)}
            <input type="text" class="tag-input-field" data-field="tag_input" data-listing-id="${listing.id}" placeholder="${tagsCount >= 13 ? 'Max tags reached' : 'Type and press Enter'}" ${tagsCount >= 13 ? 'disabled' : ''}>
          </div>
          <div class="tags-counter ${tagsCount >= 13 ? 'full' : ''}">${tagsCount}/13 tags</div>
        </div>
        <details class="advanced-options">
          <summary>Advanced Options</summary>
          <div class="form-group">
            <label>Who made it?</label>
            <select data-field="who_made" data-listing-id="${listing.id}">
              ${selectOption([['i_did', 'I did'], ['member', 'A member of my shop'], ['another', 'Another company or person']], listing.who_made)}
            </select>
          </div>
          <div class="form-group">
            <label>What is it?</label>
            <select data-field="what_is_it" data-listing-id="${listing.id}">
              ${selectOption([['finished_product', 'A finished product'], ['supply', 'A supply or tool to make things']], listing.what_is_it)}
            </select>
          </div>
          <div class="form-group">
            <label>Content type</label>
            <select data-field="ai_content" data-listing-id="${listing.id}">
              ${selectOption([['original', 'Created by me'], ['ai_gen', 'With an AI generator']], listing.ai_content)}
            </select>
          </div>
          <div class="form-group">
            <label>When was it made?</label>
            <select data-field="when_made" data-listing-id="${listing.id}">
              ${selectOption([['made_to_order', 'Made to order'], ['2020_2026', '2020 - 2026'], ['2010_2019', '2010 - 2019'], ['2007_2009', '2007 - 2009'], ['before_2007', 'Before 2007']], listing.when_made)}
            </select>
          </div>
          <div class="form-group">
            <label>Renewal</label>
            <select data-field="renewal" data-listing-id="${listing.id}">
              ${selectOption([['automatic', 'Automatic ($0.20/renewal)'], ['manual', 'Manual']], listing.renewal)}
            </select>
          </div>
          <div class="form-group">
            <label>Listing state</label>
            <select data-field="listing_state" data-listing-id="${listing.id}">
              ${selectOption([['draft', 'Draft (recommended)'], ['active', 'Published']], listing.listing_state)}
            </select>
          </div>
          <div class="form-group">
            <label>Materials (comma separated)</label>
            <input type="text" data-field="materials" data-listing-id="${listing.id}" value="${escapeHtml((listing.materials || []).join(', '))}" placeholder="cotton, wood, etc.">
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" data-field="quantity" data-listing-id="${listing.id}" value="${listing.quantity || 999}" min="1">
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input type="text" data-field="sku" data-listing-id="${listing.id}" value="${escapeHtml(listing.sku)}" placeholder="Optional">
          </div>
        </details>
      </div>
      ${validationHtml}
    </div>
  `;
}

export function renderAllCards(listings, container, expandedIds = null) {
  container.innerHTML = listings.map((listing, i) => {
    const collapsed = expandedIds ? !expandedIds.has(listing.id) : false;
    return renderListingCard(listing, i, collapsed);
  }).join('');
}
