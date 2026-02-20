console.log('BulkListingPro amazon-scraper.js loaded on:', window.location.href);

function extractListingData() {
  const data = {
    url: window.location.href,
    platform: 'amazon',
    capturedAt: new Date().toISOString(),
    title: '',
    price: '',
    currency: 'USD',
    description: '',
    images: [],
    tags: [],
    featureBullets: [],
    productDetails: {},
    seller: { name: '', brand: '' }
  };

  const titleEl = document.querySelector('#productTitle');
  data.title = titleEl?.textContent?.trim() || '';

  const priceOffscreen = document.querySelector('#tp_price_block_total_price_ww .a-offscreen') ||
                         document.querySelector('.a-price .a-offscreen');
  if (priceOffscreen) {
    data.price = priceOffscreen.textContent.replace(/[^0-9.]/g, '');
    const priceText = priceOffscreen.textContent;
    if (priceText.includes('£')) data.currency = 'GBP';
    else if (priceText.includes('€')) data.currency = 'EUR';
  }

  data.images = extractImages();
  data.featureBullets = extractFeatureBullets();
  data.description = data.featureBullets.join('\n\n');
  data.productDetails = extractProductDetails();
  data.tags = generateTags(data.title, data.productDetails);

  const brandEl = document.querySelector('#bylineInfo') ||
                  document.querySelector('.po-break-word');
  if (brandEl) data.seller.brand = brandEl.textContent.replace(/^(Visit the |Brand:\s*)/i, '').replace(/\s*Store$/, '').trim();

  return data;
}

function extractImages() {
  const urls = [];
  const seen = new Set();

  const landingImg = document.querySelector('img#landingImage');
  if (landingImg) {
    const hiRes = landingImg.getAttribute('data-old-hires');
    if (hiRes && !seen.has(hiRes)) { seen.add(hiRes); urls.push(hiRes); }

    const dynamicData = landingImg.getAttribute('data-a-dynamic-image');
    if (dynamicData) {
      try {
        const parsed = JSON.parse(dynamicData);
        for (const imgUrl of Object.keys(parsed)) {
          if (!seen.has(imgUrl)) { seen.add(imgUrl); urls.push(imgUrl); }
        }
      } catch (e) {}
    }
  }

  const scripts = document.querySelectorAll('script[type="text/javascript"], script:not([type])');
  for (const script of scripts) {
    const text = script.textContent;
    if (!text.includes('colorImages')) continue;
    const match = text.match(/'colorImages':\s*\{\s*'initial':\s*(\[[\s\S]*?\])\s*\}/);
    if (!match) continue;
    try {
      const images = JSON.parse(match[1]);
      for (const img of images) {
        const src = img.hiRes || img.large || '';
        if (src && src.includes('media-amazon.com') && !seen.has(src)) {
          seen.add(src);
          urls.push(src);
        }
      }
    } catch (e) {}
    break;
  }

  if (urls.length === 0) {
    document.querySelectorAll('.imageThumbnail img, #altImages img').forEach(img => {
      let src = img.src || '';
      if (src && src.includes('media-amazon.com') && !seen.has(src)) {
        src = src.replace(/_AC_US\d+_/, '_AC_SL1500_').replace(/_SS\d+_/, '_AC_SL1500_');
        seen.add(src);
        urls.push(src);
      }
    });
  }

  console.log('Extracted Amazon images:', urls.length);
  return urls.slice(0, 10);
}

function extractFeatureBullets() {
  const bullets = [];
  document.querySelectorAll('#feature-bullets ul li span.a-list-item').forEach(el => {
    const text = el.textContent.trim();
    if (text && !text.startsWith('Make sure') && !text.startsWith('›')) {
      bullets.push(text);
    }
  });
  console.log('Extracted feature bullets:', bullets.length);
  return bullets;
}

function extractProductDetails() {
  const details = {};

  document.querySelectorAll('#productOverview_feature_div table tr').forEach(row => {
    const label = row.querySelector('td.a-span3 span')?.textContent?.trim();
    const value = row.querySelector('td.a-span9 span')?.textContent?.trim();
    if (label && value) details[label] = value;
  });

  document.querySelectorAll('#prodDetails table.prodDetTable tr, #detailBullets_feature_div li').forEach(el => {
    if (el.tagName === 'TR') {
      const label = el.querySelector('th')?.textContent?.trim().replace(/\s+/g, ' ');
      const value = el.querySelector('td')?.textContent?.trim().replace(/\s+/g, ' ');
      if (label && value) details[label] = value;
    } else {
      const spans = el.querySelectorAll('span span');
      if (spans.length >= 2) {
        const label = spans[0].textContent.trim().replace(/[:\s]+$/, '');
        const value = spans[1].textContent.trim();
        if (label && value) details[label] = value;
      }
    }
  });

  const asinEl = document.querySelector('input#ASIN');
  if (asinEl) details['ASIN'] = asinEl.value;

  console.log('Extracted product details:', Object.keys(details).length);
  return details;
}

function generateTags(title, details) {
  const tags = [];
  const stopWords = new Set(['the', 'and', 'for', 'with', 'new', 'from', 'that', 'this', 'are', 'was', 'has']);

  title.toLowerCase().split(/[\s,\-|()]+/).filter(w => w.length > 2 && w.length < 25).forEach(w => {
    if (!stopWords.has(w) && !tags.includes(w)) tags.push(w);
  });

  const tagFields = ['Brand', 'Material', 'Color', 'Style', 'Theme', 'Special Feature', 'Pattern', 'Item Shape'];
  for (const field of tagFields) {
    const val = details[field];
    if (val && val.length < 25) {
      const lower = val.toLowerCase();
      if (!tags.includes(lower)) tags.push(lower);
    }
  }

  return tags.slice(0, 13);
}

function isProductPage() {
  return !!document.querySelector('#productTitle');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('amazon-scraper received message:', message.type);
  if (message.type === 'EXTRACT_AMAZON_LISTING') {
    if (!isProductPage()) {
      sendResponse({ success: false, error: 'Not on an Amazon product page.' });
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
  console.log('Starting Amazon extraction with scroll...');
  await scrollPageToLoadContent();
  await new Promise(resolve => setTimeout(resolve, 500));
  window.scrollTo({ top: 0, behavior: 'instant' });
  return extractListingData();
}

async function scrollPageToLoadContent() {
  const scrollHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

  console.log(`Scrolling Amazon page (${scrollSteps} steps)...`);

  for (let i = 1; i <= scrollSteps; i++) {
    window.scrollTo({ top: i * viewportHeight, behavior: 'instant' });
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  window.scrollTo({ top: scrollHeight, behavior: 'instant' });
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Scroll complete');
}
