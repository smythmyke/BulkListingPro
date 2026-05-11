import { cdpService } from './cdp.js';

const LISTINGS_INDEX_URL_PATTERN = /etsy\.com\/your\/shops\/me\/tools\/listings/;

export class EtsyShopScraperService {
  isListingsIndexUrl(url) {
    return LISTINGS_INDEX_URL_PATTERN.test(url || '');
  }

  async scrapeCurrentPage(tabId) {
    if (!tabId) {
      throw new Error('No tab ID provided');
    }

    const tab = await chrome.tabs.get(tabId);
    if (!this.isListingsIndexUrl(tab?.url)) {
      throw new Error('Not on Etsy listings page. Navigate to your Shop Manager → Listings page first, then try again.');
    }

    const attachResult = await cdpService.attach(tabId);
    const shouldDetachAfter = !attachResult.alreadyAttached;

    try {
      await this.waitForListingRows(tabId);

      const listings = await cdpService.evaluate(`
        (() => {
          const rows = document.querySelectorAll('a[data-edit-title="true"]');
          const out = [];
          for (const a of rows) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/\\/edit\\/(\\d+)/);
            if (!m) continue;
            const row = a.closest('.listing-row') || a.closest('.listing-row-meta') || a.parentElement;
            const imgEl = row ? row.querySelector('a[data-edit-img] img') : null;
            const badgeEl = row ? row.querySelector('.wt-badge') : null;
            out.push({
              id: m[1],
              title: (a.textContent || '').trim(),
              editUrl: a.href,
              thumbnail: imgEl ? imgEl.src : null,
              type: badgeEl ? (badgeEl.textContent || '').trim() : null
            });
          }
          return out;
        })()
      `);

      const result = Array.isArray(listings) ? listings : [];
      console.log('[edit-import] scrape result:', { count: result.length, firstThumb: result[0]?.thumbnail, firstId: result[0]?.id });
      return result;
    } finally {
      if (shouldDetachAfter) {
        try { await cdpService.detach(); } catch (e) {}
      }
    }
  }

  async waitForListingRows(tabId, { timeoutMs = 15000, intervalMs = 250 } = {}) {
    const started = Date.now();
    let iteration = 0;
    let lastCount = -1;
    console.log('[edit-import] waitForListingRows start', { tabId, timeoutMs, intervalMs });

    while (Date.now() - started < timeoutMs) {
      iteration++;
      let count = 0;
      let readyState = 'unknown';
      try {
        const probe = await cdpService.evaluate(`
          (() => ({
            count: document.querySelectorAll('a[data-edit-title="true"]').length,
            readyState: document.readyState
          }))()
        `);
        count = probe?.count ?? 0;
        readyState = probe?.readyState ?? 'unknown';
      } catch (err) {
        console.warn('[edit-import] waitForListingRows probe error', { iteration, error: err?.message });
      }

      if (count !== lastCount) {
        console.log('[edit-import] waitForListingRows probe', { iteration, count, readyState, elapsedMs: Date.now() - started });
        lastCount = count;
      }

      if (count > 0) {
        console.log('[edit-import] waitForListingRows ready', { iteration, count, elapsedMs: Date.now() - started });
        return count;
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    console.warn('[edit-import] waitForListingRows timeout', { iterations: iteration, lastCount, elapsedMs: Date.now() - started });
    return 0;
  }
}

export const etsyShopScraperService = new EtsyShopScraperService();
