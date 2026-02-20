console.log('BulkListingPro ebay-scraper.js loaded on:', window.location.href);

function extractListingData() {
  const data = {
    url: window.location.href,
    platform: 'ebay',
    capturedAt: new Date().toISOString(),
    title: '',
    price: '',
    currency: 'USD',
    description: '',
    images: [],
    tags: [],
    itemSpecifics: {},
    condition: '',
    seller: { name: '', feedbackScore: '', feedbackPercent: '' }
  };

  const titleEl = document.querySelector('[data-testid="x-item-title"] span.ux-textspans--BOLD') ||
                  document.querySelector('[data-testid="x-item-title"]') ||
                  document.querySelector('.x-item-title__mainTitle span');
  data.title = titleEl?.textContent?.trim() || '';

  try {
    if (window.utag_data?.price?.[0]) {
      data.price = window.utag_data.price[0];
    }
  } catch (e) {}
  if (!data.price) {
    const priceEl = document.querySelector('[data-testid="x-price-primary"] span.ux-textspans') ||
                    document.querySelector('.x-price-primary span');
    if (priceEl) {
      data.price = priceEl.textContent.replace(/[^0-9.]/g, '');
      const priceText = priceEl.textContent;
      if (priceText.includes('£')) data.currency = 'GBP';
      else if (priceText.includes('€')) data.currency = 'EUR';
    }
  }

  data.images = extractImages();
  data.description = extractDescription();
  data.itemSpecifics = extractItemSpecifics();
  data.condition = extractCondition();
  data.tags = generateTagsFromSpecifics(data.title, data.itemSpecifics);

  const sellerLink = document.querySelector('.x-sellercard-atf__info__about-seller a') ||
                     document.querySelector('[data-testid="str-title"] a') ||
                     document.querySelector('.seller-persona a');
  if (sellerLink) {
    data.seller.name = sellerLink.textContent.trim();
  }

  const feedbackEl = document.querySelector('.x-sellercard-atf__about-seller .ux-textspans--SECONDARY') ||
                     document.querySelector('[data-testid="str-feedback"]');
  if (feedbackEl) {
    const fbText = feedbackEl.textContent;
    const scoreMatch = fbText.match(/([\d,]+)/);
    const pctMatch = fbText.match(/([\d.]+)%/);
    if (scoreMatch) data.seller.feedbackScore = scoreMatch[1].replace(/,/g, '');
    if (pctMatch) data.seller.feedbackPercent = pctMatch[1];
  }

  return data;
}

function extractImages() {
  const urls = [];
  const seen = new Set();

  document.querySelectorAll('[data-zoom-src]').forEach(el => {
    const src = el.getAttribute('data-zoom-src');
    if (src && src.includes('ebayimg.com') && !seen.has(src)) {
      seen.add(src);
      urls.push(src);
    }
  });

  if (urls.length === 0) {
    document.querySelectorAll('.ux-image-carousel-item img').forEach(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src && src.includes('ebayimg.com') && !seen.has(src)) {
        seen.add(src);
        urls.push(src.replace(/s-l\d+/, 's-l1600'));
      }
    });
  }

  if (urls.length === 0) {
    document.querySelectorAll('img[src*="i.ebayimg.com/images"]').forEach(img => {
      const src = img.src;
      if (src && !seen.has(src) && src.includes('/il/') || src.includes('/images/g/')) {
        seen.add(src);
        urls.push(src.replace(/s-l\d+/, 's-l1600'));
      }
    });
  }

  console.log('Extracted eBay images:', urls.length);
  return urls.slice(0, 10);
}

function extractDescription() {
  const descContainer = document.querySelector('[data-testid="d-item-description"]') ||
                        document.querySelector('.d-item-description');
  if (descContainer) {
    const iframe = descContainer.querySelector('iframe');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc?.body) return iframeDoc.body.innerText.trim();
      } catch (e) {}
    }
    return descContainer.innerText.trim();
  }

  const iframe = document.querySelector('#desc_ifr');
  if (iframe) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc?.body) return iframeDoc.body.innerText.trim();
    } catch (e) {}
  }

  return '';
}

function extractItemSpecifics() {
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

  if (Object.keys(specifics).length === 0) {
    document.querySelectorAll('[data-testid="ux-labels-values"]').forEach(row => {
      const cols = row.querySelectorAll('.ux-labels-values__values-content span');
      const labels = row.querySelectorAll('.ux-labels-values__labels-content span');
      if (labels.length > 0 && cols.length > 0) {
        specifics[labels[0].textContent.trim().replace(/:$/, '')] = cols[0].textContent.trim();
      }
    });
  }

  console.log('Extracted item specifics:', Object.keys(specifics).length);
  return specifics;
}

function extractCondition() {
  const condEl = document.querySelector('[data-testid="x-item-condition"] span') ||
                 document.querySelector('.x-item-condition span.ux-textspans') ||
                 document.querySelector('[data-testid="ux-icon-text-display"]');
  return condEl?.textContent?.trim() || '';
}

function generateTagsFromSpecifics(title, specifics) {
  const tags = [];

  const titleWords = title.toLowerCase().split(/[\s,\-|]+/).filter(w => w.length > 2 && w.length < 25);
  const stopWords = new Set(['the', 'and', 'for', 'with', 'new', 'from', 'that', 'this', 'are', 'was', 'has', 'lot']);
  titleWords.forEach(w => {
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

  return tags.slice(0, 13);
}

function isListingPage() {
  return window.location.pathname.startsWith('/itm/');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('ebay-scraper received message:', message.type);
  if (message.type === 'EXTRACT_EBAY_LISTING') {
    if (!isListingPage()) {
      sendResponse({ success: false, error: 'Not on an eBay listing page.' });
      return true;
    }

    extractListingDataAsync().then(data => {
      if (!data.title) {
        sendResponse({ success: false, error: 'Could not extract listing data. The page may still be loading.' });
      } else {
        sendResponse({ success: true, data });
      }
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
  return true;
});

async function extractListingDataAsync() {
  console.log('Starting eBay extraction with scroll...');
  await scrollPageToLoadContent();
  await new Promise(resolve => setTimeout(resolve, 500));
  window.scrollTo({ top: 0, behavior: 'instant' });
  return extractListingData();
}

async function scrollPageToLoadContent() {
  const scrollHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

  console.log(`Scrolling eBay page (${scrollSteps} steps)...`);

  for (let i = 1; i <= scrollSteps; i++) {
    window.scrollTo({ top: i * viewportHeight, behavior: 'instant' });
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  window.scrollTo({ top: scrollHeight, behavior: 'instant' });
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Scroll complete');
}
