/**
 * Meeting Summary Templates System
 *
 * Inspiré par Hyprnote (mais codé from scratch, sans utiliser leur code GPL)
 *
 * Fournit différents templates de formatage pour les comptes-rendus:
 * - Executive Brief: Résumé ultra-concis pour la direction
 * - Detailed: Compte-rendu complet et détaillé
 * - Bullet Points: Format liste facile à scanner
 * - Action-Focused: Focus sur les actions et décisions
 * - Timeline: Vue chronologique de la réunion
 * - Custom: Template personnalisable par l'utilisateur
 */

/**
 * Templates disponibles avec leur configuration
 */
const TEMPLATES = {
    executive_brief: {
        id: 'executive_brief',
        name: 'Brief Exécutif',
        description: 'Résumé ultra-concis pour la direction (1 page max)',
        icon: '👔',
        maxLength: 500, // mots
        sections: ['executiveSummary', 'decisions', 'actionItems', 'nextSteps'],
        style: {
            tone: 'formal',
            bulletStyle: 'dash',
            includeDetails: false,
            maxItemsPerSection: 5
        }
    },

    detailed: {
        id: 'detailed',
        name: 'Compte-Rendu Détaillé',
        description: 'Document complet avec tous les détails',
        icon: '📋',
        maxLength: null, // pas de limite
        sections: [
            'executiveSummary', 'meetingMetadata', 'objectives', 'keyPoints',
            'decisions', 'actionItems', 'timeline', 'unresolvedItems',
            'risks', 'nextSteps', 'importantQuotes'
        ],
        style: {
            tone: 'professional',
            bulletStyle: 'bullet',
            includeDetails: true,
            maxItemsPerSection: null
        }
    },

    bullet_points: {
        id: 'bullet_points',
        name: 'Points Clés (Bullets)',
        description: 'Format liste facile à scanner rapidement',
        icon: '📌',
        maxLength: 800,
        sections: ['executiveSummary', 'keyPoints', 'decisions', 'actionItems'],
        style: {
            tone: 'concise',
            bulletStyle: 'bullet',
            includeDetails: false,
            maxItemsPerSection: 10
        }
    },

    action_focused: {
        id: 'action_focused',
        name: 'Focus Actions',
        description: 'Centré sur les actions et décisions à suivre',
        icon: '✅',
        maxLength: 600,
        sections: ['executiveSummary', 'decisions', 'actionItems', 'unresolvedItems', 'nextSteps'],
        style: {
            tone: 'actionable',
            bulletStyle: 'checkbox',
            includeDetails: true,
            maxItemsPerSection: null
        }
    },

    timeline: {
        id: 'timeline',
        name: 'Vue Chronologique',
        description: 'Déroulé de la réunion minute par minute',
        icon: '⏱️',
        maxLength: 1000,
        sections: ['executiveSummary', 'timeline', 'decisions', 'actionItems'],
        style: {
            tone: 'narrative',
            bulletStyle: 'numbered',
            includeDetails: true,
            maxItemsPerSection: null
        }
    },

    email_ready: {
        id: 'email_ready',
        name: 'Prêt pour Email',
        description: 'Format optimisé pour envoi par email',
        icon: '📧',
        maxLength: 400,
        sections: ['executiveSummary', 'keyPoints', 'actionItems', 'nextSteps'],
        style: {
            tone: 'friendly_professional',
            bulletStyle: 'bullet',
            includeDetails: false,
            maxItemsPerSection: 7,
            includeGreeting: true,
            includeSignature: true
        }
    }
};

/**
 * Classe principale pour le formatage des comptes-rendus
 */
class MeetingTemplateFormatter {
    constructor(templateId = 'detailed') {
        this.template = TEMPLATES[templateId] || TEMPLATES.detailed;
    }

    /**
     * Change le template actif
     * @param {string} templateId - ID du template
     */
    setTemplate(templateId) {
        if (TEMPLATES[templateId]) {
            this.template = TEMPLATES[templateId];
        } else {
            console.warn(`[MeetingTemplates] Template '${templateId}' not found, using 'detailed'`);
            this.template = TEMPLATES.detailed;
        }
    }

