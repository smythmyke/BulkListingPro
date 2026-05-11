export class EtsyEditPageScraperService {
  async scrapeListing(tabId, etsyListingId) {
    if (!tabId) return { success: false, error: 'No tab ID' };
    if (!etsyListingId) return { success: false, error: 'No listing ID' };

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        args: [etsyListingId],
        func: editPageFetchAndParse
      });
    } catch (err) {
      return { success: false, error: 'executeScript failed: ' + (err?.message || String(err)) };
    }

    const payload = results?.[0]?.result;
    if (!payload) return { success: false, error: 'No result from injected script' };
    return payload;
  }
}

function editPageFetchAndParse(listingId) {
  const url = '/your/shops/me/listing-editor/edit/' + listingId;

  function extractBalancedObject(text, startIdx) {
    if (text[startIdx] !== '{') return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIdx; i < text.length; i++) {
      const c = text[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return text.slice(startIdx, i + 1);
      }
    }
    return null;
  }

  return fetch(url, { credentials: 'include' })
    .then(r => {
      if (!r.ok) return { success: false, error: 'HTTP ' + r.status, status: r.status };
      return r.text().then(html => ({ html, status: r.status, finalUrl: r.url }));
    })
    .then(payload => {
      if (payload.success === false) return payload;
      const { html, status, finalUrl } = payload;
      if (html.includes('captcha-delivery') || html.includes('Please enable JS')) {
        return { success: false, error: 'Blocked by DataDome', blocked: true };
      }

      const anchor = '"listingEditor":{"listing":';
      const anchorIdx = html.indexOf(anchor);
      if (anchorIdx < 0) {
        return { success: false, error: 'listing anchor not found in HTML', status, finalUrl };
      }
      const objStart = anchorIdx + anchor.length;
      const listingJson = extractBalancedObject(html, objStart);
      if (!listingJson) {
        return { success: false, error: 'failed to extract balanced listing object', status, finalUrl };
      }

      let listing;
      try {
        listing = JSON.parse(listingJson);
      } catch (e) {
        return { success: false, error: 'JSON.parse failed: ' + e.message, status, finalUrl };
      }

      const ff = listing.formFields || {};

      const priceCents = typeof ff.price === 'number' ? ff.price : null;
      const priceStr = priceCents != null ? (priceCents / 100).toFixed(2) : '';

      const tags = Array.isArray(ff.tags) ? ff.tags.slice() : [];
      const materials = Array.isArray(ff.materials) ? ff.materials.slice() : [];

      const formImgs = Array.isArray(ff.formattedListingImages) ? ff.formattedListingImages : [];
      const images = [];
      const altTexts = [];
      for (let i = 0; i < Math.min(formImgs.length, 5); i++) {
        const img = formImgs[i] || {};
        if (img.url) images.push(img.url);
        altTexts.push(img.altText || '');
      }

      const data = {
        title: (listing.title || ff.title || '').trim(),
        description: (ff.description || '').trim(),
        price: priceStr,
        quantity: typeof ff.quantity === 'number' ? String(ff.quantity) : '',
        tags,
        materials,
        sku: (ff.sku || '').trim(),
        images,
        altTexts,
        whoMade: listing.whoMade || ff.whoMade || '',
        whenMade: listing.whenMade || ff.whenMade || '',
        isSupply: typeof listing.isSupply === 'boolean' ? listing.isSupply
                : typeof ff.isSupply === 'boolean' ? ff.isSupply
                : null,
        shopSectionId: ff.sectionId != null ? ff.sectionId
                     : listing.shopSectionId != null ? listing.shopSectionId
                     : null,
        shouldAutoRenew: typeof ff.shouldAutoRenew === 'boolean' ? ff.shouldAutoRenew : null,
        isPersonalizable: typeof ff.isPersonalizable === 'boolean' ? ff.isPersonalizable : null,
        state: typeof listing.state === 'number' ? listing.state : null,
        listingType: listing.type || ''
      };

      return { success: true, data, status, finalUrl };
    })
    .catch(err => ({ success: false, error: 'fetch failed: ' + (err?.message || String(err)) }));
}

export const etsyEditPageScraperService = new EtsyEditPageScraperService();
