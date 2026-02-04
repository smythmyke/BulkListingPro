const STORAGE_KEYS = {
  USER: 'bulklistingpro_user',
  TOKEN: 'bulklistingpro_token',
  CREDITS: 'bulklistingpro_credits',
  SETTINGS: 'bulklistingpro_settings',
  QUEUE: 'bulklistingpro_queue'
};

class StorageService {
  static getInstance() {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async get(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  }

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  async remove(key) {
    await chrome.storage.local.remove([key]);
  }

  async getMultiple(keys) {
    return chrome.storage.local.get(keys);
  }

  async clear() {
    await chrome.storage.local.clear();
  }

  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
}

StorageService.instance = null;

export const storageService = StorageService.getInstance();
export { STORAGE_KEYS };