    /**
     * Formate les notes structurées selon le template actif
     * @param {Object} structuredNotes - Notes structurées (JSON du LLM)
     * @param {Object} options - Options de formatage
     * @returns {string} Notes formatées en Markdown
     */
    format(structuredNotes, options = {}) {
        const { language = 'fr' } = options;
        const sections = [];

        // Header
        sections.push(this._formatHeader(structuredNotes, language));

        // Sections selon le template
        for (const sectionId of this.template.sections) {
            const formatted = this._formatSection(sectionId, structuredNotes, language);
            if (formatted) {
                sections.push(formatted);
            }
        }

        // Footer (métadonnées)
        sections.push(this._formatFooter(structuredNotes, language));

        let result = sections.filter(s => s).join('\n\n');

        // Appliquer la limite de mots si définie
        if (this.template.maxLength) {
            result = this._truncateToWordLimit(result, this.template.maxLength);
        }

        return result;
    }

    /**
     * Formate le header du document
     * @private
     */
    _formatHeader(notes, language) {
        const titles = {
            fr: {
                executive_brief: '# 📋 Brief Exécutif',
                detailed: '# 📝 Compte-Rendu de Réunion',
                bullet_points: '# 📌 Points Clés',
                action_focused: '# ✅ Actions & Décisions',
                timeline: '# ⏱️ Déroulé de Réunion',
                email_ready: ''
            },
            en: {
                executive_brief: '# 📋 Executive Brief',
                detailed: '# 📝 Meeting Minutes',
                bullet_points: '# 📌 Key Points',
                action_focused: '# ✅ Actions & Decisions',
                timeline: '# ⏱️ Meeting Timeline',
                email_ready: ''
            }
        };

        const title = titles[language]?.[this.template.id] || titles.fr[this.template.id];
        const date = notes.meetingMetadata?.date || new Date().toISOString().split('T')[0];
        const topic = notes.meetingMetadata?.mainTopic || notes.meetingType || '';

        let header = title;
        if (topic) {
            header += `\n**${topic}**`;
        }
        header += `\n*${date}*`;

        // Ajout salutation pour email
        if (this.template.style.includeGreeting) {
            header = `Bonjour,\n\nVoici le compte-rendu de notre réunion.\n\n${header}`;
        }

        return header;
    }

    /**
     * Formate une section spécifique
     * @private
     */
    _formatSection(sectionId, notes, language) {
        const formatters = {
            executiveSummary: () => this._formatExecutiveSummary(notes, language),
            meetingMetadata: () => this._formatMeetingMetadata(notes, language),
            objectives: () => this._formatObjectives(notes, language),
            keyPoints: () => this._formatKeyPoints(notes, language),
            decisions: () => this._formatDecisions(notes, language),
            actionItems: () => this._formatActionItems(notes, language),
            timeline: () => this._formatTimeline(notes, language),
            unresolvedItems: () => this._formatUnresolvedItems(notes, language),
            risks: () => this._formatRisks(notes, language),
            nextSteps: () => this._formatNextSteps(notes, language),
            importantQuotes: () => this._formatQuotes(notes, language)
        };

        const formatter = formatters[sectionId];
        if (formatter) {
            return formatter();
        }
        return null;
    }

    /**
     * Formate le résumé exécutif
     * @private
     */
    _formatExecutiveSummary(notes, language) {
        if (!notes.executiveSummary) return null;

        const title = language === 'fr' ? '## 📋 Résumé' : '## 📋 Summary';
        return `${title}\n\n${notes.executiveSummary}`;
    }

