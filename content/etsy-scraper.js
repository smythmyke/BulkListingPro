console.log('BulkListingPro etsy-scraper.js loaded on:', window.location.href);

const LISTING_SELECTORS = {
  title: 'h1[data-buy-box-listing-title]',
  price: '[data-buy-box-region="price"] p.wt-text-title-larger',
  priceAlt: '[data-buy-box-region="price"] .wt-text-title-larger',
  description: '[data-product-details-description-text-content]',
  descriptionAlt: '[data-id="description-text"]',
  // Multiple shop name selectors in order of preference
  shopName: [
    'a[href*="/shop/"][href*="ref=shop-header-name"]',
    'a[href*="/shop/"] p.wt-text-heading',
    'a[href*="/shop/"].wt-text-link-no-underline.wt-text-title',
    'a[href*="ref=l2-about-shopname"]',
    '[data-shop-name]'
  ],
  reviewRating: '[data-reviews-section] input[name="rating"]',
  reviewCount: '[data-reviews-section] .wt-text-caption',
  favorites: '[data-favorite-count]',
  favoritesAlt: 'button[aria-label*="favorite"] span',
  category: '#breadcrumbs-block ol li'
};

function extractListingData() {
  const data = {
    url: window.location.href,
    capturedAt: new Date().toISOString(),
    title: '',
    price: '',
    currency: 'USD',
    tags: [],
    description: '',
    shopName: '',
    shopUrl: '',
    images: [],
    reviews: { rating: 0, count: 0 },
    favorites: 0,
    category: ''
  };

  const titleEl = document.querySelector(LISTING_SELECTORS.title);
  data.title = titleEl?.textContent?.trim() || '';

  const priceEl = document.querySelector(LISTING_SELECTORS.price) ||
                  document.querySelector(LISTING_SELECTORS.priceAlt);
  if (priceEl) {
    const priceText = priceEl.textContent.trim();
    data.price = priceText.replace(/[^0-9.]/g, '');
    data.currency = priceText.includes('$') ? 'USD' :
                    priceText.includes('€') ? 'EUR' :
                    priceText.includes('£') ? 'GBP' : 'USD';
  }

  data.tags = extractTags();

  const descEl = document.querySelector(LISTING_SELECTORS.description) ||
                 document.querySelector(LISTING_SELECTORS.descriptionAlt);
  data.description = descEl?.textContent?.trim() || '';

  // Try multiple selectors for shop name
  let shopName = '';
  let shopUrl = '';

  for (const selector of LISTING_SELECTORS.shopName) {
    const el = document.querySelector(selector);
    if (el) {
      shopName = el.textContent?.trim() || '';
      if (shopName) {
        console.log('Found shop name with selector:', selector, shopName);
        break;
      }
    }
  }

  // Extract shop URL from any shop link
  const shopLink = document.querySelector('a[href*="/shop/"][href*="ref="]') ||
                   document.querySelector('a[href*="/shop/"]');
  if (shopLink) {
    shopUrl = shopLink.href;
    // Extract shop name from URL if not found elsewhere
    if (!shopName) {
      const urlMatch = shopLink.href.match(/\/shop\/([^?/]+)/);
      if (urlMatch) {
        shopName = urlMatch[1];
        console.log('Extracted shop name from URL:', shopName);
      }
    }
  }

  data.shopName = shopName;
  data.shopUrl = shopUrl;

  const ratingEl = document.querySelector(LISTING_SELECTORS.reviewRating);
  if (ratingEl) {
    data.reviews.rating = parseFloat(ratingEl.value) || 0;
  }

  const reviewCountText = document.querySelector(LISTING_SELECTORS.reviewCount)?.textContent || '';
  const countMatch = reviewCountText.match(/(\d[\d,]*)\s*reviews?/i);
  if (countMatch) {
    data.reviews.count = parseInt(countMatch[1].replace(/,/g, '')) || 0;
  }

  const favEl = document.querySelector(LISTING_SELECTORS.favorites) ||
                document.querySelector(LISTING_SELECTORS.favoritesAlt);
  if (favEl) {
    const favText = favEl.textContent || favEl.getAttribute('data-favorite-count') || '';
    data.favorites = parseInt(favText.replace(/[^0-9]/g, '')) || 0;
  }

  data.category = extractCategory();
  data.images = extractImages();

  return data;
}

function extractImages() {
  const urls = [];
  const seen = new Set();

  const carouselImgs = document.querySelectorAll('ul.carousel-pane-list img[src*="etsystatic.com"]');
  for (const img of carouselImgs) {
    const src = img.src || img.getAttribute('data-src') || '';
    if (src && !seen.has(src)) {
      seen.add(src);
      urls.push(src.replace(/_\d+x\d+/, '_fullxfull'));
    }
  }

  if (urls.length === 0) {
    const allImgs = document.querySelectorAll('img[src*="etsystatic.com/i"]');
    for (const img of allImgs) {
      const src = img.src || '';
      if (src && src.includes('/il/') && !seen.has(src)) {
        seen.add(src);
        urls.push(src.replace(/_\d+x\d+/, '_fullxfull'));
      }
    }
  }

  if (urls.length === 0) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        if (parsed['@type'] === 'Product' && parsed.image) {
          const imgs = Array.isArray(parsed.image) ? parsed.image : [parsed.image];
          for (const u of imgs) {
            if (u && !seen.has(u)) { seen.add(u); urls.push(u); }
          }
        }
      } catch (e) {}
    }
  }

  console.log('Extracted images:', urls.length);
  return urls.slice(0, 10);
}

