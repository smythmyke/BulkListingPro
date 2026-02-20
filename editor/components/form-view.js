import { CATEGORIES, CATEGORY_ATTRIBUTES, VALID_COLORS, COLOR_DISPLAY } from '../../services/listingUtils.js';
import { validateListing, getCharCountClass } from './validator.js';
import { getImageSrc, hasImage, formatFileSize } from './image-handler.js';

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
    primary_color: '',
    secondary_color: '',
    personalization_instructions: '',
    personalization_char_limit: '',
    personalization_required: false,
    listing_type: 'digital',
    featured: false,
    etsy_ads: false,
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

function colorOptions(selected) {
  let html = `<option value="" ${!selected ? 'selected' : ''}>None</option>`;
  for (const code of VALID_COLORS) {
    const sel = code === selected ? 'selected' : '';
    html += `<option value="${code}" ${sel}>${COLOR_DISPLAY[code] || code}</option>`;
  }
  return html;
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
    const value = listing[`image_${i}`] || '';
    const filled = hasImage(value);
    const src = getImageSrc(value);
    const meta = listing[`_image_${i}_meta`];
    const hasWarning = meta && (meta.fileSize > 10 * 1024 * 1024 || (meta.width && meta.height && Math.min(meta.width, meta.height) < 1000));
    const warningClass = filled && hasWarning ? ' has-warning' : '';
    const dimTitle = meta ? `${meta.width}x${meta.height} | ${formatFileSize(meta.fileSize)}` : '';
    slots.push(`
      <div class="image-slot${filled ? ' has-image' : ''}${warningClass}" data-image-index="${i}" data-listing-id="${listing.id}" ${filled ? 'draggable="true"' : ''} ${dimTitle ? `title="${escapeHtml(dimTitle)}"` : ''}>
        ${filled
          ? `<img src="${escapeHtml(src)}" alt="Image ${i}"><span class="image-slot-number">${i}</span><button class="image-slot-remove" data-image-index="${i}" data-listing-id="${listing.id}">&times;</button>`
          : `<span class="image-slot-placeholder">${i}</span>`
        }
        <input type="file" class="image-slot-input" data-image-index="${i}" data-listing-id="${listing.id}" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden>
      </div>
    `);
  }
  return slots.join('');
}

function renderDigitalFileSlot(listing) {
  const value = listing.digital_file_1 || '';
  const hasFile = !!value;
  const fileName = listing._digital_file_name || (hasFile ? 'Digital file attached' : '');
  const fileSize = listing._digital_file_size ? formatFileSize(listing._digital_file_size) : '';
  return `
    <div class="digital-file-slot${hasFile ? ' has-file' : ''}" data-listing-id="${listing.id}" data-drop-zone="digital">
      ${hasFile
        ? `<div class="digital-file-info"><span class="digital-file-name">${escapeHtml(fileName)}</span>${fileSize ? `<span class="digital-file-size">(${fileSize})</span>` : ''}<button class="digital-file-remove" data-listing-id="${listing.id}">&times;</button></div>
          <div class="digital-display-name-group"><input type="text" data-field="_digital_display_name" data-listing-id="${listing.id}" value="${escapeHtml(listing._digital_display_name || '')}" placeholder="Display name for buyer (optional)"></div>`
        : `<button class="btn btn-small digital-file-browse" data-listing-id="${listing.id}">Choose File</button><span class="digital-file-hint">Drag & drop or click</span>`
      }
      <input type="file" class="digital-file-input" data-listing-id="${listing.id}" hidden>
    </div>
  `;
}

function aiButtonState(listing, field) {
  const hasTitle = !!(listing.title && listing.title.trim());
  const hasDesc = !!(listing.description && listing.description.trim());
  const hasTags = listing.tags && listing.tags.length > 0;

  let enabled = false;
  let tip = '';
  if (field === 'title') {
    enabled = hasDesc || hasTags;
    tip = enabled ? 'Generate title suggestions (1 credit)' : 'Add a description or tags first';
  } else if (field === 'description') {
    enabled = hasTitle || hasTags;
    tip = enabled ? 'Generate a description (1 credit)' : 'Add a title or tags first';
  } else if (field === 'tags') {
    enabled = hasTitle || hasDesc;
    tip = enabled ? 'Generate tag suggestions (1 credit)' : 'Add a title or description first';
  }
  return { enabled, tip };
}

