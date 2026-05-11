export class EtsyStorefrontScraperService {
  async scrapeListing(tabId, etsyListingId) {
    if (!tabId) return { success: false, error: 'No tab ID' };
    if (!etsyListingId) return { success: false, error: 'No listing ID' };

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        args: [etsyListingId],
        func: storefrontFetchAndParse
      });
    } catch (err) {
      return { success: false, error: 'executeScript failed: ' + (err?.message || String(err)) };
    }

    const payload = results?.[0]?.result;
    if (!payload) return { success: false, error: 'No result from injected script' };
    return payload;
  }
}

function storefrontFetchAndParse(listingId) {
  return fetch('/listing/' + listingId, { credentials: 'include' })
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
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const lds = [...doc.querySelectorAll('script[type="application/ld+json"]')];
      let product = null;
      for (const s of lds) {
        try {
          const parsed = JSON.parse(s.textContent);
          if (parsed && parsed['@type'] === 'Product') { product = parsed; break; }
        } catch (e) {}
      }
      if (!product) {
        return { success: false, error: 'No Product JSON-LD on page', status, finalUrl };
      }

      const title = (product.name || '').trim();
      const description = (product.description || '').trim();
      let price = '';
      let currency = '';
      let quantity = null;
      if (product.offers) {
        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        if (offer) {
          price = String(offer.price || '').trim();
          currency = (offer.priceCurrency || '').trim();
          if (typeof offer.eligibleQuantity === 'number') quantity = offer.eligibleQuantity;
          else if (offer.eligibleQuantity && typeof offer.eligibleQuantity.value === 'number') quantity = offer.eligibleQuantity.value;
        }
      }
      const images = [];
      if (Array.isArray(product.image)) {
        for (const img of product.image) {
          if (!img) continue;
          const url = typeof img === 'string' ? img : (img.contentURL || img.url || '');
          if (url) images.push(url);
          if (images.length >= 5) break;
        }
      } else if (typeof product.image === 'string') {
        images.push(product.image);
      }
      const category = (product.category || '').trim();

      return {
        success: true,
        data: { title, description, price, currency, quantity, category, images },
        status,
        finalUrl
      };
    })
    .catch(err => ({ success: false, error: 'fetch failed: ' + (err?.message || String(err)) }));
}

export const etsyStorefrontScraperService = new EtsyStorefrontScraperService();
