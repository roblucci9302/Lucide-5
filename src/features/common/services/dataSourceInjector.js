/**
 * Data Source Injector Service
 *
 * Injects information about available database connections and APIs
 * into the AI prompt, enabling the model to query external data sources.
 */

class DataSourceInjector {
    constructor() {
        this._externalDataService = null;
    }

    /**
     * Lazy load external data service
     * @private
     */
    _getExternalDataService() {
        if (!this._externalDataService) {
            try {
                this._externalDataService = require('./externalDataService');
            } catch (e) {
                console.warn('[DataSourceInjector] External data service not available:', e.message);
            }
        }
        return this._externalDataService;
    }

    /**
     * Get formatted data source information for injection into prompts
     * @param {string} userId - User ID
     * @returns {Promise<string>} - Formatted prompt section
     */
    async getDataSourcesPrompt(userId) {
        const externalDataService = this._getExternalDataService();

        if (!externalDataService) {
            return '';
        }

        try {
            const sources = await externalDataService.getExternalSources(userId);

            if (!sources || sources.length === 0) {
                return '';
            }

            // Build the prompt section
            let prompt = `
=== SOURCES DE DONNÉES EXTERNES DISPONIBLES ===
Tu as accès aux bases de données et APIs suivantes. Tu peux exécuter des requêtes pour aider l'utilisateur.

`;

            for (const source of sources) {
                const sourceInfo = this._formatSourceInfo(source);
                prompt += sourceInfo;
            }

            prompt += `
SYNTAXE POUR INTERROGER UNE SOURCE:
<<QUERY:nom_de_la_source>>
Ta requête ici (SQL, JSON filter, ou API call)
<</QUERY>>

EXEMPLES:
${this._getExamplesForSources(sources)}

IMPORTANT:
- Utilise le nom exact de la source (sensible à la casse)
- Limite tes requêtes à 50 résultats maximum
- N'effectue que des requêtes de lecture (SELECT, GET, find)
- Ne modifie jamais les données sans confirmation explicite de l'utilisateur
`;

            return prompt;
        } catch (error) {
            console.error('[DataSourceInjector] Error getting data sources:', error);
            return '';
        }
    }

    /**
     * Format a single source info for the prompt
     * @private
     */
    _formatSourceInfo(source) {
        const typeLabels = {
            'postgresql': 'PostgreSQL',
            'mysql': 'MySQL',
            'mongodb': 'MongoDB',
            'notion': 'Notion',
            'airtable': 'Airtable',
            'rest_api': 'API REST'
        };

        const typeIcons = {
            'postgresql': '🐘',
            'mysql': '🐬',
            'mongodb': '🍃',
            'notion': '📝',
            'airtable': '📊',
            'rest_api': '🌐'
        };

        const icon = typeIcons[source.type] || '📦';
        const label = typeLabels[source.type] || source.type;

        let info = `${icon} **${source.name}** (${label})\n`;

        // Add type-specific hints
        switch (source.type) {
            case 'postgresql':
            case 'mysql':
                info += `   → Syntaxe: SQL standard (SELECT, JOIN, WHERE, etc.)\n`;
                break;
            case 'mongodb':
                info += `   → Syntaxe: Filtre JSON (ex: {"status": "active"})\n`;
                break;
            case 'notion':
                info += `   → Syntaxe: Filtre Notion ou recherche textuelle\n`;
                break;
            case 'airtable':
                info += `   → Syntaxe: Formule Airtable (filterByFormula)\n`;
                break;
            case 'rest_api':
                info += `   → Syntaxe: GET /endpoint ou POST /endpoint avec body JSON\n`;
                break;
        }

        info += '\n';
        return info;
    }

    /**
     * Generate query examples based on available sources
     * @private
     */
    _getExamplesForSources(sources) {
        let examples = '';

        const hasSql = sources.some(s => s.type === 'postgresql' || s.type === 'mysql');
        const hasMongo = sources.some(s => s.type === 'mongodb');
        const hasNotion = sources.some(s => s.type === 'notion');
        const hasAirtable = sources.some(s => s.type === 'airtable');
        const hasRestApi = sources.some(s => s.type === 'rest_api');

        if (hasSql) {
            const sqlSource = sources.find(s => s.type === 'postgresql' || s.type === 'mysql');
            examples += `- SQL (${sqlSource.name}):
  <<QUERY:${sqlSource.name}>>
  SELECT * FROM clients WHERE created_at > '2024-01-01' LIMIT 10
  <</QUERY>>

`;
        }

        if (hasMongo) {
            const mongoSource = sources.find(s => s.type === 'mongodb');
            examples += `- MongoDB (${mongoSource.name}):
  <<QUERY:${mongoSource.name}>>
  {"status": "active", "department": "sales"}
  <</QUERY>>

`;
        }

        if (hasNotion) {
            const notionSource = sources.find(s => s.type === 'notion');
            examples += `- Notion (${notionSource.name}):
  <<QUERY:${notionSource.name}>>
  {"filter": {"property": "Status", "status": {"equals": "In Progress"}}}
  <</QUERY>>

`;
        }

        if (hasAirtable) {
            const airtableSource = sources.find(s => s.type === 'airtable');
            examples += `- Airtable (${airtableSource.name}):
  <<QUERY:${airtableSource.name}>>
  {Status} = 'Active'
  <</QUERY>>

`;
        }

        if (hasRestApi) {
            const apiSource = sources.find(s => s.type === 'rest_api');
            examples += `- API REST (${apiSource.name}):
  <<QUERY:${apiSource.name}>>
  GET /users?status=active&limit=10
  <</QUERY>>

`;
        }

        return examples || 'Aucune source configurée.\n';
    }

    /**
     * Check if user has any data sources configured
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async hasDataSources(userId) {
        const externalDataService = this._getExternalDataService();

        if (!externalDataService) {
            return false;
        }

        try {
            const sources = await externalDataService.getExternalSources(userId);
            return sources && sources.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get a simple list of available source names
     * @param {string} userId - User ID
     * @returns {Promise<Array<string>>}
     */
    async getSourceNames(userId) {
        const externalDataService = this._getExternalDataService();

        if (!externalDataService) {
            return [];
        }

        try {
            const sources = await externalDataService.getExternalSources(userId);
            return sources.map(s => s.name);
        } catch {
            return [];
        }
    }

    /**
     * Get source details for a specific source
     * @param {string} userId - User ID
     * @param {string} sourceName - Source name
     * @returns {Promise<Object|null>}
     */
    async getSourceDetails(userId, sourceName) {
        const externalDataService = this._getExternalDataService();

        if (!externalDataService) {
            return null;
        }

        try {
            const sources = await externalDataService.getExternalSources(userId);
            return sources.find(s => s.name.toLowerCase() === sourceName.toLowerCase()) || null;
        } catch {
            return null;
        }
    }
}

// Export singleton instance
module.exports = new DataSourceInjector();
