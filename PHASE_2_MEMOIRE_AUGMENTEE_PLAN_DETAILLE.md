# 🧠 PHASE 2 : MÉMOIRE AUGMENTÉE - PLAN DÉTAILLÉ COMPLET

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs](#objectifs)
3. [Architecture Technique](#architecture-technique)
4. [Fonctionnalités Détaillées](#fonctionnalités-détaillées)
5. [Roadmap Jour par Jour](#roadmap-jour-par-jour)
6. [Base de Données](#base-de-données)
7. [Services à Créer/Améliorer](#services-à-créeraméliorer)
8. [Interface Utilisateur](#interface-utilisateur)
9. [Scénarios de Démonstration](#scénarios-de-démonstration)
10. [Critères de Validation](#critères-de-validation)

---

## 🎯 VUE D'ENSEMBLE

### Vision
Créer un système de **mémoire augmentée ultra-personnalisée** qui permet à Lucide de :
- **Connaître vraiment l'utilisateur** et son contexte professionnel
- **Se souvenir de TOUT** (conversations, documents, audio, screenshots)
- **S'enrichir continuellement** au fil des interactions
- **Mobiliser le contexte pertinent** automatiquement en temps réel
- **Se connecter aux données existantes** de l'utilisateur

### Différenciation vs IA classiques
- ❌ ChatGPT/Claude : Pas de mémoire persistante entre sessions
- ❌ Autres IA : Mémoire limitée et manuelle
- ✅ **Lucide** : Mémoire automatique, multi-sources, intelligente et évolutive

---

## 🎯 OBJECTIFS

### Objectifs Fonctionnels
1. ✅ **Base de données personnelle par utilisateur**
   - Stockage automatique de toutes les interactions
   - Organisation intelligente par projets/sujets
   - Indexation sémantique pour recherche rapide

2. ✅ **Auto-indexation multi-sources**
   - Conversations → Extraits importants auto-indexés
   - Documents → Upload + extraction texte + chunking
   - Screenshots → OCR + extraction texte + indexation
   - Audio → Transcription + indexation
   - Réponses IA → Points clés sauvegardés

3. ✅ **Connexion à bases de données existantes**
   - Import de contexte de travail déjà effectué
   - Synchronisation avec outils de l'utilisateur
   - Connecteurs pour PostgreSQL, MySQL, REST APIs

4. ✅ **Mobilisation du contexte en temps réel**
   - RAG multi-sources amélioré
   - Comprendre la situation complète de l'utilisateur
   - Fournir des réponses ultra-personnalisées
   - Anticiper les besoins selon le contexte

### Objectifs Techniques
- ⚡ Temps de réponse < 3s (avec récupération contexte)
- 📊 Support 10,000+ documents indexés par utilisateur
- 🔒 Sécurité et encryption des données sensibles
- 🌐 Sync multi-device (existant à réutiliser)
- 📱 UI réactive et performante

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                     SOURCES DE DONNÉES                       │
├─────────────────────────────────────────────────────────────┤
│  📄 Documents  │  💬 Conversations  │  🎤 Audio  │  📸 Screenshots │
│  🗄️ BD Externes  │  🤖 Réponses IA  │  📝 Notes  │  📊 Projets    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              AUTO-INDEXATION ENGINE (Nouveau)                │
├─────────────────────────────────────────────────────────────┤
│  • Détection automatique de nouveau contenu                  │
│  • Extraction et chunking intelligent                        │
│  • Génération d'embeddings (OpenAI/local)                    │
│  • Auto-tagging avec LLM                                     │
│  • Extraction d'entités (projets, personnes, dates)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               BASE DE CONNAISSANCES (SQLite)                 │
├─────────────────────────────────────────────────────────────┤
│  documents • document_chunks • auto_indexed_content          │
│  knowledge_graph • memory_stats • external_sources           │
│  document_citations • user_context • sessions                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            RAG MULTI-SOURCES (Amélioré)                      │
├─────────────────────────────────────────────────────────────┤
│  • Recherche sémantique unifiée                              │
│  • Pondération par type de source                            │
│  • Scoring de pertinence avancé                              │
│  • Graph de connaissances pour liens complexes               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   INTERFACE UTILISATEUR                       │
├─────────────────────────────────────────────────────────────┤
│  📊 Dashboard Mémoire  │  🕐 Timeline  │  🔍 Recherche        │
│  📈 Statistiques       │  🏷️ Organisation │  🔗 Connexions    │
└─────────────────────────────────────────────────────────────┘
```

### Stack Technique Existante (à réutiliser)
- **Base de données** : SQLite (local) + Firebase/Supabase (cloud sync)
- **Embeddings** : OpenAI API (text-embedding-3-small) OU local
- **LLM** : OpenAI/Anthropic/Ollama (selon config utilisateur)
- **OCR** : Tesseract.js (pour screenshots)
- **PDF/DOCX** : pdf-parse + mammoth (déjà en place)
- **Audio** : Whisper (local ou API)
- **UI** : Lit.js (Web Components)

---

## 🎨 FONCTIONNALITÉS DÉTAILLÉES

### 📦 FEATURE 1 : Auto-indexation Multi-Sources

#### Description
Système d'indexation automatique qui capture et indexe TOUTES les sources de données de l'utilisateur sans intervention manuelle.

#### Composants

**1.1 Auto-indexation des Conversations**
```javascript
// Service: autoIndexingService.js
class AutoIndexingService {
  async indexConversation(sessionId) {
    // 1. Récupérer les messages de la conversation
    // 2. Extraire les points clés (avec LLM)
    // 3. Créer des chunks sémantiques
    // 4. Générer embeddings
    // 5. Sauvegarder dans auto_indexed_content
    // 6. Mettre à jour memory_stats
  }
}
```

**Déclencheurs** :
- ✅ Fin de conversation (session ended)
- ✅ Après X messages (ex: tous les 10 messages)
- ✅ Sur demande manuelle ("Sauvegarder cette conversation")

**Stockage** :
```sql
auto_indexed_content (
  id, uid, source_type='conversation',
  source_id=session_id, content, entities,
  indexed_at, project, tags
)
```

**1.2 Auto-indexation des Screenshots**
```javascript
async indexScreenshot(screenshotPath, sessionId) {
  // 1. OCR avec Tesseract.js
  // 2. Extraction du texte
  // 3. Détection d'entités (emails, URLs, noms)
  // 4. Génération d'embeddings
  // 5. Association au projet/session actuel
  // 6. Sauvegarde avec preview thumbnail
}
```

**Déclencheurs** :
- ✅ Capture screenshot dans l'app
- ✅ Upload manuel de screenshot
- ✅ Import dossier de screenshots

**Stockage** :
- Texte extrait → `auto_indexed_content`
- Image originale → `file_path` (local ou cloud)
- Thumbnail → généré et stocké

**1.3 Auto-indexation des Transcriptions Audio**
```javascript
async indexAudioTranscription(sessionId) {
  // 1. Récupérer transcriptions de la session
  // 2. Assembler le texte complet
  // 3. Détection de speakers et sujets
  // 4. Extraction de décisions/actions
  // 5. Génération d'embeddings
  // 6. Sauvegarde avec timeline
}
```

**Déclencheurs** :
- ✅ Fin de session Listen
- ✅ Génération du summary
- ✅ Sur demande manuelle

**1.4 Auto-indexation des Réponses IA Importantes**
```javascript
async indexImportantAIResponse(messageId, sessionId) {
  // Critères pour "important":
  // - Longueur > 500 chars
  // - Contient des listes/étapes
  // - Contient des recommandations
  // - Marqué comme important par l'utilisateur

  // Indexation avec:
  // - Question posée (context)
  // - Réponse complète
  // - Entités mentionnées
  // - Tags auto-générés
}
```

**1.5 Détection et Extraction d'Entités**
```javascript
async extractEntities(content) {
  // Utilise un LLM pour extraire:
  return {
    projects: ['Projet X', 'Campagne Y'],
    people: ['Marie Dupont', 'Jean Martin'],
    companies: ['Acme Corp', 'TechStart'],
    dates: ['2025-12-15', 'Q4 2025'],
    locations: ['Paris', 'Remote'],
    technologies: ['React', 'PostgreSQL'],
    topics: ['recrutement', 'budget', 'roadmap']
  };
}
```

#### Tables de Base de Données

```sql
-- Nouvelle table pour contenu auto-indexé
CREATE TABLE auto_indexed_content (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,

  -- Source info
  source_type TEXT NOT NULL,  -- 'conversation', 'screenshot', 'audio', 'ai_response'
  source_id TEXT,             -- session_id, message_id, transcript_id
  source_title TEXT,          -- Titre généré automatiquement

  -- Contenu
  content TEXT NOT NULL,      -- Texte extrait/résumé
  content_summary TEXT,       -- Résumé court (1-2 phrases)
  raw_content TEXT,           -- Contenu brut original si applicable

  -- Métadonnées
  entities TEXT,              -- JSON: {projects:[], people:[], companies:[], etc.}
  tags TEXT,                  -- JSON array: auto-generated tags
  project TEXT,               -- Projet principal détecté
  importance_score REAL,      -- 0-1: score d'importance

  -- Embedding pour recherche sémantique
  embedding TEXT,             -- JSON array: vector embedding

  -- Organisation
  auto_generated INTEGER DEFAULT 1,
  indexed_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER,

  sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_auto_indexed_uid ON auto_indexed_content(uid);
CREATE INDEX idx_auto_indexed_source ON auto_indexed_content(source_type, source_id);
CREATE INDEX idx_auto_indexed_project ON auto_indexed_content(project);
CREATE INDEX idx_auto_indexed_date ON auto_indexed_content(indexed_at);
```

```sql
-- Graph de connaissances pour entités
CREATE TABLE knowledge_graph (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,

  -- Entité
  entity_type TEXT NOT NULL,  -- 'project', 'person', 'company', 'topic', 'technology'
  entity_name TEXT NOT NULL,
  entity_description TEXT,

  -- Statistiques
  first_seen INTEGER,
  last_seen INTEGER,
  mention_count INTEGER DEFAULT 1,

  -- Relations
  related_entities TEXT,      -- JSON: [{type:'person', name:'Marie', relation:'works_on'}]
  related_documents TEXT,      -- JSON: array of document IDs
  related_content TEXT,        -- JSON: array of auto_indexed_content IDs

  -- Métadonnées
  metadata TEXT,              -- JSON: données spécifiques au type
  importance_score REAL,      -- Score basé sur fréquence et contexte

  created_at INTEGER,
  updated_at INTEGER,
  sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_knowledge_uid ON knowledge_graph(uid);
CREATE INDEX idx_knowledge_type ON knowledge_graph(entity_type);
CREATE INDEX idx_knowledge_name ON knowledge_graph(entity_name);
```

```sql
-- Statistiques de mémoire par utilisateur
CREATE TABLE memory_stats (
  uid TEXT PRIMARY KEY,

  -- Compteurs par type
  total_elements INTEGER DEFAULT 0,
  documents_count INTEGER DEFAULT 0,
  conversations_indexed INTEGER DEFAULT 0,
  screenshots_indexed INTEGER DEFAULT 0,
  audio_indexed INTEGER DEFAULT 0,
  ai_responses_indexed INTEGER DEFAULT 0,

  -- Taille
  total_size_bytes INTEGER DEFAULT 0,
  embeddings_count INTEGER DEFAULT 0,

  -- Entités
  projects_count INTEGER DEFAULT 0,
  people_count INTEGER DEFAULT 0,
  companies_count INTEGER DEFAULT 0,
  topics_count INTEGER DEFAULT 0,

  -- Activité
  last_indexed_at INTEGER,
  indexing_in_progress INTEGER DEFAULT 0,

  -- Métadonnées
  created_at INTEGER,
  updated_at INTEGER,
  sync_state TEXT DEFAULT 'clean'
);
```

#### API / Services

**autoIndexingService.js**
```javascript
class AutoIndexingService {
  // Indexation automatique
  async indexConversation(sessionId, uid)
  async indexScreenshot(screenshotPath, uid, sessionId)
  async indexAudioSession(sessionId, uid)
  async indexAIResponse(messageId, sessionId, uid)

  // Extraction et analyse
  async extractEntities(content)
  async generateTags(content)
  async detectProject(content, entities)
  async calculateImportance(content, context)

  // Helpers
  async shouldIndexConversation(sessionId)
  async shouldIndexAIResponse(message)

  // Événements
  onIndexingComplete(callback)
  onIndexingError(callback)
}
```

**knowledgeOrganizerService.js**
```javascript
class KnowledgeOrganizerService {
  // Organisation du graph de connaissances
  async createOrUpdateEntity(uid, entityType, entityName, metadata)
  async linkEntities(entityId1, entityId2, relationType)
  async getEntityById(entityId)
  async searchEntities(uid, query, filters)

  // Détection automatique
  async detectProjects(uid)
  async detectPeople(uid)
  async detectTopics(uid)

  // Statistiques
  async getEntityStats(uid, entityType)
  async getTopEntities(uid, limit)
  async getRelatedEntities(entityId, depth)

  // Visualisation
  async getKnowledgeGraphData(uid, filters)
}
```

---

### 📦 FEATURE 2 : Connexion aux Bases de Données Existantes

#### Description
Permettre à Lucide de se connecter aux bases de données et outils existants de l'utilisateur pour importer le contexte de travail déjà effectué.

#### Composants

**2.1 Connecteurs de Bases de Données**

Utiliser l'infrastructure **lucide-enterprise-gateway** existante et l'étendre :

```javascript
// Connecteurs existants (dans lucide-enterprise-gateway/src/connectors/)
- postgresql.js  ✅ Déjà implémenté
- mysql.js       ✅ Déjà implémenté
- rest.js        ✅ Déjà implémenté

// À ajouter:
- mongodb.js     ➕ Nouveau
- sqlite.js      ➕ Nouveau (pour import d'autres apps)
- notion.js      ➕ Nouveau (via API Notion)
- airtable.js    ➕ Nouveau (via API Airtable)
```

**2.2 Service d'Import de Contexte**

```javascript
// externalDataService.js (nouveau)
class ExternalDataService {
  // Connexion
  async testConnection(connectionConfig)
  async saveConnection(uid, connectionConfig)
  async listConnections(uid)
  async deleteConnection(connectionId)

  // Import
  async importFromDatabase(connectionId, query, options)
  async importFromAPI(connectionId, endpoint, options)
  async syncData(connectionId, syncConfig)

  // Traitement
  async processImportedData(data, mappingConfig)
  async createDocumentsFromImport(uid, data)
  async indexImportedContent(uid, contentArray)

  // Scheduling
  async scheduleSync(connectionId, cronExpression)
  async cancelScheduledSync(connectionId)
}
```

**2.3 Mapping et Transformation**

```javascript
// dataMappingService.js
class DataMappingService {
  // Définir comment mapper les données externes vers le format Lucide
  async createMapping(sourceType, mappingConfig)

  // Exemples de mappings:
  mappings = {
    postgres_projects: {
      source: { table: 'projects', columns: ['id', 'name', 'description', 'status'] },
      target: { type: 'document', fields: { title: 'name', content: 'description' } }
    },
    notion_pages: {
      source: { database_id: 'xxx', properties: ['Name', 'Content'] },
      target: { type: 'document', fields: { title: 'Name', content: 'Content' } }
    }
  }
}
```

#### Tables de Base de Données

```sql
-- Connexions aux sources externes
CREATE TABLE external_sources (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,

  -- Type de source
  source_type TEXT NOT NULL,  -- 'postgresql', 'mysql', 'mongodb', 'rest', 'notion', 'airtable'
  source_name TEXT NOT NULL,  -- Nom donné par l'utilisateur

  -- Configuration de connexion (encrypted)
  connection_config TEXT NOT NULL,  -- JSON encrypted: {host, port, database, credentials, etc.}

  -- Mapping
  mapping_config TEXT,        -- JSON: comment mapper les données

  -- Synchronisation
  sync_enabled INTEGER DEFAULT 0,
  sync_frequency TEXT,        -- 'manual', 'daily', 'weekly', 'real-time'
  last_sync_at INTEGER,
  next_sync_at INTEGER,
  sync_status TEXT,           -- 'idle', 'syncing', 'error', 'success'
  sync_error TEXT,

  -- Statistiques
  documents_imported INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,

  -- Métadonnées
  created_at INTEGER,
  updated_at INTEGER,
  sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_external_sources_uid ON external_sources(uid);
CREATE INDEX idx_external_sources_type ON external_sources(source_type);
```

```sql
-- Historique d'imports
CREATE TABLE import_history (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  source_id TEXT NOT NULL,  -- external_sources.id

  -- Import info
  import_type TEXT,         -- 'manual', 'scheduled', 'initial'
  started_at INTEGER,
  completed_at INTEGER,
  status TEXT,              -- 'running', 'completed', 'failed', 'partial'

  -- Résultats
  records_processed INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  errors TEXT,              -- JSON: array d'erreurs

  -- Métadonnées
  created_at INTEGER,
  sync_state TEXT DEFAULT 'clean'
);

CREATE INDEX idx_import_history_uid ON import_history(uid);
CREATE INDEX idx_import_history_source ON import_history(source_id);
```

#### UI pour Connexions Externes

```javascript
// ExternalSourcesView.js
class ExternalSourcesView extends LitElement {
  render() {
    return html`
      <div class="external-sources-container">
        <!-- Liste des connexions -->
        <div class="sources-list">
          ${this.sources.map(source => html`
            <div class="source-card">
              <h3>${source.source_name}</h3>
              <p>${source.source_type}</p>
              <button @click=${() => this.syncNow(source.id)}>
                Synchroniser maintenant
              </button>
            </div>
          `)}
        </div>

        <!-- Ajouter une connexion -->
        <button @click=${this.openAddSourceDialog}>
          + Ajouter une source de données
        </button>
      </div>
    `;
  }
}
```

---

### 📦 FEATURE 3 : RAG Multi-Sources Amélioré

#### Description
Améliorer le service RAG existant pour mobiliser le contexte de TOUTES les sources en temps réel.

#### Améliorations du RAGService

```javascript
// ragService.js (amélioré)
class RAGService {
  /**
   * Recherche unifiée sur toutes les sources
   */
  async retrieveContextMultiSource(query, uid, options = {}) {
    const {
      maxChunks = 10,
      sources = ['documents', 'conversations', 'screenshots', 'audio', 'external'],
      minScore = 0.7,
      timeRange = null,
      projects = null
    } = options;

    const results = {
      chunks: [],
      sources: [],
      totalTokens: 0,
      sourceBreakdown: {}
    };

    // 1. Documents classiques (existant)
    if (sources.includes('documents')) {
      const docChunks = await indexingService.semanticSearch(query, {
        limit: maxChunks,
        minScore
      });
      results.chunks.push(...docChunks);
      results.sourceBreakdown.documents = docChunks.length;
    }

    // 2. Conversations indexées (nouveau)
    if (sources.includes('conversations')) {
      const convChunks = await this._searchConversations(query, uid, {
        limit: Math.ceil(maxChunks / 2),
        minScore
      });
      results.chunks.push(...convChunks);
      results.sourceBreakdown.conversations = convChunks.length;
    }

    // 3. Screenshots (nouveau)
    if (sources.includes('screenshots')) {
      const screenshotChunks = await this._searchScreenshots(query, uid, {
        limit: Math.ceil(maxChunks / 3),
        minScore
      });
      results.chunks.push(...screenshotChunks);
      results.sourceBreakdown.screenshots = screenshotChunks.length;
    }

    // 4. Audio transcripts (nouveau)
    if (sources.includes('audio')) {
      const audioChunks = await this._searchAudio(query, uid, {
        limit: Math.ceil(maxChunks / 3),
        minScore
      });
      results.chunks.push(...audioChunks);
      results.sourceBreakdown.audio = audioChunks.length;
    }

    // 5. Données externes (nouveau)
    if (sources.includes('external')) {
      const externalChunks = await this._searchExternal(query, uid, {
        limit: Math.ceil(maxChunks / 4),
        minScore
      });
      results.chunks.push(...externalChunks);
      results.sourceBreakdown.external = externalChunks.length;
    }

    // Tri par pertinence globale
    results.chunks.sort((a, b) => b.relevance_score - a.relevance_score);

    // Limite au nombre max de chunks
    results.chunks = results.chunks.slice(0, maxChunks);

    // Construction des sources avec métadonnées enrichies
    results.sources = this._buildEnrichedSources(results.chunks);
    results.totalTokens = this._calculateTotalTokens(results.chunks);

    return results;
  }

  /**
   * Recherche dans les conversations indexées
   */
  async _searchConversations(query, uid, options) {
    // Recherche sémantique dans auto_indexed_content
    // où source_type = 'conversation'
  }

  /**
   * Recherche dans les screenshots
   */
  async _searchScreenshots(query, uid, options) {
    // Recherche sémantique dans auto_indexed_content
    // où source_type = 'screenshot'
  }

  /**
   * Pondération intelligente par type de source
   */
  _applySourceWeighting(chunks) {
    const weights = {
      documents: 1.0,      // Documents uploadés = référence
      conversations: 0.9,  // Conversations récentes
      external: 0.85,      // Données externes
      audio: 0.8,          // Transcriptions audio
      screenshots: 0.75    // Screenshots (OCR moins fiable)
    };

    return chunks.map(chunk => ({
      ...chunk,
      weighted_score: chunk.relevance_score * (weights[chunk.source_type] || 1.0)
    }));
  }
}
```

#### Prompt Enrichi avec Contexte Multi-Sources

```javascript
async buildEnrichedPromptMultiSource(userQuery, basePrompt, contextData, uid) {
  if (!contextData.hasContext) {
    return { prompt: basePrompt, userQuery, hasContext: false };
  }

  // Récupérer le contexte utilisateur
  const userContext = await userContextService.getContext(uid);

  // Récupérer les entités liées à la query
  const relatedEntities = await knowledgeOrganizerService.detectEntitiesInQuery(userQuery);

  // Construire le prompt enrichi
  const contextSection = this._formatMultiSourceContext(contextData.sources);
  const userContextSection = this._formatUserContext(userContext);
  const entitiesSection = this._formatRelatedEntities(relatedEntities);

  const enrichedPrompt = `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 CONTEXTE UTILISATEUR
${userContextSection}

🧠 MÉMOIRE & CONNAISSANCES
J'ai accès à votre base de connaissances personnelle qui contient :
- ${contextData.sourceBreakdown.documents || 0} documents
- ${contextData.sourceBreakdown.conversations || 0} conversations passées
- ${contextData.sourceBreakdown.screenshots || 0} screenshots
- ${contextData.sourceBreakdown.audio || 0} transcriptions audio
- ${contextData.sourceBreakdown.external || 0} données externes

${contextSection}

🏷️ ENTITÉS LIÉES DÉTECTÉES
${entitiesSection}

INSTRUCTIONS IMPORTANTES :
1. Utilisez votre mémoire de mes interactions passées pour personnaliser votre réponse
2. Citez toujours vos sources : [Source: {titre} - {type}]
3. Si plusieurs sources se contredisent, mentionnez-le
4. Priorisez les informations récentes sur les anciennes
5. Tenez compte de mon contexte professionnel et mes préférences
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return {
    prompt: enrichedPrompt,
    userQuery,
    hasContext: true,
    sources: contextData.sources,
    contextTokens: contextData.totalTokens,
    userContext,
    relatedEntities
  };
}
```

---

### 📦 FEATURE 4 : Dashboard Mémoire

#### Description
Interface visuelle pour voir et gérer la mémoire de Lucide.

#### Composants UI

**4.1 Vue d'ensemble - MemoryDashboardView.js**

```javascript
class MemoryDashboardView extends LitElement {
  render() {
    return html`
      <div class="memory-dashboard">
        <!-- Stats Overview -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>${this.stats.total_elements}</h3>
            <p>Éléments en mémoire</p>
          </div>

          <div class="stat-card">
            <h3>${this.formatSize(this.stats.total_size_bytes)}</h3>
            <p>Taille totale</p>
          </div>

          <div class="stat-card">
            <h3>${this.stats.projects_count}</h3>
            <p>Projets détectés</p>
          </div>

          <div class="stat-card">
            <h3>${this.stats.people_count}</h3>
            <p>Personnes mentionnées</p>
          </div>
        </div>

        <!-- Breakdown par type -->
        <div class="breakdown-section">
          <h2>Répartition de la mémoire</h2>
          <canvas id="memoryBreakdownChart"></canvas>
          <!-- Pie chart: Documents, Conversations, Screenshots, Audio, External -->
        </div>

        <!-- Croissance dans le temps -->
        <div class="growth-section">
          <h2>Croissance de la mémoire</h2>
          <canvas id="memoryGrowthChart"></canvas>
          <!-- Line chart: Évolution sur 30/60/90 jours -->
        </div>

        <!-- Top Projects -->
        <div class="top-projects">
          <h2>Projets principaux</h2>
          ${this.topProjects.map(project => html`
            <div class="project-item">
              <span>${project.name}</span>
              <span>${project.mention_count} mentions</span>
            </div>
          `)}
        </div>

        <!-- Top Topics -->
        <div class="top-topics">
          <h2>Sujets les plus discutés</h2>
          <div class="topics-cloud">
            ${this.topTopics.map(topic => html`
              <span class="topic-tag" style="font-size: ${topic.size}px">
                ${topic.name}
              </span>
            `)}
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button @click=${this.exportMemory}>
            📥 Exporter ma mémoire
          </button>
          <button @click=${this.cleanupMemory}>
            🧹 Nettoyer les doublons
          </button>
        </div>
      </div>
    `;
  }
}
```

**4.2 Timeline de la Mémoire - MemoryTimelineView.js**

```javascript
class MemoryTimelineView extends LitElement {
  render() {
    return html`
      <div class="memory-timeline">
        <!-- Filtres -->
        <div class="filters">
          <select @change=${this.filterByType}>
            <option value="all">Tous les types</option>
            <option value="documents">Documents</option>
            <option value="conversations">Conversations</option>
            <option value="screenshots">Screenshots</option>
            <option value="audio">Audio</option>
            <option value="external">Données externes</option>
          </select>

          <select @change=${this.filterByProject}>
            <option value="all">Tous les projets</option>
            ${this.projects.map(p => html`
              <option value=${p.id}>${p.name}</option>
            `)}
          </select>

          <input
            type="search"
            placeholder="Rechercher dans la mémoire..."
            @input=${this.search}
          />
        </div>

        <!-- Timeline -->
        <div class="timeline">
          ${this.groupedItems.map(group => html`
            <div class="timeline-group">
              <h3 class="timeline-date">${group.date}</h3>

              ${group.items.map(item => html`
                <div class="timeline-item ${item.source_type}">
                  <div class="item-icon">${this.getIcon(item.source_type)}</div>

                  <div class="item-content">
                    <h4>${item.source_title}</h4>
                    <p>${item.content_summary}</p>

                    <!-- Tags -->
                    <div class="item-tags">
                      ${item.tags.map(tag => html`
                        <span class="tag">${tag}</span>
                      `)}
                    </div>

                    <!-- Entités -->
                    <div class="item-entities">
                      ${item.entities?.projects?.map(p => html`
                        <span class="entity project">📁 ${p}</span>
                      `)}
                      ${item.entities?.people?.map(person => html`
                        <span class="entity person">👤 ${person}</span>
                      `)}
                    </div>

                    <!-- Actions -->
                    <div class="item-actions">
                      <button @click=${() => this.viewDetails(item.id)}>
                        Voir détails
                      </button>
                      <button @click=${() => this.deleteItem(item.id)}>
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div class="item-time">
                    ${this.formatTime(item.indexed_at)}
                  </div>
                </div>
              `)}
            </div>
          `)}
        </div>

        <!-- Load More -->
        <button
          class="load-more"
          @click=${this.loadMore}
          ?hidden=${!this.hasMore}
        >
          Charger plus
        </button>
      </div>
    `;
  }

  groupByDate(items) {
    // Grouper les items par jour
    const groups = {};
    items.forEach(item => {
      const date = new Date(item.indexed_at).toLocaleDateString('fr-FR');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      items
    }));
  }
}
```

**4.3 Recherche Unifiée - MemorySearchView.js**

```javascript
class MemorySearchView extends LitElement {
  async performSearch(query) {
    // Recherche sémantique dans toutes les sources
    const results = await ragService.retrieveContextMultiSource(query, this.uid, {
      maxChunks: 50,
      sources: ['documents', 'conversations', 'screenshots', 'audio', 'external']
    });

    this.searchResults = results.sources.map(source => ({
      ...source,
      highlighted: this.highlightQuery(source.content, query)
    }));
  }

  render() {
    return html`
      <div class="memory-search">
        <!-- Barre de recherche -->
        <div class="search-bar">
          <input
            type="search"
            placeholder="Chercher dans toute votre mémoire..."
            @input=${this.debounceSearch}
            .value=${this.query}
          />
        </div>

        <!-- Résultats -->
        <div class="search-results">
          ${this.searchResults.map(result => html`
            <div class="search-result-item">
              <div class="result-header">
                <span class="result-type">${result.source_type}</span>
                <span class="result-score">
                  ${(result.relevance_score * 100).toFixed(0)}% pertinent
                </span>
              </div>

              <h3>${result.document_title}</h3>
              <p .innerHTML=${result.highlighted}></p>

              <div class="result-meta">
                <span>📅 ${this.formatDate(result.created_at)}</span>
                ${result.project ? html`
                  <span>📁 ${result.project}</span>
                ` : ''}
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
```

---

### 📦 FEATURE 5 : Graph de Connaissances Visuel

#### Description
Visualisation interactive des connexions entre entités (projets, personnes, sujets).

**KnowledgeGraphView.js**
```javascript
class KnowledgeGraphView extends LitElement {
  async loadGraph() {
    // Récupérer les données du graph
    const graphData = await knowledgeOrganizerService.getKnowledgeGraphData(this.uid);

    // Utiliser D3.js ou vis.js pour visualiser
    this.renderGraph(graphData);
  }

  renderGraph(data) {
    // Nodes: entités (projets, personnes, sujets)
    const nodes = data.entities.map(entity => ({
      id: entity.id,
      label: entity.entity_name,
      type: entity.entity_type,
      size: Math.log(entity.mention_count + 1) * 10
    }));

    // Edges: relations entre entités
    const edges = data.relations.map(rel => ({
      from: rel.from_id,
      to: rel.to_id,
      label: rel.relation_type
    }));

    // Render avec vis.js
    const network = new vis.Network(container, { nodes, edges }, options);
  }
}
```

---

## 📅 ROADMAP JOUR PAR JOUR (7 jours)

### 🗓️ JOUR 1 : Auto-indexation Core + Base de Données

**Matin (4h)**
- ✅ Créer les nouvelles tables SQL
  - `auto_indexed_content`
  - `knowledge_graph`
  - `memory_stats`
  - Migrations + indexes
- ✅ Créer `autoIndexingService.js` (structure de base)

**Après-midi (4h)**
- ✅ Implémenter `indexConversation()`
  - Extraction des messages
  - Détection de points clés avec LLM
  - Génération embeddings
  - Sauvegarde dans BD
- ✅ Tests unitaires

**Livrables** :
- Tables créées et migrées
- Auto-indexation des conversations fonctionnelle

---

### 🗓️ JOUR 2 : Auto-indexation Screenshots + Audio

**Matin (4h)**
- ✅ Implémenter `indexScreenshot()`
  - Intégration Tesseract.js (OCR)
  - Extraction texte
  - Génération embeddings
  - Sauvegarde avec thumbnail
- ✅ Tests avec screenshots réels

**Après-midi (4h)**
- ✅ Implémenter `indexAudioTranscription()`
  - Récupération transcripts
  - Assemblage et résumé
  - Détection speakers/sujets
  - Sauvegarde
- ✅ Tests avec sessions audio

**Livrables** :
- Screenshots auto-indexés avec OCR
- Audio auto-indexé depuis transcripts

---

### 🗓️ JOUR 3 : Extraction d'Entités + Graph de Connaissances

**Matin (4h)**
- ✅ Créer `knowledgeOrganizerService.js`
- ✅ Implémenter `extractEntities()`
  - Appel LLM pour extraction
  - Détection projets, personnes, entreprises, dates
  - Normalisation des noms
- ✅ Implémenter `createOrUpdateEntity()`
  - Création entités dans knowledge_graph
  - Mise à jour mention_count

**Après-midi (4h)**
- ✅ Implémenter détection automatique
  - `detectProjects(uid)`
  - `detectPeople(uid)`
  - `detectTopics(uid)`
- ✅ Auto-tagging avec LLM
- ✅ Tests avec données réelles

**Livrables** :
- Service d'organisation intelligent
- Extraction d'entités fonctionnelle
- Graph de connaissances construit

---

### 🗓️ JOUR 4 : Connexion Bases de Données Externes

**Matin (4h)**
- ✅ Créer tables `external_sources` + `import_history`
- ✅ Créer `externalDataService.js`
- ✅ Implémenter connexion/test de BD
  - PostgreSQL (réutiliser connecteur existant)
  - MySQL (réutiliser connecteur existant)
  - REST APIs (réutiliser connecteur existant)

**Après-midi (4h)**
- ✅ Implémenter `importFromDatabase()`
  - Exécution queries
  - Mapping des données
  - Création documents
  - Auto-indexation
- ✅ Tests avec PostgreSQL local

**Livrables** :
- Connexion BD externes fonctionnelle
- Import et indexation automatique

---

### 🗓️ JOUR 5 : RAG Multi-Sources Amélioré

**Matin (4h)**
- ✅ Améliorer `ragService.js`
- ✅ Implémenter `retrieveContextMultiSource()`
  - Recherche unifiée sur toutes sources
  - Pondération par type
  - Scoring avancé
- ✅ Implémenter recherches spécifiques
  - `_searchConversations()`
  - `_searchScreenshots()`
  - `_searchAudio()`
  - `_searchExternal()`

**Après-midi (4h)**
- ✅ Implémenter `buildEnrichedPromptMultiSource()`
  - Intégration contexte utilisateur
  - Intégration entités liées
  - Formatage multi-sources
- ✅ Tests de pertinence
- ✅ Optimisation performances

**Livrables** :
- RAG multi-sources fonctionnel
- Contexte enrichi mobilisé en temps réel

---

### 🗓️ JOUR 6 : Dashboard Mémoire + Timeline

**Matin (4h)**
- ✅ Créer `MemoryDashboardView.js`
  - Stats overview
  - Graphiques (Chart.js)
  - Top projects/topics
  - Actions (export, cleanup)
- ✅ Service `memoryStatsService.js`
  - Calcul des métriques
  - Mise à jour stats

**Après-midi (4h)**
- ✅ Créer `MemoryTimelineView.js`
  - Timeline chronologique
  - Filtres (type, projet, date)
  - Recherche
  - Pagination
- ✅ Intégration dans `LucideApp.js`

**Livrables** :
- Dashboard mémoire visuel et fonctionnel
- Timeline complète

---

### 🗓️ JOUR 7 : Recherche Unifiée + Graph Visuel + Tests

**Matin (4h)**
- ✅ Créer `MemorySearchView.js`
  - Barre de recherche
  - Recherche sémantique multi-sources
  - Highlighting des résultats
  - Filtres avancés
- ✅ Créer `KnowledgeGraphView.js` (optionnel)
  - Visualisation D3.js/vis.js
  - Interactions

**Après-midi (4h)**
- ✅ Tests end-to-end complets
  - Scénario: Upload doc → Auto-index → Recherche → RAG
  - Scénario: Screenshot → OCR → Index → Recherche
  - Scénario: Connexion BD → Import → Index → RAG
- ✅ Optimisations performances
- ✅ Documentation

**Livrables** :
- Recherche unifiée fonctionnelle
- Tous les tests passent
- Documentation complète

---

## ✅ CRITÈRES DE VALIDATION

### Tests Fonctionnels

1. **Auto-indexation**
   - [ ] Une conversation de 10 messages est automatiquement indexée
   - [ ] Un screenshot capturé est OCR + indexé en < 5s
   - [ ] Une session audio est transcrite et indexée
   - [ ] Les entités sont correctement extraites (>80% précision)

2. **Connexion BD Externes**
   - [ ] Connexion PostgreSQL réussie
   - [ ] Import de 100 lignes → 100 documents créés et indexés
   - [ ] Sync programmée fonctionne

3. **RAG Multi-Sources**
   - [ ] Query "budget projet X" retourne des résultats de documents + conversations + screenshots
   - [ ] Pondération correcte par type de source
   - [ ] Citations précises avec sources

4. **Dashboard & Timeline**
   - [ ] Stats affichées correctement
   - [ ] Timeline chargeable par pagination
   - [ ] Filtres fonctionnels
   - [ ] Recherche retourne résultats pertinents en < 2s

### Tests de Performance

- [ ] Indexation d'une conversation de 50 messages en < 10s
- [ ] Recherche sémantique sur 10,000 chunks en < 3s
- [ ] Dashboard charge en < 2s
- [ ] Timeline charge 100 items en < 1s

### Tests de Sécurité

- [ ] Credentials BD externes encryptés
- [ ] Données sensibles non loggées
- [ ] Validation des inputs pour SQL injection
- [ ] Isolation des données par utilisateur (uid)

---

## 🎬 SCÉNARIOS DE DÉMONSTRATION

### Scénario 1 : "La Mémoire qui Apprend"

```
1. Utilisateur nouveau → Dashboard mémoire vide
2. Upload 3 documents PDF sur "Projet Alpha"
   → Auto-indexation visible (progress bar)
   → Dashboard affiche: 3 documents, projet "Alpha" détecté
3. Conversation: "Quels sont les risques du projet Alpha?"
   → Réponse IA avec citations des 3 PDFs
   → Conversation auto-indexée
4. Retour au Dashboard
   → 3 documents + 1 conversation
   → Projet "Alpha" avec 4 sources liées
5. Timeline
   → Voir les 4 éléments indexés chronologiquement
```

### Scénario 2 : "Multi-Sources en Action"

```
1. Upload doc "Budget Q4.pdf"
2. Session audio: Réunion budget (transcription auto)
3. Screenshot: Tableau Excel budget
4. Conversation: "Parle-moi du budget Q4"
5. Réponse IA mobilise:
   - PDF Budget Q4 (page 3)
   - Transcript réunion (14h23)
   - Screenshot Excel
   → Réponse ultra-contextualisée
6. Dashboard montre:
   - 3 sources différentes mobilisées
   - Projet "Budget Q4" créé automatiquement
```

### Scénario 3 : "Import de Données Externes"

```
1. Connexion à base PostgreSQL
   → Importer 50 projets de Notion/Airtable
2. Auto-indexation des 50 projets
3. Recherche: "projets tech en cours"
   → Résultats incluent projets importés + conversations locales
4. Graph de connaissances
   → Voir les connexions entre projets importés et conversations locales
```

---

## 📚 DOCUMENTATION TECHNIQUE

### Architecture des Services

```
autoIndexingService
  ├── indexConversation(sessionId, uid)
  ├── indexScreenshot(screenshotPath, uid, sessionId)
  ├── indexAudioSession(sessionId, uid)
  ├── extractEntities(content)
  ├── generateTags(content)
  └── calculateImportance(content)

knowledgeOrganizerService
  ├── createOrUpdateEntity(uid, type, name)
  ├── detectProjects(uid)
  ├── detectPeople(uid)
  ├── getKnowledgeGraphData(uid)
  └── getRelatedEntities(entityId)

externalDataService
  ├── testConnection(config)
  ├── saveConnection(uid, config)
  ├── importFromDatabase(connectionId, query)
  ├── processImportedData(data)
  └── scheduleSync(connectionId, cron)

ragService (amélioré)
  ├── retrieveContextMultiSource(query, uid, options)
  ├── _searchConversations(query, uid)
  ├── _searchScreenshots(query, uid)
  ├── _searchAudio(query, uid)
  ├── _searchExternal(query, uid)
  └── buildEnrichedPromptMultiSource(query, basePrompt, context)

memoryStatsService (nouveau)
  ├── updateStats(uid)
  ├── getStats(uid)
  ├── getGrowthData(uid, days)
  └── getBreakdownData(uid)
```

### Flux de Données

```
┌─────────────────────────────────────────────┐
│         Nouvelle Interaction                 │
│  (conversation, upload, screenshot, audio)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│     autoIndexingService.detect()             │
│  Détecte qu'il y a du nouveau contenu        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   Extraction & Traitement                    │
│  • Texte brut extrait                        │
│  • Chunking si nécessaire                    │
│  • Génération embeddings                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   knowledgeOrganizerService                  │
│  • Extraction entités (LLM)                  │
│  • Auto-tagging                              │
│  • Détection projet                          │
│  • Calcul importance                         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   Sauvegarde en Base de Données              │
│  • auto_indexed_content                      │
│  • knowledge_graph (entités)                 │
│  • memory_stats (mise à jour)                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   Notification UI                            │
│  • Update dashboard                          │
│  • Update timeline                           │
│  • Toast: "1 nouvelle conversation indexée"  │
└─────────────────────────────────────────────┘
```

### Gestion des Erreurs

```javascript
// Stratégie de retry pour indexation
async indexWithRetry(indexFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await indexFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}

// Fallback gracieux pour embeddings
async generateEmbeddingWithFallback(text) {
  try {
    return await embeddingProvider.generateEmbedding(text);
  } catch (error) {
    console.warn('[AutoIndexing] Embedding failed, indexing without embedding');
    // Index quand même sans embedding (keyword search seulement)
    return null;
  }
}
```

---

## 🔒 SÉCURITÉ & CONFIDENTIALITÉ

### Encryption des Données Sensibles

```javascript
// Encryption des credentials BD externes
const encryptionService = require('./encryptionService');

async function saveExternalSource(uid, config) {
  const encryptedConfig = await encryptionService.encrypt(
    JSON.stringify(config.credentials)
  );

  await db.execute(
    'INSERT INTO external_sources (uid, connection_config) VALUES (?, ?)',
    [uid, encryptedConfig]
  );
}
```

### Isolation par Utilisateur

Tous les queries incluent un filtre `WHERE uid = ?` pour garantir que chaque utilisateur ne voit que SES données.

### Mode Local Only

Option pour les données ultra-sensibles :
```javascript
const document = {
  ...docData,
  local_only: 1,  // Ne jamais syncer vers Firebase
  encrypted: 1     // Encrypté au repos
};
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### KPIs Techniques
- ✅ 100% des conversations indexées automatiquement
- ✅ Temps d'indexation < 10s par conversation
- ✅ Précision extraction entités > 80%
- ✅ Temps de recherche < 3s sur 10K chunks
- ✅ 0 data leaks entre utilisateurs

### KPIs Business
- ✅ Démo spectaculaire de 15 min prête
- ✅ Différenciation claire vs ChatGPT/Claude
- ✅ Preuve de valeur ajoutée pour subventions
- ✅ Feedback utilisateur > 4.5/5

---

## 🚀 PROCHAINES ÉTAPES

### Après Phase 2
1. **Phase 3** : Analytics & Démo spectaculaire
2. **Phase 4** : Intelligence contextuelle avancée
3. **Phase 5** : Workflows professionnels

### Évolutions Futures Phase 2
- Connecteurs supplémentaires (Notion, Airtable, Google Drive)
- Multi-modal: images, vidéos
- Recommandations proactives basées sur la mémoire
- Partage de mémoire entre utilisateurs d'une équipe

---

**Date de création** : 2025-11-15
**Version** : 1.0
**Durée estimée** : 7 jours de développement
**Statut** : ⏳ En attente de validation

---

## 📝 NOTES IMPORTANTES

### Réutilisation de l'Existant
Ce plan **réutilise massivement** l'infrastructure existante :
- ✅ `documentService.js` → Extraction texte PDF/DOCX
- ✅ `indexingService.js` → Chunking et embeddings
- ✅ `ragService.js` → Base du RAG (à améliorer)
- ✅ `userContextService.js` → Contexte utilisateur
- ✅ `conversationHistoryService.js` → Historique conversations
- ✅ `syncService.js` → Sync multi-device
- ✅ Enterprise Gateway → Connecteurs BD

### Pas de Mocks
**100% fonctionnel** :
- Vraie extraction d'entités avec LLM
- Vrais embeddings générés
- Vraie recherche sémantique
- Vraies connexions BD externes
- Vraie UI interactive

### Approche Incrémentale
**Chaque jour produit quelque chose de démontrable** :
- Jour 1 → Conversations auto-indexées
- Jour 2 → Screenshots + Audio indexés
- Jour 3 → Entités détectées et graph construit
- Jour 4 → Import BD externe fonctionnel
- Jour 5 → RAG multi-sources en action
- Jour 6 → Dashboard visuel
- Jour 7 → Tout intégré + tests

---

🎯 **OBJECTIF FINAL** : Démontrer que Lucide a une **mémoire augmentée réelle** qui s'améliore avec le temps et qui mobilise intelligemment TOUTES les sources de données de l'utilisateur pour fournir des réponses ultra-personnalisées.

**Ceci est impossible avec ChatGPT, Claude ou toute autre IA générique.**

C'est notre **avantage concurrentiel majeur** pour les subventions. 🚀
