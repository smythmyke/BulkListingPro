import { STORAGE_KEYS } from '../../services/listingUtils.js';

const CATEGORY_MAPPING = {
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

export async function loadTagLibrary() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.TAG_LIBRARY);
    const stored = data[STORAGE_KEYS.TAG_LIBRARY];
    if (Array.isArray(stored)) {
      return { 'Uncategorized': { sets: stored, recentTags: [] } };
    }
    return stored || {};
  } catch (err) {
    console.warn('Failed to load tag library:', err);
    return {};
  }
}

export function mapFormCategoryToInternal(formCategory) {
  return CATEGORY_MAPPING[formCategory] || null;
}

export function getSuggestionsForCategory(formCategory, tagLibrary) {
  const internal = mapFormCategoryToInternal(formCategory);
  if (!internal || !tagLibrary[internal]) return { sets: [], recentTags: [] };
  const data = tagLibrary[internal];
  return { sets: data.sets || [], recentTags: data.recentTags || [] };
}

export async function fetchCompetitorTags(url) {
  let windowId = null;
  try {
    console.log('[TagImport] Creating minimized window for:', url);
    const win = await chrome.windows.create({ url, state: 'minimized' });
    windowId = win.id;
    const tabId = win.tabs[0].id;
    console.log('[TagImport] Window created:', windowId, 'tab:', tabId);

    await new Promise((resolve) => {
      const onUpdated = (id, info) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdated); resolve(); }, 15000);
    });
    console.log('[TagImport] Page loaded, waiting for render...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('[TagImport] Scrolling page to trigger lazy content...');
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const height = document.documentElement.scrollHeight;
        const step = window.innerHeight || 800;
        const steps = Math.ceil(height / step);
        for (let i = 1; i <= steps; i++) {
          window.scrollTo({ top: i * step, behavior: 'instant' });
          await new Promise(r => setTimeout(r, 150));
        }
        window.scrollTo({ top: height, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 500));
      }
    });
    console.log('[TagImport] Scroll complete, waiting for render...');
    await new Promise(r => setTimeout(r, 1500));

    console.log('[TagImport] Extracting tags...');
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        let title = '';
        const titleEl = document.querySelector('h1[data-buy-box-listing-title]');
        if (titleEl) title = titleEl.textContent.trim();

        let price = '';
        const priceEl = document.querySelector('[data-buy-box-region="price"] p.wt-text-title-larger') ||
                        document.querySelector('[data-buy-box-region="price"] .wt-text-title-larger');
        if (priceEl) price = priceEl.textContent.replace(/[^0-9.]/g, '');

        let tags = [];

        const visualTags = document.querySelectorAll('.visual-search-tags-bubbles__title');
        visualTags.forEach(el => {
          const text = el.textContent.trim();
          if (text && !tags.includes(text)) tags.push(text);
        });

        const textTagLinks = document.querySelectorAll('.tags-section-container a[href*="/market/"]');
        textTagLinks.forEach(el => {
          const text = el.textContent.trim();
          if (text && !tags.includes(text)) tags.push(text);
        });

        if (tags.length === 0) {
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of jsonLdScripts) {
            try {
              const parsed = JSON.parse(script.textContent);
              if (parsed.keywords) {
                const kw = typeof parsed.keywords === 'string'
                  ? parsed.keywords.split(',').map(t => t.trim())
                  : parsed.keywords;
                tags = kw.filter(t => t);
                if (tags.length > 0) break;
              }
            } catch (e) {}
          }
        }

        if (tags.length === 0) {
          const meta = document.querySelector('meta[name="keywords"]');
          if (meta) tags = meta.content.split(',').map(t => t.trim()).filter(t => t);
        }

        return { title, price, tags: tags.slice(0, 13) };
      }
    });

    const d = results?.[0]?.result;
    console.log('[TagImport] Result:', d?.title?.substring(0, 40), 'Tags:', d?.tags?.length);
    chrome.windows.remove(windowId).catch(() => {});

    if (!d) return { title: '', price: '', tags: [], error: 'Script execution returned no result' };
    return { title: d.title || '', price: d.price || '', tags: d.tags || [] };
  } catch (err) {
    console.error('[TagImport] Caught error:', err);
    if (windowId) chrome.windows.remove(windowId).catch(() => {});
    return { title: '', price: '', tags: [], error: err.message };
  }
}

