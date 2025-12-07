/**
 * Action Parser Service
 *
 * Parses AI responses to detect and extract actionable commands.
 * Allows the AI model to trigger system actions via special syntax.
 *
 * Supported Actions:
 * - <<EMAIL>> ... <</EMAIL>> - Generate and display email
 * - <<TASK>> ... <</TASK>> - Create a task
 * - <<PROFILE:id>> - Switch to a different agent profile
 * - <<UPLOAD_REQUEST>> - Request file upload from user
 * - <<QUERY:source_name>> ... <</QUERY>> - Execute database query
 */

class ActionParser {
    constructor() {
        // Email action: <<EMAIL>>to: ...\nsubject: ...\n---\nBody content<</EMAIL>>
        this.emailRegex = /<<EMAIL>>\s*(?:to:\s*(.+?)\s*)?(?:cc:\s*(.+?)\s*)?subject:\s*(.+?)\s*---\s*([\s\S]+?)<<\/EMAIL>>/gi;

        // Task action: <<TASK>>assignee: ...\ndeadline: ...\npriority: ...\n---\nDescription<</TASK>>
        this.taskRegex = /<<TASK>>\s*(?:assignee:\s*(.+?)\s*)?(?:deadline:\s*(.+?)\s*)?(?:priority:\s*(low|medium|high)\s*)?---\s*([\s\S]+?)<<\/TASK>>/gi;

        // Profile switch: <<PROFILE:profile_id>>
        this.profileRegex = /<<PROFILE:(\w+)>>/gi;

        // Upload request: <<UPLOAD_REQUEST>>description<</UPLOAD_REQUEST>>
        this.uploadRequestRegex = /<<UPLOAD_REQUEST>>\s*([\s\S]+?)<<\/UPLOAD_REQUEST>>/gi;

        // Database query: <<QUERY:source_name>>SQL or filter<</QUERY>>
        this.queryRegex = /<<QUERY:(\w+)>>\s*([\s\S]+?)<<\/QUERY>>/gi;

        // Available profiles for validation
        this.validProfiles = [
            'lucide_assistant',
            'interview',
            'hr_specialist',
            'it_expert',
            'marketing_expert',
            'meeting_assistant',
            'ceo_advisor',
            'sales_expert',
            'manager_coach'
        ];
    }

    /**
     * Parse AI response and extract all actions
     * @param {string} text - AI response text
     * @returns {Object} - { actions: Array, cleanText: string }
     */
    parse(text) {
        if (!text || typeof text !== 'string') {
            return { actions: [], cleanText: text || '' };
        }

        const actions = [];
        let cleanText = text;

        // Parse emails
        const emailActions = this._parseEmails(text);
        actions.push(...emailActions.actions);
        cleanText = emailActions.cleanText;

        // Parse tasks
        const taskActions = this._parseTasks(cleanText);
        actions.push(...taskActions.actions);
        cleanText = taskActions.cleanText;

        // Parse profile switches
        const profileActions = this._parseProfileSwitches(cleanText);
        actions.push(...profileActions.actions);
        cleanText = profileActions.cleanText;

        // Parse upload requests
        const uploadActions = this._parseUploadRequests(cleanText);
        actions.push(...uploadActions.actions);
        cleanText = uploadActions.cleanText;

        // Parse database queries
        const queryActions = this._parseQueries(cleanText);
        actions.push(...queryActions.actions);
        cleanText = queryActions.cleanText;

        if (actions.length > 0) {
            console.log(`[ActionParser] Parsed ${actions.length} actions from response:`,
                actions.map(a => a.type).join(', '));
        }

        return {
            actions,
            cleanText: cleanText.trim()
        };
    }

    /**
     * Parse email actions
     * @private
     */
    _parseEmails(text) {
        const actions = [];
        let cleanText = text;
        const regex = new RegExp(this.emailRegex);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, to, cc, subject, body] = match;

            const emailAction = {
                id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'email',
                data: {
                    to: to ? to.split(',').map(e => e.trim()) : [],
                    cc: cc ? cc.split(',').map(e => e.trim()) : [],
                    subject: subject.trim(),
                    body: body.trim(),
                    bodyHtml: this._markdownToHtml(body.trim())
                },
                timestamp: new Date().toISOString()
            };

            actions.push(emailAction);

