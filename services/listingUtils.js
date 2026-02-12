export const STORAGE_KEYS = {
  QUEUE: 'bulklistingpro_queue',
  UPLOAD_STATE: 'bulklistingpro_upload_state',
  UPLOAD_RESULTS: 'bulklistingpro_upload_results',
  RESEARCH_CLIPBOARD: 'bulklistingpro_research_clipboard',
  TAG_LIBRARY: 'bulklistingpro_tag_library',
  EDITOR_LISTINGS: 'bulklistingpro_editor_listings',
  EDITOR_TAB_ID: 'bulklistingpro_editor_tab_id'
};

export const CATEGORY_ATTRIBUTES = {
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

export const CATEGORIES = [
  'Digital Prints',
  'Guides & How Tos',
  'Drawing & Illustration',
  'Digital Patterns',
  'Planners & Templates',
  'Clip Art & Image Files',
  'Cutting Machine Files (SVG)',
  'Embroidery Machine Files',
  '3D Printer Files',
  'Knitting Machine Files',
  'Social Media Templates',
  'Resume Templates',
  'Greeting Card Templates',
  'Menu Templates',
  'Event Program Templates',
  'Newsletter Templates',
  'Personal Finance Templates',
  'Bookkeeping Templates',
  'Contract & Agreement Templates',
  'Flashcards',
  'Study Guides',
  'Worksheets',
  'Fonts',
  'Photography',
];

export const WHO_MADE_FRIENDLY = { 'i did': 'i_did', 'a member of my shop': 'member', 'another company or person': 'another' };
export const WHAT_IS_IT_FRIENDLY = { 'a finished product': 'finished_product', 'a supply or tool to make things': 'supply' };
export const AI_CONTENT_FRIENDLY = { 'created by me': 'original', 'with an ai generator': 'ai_gen' };
export const WHEN_MADE_FRIENDLY = { 'made to order': 'made_to_order', '2020 - 2026': '2020_2026', '2010 - 2019': '2010_2019', '2007 - 2009': '2007_2009', 'before 2007': 'before_2007' };
export const RENEWAL_FRIENDLY = { 'automatic': 'automatic', 'manual': 'manual' };
export const LISTING_STATE_FRIENDLY = { 'draft': 'draft', 'active': 'active', 'published': 'active' };

export const VALID_COLORS = [
  'beige', 'black', 'blue', 'bronze', 'brown', 'clear', 'copper',
  'gold', 'gray', 'green', 'orange', 'pink', 'purple', 'red',
  'rose_gold', 'silver', 'white', 'yellow', 'rainbow'
];

export const COLOR_FRIENDLY = {
  'grey': 'gray', 'rose gold': 'rose_gold', 'rosegold': 'rose_gold',
  'beige': 'beige', 'black': 'black', 'blue': 'blue', 'bronze': 'bronze',
  'brown': 'brown', 'clear': 'clear', 'copper': 'copper', 'gold': 'gold',
  'gray': 'gray', 'green': 'green', 'orange': 'orange', 'pink': 'pink',
  'purple': 'purple', 'red': 'red', 'silver': 'silver', 'white': 'white',
  'yellow': 'yellow', 'rainbow': 'rainbow'
};

export const COLOR_DISPLAY = {
  beige: 'Beige', black: 'Black', blue: 'Blue', bronze: 'Bronze',
  brown: 'Brown', clear: 'Clear', copper: 'Copper', gold: 'Gold',
  gray: 'Gray', green: 'Green', orange: 'Orange', pink: 'Pink',
  purple: 'Purple', red: 'Red', rose_gold: 'Rose gold', silver: 'Silver',
  white: 'White', yellow: 'Yellow', rainbow: 'Rainbow'
};

export const VALID_LISTING_TYPE = ['digital', 'physical'];
export const LISTING_TYPE_FRIENDLY = { 'digital': 'digital', 'physical': 'physical', 'digital files': 'digital', 'a physical item': 'physical' };

export const VALID_WHO_MADE = ['i_did', 'member', 'another'];
export const VALID_WHAT_IS_IT = ['finished_product', 'supply'];
export const VALID_AI_CONTENT = ['original', 'ai_gen'];
export const VALID_WHEN_MADE = ['made_to_order', '2020_2026', '2010_2019', '2007_2009', 'before_2007'];
export const VALID_RENEWAL = ['automatic', 'manual'];

export function resolveField(raw, friendlyMap, validCodes, fallback) {
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (friendlyMap[lower]) return friendlyMap[lower];
  if (validCodes.includes(lower)) return lower;
  return fallback;
}

export function extractTags(row) {
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

export function sanitizeListing(row, rowIndex) {
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

  const primaryColorRaw = (row.primary_color || row.PrimaryColor || row['Primary Color'] || '').toString().trim();
  const secondaryColorRaw = (row.secondary_color || row.SecondaryColor || row['Secondary Color'] || '').toString().trim();
  const personalizationInstructions = (row.personalization_instructions || row.PersonalizationInstructions || row['Personalization Instructions'] || '').toString().trim();
  const personalizationCharLimitRaw = (row.personalization_char_limit || row.PersonalizationCharLimit || row['Personalization Char Limit'] || '').toString().trim();
  const personalizationCharLimit = personalizationCharLimitRaw ? (parseInt(personalizationCharLimitRaw) || '') : '';
  const personalizationRequiredRaw = (row.personalization_required || row.PersonalizationRequired || row['Personalization Required'] || '').toString().trim().toLowerCase();
  const personalizationRequired = personalizationRequiredRaw === 'true' || personalizationRequiredRaw === 'yes' || personalizationRequiredRaw === '1';
  const listingTypeRaw = (row.listing_type || row.ListingType || row['Listing Type'] || '').toString().trim();
  const featuredRaw = (row.featured || row.Featured || '').toString().trim().toLowerCase();
  const featured = featuredRaw === 'true' || featuredRaw === 'yes' || featuredRaw === '1';
  const etsyAdsRaw = (row.etsy_ads || row.EtsyAds || row['Etsy Ads'] || '').toString().trim().toLowerCase();
  const etsyAds = etsyAdsRaw === 'true' || etsyAdsRaw === 'yes' || etsyAdsRaw === '1';

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
    primary_color: resolveField(primaryColorRaw, COLOR_FRIENDLY, VALID_COLORS, ''),
    secondary_color: resolveField(secondaryColorRaw, COLOR_FRIENDLY, VALID_COLORS, ''),
    personalization_instructions: personalizationInstructions,
    personalization_char_limit: personalizationCharLimit,
    personalization_required: personalizationRequired,
    listing_type: resolveField(listingTypeRaw, LISTING_TYPE_FRIENDLY, VALID_LISTING_TYPE, 'digital'),
    featured,
    etsy_ads: etsyAds,
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

export function readSpreadsheetFile(file) {
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

export function isLocalFilePath(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('data:')) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  if (value.match(/^[A-Za-z]:[\\\/]/) || value.startsWith('/') || value.startsWith('\\\\')) {
    return true;
  }
  return false;
}

export function collectLocalFilePaths(listings) {
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