function renderAiBtn(listing, field) {
  const { enabled, tip } = aiButtonState(listing, field);
  return `<button class="ai-gen-btn${enabled ? '' : ' disabled'}" data-ai-field="${field}" data-listing-id="${listing.id}" title="${escapeHtml(tip)}" ${enabled ? '' : 'disabled'}>AI · 1 credit</button>`;
}

function renderEvalBtn(listing) {
  const hasTitle = !!(listing.title && listing.title.trim());
  return `<button class="eval-btn${hasTitle ? '' : ' disabled'}" data-listing-id="${listing.id}" title="${hasTitle ? 'Evaluate listing quality (2 credits)' : 'Add a title first'}" ${hasTitle ? '' : 'disabled'}>Evaluate (2 credits)</button>`;
}

function renderScoreChip(listing, field) {
  const evalData = listing[`_eval_${field}`];
  if (!evalData) return '';
  const score = field === 'tags' ? Math.round(evalData.reduce((sum, t) => sum + (t.score || 0), 0) / (evalData.length || 1)) : evalData.score;
  const colorClass = score >= 7 ? 'good' : score >= 4 ? 'ok' : 'poor';

  let tooltipContent = '';
  if (field === 'tags') {
    const weak = evalData.filter(t => t.score < 7).length;
    tooltipContent = weak > 0 ? `${weak} tag${weak !== 1 ? 's' : ''} could be improved. Hover over highlighted tags to see suggestions.` : 'All tags look strong.';
  } else {
    tooltipContent = escapeHtml(evalData.reasoning || '');
    if (evalData.improvement) {
      tooltipContent += `<span class="eval-tooltip-improvement">${escapeHtml(evalData.improvement)}</span>`;
    }
  }

  return ` <span class="eval-score-chip ${colorClass}">${score}/10<span class="eval-tooltip">${tooltipContent}</span></span>`;
}

function getTagEvalMap(listing) {
  if (!listing._eval_tags || !Array.isArray(listing._eval_tags)) return null;
  const map = {};
  for (const t of listing._eval_tags) {
    map[t.tag.toLowerCase()] = t;
  }
  return map;
}

function renderTagChipsWithEval(tags, listing) {
  if (!tags || tags.length === 0) return '';
  const evalMap = getTagEvalMap(listing);
  return tags.map((tag, i) => {
    let extraClass = '';
    let tooltip = '';
    if (evalMap) {
      const evalData = evalMap[tag.toLowerCase()];
      if (evalData) {
        if (evalData.score < 4) extraClass = ' eval-poor';
        else if (evalData.score < 7) extraClass = ' eval-weak';
        if (evalData.score < 9) {
          tooltip = `<span class="tag-eval-tooltip">${evalData.score}/10 - ${escapeHtml(evalData.reason)}${evalData.replacement ? `<span class="tag-eval-replacement" data-eval-action="swap-tag" data-old-tag="${escapeHtml(tag)}" data-new-tag="${escapeHtml(evalData.replacement)}" data-listing-id="${listing.id}">&#8594; ${escapeHtml(evalData.replacement)}</span>` : ''}</span>`;
        }
      }
    }
    return `<span class="tag-chip${extraClass}" data-tag-index="${i}">${escapeHtml(tag)} <button class="tag-remove" data-tag-index="${i}">&times;</button>${tooltip}</span>`;
  }).join('');
}