    /**
     * Formate les métadonnées de la réunion
     * @private
     */
    _formatMeetingMetadata(notes, language) {
        const meta = notes.meetingMetadata;
        if (!meta) return null;

        const labels = {
            fr: { participants: 'Participants', duration: 'Durée', type: 'Type' },
            en: { participants: 'Participants', duration: 'Duration', type: 'Type' }
        };
        const l = labels[language] || labels.fr;

        const lines = [];
        lines.push(language === 'fr' ? '## 👥 Informations' : '## 👥 Meeting Info');

        if (meta.participants && meta.participants.length > 0) {
            const parts = meta.participants.map(p =>
                typeof p === 'string' ? p : `${p.name}${p.role ? ` (${p.role})` : ''}`
            );
            lines.push(`- **${l.participants}:** ${parts.join(', ')}`);
        }

        if (meta.duration) {
            lines.push(`- **${l.duration}:** ${meta.duration}`);
        }

        if (notes.meetingType) {
            lines.push(`- **${l.type}:** ${notes.meetingType}`);
        }

        return lines.join('\n');
    }

    /**
     * Formate les objectifs
     * @private
     */
    _formatObjectives(notes, language) {
        if (!notes.objectives || notes.objectives.length === 0) return null;

        const title = language === 'fr' ? '## 🎯 Objectifs' : '## 🎯 Objectives';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.objectives);

