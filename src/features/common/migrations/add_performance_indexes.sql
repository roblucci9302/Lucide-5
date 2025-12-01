-- Performance Indexes Migration
-- Created: 2025-11-10
-- Purpose: Add database indexes to optimize common query patterns

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_uid_created
    ON documents(uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_uid_updated
    ON documents(uid, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_indexed
    ON documents(indexed);

-- Document chunks indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id
    ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_chunks_created
    ON document_chunks(created_at DESC);

-- Document citations indexes
CREATE INDEX IF NOT EXISTS idx_citations_session
    ON document_citations(session_id);

CREATE INDEX IF NOT EXISTS idx_citations_document
    ON document_citations(document_id);

CREATE INDEX IF NOT EXISTS idx_citations_message
    ON document_citations(message_id);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_uid_updated
    ON sessions(uid, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_uid_started
    ON sessions(uid, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_agent_profile
    ON sessions(agent_profile);

-- AI Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_session_created
    ON ai_messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_role
    ON ai_messages(role);

-- Users table indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_users_uid
    ON users(uid);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);