            // Replace with UI placeholder
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n📧 **Email généré**: "${subject.trim()}"\n` +
                `> Destinataire(s): ${to || 'À définir'}\n` +
                `> [Cliquez pour ouvrir l'email]\n\n`
            );
        }

        return { actions, cleanText };
    }

    /**
     * Parse task actions
     * @private
     */
    _parseTasks(text) {
        const actions = [];
        let cleanText = text;
        const regex = new RegExp(this.taskRegex);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, assignee, deadline, priority, description] = match;

            const taskAction = {
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'task',
                data: {
                    task_description: description.trim(),
                    assigned_to: assignee ? assignee.trim() : 'Non assigné',
                    deadline: deadline ? deadline.trim() : 'TBD',
                    priority: priority ? priority.toLowerCase() : 'medium',
                    status: 'pending'
                },
                timestamp: new Date().toISOString()
            };

            actions.push(taskAction);

            // Replace with UI placeholder
            const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n✅ **Tâche créée**: ${description.trim().substring(0, 50)}...\n` +
                `> ${priorityEmoji[taskAction.data.priority] || '🟡'} Priorité: ${priority || 'medium'}\n` +
                `> 👤 Assigné à: ${assignee || 'Non assigné'}\n` +
                `> 📅 Deadline: ${deadline || 'À définir'}\n\n`
            );
        }

        return { actions, cleanText };
    }

    /**
     * Parse profile switch actions
     * @private
     */
    _parseProfileSwitches(text) {
        const actions = [];
        let cleanText = text;
        const regex = new RegExp(this.profileRegex);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, profileId] = match;

            if (this.validProfiles.includes(profileId.toLowerCase())) {
                const profileAction = {
                    id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'profile_switch',
                    data: {
                        profileId: profileId.toLowerCase(),
                        reason: 'ai_suggested'
                    },
                    timestamp: new Date().toISOString()
                };

                actions.push(profileAction);

                // Replace with UI placeholder
                const profileNames = {
                    'lucide_assistant': 'Assistant Général',
                    'interview': 'Mode Interview',
                    'hr_specialist': 'Expert RH',
                    'it_expert': 'Expert IT',
                    'marketing_expert': 'Expert Marketing',
                    'meeting_assistant': 'Assistant Réunion',
                    'ceo_advisor': 'Conseiller CEO',
                    'sales_expert': 'Expert Sales',
                    'manager_coach': 'Coach Manager'
                };

                cleanText = cleanText.replace(
                    fullMatch,
                    `\n\n🔄 **Changement de profil suggéré**: ${profileNames[profileId.toLowerCase()] || profileId}\n` +
                    `> [Cliquez pour changer de profil]\n\n`
                );
            } else {
                console.warn(`[ActionParser] Invalid profile ID: ${profileId}`);
                cleanText = cleanText.replace(fullMatch, '');
            }
        }

        return { actions, cleanText };
    }

    /**
     * Parse upload request actions
     * @private
     */
    _parseUploadRequests(text) {
        const actions = [];
        let cleanText = text;
        const regex = new RegExp(this.uploadRequestRegex);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, description] = match;

            const uploadAction = {
                id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'upload_request',
                data: {
                    description: description.trim(),
                    fileTypes: this._detectFileTypes(description)
                },
                timestamp: new Date().toISOString()
            };

            actions.push(uploadAction);

            // Replace with UI placeholder
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n📁 **Fichier demandé**: ${description.trim()}\n` +
                `> [Cliquez pour uploader un fichier]\n\n`
            );
        }

        return { actions, cleanText };
    }

    /**
     * Parse database query actions
     * @private
     */
    _parseQueries(text) {
        const actions = [];
        let cleanText = text;
        const regex = new RegExp(this.queryRegex);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, sourceName, queryContent] = match;

            const queryAction = {
                id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'database_query',
                data: {
                    sourceName: sourceName.trim(),
                    query: queryContent.trim(),
                    queryType: this._detectQueryType(queryContent)
                },
                timestamp: new Date().toISOString()
            };

            actions.push(queryAction);

            // Replace with UI placeholder
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n🔍 **Requête exécutée**: ${sourceName}\n` +
                `> Source: ${sourceName}\n` +
                `> [Résultats en cours de chargement...]\n\n`
            );
        }

        return { actions, cleanText };
    }

    /**
     * Detect the type of query (SQL, MongoDB, API, etc.)
     * @private
     */
    _detectQueryType(query) {
        const lower = query.toLowerCase().trim();

        // SQL patterns
        if (lower.startsWith('select') || lower.startsWith('insert') ||
            lower.startsWith('update') || lower.startsWith('delete')) {
            return 'sql';
        }

        // MongoDB patterns (JSON-like)
        if (lower.startsWith('{') || lower.startsWith('[')) {
            return 'mongodb';
        }

        // REST API patterns
        if (lower.startsWith('get ') || lower.startsWith('post ') ||
            lower.startsWith('put ') || lower.startsWith('delete ')) {
            return 'rest';
        }

        // Default to filter (for Notion, Airtable, etc.)
        return 'filter';
    }

    /**
     * Detect file types from description
     * @private
     */
    _detectFileTypes(description) {
        const lower = description.toLowerCase();
        const types = [];

        if (lower.includes('pdf')) types.push('application/pdf');
        if (lower.includes('word') || lower.includes('docx')) types.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        if (lower.includes('excel') || lower.includes('xlsx')) types.push('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        if (lower.includes('image') || lower.includes('photo') || lower.includes('capture')) {
            types.push('image/jpeg', 'image/png', 'image/gif');
        }
        if (lower.includes('csv')) types.push('text/csv');
        if (lower.includes('texte') || lower.includes('txt')) types.push('text/plain');

        return types.length > 0 ? types : ['*/*'];
    }

    /**
     * Simple markdown to HTML conversion
     * @private
     */
    _markdownToHtml(markdown) {
        if (!markdown) return '';

        return markdown
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, (match) => {
                if (!match.startsWith('<')) return `<p>${match}</p>`;
                return match;
            });
    }

    /**
     * Check if text contains any action markers
     * @param {string} text - Text to check
     * @returns {boolean}
     */
    hasActions(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        return (
            this.emailRegex.test(text) ||
            this.taskRegex.test(text) ||
            this.profileRegex.test(text) ||
            this.uploadRequestRegex.test(text) ||
            this.queryRegex.test(text)
        );
    }

    /**
     * Get action summary for logging/debugging
     * @param {string} text - Text to analyze
     * @returns {Object} - { emails: number, tasks: number, profiles: number, uploads: number, queries: number }
     */
    getActionSummary(text) {
        if (!text || typeof text !== 'string') {
            return { emails: 0, tasks: 0, profiles: 0, uploads: 0, queries: 0 };
        }

        return {
            emails: (text.match(this.emailRegex) || []).length,
            tasks: (text.match(this.taskRegex) || []).length,
            profiles: (text.match(this.profileRegex) || []).length,
            uploads: (text.match(this.uploadRequestRegex) || []).length,
            queries: (text.match(this.queryRegex) || []).length
        };
    }

    /**
     * Generate syntax instructions for AI prompts
     * @returns {string}
     */
    getActionSyntaxInstructions() {
        return `
