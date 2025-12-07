/**
 * Application Constants
 *
 * Centralized configuration for magic numbers and common values.
 */

/**
 * Query and Pagination Constants
 */
const QUERY = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
    DEFAULT_OFFSET: 0,
    SEARCH_MAX_LENGTH: 500
};

/**
 * Document Management Constants
 */
const DOCUMENTS = {
    MAX_FILE_SIZE_MB: 100,
    MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024,
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_TAGS: 20,
    MAX_TAG_LENGTH: 50,
    MAX_FILENAME_LENGTH: 255,

    // Allowed sort columns
    ALLOWED_SORT_COLUMNS: ['created_at', 'updated_at', 'title', 'filename', 'file_size', 'file_type'],

    // Supported file types
    SUPPORTED_EXTENSIONS: ['txt', 'md', 'pdf', 'docx']
};

/**
 * Session/Conversation Constants
 */
const SESSIONS = {
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_TAGS: 10,

    // Allowed sort columns
    ALLOWED_SORT_COLUMNS: ['updated_at', 'started_at', 'title', 'created_at'],

    // Valid agent profiles
    VALID_PROFILES: ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert']
};

/**
 * Indexing and Chunking Constants
 */
const INDEXING = {
    CHUNK_SIZE: 500,              // Characters per chunk
    CHUNK_OVERLAP: 100,           // Overlap between chunks
    MAX_CHUNKS_SEARCH: 5000,      // Limit semantic search to most recent chunks
    EMBEDDING_DIMENSIONS: 384     // Mock embedding dimensions
};

/**
 * RAG (Retrieval Augmented Generation) Constants
 */
const RAG = {
    MAX_CONTEXT_TOKENS: 8000,     // Maximum tokens for injected context (~8 pages)
    MIN_RELEVANCE_SCORE: 0.5,     // Minimum similarity score (lowered for MockEmbedding compatibility)
    DEFAULT_MAX_CHUNKS: 10,       // Default number of chunks to retrieve
    MIN_MAX_CHUNKS: 1,            // Minimum chunks
    MAX_MAX_CHUNKS: 40,           // Maximum chunks
    MAX_DOCUMENT_IDS: 100         // Maximum document IDs in filter
};

/**
 * Token Estimation Constants
 */
const TOKENS = {
    CHARS_PER_TOKEN: 4            // Rough estimation: ~4 characters per token
};

/**
 * Database Sort Orders
 */
const SORT_ORDERS = ['ASC', 'DESC'];

/**
 * File Upload Constants
 */
const UPLOAD = {
    BUFFER_MAX_SIZE: 100 * 1024 * 1024,  // 100MB
    CHUNK_SIZE: 64 * 1024                 // 64KB chunks for streaming
};

/**
 * Validation Constants
 */
const VALIDATION = {
    EMAIL_MAX_LENGTH: 255,
    UID_MAX_LENGTH: 128,
    QUERY_MAX_LENGTH: 500
};

/**
 * Cache Constants
 */
const CACHE = {
    TITLE_CACHE_SIZE: 100,        // Number of titles to cache
    TITLE_CACHE_TTL: 3600000      // 1 hour in milliseconds
};

/**
 * Time Constants (milliseconds)
 */
const TIME = {
    // Seconds
    ONE_SECOND: 1000,
    TWO_SECONDS: 2000,
    FIVE_SECONDS: 5000,
    EIGHT_SECONDS: 8000,
    TEN_SECONDS: 10000,
    THIRTY_SECONDS: 30000,

    // Minutes
    ONE_MINUTE: 60 * 1000,
    TWO_MINUTES: 2 * 60 * 1000,
    FIVE_MINUTES: 5 * 60 * 1000,

    // Common timeouts
    QUICK_TIMEOUT: 5000,          // 5 seconds
    STANDARD_TIMEOUT: 30000,      // 30 seconds
    LONG_TIMEOUT: 120000,         // 2 minutes
    DOWNLOAD_TIMEOUT: 300000,     // 5 minutes
};

/**
 * Retry Configuration
 */
const RETRY = {
    MAX_ATTEMPTS: 3,
    MAX_ATTEMPTS_NETWORK: 4,
    INITIAL_DELAY: 1000,          // 1 second
    BACKOFF_MULTIPLIER: 2,
};

/**
 * Service Configuration
 */
const SERVICE = {
    SYNC_INTERVAL: 30000,         // 30 seconds
    SHUTDOWN_TIMEOUT: 8000,       // 8 seconds
    MAX_WAIT_ATTEMPTS: 30,
    WAIT_DELAY: 1000,             // 1 second
};

/**
 * Model Configuration
 */
const MODEL = {
    WARMUP_TIMEOUT: 120000,       // 2 minutes
    WARMUP_COOLDOWN: 5000,        // 5 seconds
    CHUNK_SIZE: 10,               // Process 10 items before yielding
};

/**
 * Window Configuration
 */
const WINDOW = {
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 600,
    HEADER_HEIGHT: 40,

    // Feature windows
    LISTEN_MIN_WIDTH: 400,
    LISTEN_DEFAULT_WIDTH: 400,
    LISTEN_MAX_WIDTH: 900,
    LISTEN_MAX_HEIGHT: 900,

    ASK_DEFAULT_WIDTH: 900,
    ASK_BROWSER_WIDTH: 900,
    ASK_BROWSER_HEIGHT: 900,

    // Settings window
    SETTINGS_WIDTH: 240,
    SETTINGS_MAX_HEIGHT: 400,
    SETTINGS_HIDE_DELAY: 200,

    // Post-meeting window
    POST_MEETING_WIDTH: 700,
    POST_MEETING_MAX_HEIGHT: 800,
};

/**
 * Get all constants
 */
function getAllConstants() {
    return {
        QUERY,
        DOCUMENTS,
        SESSIONS,
        INDEXING,
        RAG,
        TOKENS,
        SORT_ORDERS,
        UPLOAD,
        VALIDATION,
        CACHE,
        TIME,
        RETRY,
        SERVICE,
        MODEL,
        WINDOW
    };
}

module.exports = {
    QUERY,
    DOCUMENTS,
    SESSIONS,
    INDEXING,
    RAG,
    TOKENS,
    SORT_ORDERS,
    UPLOAD,
    VALIDATION,
    CACHE,
    TIME,
    RETRY,
    SERVICE,
    MODEL,
    WINDOW,
    getAllConstants
};
