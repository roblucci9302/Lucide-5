const LATEST_SCHEMA = {
    users: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            { name: 'display_name', type: 'TEXT NOT NULL' },
            { name: 'email', type: 'TEXT NOT NULL' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'auto_update_enabled', type: 'INTEGER DEFAULT 1' },
            { name: 'has_migrated_to_firebase', type: 'INTEGER DEFAULT 0' },
            { name: 'active_agent_profile', type: 'TEXT DEFAULT \'lucide_assistant\'' }
        ]
    },
    sessions: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'title', type: 'TEXT' },
            { name: 'session_type', type: 'TEXT DEFAULT \'ask\'' },
            { name: 'started_at', type: 'INTEGER' },
            { name: 'ended_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' },
            { name: 'updated_at', type: 'INTEGER' },
            // Phase 2: Enhanced conversation history
            { name: 'tags', type: 'TEXT' }, // JSON array: ["work", "personal", etc.]
            { name: 'description', type: 'TEXT' }, // Optional longer description
            { name: 'agent_profile', type: 'TEXT' }, // Which Lucy profile was used
            { name: 'message_count', type: 'INTEGER DEFAULT 0' }, // Number of messages
            { name: 'auto_title', type: 'INTEGER DEFAULT 1' }, // 1 if title auto-generated
            // Fix HIGH BUG: Persist session processing flag
            { name: 'is_post_processed', type: 'INTEGER DEFAULT 0' } // 1 if meeting notes have been generated
        ]
    },
    transcripts: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' },
            { name: 'start_at', type: 'INTEGER' },
            { name: 'end_at', type: 'INTEGER' },
            { name: 'speaker', type: 'TEXT' },
            { name: 'text', type: 'TEXT' },
            { name: 'lang', type: 'TEXT' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ],
        // Fix HIGH BUG: Document FK constraints (enforced via deleteWithRelatedData in session repository)
        constraints: ['FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE']
    },
    ai_messages: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' },
            { name: 'sent_at', type: 'INTEGER' },
            { name: 'role', type: 'TEXT' },
            { name: 'content', type: 'TEXT' },
            { name: 'tokens', type: 'INTEGER' },
            { name: 'model', type: 'TEXT' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ],
        // Fix HIGH BUG: Document FK constraints (enforced via deleteWithRelatedData in session repository)
        constraints: ['FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE']
    },
    summaries: {
        columns: [
            { name: 'session_id', type: 'TEXT PRIMARY KEY' },
            { name: 'generated_at', type: 'INTEGER' },
            { name: 'model', type: 'TEXT' },
            { name: 'text', type: 'TEXT' },
            { name: 'tldr', type: 'TEXT' },
            { name: 'bullet_json', type: 'TEXT' },
            { name: 'action_json', type: 'TEXT' },
            { name: 'tokens_used', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ],
        // Fix HIGH BUG: Document FK constraints (session_id is PK so deletion deletes this row too)
        constraints: ['FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE']
    },
    prompt_presets: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'title', type: 'TEXT NOT NULL' },
            { name: 'prompt', type: 'TEXT NOT NULL' },
            { name: 'is_default', type: 'INTEGER NOT NULL' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    ollama_models: {
        columns: [
            { name: 'name', type: 'TEXT PRIMARY KEY' },
            { name: 'size', type: 'TEXT NOT NULL' },
            { name: 'installed', type: 'INTEGER DEFAULT 0' },
            { name: 'installing', type: 'INTEGER DEFAULT 0' }
        ]
    },
    whisper_models: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'name', type: 'TEXT NOT NULL' },
            { name: 'size', type: 'TEXT NOT NULL' },
            { name: 'installed', type: 'INTEGER DEFAULT 0' },
            { name: 'installing', type: 'INTEGER DEFAULT 0' }
        ]
    },
    provider_settings: {
        columns: [
            { name: 'provider', type: 'TEXT NOT NULL' },
            { name: 'api_key', type: 'TEXT' },
            { name: 'selected_llm_model', type: 'TEXT' },
            { name: 'selected_stt_model', type: 'TEXT' },
            { name: 'is_active_llm', type: 'INTEGER DEFAULT 0' },
            { name: 'is_active_stt', type: 'INTEGER DEFAULT 0' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' }
        ],
        constraints: ['PRIMARY KEY (provider)']
    },
    shortcuts: {
        columns: [
            { name: 'action', type: 'TEXT PRIMARY KEY' },
            { name: 'accelerator', type: 'TEXT NOT NULL' },
            { name: 'created_at', type: 'INTEGER' }
        ]
    },
    permissions: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            { name: 'keychain_completed', type: 'INTEGER DEFAULT 0' }
        ]
    },
    // Phase 4: Knowledge Base - Document Management
    documents: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' }, // Owner
            { name: 'title', type: 'TEXT NOT NULL' }, // Document title
            { name: 'filename', type: 'TEXT NOT NULL' }, // Original filename
            { name: 'file_type', type: 'TEXT NOT NULL' }, // pdf, docx, txt, md
            { name: 'file_size', type: 'INTEGER' }, // Size in bytes
            { name: 'file_path', type: 'TEXT' }, // Local file path or cloud URL
            { name: 'content', type: 'TEXT' }, // Extracted text content
            { name: 'content_hash', type: 'TEXT' }, // KB-P2-5: SHA-256 hash for duplicate detection
            { name: 'tags', type: 'TEXT' }, // JSON array of tags
            { name: 'description', type: 'TEXT' }, // Optional description
            { name: 'chunk_count', type: 'INTEGER DEFAULT 0' }, // Number of chunks
            { name: 'indexed', type: 'INTEGER DEFAULT 0' }, // 1 if indexed with embeddings
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 4: Knowledge Base - Document Chunks for Semantic Search
    document_chunks: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'document_id', type: 'TEXT NOT NULL' }, // Foreign key to documents
            { name: 'chunk_index', type: 'INTEGER NOT NULL' }, // Order in document
            { name: 'content', type: 'TEXT NOT NULL' }, // Chunk text
            { name: 'char_start', type: 'INTEGER' }, // Start position in original
            { name: 'char_end', type: 'INTEGER' }, // End position in original
            { name: 'token_count', type: 'INTEGER' }, // Estimated tokens
            { name: 'embedding', type: 'TEXT' }, // JSON array of vector floats
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 4: Knowledge Base - Citation Tracking
    document_citations: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' }, // Related conversation
            { name: 'message_id', type: 'TEXT' }, // AI message that cited
            { name: 'document_id', type: 'TEXT NOT NULL' }, // Cited document
            { name: 'chunk_id', type: 'TEXT' }, // Specific chunk cited
            { name: 'relevance_score', type: 'REAL' }, // Similarity score
            { name: 'context_used', type: 'TEXT' }, // Actual text included in prompt
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase WOW 1: User Profiles & Onboarding
    user_profiles: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            { name: 'active_profile', type: 'TEXT DEFAULT \'lucide_assistant\'' }, // Current active profile
            { name: 'onboarding_completed', type: 'INTEGER DEFAULT 0' }, // 1 if onboarding done
            { name: 'profile_preferences', type: 'TEXT' }, // JSON: {industry, company_size, goals, etc.}
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase WOW 1: Profile Switch Tracking
    profile_switches: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'from_profile', type: 'TEXT' },
            { name: 'to_profile', type: 'TEXT NOT NULL' },
            { name: 'reason', type: 'TEXT' }, // 'manual' or 'auto'
            { name: 'switched_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 2: Augmented Memory - Auto-indexed Content
    auto_indexed_content: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            // Source info
            { name: 'source_type', type: 'TEXT NOT NULL' }, // 'conversation', 'screenshot', 'audio', 'ai_response'
            { name: 'source_id', type: 'TEXT' }, // session_id, message_id, transcript_id
            { name: 'source_title', type: 'TEXT' }, // Auto-generated title
            // Content
            { name: 'content', type: 'TEXT NOT NULL' }, // Extracted/summarized text
            { name: 'content_summary', type: 'TEXT' }, // Short summary (1-2 sentences)
            { name: 'raw_content', type: 'TEXT' }, // Original raw content if applicable
            // Metadata
            { name: 'entities', type: 'TEXT' }, // JSON: {projects:[], people:[], companies:[], dates:[], etc.}
            { name: 'tags', type: 'TEXT' }, // JSON array: auto-generated tags
            { name: 'project', type: 'TEXT' }, // Main project detected
            { name: 'importance_score', type: 'REAL DEFAULT 0.5' }, // 0-1: importance score
            // Embedding for semantic search
            { name: 'embedding', type: 'TEXT' }, // JSON array: vector embedding
            // Organization
            { name: 'auto_generated', type: 'INTEGER DEFAULT 1' },
            { name: 'indexed_at', type: 'INTEGER' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 2: Augmented Memory - Knowledge Graph
    knowledge_graph: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            // Entity
            { name: 'entity_type', type: 'TEXT NOT NULL' }, // 'project', 'person', 'company', 'topic', 'technology'
            { name: 'entity_name', type: 'TEXT NOT NULL' },
            { name: 'entity_description', type: 'TEXT' },
            // Statistics
            { name: 'first_seen', type: 'INTEGER' },
            { name: 'last_seen', type: 'INTEGER' },
            { name: 'mention_count', type: 'INTEGER DEFAULT 1' },
            // Relations
            { name: 'related_entities', type: 'TEXT' }, // JSON: [{type:'person', name:'Marie', relation:'works_on'}]
            { name: 'related_documents', type: 'TEXT' }, // JSON: array of document IDs
            { name: 'related_content', type: 'TEXT' }, // JSON: array of auto_indexed_content IDs
            // Metadata
            { name: 'metadata', type: 'TEXT' }, // JSON: type-specific data
            { name: 'importance_score', type: 'REAL DEFAULT 0.5' }, // Based on frequency and context
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 2: Augmented Memory - Memory Statistics
    memory_stats: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            // Counters by type
            { name: 'total_elements', type: 'INTEGER DEFAULT 0' },
            { name: 'documents_count', type: 'INTEGER DEFAULT 0' },
            { name: 'conversations_indexed', type: 'INTEGER DEFAULT 0' },
            { name: 'screenshots_indexed', type: 'INTEGER DEFAULT 0' },
            { name: 'audio_indexed', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_responses_indexed', type: 'INTEGER DEFAULT 0' },
            // Size
            { name: 'total_size_bytes', type: 'INTEGER DEFAULT 0' },
            { name: 'embeddings_count', type: 'INTEGER DEFAULT 0' },
            // Entities
            { name: 'projects_count', type: 'INTEGER DEFAULT 0' },
            { name: 'people_count', type: 'INTEGER DEFAULT 0' },
            { name: 'companies_count', type: 'INTEGER DEFAULT 0' },
            { name: 'topics_count', type: 'INTEGER DEFAULT 0' },
            // Activity
            { name: 'last_indexed_at', type: 'INTEGER' },
            { name: 'indexing_in_progress', type: 'INTEGER DEFAULT 0' },
            // Metadata
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 2: Augmented Memory - External Data Sources
    external_sources: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            // Source type
            { name: 'source_type', type: 'TEXT NOT NULL' }, // 'postgresql', 'mysql', 'mongodb', 'rest', 'notion', 'airtable'
            { name: 'source_name', type: 'TEXT NOT NULL' }, // User-given name
            // Connection config (encrypted)
            { name: 'connection_config', type: 'TEXT NOT NULL' }, // JSON encrypted: {host, port, database, credentials}
            // Mapping
            { name: 'mapping_config', type: 'TEXT' }, // JSON: how to map external data
            // Synchronization
            { name: 'sync_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'sync_frequency', type: 'TEXT' }, // 'manual', 'daily', 'weekly', 'real-time'
            { name: 'last_sync_at', type: 'INTEGER' },
            { name: 'next_sync_at', type: 'INTEGER' },
            { name: 'sync_status', type: 'TEXT' }, // 'idle', 'syncing', 'error', 'success'
            { name: 'sync_error', type: 'TEXT' },
            // Statistics
            { name: 'documents_imported', type: 'INTEGER DEFAULT 0' },
            { name: 'total_size_bytes', type: 'INTEGER DEFAULT 0' },
            // Metadata
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 2: Augmented Memory - Import History
    import_history: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'source_id', type: 'TEXT NOT NULL' }, // external_sources.id
            // Import info
            { name: 'import_type', type: 'TEXT' }, // 'manual', 'scheduled', 'initial'
            { name: 'started_at', type: 'INTEGER' },
            { name: 'completed_at', type: 'INTEGER' },
            { name: 'status', type: 'TEXT' }, // 'running', 'completed', 'failed', 'partial'
            // Results
            { name: 'records_processed', type: 'INTEGER DEFAULT 0' },
            { name: 'records_imported', type: 'INTEGER DEFAULT 0' },
            { name: 'records_failed', type: 'INTEGER DEFAULT 0' },
            { name: 'errors', type: 'TEXT' }, // JSON: array of errors
            // Metadata
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 1: Meeting Assistant - Structured Meeting Notes
    meeting_notes: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' }, // Foreign key to sessions
            { name: 'uid', type: 'TEXT NOT NULL' }, // Owner
            // Structured data (JSON)
            { name: 'executive_summary', type: 'TEXT' }, // 2-3 sentence summary
            { name: 'participants', type: 'TEXT' }, // JSON array of participant names
            { name: 'meeting_metadata', type: 'TEXT' }, // JSON: duration, mainTopic, type
            { name: 'key_points', type: 'TEXT' }, // JSON array of key discussion points
            { name: 'decisions', type: 'TEXT' }, // JSON array of decision objects
            { name: 'action_items', type: 'TEXT' }, // JSON array of action item objects
            { name: 'timeline', type: 'TEXT' }, // JSON array of timeline segments
            { name: 'unresolved_items', type: 'TEXT' }, // JSON array of unresolved questions
            { name: 'next_steps', type: 'TEXT' }, // JSON array of suggested next steps
            { name: 'important_quotes', type: 'TEXT' }, // JSON array of quote objects
            // Full structured data (backup)
            { name: 'full_structured_data', type: 'TEXT' }, // Complete JSON response from AI
            // Email drafts
            { name: 'email_draft', type: 'TEXT' }, // Generated follow-up email
            // Generation metadata
            { name: 'model_used', type: 'TEXT' }, // AI model used for generation
            { name: 'tokens_used', type: 'INTEGER' }, // Token count
            { name: 'generation_status', type: 'TEXT DEFAULT \'pending\'' }, // 'pending', 'generating', 'completed', 'failed'
            { name: 'generation_error', type: 'TEXT' }, // Error message if failed
            // Timestamps
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ],
        // Fix HIGH BUG: Document FK constraints (enforced via deleteWithRelatedData)
        constraints: ['FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE']
    },
    // Phase 1: Meeting Assistant - Task Management
    meeting_tasks: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'meeting_note_id', type: 'TEXT NOT NULL' }, // Foreign key to meeting_notes
            { name: 'session_id', type: 'TEXT NOT NULL' }, // Foreign key to sessions
            { name: 'uid', type: 'TEXT NOT NULL' }, // Owner
            // Task details
            { name: 'task_description', type: 'TEXT NOT NULL' }, // What needs to be done
            { name: 'assigned_to', type: 'TEXT' }, // Speaker name or 'Team' or 'TBD'
            { name: 'assigned_to_email', type: 'TEXT' }, // Phase 2: Email of assignee
            { name: 'deadline', type: 'TEXT' }, // ISO date or 'TBD' or timeframe
            { name: 'priority', type: 'TEXT DEFAULT \'medium\'' }, // 'low', 'medium', 'high'
            { name: 'context', type: 'TEXT' }, // Why this task matters
            // Status tracking
            { name: 'status', type: 'TEXT DEFAULT \'pending\'' }, // 'pending', 'in_progress', 'completed', 'cancelled', 'blocked'
            { name: 'completed_at', type: 'INTEGER' }, // When marked complete
            // Phase 2.3: Advanced task management
            { name: 'notes', type: 'TEXT' }, // Additional notes on the task
            { name: 'blocked_reason', type: 'TEXT' }, // Why task is blocked (if status='blocked')
            { name: 'reminder_date', type: 'TEXT' }, // ISO date for reminder
            { name: 'reminder_sent', type: 'INTEGER DEFAULT 0' }, // Boolean: has reminder been sent
            { name: 'estimated_hours', type: 'REAL' }, // Estimated time to complete (in hours)
            { name: 'tags', type: 'TEXT' }, // JSON array of tags ['frontend', 'urgent']
            // Metadata
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ],
        // Fix HIGH BUG: Document FK constraints (enforced via deleteWithRelatedData in meeting_notes repository)
        constraints: [
            'FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id) ON DELETE CASCADE',
            'FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE'
        ]
    },
    // Phase 2: Meeting Assistant - Participant Attribution
    session_participants: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' }, // Foreign key to sessions
            { name: 'speaker_label', type: 'TEXT NOT NULL' }, // 'Me' or 'Them' (as detected in transcripts)
            // Participant details
            { name: 'participant_name', type: 'TEXT NOT NULL' }, // Full name
            { name: 'participant_email', type: 'TEXT' }, // Email address (optional)
            { name: 'participant_role', type: 'TEXT' }, // Job title or role (optional)
            { name: 'participant_company', type: 'TEXT' }, // Company name (optional)
            // Metadata
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    // Phase 3: Live Insights - Real-time Meeting Intelligence
    live_insights: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' }, // Foreign key to sessions
            { name: 'user_id', type: 'TEXT NOT NULL' }, // Owner
            // Insight classification
            { name: 'type', type: 'TEXT NOT NULL' }, // 'decision', 'action', 'deadline', 'question', 'key_point', 'blocker', 'topic_change', 'recurring'
            { name: 'title', type: 'TEXT NOT NULL' }, // Short title/summary
            { name: 'content', type: 'TEXT NOT NULL' }, // Full content/context
            { name: 'speaker', type: 'TEXT' }, // Who triggered this insight
            { name: 'priority', type: 'TEXT DEFAULT \'medium\'' }, // 'low', 'medium', 'high'
            // Timing
            { name: 'timestamp', type: 'INTEGER NOT NULL' }, // When detected (milliseconds)
            // Metadata
            { name: 'metadata', type: 'TEXT' }, // JSON: type-specific data (topic, count, etc.)
            { name: 'dismissed', type: 'INTEGER DEFAULT 0' }, // Boolean: user dismissed this insight
            // Timestamps
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    }
};

module.exports = LATEST_SCHEMA; 