export async function importListingFromUrl(url) {
  let windowId = null;
  const isEbay = url.includes('ebay.com/itm/');
  const isAmazon = url.includes('amazon.com/');
  try {
    const win = await chrome.windows.create({ url, state: 'minimized' });
    windowId = win.id;
    const tabId = win.tabs[0].id;

    await new Promise((resolve) => {
      const onUpdated = (id, info) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdated); resolve(); }, 15000);
    });
    await new Promise(r => setTimeout(r, 2000));

    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const height = document.documentElement.scrollHeight;
        const step = window.innerHeight || 800;
        for (let i = 1; i <= Math.ceil(height / step); i++) {
          window.scrollTo({ top: i * step, behavior: 'instant' });
          await new Promise(r => setTimeout(r, 150));
        }
        window.scrollTo({ top: height, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 500));
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    const extractionFunc = isAmazon ? extractAmazonListing : isEbay ? extractEbayListing : extractEtsyListing;
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractionFunc
    });

    chrome.windows.remove(windowId).catch(() => {});
    const d = results?.[0]?.result;
    if (!d || !d.title) return { error: 'Could not extract listing data' };
    return d;
  } catch (err) {
    if (windowId) chrome.windows.remove(windowId).catch(() => {});
    return { error: err.message };
  }
}

function extractEtsyListing() {
  if (typeof extractListingData === 'function') return extractListingData();

  const title = document.querySelector('h1[data-buy-box-listing-title]')?.textContent?.trim() || '';
  const priceEl = document.querySelector('[data-buy-box-region="price"] p.wt-text-title-larger') ||
                  document.querySelector('[data-buy-box-region="price"] .wt-text-title-larger');
  const price = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, '') : '';
  const descEl = document.querySelector('[data-product-details-description-text-content]') ||
                 document.querySelector('[data-id="description-text"]');
  const description = descEl?.textContent?.trim() || '';

  let tags = [];
  document.querySelectorAll('.visual-search-tags-bubbles__title').forEach(el => {
    const t = el.textContent.trim();
    if (t && !tags.includes(t)) tags.push(t);
  });
  document.querySelectorAll('.tags-section-container a[href*="/market/"]').forEach(el => {
    const t = el.textContent.trim();
    if (t && !tags.includes(t)) tags.push(t);
  });
  if (tags.length === 0) {
    const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of jsonLd) {
      try {
        const p = JSON.parse(s.textContent);
        if (p.keywords) {
          tags = (typeof p.keywords === 'string' ? p.keywords.split(',').map(t => t.trim()) : p.keywords).filter(t => t);
          if (tags.length > 0) break;
        }
      } catch (e) {}
    }
  }

  const images = [];
  const seen = new Set();
  const carouselImgs = document.querySelectorAll('ul.carousel-pane-list img[src*="etsystatic.com"]');
  for (const img of carouselImgs) {
    const src = img.src || img.getAttribute('data-src') || '';
    if (src && !seen.has(src)) { seen.add(src); images.push(src.replace(/_\d+x\d+/, '_fullxfull')); }
  }
  if (images.length === 0) {
    document.querySelectorAll('img[src*="etsystatic.com/i"]').forEach(img => {
      const src = img.src || '';
      if (src && src.includes('/il/') && !seen.has(src)) { seen.add(src); images.push(src.replace(/_\d+x\d+/, '_fullxfull')); }
    });
  }
  if (images.length === 0) {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const p = JSON.parse(s.textContent);
        if (p['@type'] === 'Product' && p.image) {
          const imgs = Array.isArray(p.image) ? p.image : [p.image];
          imgs.forEach(u => { if (u && !seen.has(u)) { seen.add(u); images.push(u); } });
        }
      } catch (e) {}
    }
  }

  return { title, price, description, tags: tags.slice(0, 13), images: images.slice(0, 10), source: 'etsy' };
}

