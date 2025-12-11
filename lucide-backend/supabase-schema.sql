/**
 * Lucide SaaS - Supabase PostgreSQL Schema
 *
 * This schema mirrors the SQLite schema with PostgreSQL enhancements:
 * - JSONB for JSON fields (better indexing and querying)
 * - Row Level Security (RLS) for multi-tenant isolation
 * - Triggers for automatic timestamps
 * - Indexes for optimal performance
 *
 * Run this in your Supabase SQL Editor to setup the database
 */

-- ============================================================================
-- DROP EXISTING TABLES (for clean reinstall)
-- ============================================================================

DROP TABLE IF EXISTS document_citations CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS prompt_presets CASCADE;
DROP TABLE IF EXISTS provider_settings CASCADE;
DROP TABLE IF EXISTS shortcuts CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
    uid TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    auto_update_enabled INTEGER DEFAULT 1,
    has_migrated_to_firebase INTEGER DEFAULT 0,
    active_agent_profile TEXT DEFAULT 'lucide_assistant',

    -- Phase 2: SaaS fields
    subscription_tier TEXT DEFAULT 'starter', -- 'starter', 'professional', 'enterprise'
    company_id TEXT, -- For multi-tenant support
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    last_sync_at BIGINT,

    -- Indexes
    CONSTRAINT valid_agent_profile CHECK (active_agent_profile IN ('lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert')),
    CONSTRAINT valid_subscription CHECK (subscription_tier IN ('starter', 'professional', 'enterprise'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_users_subscription ON users(subscription_tier);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT,
    session_type TEXT DEFAULT 'ask',
    started_at BIGINT,
    ended_at BIGINT,

    -- Phase 2: Enhanced conversation history
    tags JSONB DEFAULT '[]'::JSONB, -- Array of tags
    description TEXT,
    agent_profile TEXT, -- Which Lucy profile was used
    message_count INTEGER DEFAULT 0,
    auto_title INTEGER DEFAULT 1, -- 1 if title auto-generated, 0 if user-edited

    -- Phase 2: Sync metadata
    sync_state TEXT DEFAULT 'clean', -- 'clean', 'dirty', 'pending'
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,

    CONSTRAINT valid_session_type CHECK (session_type IN ('ask', 'listen', 'summary'))
);

CREATE INDEX idx_sessions_uid ON sessions(uid);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX idx_sessions_agent_profile ON sessions(agent_profile) WHERE agent_profile IS NOT NULL;
CREATE INDEX idx_sessions_tags ON sessions USING GIN (tags); -- JSONB index for tag searches
CREATE INDEX idx_sessions_sync_state ON sessions(sync_state) WHERE sync_state != 'clean';

-- ============================================================================
-- AI_MESSAGES TABLE
-- ============================================================================

CREATE TABLE ai_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sent_at BIGINT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER,
    model TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean',

    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_messages_session ON ai_messages(session_id);
CREATE INDEX idx_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX idx_messages_sync_state ON ai_messages(sync_state) WHERE sync_state != 'clean';
CREATE INDEX idx_messages_content_search ON ai_messages USING GIN (to_tsvector('english', content)); -- Full-text search

-- ============================================================================
-- TRANSCRIPTS TABLE
-- ============================================================================

CREATE TABLE transcripts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    start_at BIGINT,
    end_at BIGINT,
    speaker TEXT,
    text TEXT,
    lang TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_transcripts_session ON transcripts(session_id);
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at DESC);

-- ============================================================================
-- SUMMARIES TABLE
-- ============================================================================

CREATE TABLE summaries (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    generated_at BIGINT,
    model TEXT,
    text TEXT,
    tldr TEXT,
    bullet_json JSONB,
    action_json JSONB,
    tokens_used INTEGER,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

-- ============================================================================
-- PROMPT_PRESETS TABLE
-- ============================================================================

CREATE TABLE prompt_presets (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_presets_uid ON prompt_presets(uid);
CREATE INDEX idx_presets_default ON prompt_presets(is_default) WHERE is_default = 1;

-- ============================================================================
-- PROVIDER_SETTINGS TABLE
-- ============================================================================

CREATE TABLE provider_settings (
    provider TEXT PRIMARY KEY,
    api_key TEXT,
    selected_llm_model TEXT,
    selected_stt_model TEXT,
    is_active_llm INTEGER DEFAULT 0,
    is_active_stt INTEGER DEFAULT 0,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- ============================================================================
-- SHORTCUTS TABLE
-- ============================================================================

CREATE TABLE shortcuts (
    action TEXT PRIMARY KEY,
    accelerator TEXT NOT NULL,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE permissions (
    uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
    keychain_completed INTEGER DEFAULT 0
);

-- ============================================================================
-- DOCUMENTS TABLE (Phase 4: Knowledge Base)
-- ============================================================================

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    file_path TEXT,
    content TEXT,
    tags JSONB DEFAULT '[]'::JSONB,
    description TEXT,
    chunk_count INTEGER DEFAULT 0,
    indexed INTEGER DEFAULT 0,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_documents_uid ON documents(uid);
CREATE INDEX idx_documents_tags ON documents USING GIN (tags);
CREATE INDEX idx_documents_indexed ON documents(indexed) WHERE indexed = 1;

-- ============================================================================
-- DOCUMENT_CHUNKS TABLE (Phase 4: Knowledge Base)
-- ============================================================================

CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    char_start INTEGER,
    char_end INTEGER,
    token_count INTEGER,
    embedding JSONB, -- Vector embedding as JSON array
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_index ON document_chunks(chunk_index);

-- ============================================================================
-- DOCUMENT_CITATIONS TABLE (Phase 4: Knowledge Base)
-- ============================================================================

CREATE TABLE document_citations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id TEXT,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
    relevance_score REAL,
    context_used TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_citations_session ON document_citations(session_id);
CREATE INDEX idx_citations_document ON document_citations(document_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_citations ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY users_own_data ON users
    FOR ALL
    USING (auth.uid() = uid);

CREATE POLICY sessions_own_data ON sessions
    FOR ALL
    USING (auth.uid() = uid);

CREATE POLICY messages_own_sessions ON ai_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = ai_messages.session_id
            AND sessions.uid = auth.uid()
        )
    );

CREATE POLICY transcripts_own_sessions ON transcripts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = transcripts.session_id
            AND sessions.uid = auth.uid()
        )
    );

CREATE POLICY summaries_own_sessions ON summaries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = summaries.session_id
            AND sessions.uid = auth.uid()
        )
    );

CREATE POLICY presets_own_data ON prompt_presets
    FOR ALL
    USING (auth.uid() = uid);

CREATE POLICY permissions_own_data ON permissions
    FOR ALL
    USING (auth.uid() = uid);

CREATE POLICY documents_own_data ON documents
    FOR ALL
    USING (auth.uid() = uid);

CREATE POLICY chunks_own_documents ON document_chunks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_chunks.document_id
            AND documents.uid = auth.uid()
        )
    );

CREATE POLICY citations_own_sessions ON document_citations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = document_citations.session_id
            AND sessions.uid = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant SELECT to anonymous users for public-facing data (if needed)
-- GRANT SELECT ON users TO anon;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a test user
INSERT INTO users (uid, display_name, email, subscription_tier)
VALUES (
    'test-user-001',
    'Test User',
    'test@lucide.ai',
    'professional'
) ON CONFLICT (uid) DO NOTHING;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Lucide SaaS - Cloud database schema with multi-device sync support';
