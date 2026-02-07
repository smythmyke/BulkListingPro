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