        return `${title}\n${items.map(obj => `${bullet} ${obj}`).join('\n')}`;
    }

    /**
     * Formate les points clés
     * @private
     */
    _formatKeyPoints(notes, language) {
        if (!notes.keyPoints || notes.keyPoints.length === 0) return null;

        const title = language === 'fr' ? '## 💡 Points Clés' : '## 💡 Key Points';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.keyPoints);

        const lines = [title];
        for (const point of items) {
            if (typeof point === 'string') {
                lines.push(`${bullet} ${point}`);
            } else {
                lines.push(`${bullet} **${point.topic}**`);
                if (this.template.style.includeDetails && point.discussion) {
                    lines.push(`  ${point.discussion}`);
                }
                if (point.conclusion) {
                    lines.push(`  → *${point.conclusion}*`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les décisions
     * @private
     */
    _formatDecisions(notes, language) {
        if (!notes.decisions || notes.decisions.length === 0) return null;

        const title = language === 'fr' ? '## ⚖️ Décisions' : '## ⚖️ Decisions';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.decisions);

        const lines = [title];
        for (const decision of items) {
            if (typeof decision === 'string') {
                lines.push(`${bullet} ${decision}`);
            } else {
                lines.push(`${bullet} **${decision.decision}**`);
                if (this.template.style.includeDetails) {
                    if (decision.rationale) {
                        lines.push(`  💭 *${decision.rationale}*`);
                    }
                    if (decision.owner) {
                        lines.push(`  👤 Responsable: ${decision.owner}`);
                    }
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les action items
     * @private
     */
    _formatActionItems(notes, language) {
        if (!notes.actionItems || notes.actionItems.length === 0) return null;

        const title = language === 'fr' ? '## ✅ Actions' : '## ✅ Action Items';
        const items = this._limitItems(notes.actionItems);

        const lines = [title];
        const bullet = this.template.style.bulletStyle === 'checkbox' ? '- [ ]' : this._getBullet();

        // Grouper par priorité si en mode action-focused
        if (this.template.id === 'action_focused') {
            const byPriority = this._groupByPriority(items);

            for (const [priority, priorityItems] of Object.entries(byPriority)) {
                if (priorityItems.length > 0) {
                    const priorityLabel = this._getPriorityLabel(priority, language);
                    lines.push(`\n### ${priorityLabel}`);
                    for (const item of priorityItems) {
                        lines.push(this._formatSingleActionItem(item, bullet, language));
                    }
                }
            }
        } else {
            for (const item of items) {
                lines.push(this._formatSingleActionItem(item, bullet, language));
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate un seul action item
     * @private
     */
    _formatSingleActionItem(item, bullet, language) {
        if (typeof item === 'string') {
            return `${bullet} ${item}`;
        }

        let line = `${bullet} **${item.task}**`;

        const details = [];
        if (item.assignee) {
            details.push(`👤 ${item.assignee}`);
        }
        if (item.deadline) {
            details.push(`📅 ${item.deadline}`);
        }
        if (item.priority && this.template.style.includeDetails) {
            const priorityEmoji = { haute: '🔴', high: '🔴', moyenne: '🟡', medium: '🟡', basse: '🟢', low: '🟢' };
            details.push(priorityEmoji[item.priority.toLowerCase()] || '⚪');
        }

        if (details.length > 0) {
            line += ` | ${details.join(' | ')}`;
        }

        // Ajouter contexte et dépendances si mode détaillé
        if (this.template.style.includeDetails) {
            if (item.context) {
                line += `\n  💬 *${item.context}*`;
            }
            if (item.dependencies) {
                line += `\n  🔗 Dépendance: ${item.dependencies}`;
            }
        }

        return line;
    }

    /**
     * Formate la timeline
     * @private
     */
    _formatTimeline(notes, language) {
        if (!notes.timeline || notes.timeline.length === 0) return null;

        const title = language === 'fr' ? '## ⏱️ Chronologie' : '## ⏱️ Timeline';
        const lines = [title];

        for (const segment of notes.timeline) {
            const time = segment.time || segment.timing || '';
            const topic = segment.topic || '';
            const duration = segment.duration || '';

            lines.push(`\n### ${time} - ${topic} ${duration ? `(${duration})` : ''}`);

            if (segment.keyPoints && segment.keyPoints.length > 0) {
                for (const point of segment.keyPoints) {
                    lines.push(`- ${point}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les points non résolus
     * @private
     */
    _formatUnresolvedItems(notes, language) {
        if (!notes.unresolvedItems || notes.unresolvedItems.length === 0) return null;

        const title = language === 'fr' ? '## ❓ Points Non Résolus' : '## ❓ Unresolved Items';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.unresolvedItems);

        const lines = [title];
        for (const item of items) {
            if (typeof item === 'string') {
                lines.push(`${bullet} ${item}`);
            } else {
                lines.push(`${bullet} **${item.issue}**`);
                if (this.template.style.includeDetails && item.reason) {
                    lines.push(`  Raison: ${item.reason}`);
                }
                if (item.nextAction) {
                    lines.push(`  → Action suggérée: ${item.nextAction}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les risques
     * @private
     */
    _formatRisks(notes, language) {
        if (!notes.risks || notes.risks.length === 0) return null;

        const title = language === 'fr' ? '## ⚠️ Risques Identifiés' : '## ⚠️ Identified Risks';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.risks);

        const lines = [title];
        for (const risk of items) {
            if (typeof risk === 'string') {
                lines.push(`${bullet} ${risk}`);
            } else {
                const probabilityEmoji = {
                    haute: '🔴', high: '🔴',
                    moyenne: '🟡', medium: '🟡',
                    basse: '🟢', low: '🟢'
                };
                const emoji = probabilityEmoji[risk.probability?.toLowerCase()] || '⚪';
                lines.push(`${bullet} ${emoji} **${risk.risk}**`);
                if (this.template.style.includeDetails && risk.mitigation) {
                    lines.push(`  Mitigation: ${risk.mitigation}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les prochaines étapes
     * @private
     */
    _formatNextSteps(notes, language) {
        if (!notes.nextSteps || notes.nextSteps.length === 0) return null;

        const title = language === 'fr' ? '## 🔮 Prochaines Étapes' : '## 🔮 Next Steps';
        const bullet = this._getBullet();
        const items = this._limitItems(notes.nextSteps);

        const lines = [title];
        for (const step of items) {
            if (typeof step === 'string') {
                lines.push(`${bullet} ${step}`);
            } else {
                lines.push(`${bullet} ${step.action}`);
                if (step.responsible) {
                    lines.push(`  👤 ${step.responsible}`);
                }
                if (step.timing) {
                    lines.push(`  📅 ${step.timing}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Formate les citations importantes
     * @private
     */
    _formatQuotes(notes, language) {
        if (!notes.importantQuotes || notes.importantQuotes.length === 0) return null;

        const title = language === 'fr' ? '## 💬 Citations Clés' : '## 💬 Key Quotes';
        const items = this._limitItems(notes.importantQuotes);

        const lines = [title];
        for (const quote of items) {
            if (typeof quote === 'string') {
                lines.push(`> "${quote}"`);
            } else {
                lines.push(`> "${quote.quote}"`);
                if (quote.speaker) {
                    lines.push(`> — *${quote.speaker}*`);
                }
                if (this.template.style.includeDetails && quote.context) {
                    lines.push(`\n*${quote.context}*`);
                }
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Formate le footer
     * @private
     */
    _formatFooter(notes, language) {
        const lines = [];
        lines.push('---');

        if (notes.metadata) {
            const meta = notes.metadata;
            const dateLabel = language === 'fr' ? 'Généré le' : 'Generated on';
            const modelLabel = language === 'fr' ? 'Modèle' : 'Model';

            if (meta.generatedAt) {
                const date = new Date(meta.generatedAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US');
                lines.push(`*${dateLabel}: ${date}*`);
            }
            if (meta.model) {
                lines.push(`*${modelLabel}: ${meta.model}*`);
            }
            if (meta.qualityScore) {
                lines.push(`*Score qualité: ${Math.round(meta.qualityScore * 100)}%*`);
            }
        }

        // Signature pour email
        if (this.template.style.includeSignature) {
            lines.push('\n\nCordialement,\nLucide Meeting Intelligence');
        }

        return lines.join('\n');
    }

    /**
     * Obtient le caractère de bullet selon le style
     * @private
     */
    _getBullet() {
        const styles = {
            bullet: '•',
            dash: '-',
            numbered: '1.',
            checkbox: '- [ ]'
        };
        return styles[this.template.style.bulletStyle] || '•';
    }

    /**
     * Limite le nombre d'items selon le template
     * @private
     */
    _limitItems(items) {
        if (!items || !Array.isArray(items)) return [];

        const maxItems = this.template.style.maxItemsPerSection;
        if (maxItems && items.length > maxItems) {
            return items.slice(0, maxItems);
        }
        return items;
    }

    /**
     * Groupe les action items par priorité
     * @private
     */
    _groupByPriority(items) {
        const groups = {
            high: [],
            medium: [],
            low: [],
            none: []
        };

        for (const item of items) {
            const priority = (item.priority || '').toLowerCase();
            if (priority === 'haute' || priority === 'high') {
                groups.high.push(item);
            } else if (priority === 'moyenne' || priority === 'medium') {
                groups.medium.push(item);
            } else if (priority === 'basse' || priority === 'low') {
                groups.low.push(item);
            } else {
                groups.none.push(item);
            }
        }

        return groups;
    }

    /**
     * Obtient le label de priorité localisé
     * @private
     */
    _getPriorityLabel(priority, language) {
        const labels = {
            fr: { high: '🔴 Priorité Haute', medium: '🟡 Priorité Moyenne', low: '🟢 Priorité Basse', none: '⚪ Non priorisé' },
            en: { high: '🔴 High Priority', medium: '🟡 Medium Priority', low: '🟢 Low Priority', none: '⚪ Not Prioritized' }
        };
        return labels[language]?.[priority] || labels.fr[priority] || priority;
    }

    /**
     * Tronque le texte à une limite de mots
     * @private
     */
    _truncateToWordLimit(text, maxWords) {
        const words = text.split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }

        const truncated = words.slice(0, maxWords).join(' ');
        return truncated + '\n\n*[Résumé tronqué pour respecter la limite de mots]*';
    }
}

/**
 * Obtient la liste des templates disponibles
 * @returns {Array} Liste des templates avec métadonnées
 */
function getAvailableTemplates() {
    return Object.values(TEMPLATES).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon
    }));
}

/**
 * Obtient un template par son ID
 * @param {string} templateId - ID du template
 * @returns {Object|null} Configuration du template
 */
function getTemplateById(templateId) {
    return TEMPLATES[templateId] || null;
}

module.exports = {
    MeetingTemplateFormatter,
    TEMPLATES,
    getAvailableTemplates,
    getTemplateById
};
