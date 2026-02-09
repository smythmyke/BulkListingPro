const API_BASE = 'https://business-search-api-815700675676.us-central1.run.app';

async function getAuthToken() {
  try {
    const result = await chrome.storage.local.get(['authToken', 'bulklistingpro_token', 'sessionToken']);
    return result.bulklistingpro_token || result.authToken || result.sessionToken || null;
  } catch (err) {
    console.error('[Affiliate] Error getting token:', err);
    return null;
  }
}

async function getApiHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Extension-Id': chrome.runtime.id || 'unknown',
    'X-Extension-Version': chrome.runtime.getManifest?.()?.version || '1.0.0',
    'X-Extension-Name': 'BulkListingPro'
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function applyCode(code) {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/affiliate/apply-code`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to apply code');
  }

  return response.json();
}

export async function getReferralCode() {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/referral/code`, { headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to get referral code');
  }

  return response.json();
}

export async function getReferralStats() {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/referral/stats`, { headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to get referral stats');
  }

  return response.json();
}

export async function getAffiliateStatus() {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/affiliate/status`, { headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to get affiliate status');
  }

  return response.json();
}

export async function applyAffiliate(promotionMethod = '') {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/affiliate/apply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ promotionMethod })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to apply for affiliate');
  }

  return response.json();
}

export async function getStripeConnectUrl() {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/affiliate/stripe-connect`, { headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to get Stripe Connect URL');
  }

  return response.json();
}

export async function getAffiliateDashboard() {
  const headers = await getApiHeaders();
  const response = await fetch(`${API_BASE}/api/affiliate/dashboard`, { headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to get affiliate dashboard');
  }

  return response.json();
}
