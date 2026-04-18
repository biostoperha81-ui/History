/**
 * Robust storage utility for game persistence.
 */

const STORAGE_KEY_PREFIX = 'novel_v1_';

export const storage = {
  save: (key: string, data: any) => {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, serialized);
    } catch (error) {
      console.error(`Storage save error for key "${key}":`, error);
      // Handle quota exceeded or other errors
    }
  },

  load: <T>(key: string, defaultValueBuilder: () => T): T => {
    try {
      const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
      if (!item) return defaultValueBuilder();
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Storage load error for key "${key}":`, error);
      return defaultValueBuilder();
    }
  },

  clear: () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
};