function extractEbayListing() {
  if (typeof extractListingData === 'function') return extractListingData();

  const titleEl = document.querySelector('[data-testid="x-item-title"] span.ux-textspans--BOLD') ||
                  document.querySelector('[data-testid="x-item-title"]') ||
                  document.querySelector('.x-item-title__mainTitle span');
  const title = titleEl?.textContent?.trim() || '';

  let price = '';
  try { if (window.utag_data?.price?.[0]) price = window.utag_data.price[0]; } catch (e) {}
  if (!price) {
    const priceEl = document.querySelector('[data-testid="x-price-primary"] span.ux-textspans') ||
                    document.querySelector('.x-price-primary span');
    if (priceEl) price = priceEl.textContent.replace(/[^0-9.]/g, '');
  }

  const descContainer = document.querySelector('[data-testid="d-item-description"]') ||
                        document.querySelector('.d-item-description');
  let description = '';
  if (descContainer) {
    const iframe = descContainer.querySelector('iframe');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc?.body) description = iframeDoc.body.innerText.trim();
      } catch (e) {}
    }
    if (!description) description = descContainer.innerText.trim();
  }

  const images = [];
  const seen = new Set();
  document.querySelectorAll('[data-zoom-src]').forEach(el => {
    const src = el.getAttribute('data-zoom-src');
    if (src && src.includes('ebayimg.com') && !seen.has(src)) { seen.add(src); images.push(src); }
  });
  if (images.length === 0) {
    document.querySelectorAll('.ux-image-carousel-item img').forEach(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src && src.includes('ebayimg.com') && !seen.has(src)) { seen.add(src); images.push(src.replace(/s-l\d+/, 's-l1600')); }
    });
  }
  if (images.length === 0) {
    document.querySelectorAll('img[src*="i.ebayimg.com/images"]').forEach(img => {
      const src = img.src;
      if (src && !seen.has(src)) { seen.add(src); images.push(src.replace(/s-l\d+/, 's-l1600')); }
    });
  }

  const specifics = {};
  document.querySelectorAll('.ux-labels-values__labels-content, .ux-labels-values').forEach(row => {
    const labelEl = row.querySelector('.ux-labels-values__labels span.ux-textspans') ||
                    row.querySelector('.ux-labels-values__labels');
    const valueEl = row.querySelector('.ux-labels-values__values span.ux-textspans') ||
                    row.querySelector('.ux-labels-values__values');
    if (labelEl && valueEl) {
      const label = labelEl.textContent.trim().replace(/:$/, '');
      const value = valueEl.textContent.trim();
      if (label && value) specifics[label] = value;
    }
  });

  const condEl = document.querySelector('[data-testid="x-item-condition"] span') ||
                 document.querySelector('.x-item-condition span.ux-textspans');
  const condition = condEl?.textContent?.trim() || '';

  const tags = [];
  const stopWords = new Set(['the', 'and', 'for', 'with', 'new', 'from', 'that', 'this', 'are', 'was', 'has', 'lot']);
  title.toLowerCase().split(/[\s,\-|]+/).filter(w => w.length > 2 && w.length < 25).forEach(w => {
    if (!stopWords.has(w) && !tags.includes(w)) tags.push(w);
  });
  const tagFields = ['Brand', 'Type', 'Material', 'Color', 'Style', 'Theme', 'Character', 'Pattern'];
  for (const field of tagFields) {
    const val = specifics[field];
    if (val && val.length < 25) {
      const lower = val.toLowerCase();
      if (!tags.includes(lower)) tags.push(lower);
    }
  }

  return {
    title, price, description, tags: tags.slice(0, 13), images: images.slice(0, 10),
    itemSpecifics: specifics, condition, source: 'ebay'
  };
}

