const API_BASE = 'https://business-search-api-815700675676.us-central1.run.app';

class AuthService {
  constructor() {
    this.user = null;
    this.listeners = [];
    this._refreshPromise = null;
  }

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(user) {
    this.listeners.forEach(callback => callback(user));
  }

  async signIn() {
    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(token);
        });
      });

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await userInfoResponse.json();

      const authResponse = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Id': chrome.runtime.id,
          'X-Extension-Name': 'BulkListingPro'
        },
        body: JSON.stringify({
          googleToken: token,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate with backend');
      }

      const authData = await authResponse.json();

      this.user = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        isAdmin: authData.isAdmin || false
      };

      const storageData = {
        bulklistingpro_token: authData.token || token,
        bulklistingpro_user: this.user,
        authToken: authData.token || token
      };

      if (authData.isNewUser) {
        storageData.bulklistingpro_welcome_state = 'needs_welcome';
      }

      await chrome.storage.local.set(storageData);

      this.notifyListeners(this.user);
      return this.user;
    } catch (error) {
      console.error('[Auth] Sign in failed:', error);
      throw error;
    }
  }

  async refreshSession() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const googleToken = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
              reject(new Error(chrome.runtime.lastError?.message || 'No cached Google token'));
              return;
            }
            resolve(token);
          });
        });

        const stored = await chrome.storage.local.get(['bulklistingpro_user']);
        const cachedUser = stored.bulklistingpro_user || {};

        const authResponse = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Extension-Id': chrome.runtime.id,
            'X-Extension-Name': 'BulkListingPro'
          },
          body: JSON.stringify({
            googleToken,
            email: cachedUser.email,
            name: cachedUser.name,
            picture: cachedUser.picture
          })
        });

        if (!authResponse.ok) {
          throw new Error(`Refresh exchange failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const newToken = authData.token || googleToken;

        await chrome.storage.local.set({
          bulklistingpro_token: newToken,
          authToken: newToken
        });

        return newToken;
      } catch (error) {
        console.warn('[Auth] Session refresh failed:', error.message);
        return null;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  async signOut() {
    try {
      const result = await chrome.storage.local.get(['bulklistingpro_token']);
      const token = result.bulklistingpro_token;

      if (token) {
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
      }

      await chrome.storage.local.remove([
        'bulklistingpro_token',
        'bulklistingpro_user',
        'bulklistingpro_credits',
        'bulklistingpro_welcome_state',
        'authToken'
      ]);

      this.user = null;
      this.notifyListeners(null);
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  }

  async checkAuth() {
    try {
      const result = await chrome.storage.local.get(['bulklistingpro_user', 'bulklistingpro_token']);

      if (result.bulklistingpro_user && result.bulklistingpro_token) {
        this.user = result.bulklistingpro_user;
        return { authenticated: true, user: this.user };
      }

      return { authenticated: false, user: null };
    } catch (error) {
      console.error('[Auth] Check auth error:', error);
      return { authenticated: false, user: null };
    }
  }

  getUser() {
    return this.user;
  }
}

AuthService.instance = null;

export const authService = AuthService.getInstance();

async function buildAuthHeaders(extraHeaders) {
  const result = await chrome.storage.local.get(['bulklistingpro_token', 'authToken', 'sessionToken']);
  const token = result.bulklistingpro_token || result.authToken || result.sessionToken || null;
  const headers = {
    'X-Extension-Id': chrome.runtime.id || 'unknown',
    'X-Extension-Version': chrome.runtime.getManifest?.()?.version || '1.0.0',
    'X-Extension-Name': 'BulkListingPro',
    ...(extraHeaders || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function authFetch(url, options = {}) {
  let response = await fetch(url, { ...options, headers: await buildAuthHeaders(options.headers) });

  if (response.status === 401) {
    const newToken = await authService.refreshSession();
    if (newToken) {
      response = await fetch(url, { ...options, headers: await buildAuthHeaders(options.headers) });
    }
  }

  return response;
}