function descLineCount(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

function renderSourceBadge(listing) {
  const source = listing._import_source;
  if (!source) return '';
  const config = {
    etsy: { label: 'Etsy', bg: '#F56400', color: '#fff' },
    ebay: { label: 'eBay', bg: '#e53238', color: '#fff' },
    amazon: { label: 'Amazon', bg: '#232f3e', color: '#ff9900' }
  };
  const c = config[source];
  if (!c) return '';
  return `<span class="source-badge" style="background:${c.bg};color:${c.color}">${c.label}</span>`;
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
    <div class="listing-card ${cardBorderClass}${collapsedClass}" data-listing-id="${listing.id}" data-index="${index}" draggable="true">
      <div class="card-header" data-action="toggle" data-listing-id="${listing.id}">
        <span class="drag-handle" title="Drag to reorder">&#9776;</span>
        <input type="checkbox" class="card-select" data-listing-id="${listing.id}" ${listing._selected ? 'checked' : ''}>
        <span class="card-chevron">${collapsed ? '&#9654;' : '&#9660;'}</span>
        <span class="card-number">#${index + 1}</span>
        <span class="card-title-preview ${titleClass}">${titlePreview}</span>
        ${renderSourceBadge(listing)}
        <span class="validation-badge ${badgeClass}"></span>
        ${renderEvalBtn(listing)}
        <button class="card-remove" data-action="remove" data-listing-id="${listing.id}">&times;</button>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label>Title <span class="required">*</span> ${renderAiBtn(listing, 'title')}${renderScoreChip(listing, 'title')}</label>
          <input type="text" data-field="title" data-listing-id="${listing.id}" value="${escapeHtml(listing.title)}" maxlength="140" placeholder="Listing title (required)" class="${!listing.title && (listing.description || listing.price) ? 'field-error' : ''}">
          <div class="char-counter ${titleCountClass}">${titleLen}/140</div>
        </div>
        <div class="form-group">
          <label>Description <span class="required">*</span> ${renderAiBtn(listing, 'description')}${renderScoreChip(listing, 'description')}</label>
          <textarea data-field="description" data-listing-id="${listing.id}" rows="8" placeholder="Listing description (required)" class="${!listing.description && (listing.title || listing.price) ? 'field-error' : ''}">${escapeHtml(listing.description)}</textarea>
          <div class="desc-counter char-counter ${(listing.description || '').length > 4800 ? 'over' : (listing.description || '').length > 4200 ? 'warn' : ''}">${(listing.description || '').length}/4800</div>
        </div>
        <div class="form-row">
          <div class="form-group-half">
            <label>Price ($) <span class="required">*</span>${renderScoreChip(listing, 'price')}</label>
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
          <label>Images (up to 5)${renderScoreChip(listing, 'images')}</label>
          <div class="image-slots" data-listing-id="${listing.id}">
            ${renderImageSlots(listing)}
          </div>
          <span class="image-url-paste" data-listing-id="${listing.id}">Paste image URL</span>
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
            ${renderTagChipsWithEval(listing.tags, listing)}
            <input type="text" class="tag-input-field" data-field="tag_input" data-listing-id="${listing.id}" placeholder="${tagsCount >= 13 ? 'Max tags reached' : 'Type and press Enter'}" ${tagsCount >= 13 ? 'disabled' : ''}>
          </div>
          <div class="tags-counter ${tagsCount >= 13 ? 'full' : ''}">${tagsCount}/13 tags ${renderAiBtn(listing, 'tags')}${renderScoreChip(listing, 'tags')} <button class="tag-library-btn" data-listing-id="${listing.id}">Library</button></div>
          <div class="tag-suggestions" data-suggestions-for="${listing.id}"></div>
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
          <div class="form-row">
            <div class="form-group-half">
              <label>Primary Color</label>
              <select data-field="primary_color" data-listing-id="${listing.id}">
                ${colorOptions(listing.primary_color)}
              </select>
            </div>
            <div class="form-group-half">
              <label>Secondary Color</label>
              <select data-field="secondary_color" data-listing-id="${listing.id}">
                ${colorOptions(listing.secondary_color)}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Personalization Instructions</label>
            <textarea data-field="personalization_instructions" data-listing-id="${listing.id}" rows="2" placeholder="e.g. Enter name for print">${escapeHtml(listing.personalization_instructions)}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group-half">
              <label>Personalization Char Limit</label>
              <input type="number" data-field="personalization_char_limit" data-listing-id="${listing.id}" value="${listing.personalization_char_limit || ''}" min="1" placeholder="Optional">
            </div>
            <div class="form-group-half">
              <label class="checkbox-label">
                <input type="checkbox" data-field="personalization_required" data-listing-id="${listing.id}" ${listing.personalization_required ? 'checked' : ''}>
                Personalization Required
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group-half">
              <label class="checkbox-label">
                <input type="checkbox" data-field="featured" data-listing-id="${listing.id}" ${listing.featured ? 'checked' : ''}>
                Featured
              </label>
            </div>
            <div class="form-group-half">
              <label class="checkbox-label">
                <input type="checkbox" data-field="etsy_ads" data-listing-id="${listing.id}" ${listing.etsy_ads ? 'checked' : ''}>
                Etsy Ads
              </label>
            </div>
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