SYNTAXES D'ACTION SYSTÈME (utilise ces formats pour déclencher des actions):

📧 GÉNÉRER UN EMAIL:
<<EMAIL>>
to: destinataire@email.com, autre@email.com
cc: copie@email.com
subject: Sujet de l'email
---
Corps de l'email en markdown...
<</EMAIL>>

✅ CRÉER UNE TÂCHE:
<<TASK>>
assignee: Nom de la personne
deadline: 2024-01-15 ou "Fin de semaine"
priority: high|medium|low
---
Description de la tâche à accomplir
<</TASK>>

🔄 CHANGER DE PROFIL:
<<PROFILE:profile_id>>
Profils valides: lucide_assistant, interview, hr_specialist, it_expert, marketing_expert, meeting_assistant, ceo_advisor, sales_expert, manager_coach

📁 DEMANDER UN FICHIER:
<<UPLOAD_REQUEST>>
Description du fichier nécessaire (ex: "le CV du candidat en PDF")
<</UPLOAD_REQUEST>>

🔍 REQUÊTE BASE DE DONNÉES/API:
<<QUERY:nom_source>>
SELECT * FROM clients WHERE status = 'active' LIMIT 10
<</QUERY>>
Types de requêtes supportés:
- SQL pour PostgreSQL/MySQL
- JSON pour MongoDB (ex: {"status": "active"})
- Filtres pour Notion/Airtable
- GET/POST pour APIs REST
`;
    }

    /**
     * Validate an action object
     * @param {Object} action - Action to validate
     * @returns {boolean}
     */
    validateAction(action) {
        if (!action || !action.type || !action.data) {
            return false;
        }

        switch (action.type) {
            case 'email':
                return !!(action.data.subject && action.data.body);
            case 'task':
                return !!(action.data.task_description);
            case 'profile_switch':
                return this.validProfiles.includes(action.data.profileId);
            case 'upload_request':
                return !!(action.data.description);
            case 'database_query':
                return !!(action.data.sourceName && action.data.query);
            default:
                return false;
        }
    }
}

// Export singleton instance
module.exports = new ActionParser();
