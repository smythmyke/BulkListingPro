const API_BASE = 'https://business-search-api-815700675676.us-central1.run.app';

async function getAuthToken() {
  const result = await chrome.storage.local.get(['bulklistingpro_token', 'authToken', 'sessionToken']);
  return result.bulklistingpro_token || result.authToken || result.sessionToken || null;
}

export async function generateListingContent({ fields, category, title, description, tags, keywords, style }) {
  const token = await getAuthToken();
  if (!token) {
    throw { error: 'not_authenticated', message: 'Sign in required to use AI generation' };
  }

  if (!fields || fields.length === 0) {
    throw { error: 'validation', message: 'Select at least one field to generate' };
  }

  const response = await fetch(`${API_BASE}/api/v1/generate-listing-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Extension-Id': chrome.runtime.id || 'bulklistingpro',
      'X-Extension-Version': chrome.runtime.getManifest?.()?.version || '1.0.0'
    },
    body: JSON.stringify({ fields, category, title, description, tags, keywords, style: style || 'descriptive' })
  });

  if (!response.ok) {
    let data = {};
    try { data = await response.json(); } catch (e) {}

    if (response.status === 401) {
      throw { error: 'not_authenticated', message: 'Sign in required' };
    }
    if (response.status === 402) {
      throw { error: 'insufficient_credits', message: data.message || 'Not enough credits', creditsRemaining: data.creditsRemaining || 0 };
    }
    if (response.status === 503) {
      throw { error: 'unavailable', message: 'AI service temporarily unavailable' };
    }
    throw { error: 'api_error', message: data.message || 'Generation failed' };
  }

  return await response.json();
}

export async function generateForListing(listing, fields, options = {}) {
  return generateListingContent({
    fields,
    category: listing.category || '',
    title: listing.title || '',
    description: listing.description || '',
    tags: listing.tags || [],
    keywords: options.keywords || '',
    style: options.style || 'descriptive'
  });
}

export async function bulkGenerate(listings, fields, options = {}, onProgress) {
  const results = [];
  let cancelled = false;

  const cancel = () => { cancelled = true; };

  for (let i = 0; i < listings.length; i++) {
    if (cancelled) break;

    if (onProgress) onProgress({ current: i, total: listings.length, cancel });

    try {
      const result = await generateForListing(listings[i], fields, options);
      results.push({ listingId: listings[i].id, success: true, result });
    } catch (err) {
      if (err.error === 'insufficient_credits') {
        results.push({ listingId: listings[i].id, success: false, error: err });
        break;
      }
      results.push({ listingId: listings[i].id, success: false, error: err });
    }
  }

  if (onProgress) onProgress({ current: listings.length, total: listings.length, done: true, cancel });

  return results;
}

export async function evaluateListing(listing) {
  const token = await getAuthToken();
  if (!token) {
    throw { error: 'not_authenticated', message: 'Sign in required to use evaluation' };
  }

  let imageCount = 0;
  for (let i = 1; i <= 10; i++) {
    if (listing[`image_${i}`]) imageCount++;
  }

  const response = await fetch(`${API_BASE}/api/v1/evaluate-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Extension-Id': chrome.runtime.id || 'bulklistingpro',
      'X-Extension-Version': chrome.runtime.getManifest?.()?.version || '1.0.0'
    },
    body: JSON.stringify({
      title: listing.title || '',
      description: listing.description || '',
      tags: listing.tags || [],
      price: listing.price || '',
      category: listing.category || '',
      imageCount
    })
  });

  if (!response.ok) {
    let data = {};
    try { data = await response.json(); } catch (e) {}

    if (response.status === 401) {
      throw { error: 'not_authenticated', message: 'Sign in required' };
    }
    if (response.status === 402) {
      throw { error: 'insufficient_credits', message: data.message || 'Not enough credits', creditsRemaining: data.creditsRemaining || 0 };
    }
    if (response.status === 503) {
      throw { error: 'unavailable', message: 'AI service temporarily unavailable' };
    }
    throw { error: 'api_error', message: data.message || 'Evaluation failed' };
  }

  return await response.json();
}

export async function bulkEvaluate(listings, onProgress) {
  const results = [];
  let cancelled = false;

  const cancel = () => { cancelled = true; };

  for (let i = 0; i < listings.length; i++) {
    if (cancelled) break;

    if (onProgress) onProgress({ current: i, total: listings.length, cancel });

    try {
      const result = await evaluateListing(listings[i]);
      results.push({ listingId: listings[i].id, success: true, result });
    } catch (err) {
      if (err.error === 'insufficient_credits') {
        results.push({ listingId: listings[i].id, success: false, error: err });
        break;
      }
      results.push({ listingId: listings[i].id, success: false, error: err });
    }
  }

  if (onProgress) onProgress({ current: listings.length, total: listings.length, done: true, cancel });

  return results;
}
