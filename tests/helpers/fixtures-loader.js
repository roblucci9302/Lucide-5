/**
 * Fixtures Loader
 *
 * Utility to load test fixtures from JSON files
 */

const fs = require('fs');
const path = require('path');
const { loaders } = require('../../src/features/common/utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;

class FixturesLoader {
    constructor() {
        this.fixturesPath = path.join(__dirname, '../fixtures');
    }

    /**
     * Load fixtures from a JSON file
     * @param {string} filename - Fixture filename (e.g., 'documents.json')
     * @returns {Array} Parsed fixture data
     */
    load(filename) {
        const filePath = path.join(this.fixturesPath, filename);

        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`[FixturesLoader] Error loading ${filename}:`, error.message);
            return [];
        }
    }

    /**
     * Load external sources fixtures
     * @param {boolean} withIds - Add UUID to each record
     * @returns {Array} External sources data
     */
    loadExternalSources(withIds = true) {
        const sources = this.load('external-sources.json');

        if (withIds) {
            return sources.map(source => ({
                id: uuidv4(),
                ...source,
                created_at: Date.now(),
                updated_at: Date.now()
            }));
        }

        return sources;
    }

    /**
     * Load documents fixtures
     * @param {boolean} withIds - Add UUID to each record
     * @returns {Array} Documents data
     */
    loadDocuments(withIds = true) {
        const docs = this.load('documents.json');

        if (withIds) {
            return docs.map(doc => ({
                id: uuidv4(),
                ...doc,
                created_at: Date.now()
            }));
        }

        return docs;
    }

    /**
     * Get a single random document
     * @returns {Object} Random document
     */
    getRandomDocument() {
        const docs = this.loadDocuments(true);
        return docs[Math.floor(Math.random() * docs.length)];
    }

    /**
     * Get a single random external source
     * @returns {Object} Random external source
     */
    getRandomExternalSource() {
        const sources = this.loadExternalSources(true);
        return sources[Math.floor(Math.random() * sources.length)];
    }

    /**
     * Create minimal document for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} Document object
     */
    createDocument(overrides = {}) {
        return {
            id: uuidv4(),
            title: 'Test Document',
            content: 'Test content',
            file_type: 'txt',
            tags: [],
            indexed: false,
            created_at: Date.now(),
            ...overrides
        };
    }

    /**
     * Create minimal external source for testing
     * @param {Object} overrides - Properties to override
     * @returns {Object} External source object
     */
    createExternalSource(overrides = {}) {
        return {
            id: uuidv4(),
            user_id: 'test_user',
            source_type: 'postgres',
            source_name: 'Test Source',
            connection_config: { host: 'localhost' },
            status: 'active',
            created_at: Date.now(),
            updated_at: Date.now(),
            ...overrides
        };
    }
}

module.exports = { FixturesLoader };
