/**
 * Simple LRU (Least Recently Used) Cache implementation
 * No external dependencies required
 */
class LRUCache {
    constructor(options = {}) {
        this.max = options.max || 100;  // Maximum number of items
        this.ttl = options.ttl || null;  // Time to live in milliseconds (null = no expiration)
        this.cache = new Map();
    }

    /**
     * Get a value from the cache
     * @param {string} key - The cache key
     * @returns {*} The cached value or undefined
     */
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }

        const item = this.cache.get(key);

        // Check if item has expired
        if (this.ttl && Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, item);

        return item.value;
    }

    /**
     * Set a value in the cache
     * @param {string} key - The cache key
     * @param {*} value - The value to cache
     */
    set(key, value) {
        // Delete if exists (to update position)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Add new item
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Check size limit
        if (this.cache.size > this.max) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Check if a key exists in the cache
     * @param {string} key - The cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        return this.get(key) !== undefined;
    }

    /**
     * Delete a key from the cache
     * @param {string} key - The cache key
     * @returns {boolean} True if key was deleted
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * Clear all items from the cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get the current size of the cache
     * @returns {number} Number of items in cache
     */
    get size() {
        return this.cache.size;
    }

    /**
     * Clean up expired items
     * @returns {number} Number of items removed
     */
    prune() {
        if (!this.ttl) return 0;

        let removed = 0;
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }
}

module.exports = LRUCache;
