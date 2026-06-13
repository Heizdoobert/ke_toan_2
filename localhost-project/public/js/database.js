/**
 * Database — localStorage persistence layer.
 * Extracted from app.js class Database.
 */
class Database {
  static getCacheKey() {
    return "reconciler_pro_rules_cache";
  }

  static saveConfig(schema, headersA = [], headersB = []) {
    try {
      const cacheObj = { schema, headersA, headersB };
      localStorage.setItem(this.getCacheKey(), JSON.stringify(cacheObj));
    } catch (e) {
      console.warn("Local storage cache write failed:", e);
    }
  }

  static restoreConfig() {
    try {
      const savedObj = localStorage.getItem(this.getCacheKey());
      return savedObj ? JSON.parse(savedObj) : null;
    } catch {
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(this.getCacheKey());
  }
}
