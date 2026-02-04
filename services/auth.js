const API_BASE = 'https://business-search-api-815700675676.us-central1.run.app';

class AuthService {
  constructor() {
    this.user = null;
    this.listeners = [];
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

      await chrome.storage.local.set({
        bulklistingpro_token: authData.token || token,
        bulklistingpro_user: this.user,
        authToken: authData.token || token
      });

      this.notifyListeners(this.user);
      return this.user;
    } catch (error) {
      console.error('[Auth] Sign in failed:', error);
      throw error;
    }
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