function extractCategory() {
  console.log('Extracting category...');

  // Method 1: Breadcrumb links with data attribute (primary method)
  const breadcrumbLinks = document.querySelectorAll('a[data-breadcrumb-link]');
  if (breadcrumbLinks.length > 0) {
    const category = Array.from(breadcrumbLinks)
      .map(a => a.textContent.trim())
      .filter(t => t && t !== 'Homepage' && t !== 'Home')
      .join(' > ');
    if (category) {
      console.log('Category from data-breadcrumb-link:', category);
      return category;
    }
  }

  // Method 2: Breadcrumb links with ref param
  const refBreadcrumbs = document.querySelectorAll('a[href*="ref=breadcrumb"]');
  if (refBreadcrumbs.length > 0) {
    const category = Array.from(refBreadcrumbs)
      .map(a => a.textContent.trim())
      .filter(t => t && t !== 'Homepage' && t !== 'Home')
      .join(' > ');
    if (category) {
      console.log('Category from ref=breadcrumb:', category);
      return category;
    }
  }

  // Method 3: Standard breadcrumbs block
  const breadcrumbs = document.querySelectorAll('#breadcrumbs-block ol li');
  if (breadcrumbs.length > 0) {
    const category = Array.from(breadcrumbs)
      .map(li => li.textContent.trim())
      .filter(t => t && t !== '>' && t !== 'Home' && t !== 'Homepage')
      .join(' > ');
    if (category) {
      console.log('Category from breadcrumbs block:', category);
      return category;
    }
  }

  // Method 4: JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script.textContent);

      // Check for BreadcrumbList
      if (parsed['@type'] === 'BreadcrumbList' && parsed.itemListElement) {
        const items = parsed.itemListElement
          .sort((a, b) => a.position - b.position)
          .map(item => item.name || item.item?.name)
          .filter(name => name && name !== 'Home' && name !== 'Homepage');
        if (items.length > 0) {
          const category = items.join(' > ');
          console.log('Category from JSON-LD BreadcrumbList:', category);
          return category;
        }
      }

      // Check for Product category
      if (parsed['@type'] === 'Product' && parsed.category) {
        console.log('Category from JSON-LD Product:', parsed.category);
        return parsed.category;
      }
    } catch (e) {}
  }

  console.log('No category found');
  return '';
}

function extractTags() {
  let tags = [];
  console.log('Extracting tags/related searches...');

  // Note: Etsy doesn't expose seller's 13 tags publicly.
  // We extract "Related Searches" which are derived from the listing's tags.

  // Method 1: Extract from "Explore related searches" section (visual tags)
  const visualTags = document.querySelectorAll('.visual-search-tags-bubbles__title');
  visualTags.forEach(el => {
    const text = el.textContent.trim();
    if (text && !tags.includes(text)) {
      tags.push(text);
    }
  });
  console.log('Visual tags found:', tags.length);

  // Method 2: Extract from "Explore more related searches" section (text tags)
  const textTagLinks = document.querySelectorAll('.tags-section-container a[href*="/market/"]');
  textTagLinks.forEach(el => {
    const text = el.textContent.trim();
    if (text && !tags.includes(text)) {
      tags.push(text);
    }
  });
  console.log('Text tag links found, total now:', tags.length);

  // Method 3: Extract from wt-action-group links (alternative selector)
  if (tags.length === 0) {
    const actionLinks = document.querySelectorAll('.wt-action-group__item');
    actionLinks.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length < 40 && !tags.includes(text)) {
        tags.push(text);
      }
    });
  }

  // Method 4: Try JSON-LD keywords as fallback
  if (tags.length === 0) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        if (parsed.keywords) {
          const keywords = typeof parsed.keywords === 'string'
            ? parsed.keywords.split(',').map(t => t.trim())
            : parsed.keywords;
          tags = keywords.filter(t => t);
          if (tags.length > 0) break;
        }
      } catch (e) {}
    }
  }

  // Method 5: Meta keywords fallback
  if (tags.length === 0) {
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      tags = metaKeywords.content.split(',').map(t => t.trim()).filter(t => t);
    }
  }

  console.log('Final extracted tags/keywords:', tags);
  return tags.slice(0, 13);
}

function isListingPage() {
  return window.location.pathname.includes('/listing/');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('etsy-scraper received message:', message.type);
  if (message.type === 'EXTRACT_LISTING_DATA') {
    if (!isListingPage()) {
      sendResponse({
        success: false,
        error: 'Not on an Etsy listing page. Please navigate to a product listing.'
      });
      return true;
    }

    // Use async extraction to wait for lazy-loaded content
    extractListingDataAsync().then(data => {
      if (!data.title) {
        sendResponse({
          success: false,
          error: 'Could not extract listing data. The page may still be loading.'
        });
      } else {
        sendResponse({ success: true, data });
      }
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep channel open for async response
  }
  return true;
});

async function extractListingDataAsync() {
  console.log('Starting extraction with scroll...');

  // Scroll to bottom to trigger all lazy-loaded content
  await scrollPageToLoadContent();

  // Wait a moment for content to render
  await new Promise(resolve => setTimeout(resolve, 500));

  // Scroll back to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  return extractListingData();
}

async function scrollPageToLoadContent() {
  const scrollHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

  console.log(`Scrolling page (${scrollSteps} steps)...`);

  // Scroll down in steps to trigger lazy loading
  for (let i = 1; i <= scrollSteps; i++) {
    window.scrollTo({
      top: i * viewportHeight,
      behavior: 'instant'
    });
    // Small delay to let content load
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // Scroll to absolute bottom
  window.scrollTo({ top: scrollHeight, behavior: 'instant' });
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log('Scroll complete');
}