function extractAmazonListing() {
  if (typeof extractListingData === 'function') return extractListingData();

  const title = document.querySelector('#productTitle')?.textContent?.trim() || '';

  let price = '';
  const priceEl = document.querySelector('#tp_price_block_total_price_ww .a-offscreen') ||
                  document.querySelector('.a-price .a-offscreen');
  if (priceEl) price = priceEl.textContent.replace(/[^0-9.]/g, '');

  const bullets = [];
  document.querySelectorAll('#feature-bullets ul li span.a-list-item').forEach(el => {
    const text = el.textContent.trim();
    if (text && !text.startsWith('Make sure') && !text.startsWith('›')) bullets.push(text);
  });
  const description = bullets.join('\n\n');

  const images = [];
  const seen = new Set();
  const landingImg = document.querySelector('img#landingImage');
  if (landingImg) {
    const hiRes = landingImg.getAttribute('data-old-hires');
    if (hiRes && !seen.has(hiRes)) { seen.add(hiRes); images.push(hiRes); }
    const dynamicData = landingImg.getAttribute('data-a-dynamic-image');
    if (dynamicData) {
      try {
        for (const imgUrl of Object.keys(JSON.parse(dynamicData))) {
          if (!seen.has(imgUrl)) { seen.add(imgUrl); images.push(imgUrl); }
        }
      } catch (e) {}
    }
  }
  if (images.length === 0) {
    document.querySelectorAll('.imageThumbnail img, #altImages img').forEach(img => {
      let src = img.src || '';
      if (src && src.includes('media-amazon.com') && !seen.has(src)) {
        src = src.replace(/_AC_US\d+_/, '_AC_SL1500_').replace(/_SS\d+_/, '_AC_SL1500_');
        seen.add(src);
        images.push(src);
      }
    });
  }

  const productDetails = {};
  document.querySelectorAll('#productOverview_feature_div table tr').forEach(row => {
    const label = row.querySelector('td.a-span3 span')?.textContent?.trim();
    const value = row.querySelector('td.a-span9 span')?.textContent?.trim();
    if (label && value) productDetails[label] = value;
  });
  document.querySelectorAll('#prodDetails table.prodDetTable tr').forEach(row => {
    const label = row.querySelector('th')?.textContent?.trim().replace(/\s+/g, ' ');
    const value = row.querySelector('td')?.textContent?.trim().replace(/\s+/g, ' ');
    if (label && value) productDetails[label] = value;
  });

  const tags = [];
  const stopWords = new Set(['the', 'and', 'for', 'with', 'new', 'from', 'that', 'this', 'are', 'was', 'has']);
  title.toLowerCase().split(/[\s,\-|()]+/).filter(w => w.length > 2 && w.length < 25).forEach(w => {
    if (!stopWords.has(w) && !tags.includes(w)) tags.push(w);
  });
  const tagFields = ['Brand', 'Material', 'Color', 'Style', 'Special Feature', 'Pattern', 'Item Shape'];
  for (const field of tagFields) {
    const val = productDetails[field];
    if (val && val.length < 25) {
      const lower = val.toLowerCase();
      if (!tags.includes(lower)) tags.push(lower);
    }
  }

  return {
    title, price, description, tags: tags.slice(0, 13), images: images.slice(0, 10),
    productDetails, source: 'amazon'
  };
}

export function getTagFrequency(listings) {
  const counts = {};
  for (const l of listings) {
    if (!l.tags) continue;
    for (const tag of l.tags) {
      const lower = tag.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function findSimilarTags(tags) {
  if (!tags || tags.length < 2) return [];
  const pairs = [];
  const suffixes = ['s', 'es', 'ing', 'ed'];
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i].toLowerCase();
      const b = tags[j].toLowerCase();
      for (const suffix of suffixes) {
        if (a + suffix === b || b + suffix === a) {
          pairs.push([tags[i], tags[j], suffix]);
          break;
        }
      }
    }
  }
  return pairs;
}
