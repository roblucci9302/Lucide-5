/**
 * Action Item Validator Service
 *
 * Inspiré par MeetingTranscriptProcessor (MIT License)
 * https://github.com/Darko-Martinovic/MeetingTranscriptProcessor
 *
 * Fournit une validation multi-étapes des action items extraits pour:
 * - Détecter les hallucinations (action items inventés par l'IA)
 * - Valider la cohérence avec la transcription source
 * - Scorer la confiance de chaque action item
 * - Filtrer les faux positifs
 */

/**
 * Patterns linguistiques indiquant une action item dans différentes langues
 */
const ACTION_PATTERNS = {
    fr: [
        // Engagements directs
        /\bje\s+(vais|dois|peux|ferai|m'engage\s+à)\b/i,
        /\btu\s+(vas|dois|peux|feras|pourrais)\b/i,
        /\bil\/elle\s+(va|doit|peut|fera)\b/i,
        /\bon\s+(va|doit|peut|fera|devrait)\b/i,
        /\bnous\s+(allons|devons|pouvons|ferons)\b/i,

        // Formulations d'action
        /\bil\s+faut\s+(que|absolument)?\b/i,
        /\bà\s+faire\b/i,
        /\baction\s*:\s*/i,
        /\btâche\s*:\s*/i,
        /\bresponsable\s*:\s*/i,

        // Deadlines
        /\bd'ici\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|la\s+semaine)\b/i,
        /\bavant\s+(le|la|lundi|mardi|mercredi|jeudi|vendredi)\b/i,
        /\bpour\s+(lundi|mardi|mercredi|jeudi|vendredi|demain|la\s+fin)\b/i,
        /\bdélai\s*:\s*/i,

        // Assignations
        /\b(jean|marie|pierre|paul|sophie|thomas|julie|marc|anne|laurent|nicolas|david|sarah|emma|lucas|léa)\s+(va|doit|s'occupe|prend\s+en\s+charge)/i,
        /\bqui\s+s'en\s+(occupe|charge)\s*\?/i,
        /\bc'est\s+(toi|moi|lui|elle|nous)\s+qui\b/i
    ],
    en: [
        // Direct commitments
        /\bi\s+(will|shall|am\s+going\s+to|need\s+to|must|can)\b/i,
        /\byou\s+(will|shall|should|need\s+to|must|can)\b/i,
        /\bwe\s+(will|shall|should|need\s+to|must|can)\b/i,
        /\blet's\b/i,

        // Action formulations
        /\baction\s*(item)?\s*:\s*/i,
        /\btask\s*:\s*/i,
        /\bto\s*-?\s*do\s*:\s*/i,
        /\bowner\s*:\s*/i,
        /\bassigned\s+to\b/i,

        // Deadlines
        /\bby\s+(monday|tuesday|wednesday|thursday|friday|tomorrow|end\s+of\s+week|eow)\b/i,
        /\bbefore\s+(monday|tuesday|wednesday|thursday|friday|the\s+meeting)\b/i,
        /\bdue\s*(date)?\s*:\s*/i,
        /\bdeadline\s*:\s*/i,

        // Assignments
        /\b(john|jane|mike|sarah|david|alex|chris|emma|tom|lisa)\s+(will|should|needs\s+to|is\s+going\s+to)/i,
        /\bwho\s+(will|is\s+going\s+to|should)\b/i
    ]
};

/**
 * Mots-clés génériques qui ne sont PAS des action items (faux positifs courants)
 */
const FALSE_POSITIVE_PATTERNS = [
    // Questions rhétoriques
    /\bqu'est-ce\s+qu'on\s+(fait|va\s+faire)\s*\?/i,
    /\bwhat\s+(do|should|will)\s+we\s+do\s*\?/i,

    // Conditions/hypothèses
    /\bsi\s+on\s+(pouvait|devait|faisait)\b/i,
    /\bif\s+we\s+(could|should|would)\b/i,

    // Passé (pas une action future)
    /\bon\s+a\s+(fait|dû|pu)\b/i,
    /\bwe\s+(did|had\s+to|were\s+able\s+to)\b/i,

    // Négations
    /\bon\s+ne\s+(va|doit|peut)\s+pas\b/i,
    /\bwe\s+(won't|shouldn't|can't|don't\s+need\s+to)\b/i,

    // Généralités sans engagement
    /\ben\s+général\b/i,
    /\bnormalement\b/i,
    /\bgenerally\b/i,
    /\busually\b/i
];

/**
 * Classe principale de validation des action items
 */
class ActionItemValidator {
    constructor(options = {}) {
        this.options = {
            minConfidenceScore: 0.6,        // Score minimum pour accepter un action item
            enableHallucinationDetection: true,
            enableConsistencyCheck: true,
            language: 'fr',                  // 'fr' ou 'en'
            strictMode: false,               // En mode strict, plus de validations
            ...options
        };
    }

    /**
     * Valide une liste d'action items contre la transcription source
     * @param {Array} actionItems - Action items extraits par l'IA
     * @param {string} transcript - Transcription source
     * @returns {Object} Résultat de validation avec scores et items filtrés
     */
    validateActionItems(actionItems, transcript) {
        if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
            return {
                validatedItems: [],
                rejectedItems: [],
                stats: { total: 0, valid: 0, rejected: 0, avgConfidence: 0 }
            };
        }

        const normalizedTranscript = this._normalizeText(transcript);
        const validatedItems = [];
        const rejectedItems = [];

        for (const item of actionItems) {
            const validation = this._validateSingleItem(item, normalizedTranscript, transcript);

            if (validation.isValid) {
                validatedItems.push({
                    ...item,
                    confidence: validation.confidence,
                    validationDetails: validation.details
                });
            } else {
                rejectedItems.push({
                    ...item,
                    rejectionReason: validation.reason,
                    confidence: validation.confidence
                });
            }
        }

        // Trier par priorité et confiance
        validatedItems.sort((a, b) => {
            const priorityOrder = { haute: 0, high: 0, moyenne: 1, medium: 1, basse: 2, low: 2 };
            const aPriority = priorityOrder[a.priority?.toLowerCase()] ?? 1;
            const bPriority = priorityOrder[b.priority?.toLowerCase()] ?? 1;

            if (aPriority !== bPriority) return aPriority - bPriority;
            return (b.confidence || 0) - (a.confidence || 0);
        });

        const avgConfidence = validatedItems.length > 0
            ? validatedItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / validatedItems.length
            : 0;

        return {
            validatedItems,
            rejectedItems,
            stats: {
                total: actionItems.length,
                valid: validatedItems.length,
                rejected: rejectedItems.length,
                avgConfidence: Math.round(avgConfidence * 100) / 100
            }
        };
    }

    /**
     * Valide un seul action item
     * @private
     */
    _validateSingleItem(item, normalizedTranscript, originalTranscript) {
        const scores = {
            groundingScore: 0,      // L'item est-il ancré dans la transcription?
            specificityScore: 0,    // L'item est-il spécifique?
            completenessScore: 0,   // L'item a-t-il tous les champs requis?
            patternScore: 0,        // Match-t-il des patterns d'action connus?
            consistencyScore: 0     // Est-il cohérent avec le contexte?
        };
        const details = [];

        // 1. Vérification d'ancrage (Grounding Check)
        if (this.options.enableHallucinationDetection) {
            scores.groundingScore = this._checkGrounding(item, normalizedTranscript, originalTranscript);
            details.push(`Ancrage: ${Math.round(scores.groundingScore * 100)}%`);
        } else {
            scores.groundingScore = 0.7; // Score par défaut si désactivé
        }

        // 2. Score de spécificité
        scores.specificityScore = this._checkSpecificity(item);
        details.push(`Spécificité: ${Math.round(scores.specificityScore * 100)}%`);

        // 3. Score de complétude
        scores.completenessScore = this._checkCompleteness(item);
        details.push(`Complétude: ${Math.round(scores.completenessScore * 100)}%`);

        // 4. Score de pattern
        scores.patternScore = this._checkPatternMatch(item, originalTranscript);
        details.push(`Pattern: ${Math.round(scores.patternScore * 100)}%`);

        // 5. Score de cohérence
        if (this.options.enableConsistencyCheck) {
            scores.consistencyScore = this._checkConsistency(item);
            details.push(`Cohérence: ${Math.round(scores.consistencyScore * 100)}%`);
        } else {
            scores.consistencyScore = 0.7;
        }

        // Calcul du score final pondéré
        const weights = {
            groundingScore: 0.35,    // Le plus important - évite les hallucinations
            specificityScore: 0.20,
            completenessScore: 0.20,
            patternScore: 0.15,
            consistencyScore: 0.10
        };

        const confidence = Object.entries(scores).reduce((total, [key, score]) => {
            return total + (score * (weights[key] || 0));
        }, 0);

        // Vérifier les faux positifs
        const isFalsePositive = this._checkFalsePositive(item, originalTranscript);

        const isValid = confidence >= this.options.minConfidenceScore && !isFalsePositive;

        let reason = null;
        if (!isValid) {
            if (isFalsePositive) {
                reason = 'Faux positif détecté (question rhétorique, hypothèse, ou passé)';
            } else if (scores.groundingScore < 0.3) {
                reason = 'Hallucination probable - non trouvé dans la transcription';
            } else if (scores.specificityScore < 0.3) {
                reason = 'Trop vague ou générique';
            } else if (scores.completenessScore < 0.3) {
                reason = 'Informations manquantes (tâche, responsable, ou délai)';
            } else {
                reason = `Score de confiance insuffisant (${Math.round(confidence * 100)}% < ${this.options.minConfidenceScore * 100}%)`;
            }
        }

        return {
            isValid,
            confidence,
            reason,
            details,
            scores
        };
    }

    /**
     * Vérifie que l'action item est ancré dans la transcription (anti-hallucination)
     * @private
     */
    _checkGrounding(item, normalizedTranscript, originalTranscript) {
        let groundingScore = 0;
        const taskText = this._normalizeText(item.task || '');
        const assigneeText = this._normalizeText(item.assignee || '');

        // Extraire les mots-clés de la tâche (mots de plus de 3 caractères)
        const taskKeywords = taskText
            .split(/\s+/)
            .filter(word => word.length > 3 && !this._isStopWord(word));

        if (taskKeywords.length === 0) {
            return 0.5; // Pas assez de mots pour vérifier
        }

        // Compter combien de mots-clés sont présents dans la transcription
        let foundKeywords = 0;
        for (const keyword of taskKeywords) {
            if (normalizedTranscript.includes(keyword)) {
                foundKeywords++;
            }
        }

        const keywordRatio = foundKeywords / taskKeywords.length;
        groundingScore += keywordRatio * 0.5;

        // Vérifier si le responsable est mentionné
        if (assigneeText && assigneeText !== 'tbd' && assigneeText !== 'équipe' && assigneeText !== 'team') {
            const assigneeWords = assigneeText.split(/\s+/).filter(w => w.length > 2);
            const assigneeFound = assigneeWords.some(word => normalizedTranscript.includes(word));
            groundingScore += assigneeFound ? 0.3 : 0;
        } else {
            groundingScore += 0.15; // Bonus partiel si pas de responsable spécifique
        }

        // Bonus si on trouve un pattern d'action autour des mots-clés
        const hasActionContext = this._findActionContext(originalTranscript, taskKeywords);
        groundingScore += hasActionContext ? 0.2 : 0;

        return Math.min(1, groundingScore);
    }

    /**
     * Vérifie la spécificité de l'action item
     * @private
     */
    _checkSpecificity(item) {
        let score = 0;
        const task = item.task || '';

        // Vérifier la longueur (ni trop court, ni trop long)
        const wordCount = task.split(/\s+/).length;
        if (wordCount >= 3 && wordCount <= 20) {
            score += 0.3;
        } else if (wordCount > 0) {
            score += 0.15;
        }

        // Présence d'un verbe d'action
        const actionVerbs = [
            // Français
            'envoyer', 'préparer', 'valider', 'organiser', 'créer', 'rédiger', 'contacter',
            'planifier', 'finaliser', 'réviser', 'analyser', 'présenter', 'livrer', 'terminer',
            'mettre à jour', 'configurer', 'tester', 'vérifier', 'corriger', 'implémenter',
            // Anglais
            'send', 'prepare', 'validate', 'organize', 'create', 'write', 'contact',
            'plan', 'finalize', 'review', 'analyze', 'present', 'deliver', 'complete',
            'update', 'configure', 'test', 'verify', 'fix', 'implement'
        ];

        const taskLower = task.toLowerCase();
        if (actionVerbs.some(verb => taskLower.includes(verb))) {
            score += 0.3;
        }

        // Présence d'un objet/sujet spécifique
        const hasSpecificObject = /\b(rapport|document|email|réunion|présentation|spec|api|feature|projet|client|budget|plan|contrat|devis|analyse|dashboard)\b/i.test(task);
        if (hasSpecificObject) {
            score += 0.2;
        }

        // Présence de détails quantifiables
        const hasQuantifiable = /\b(\d+|tous|toutes|chaque|premier|première|final|finale)\b/i.test(task);
        if (hasQuantifiable) {
            score += 0.2;
        }

        return Math.min(1, score);
    }

    /**
     * Vérifie la complétude de l'action item
     * @private
     */
    _checkCompleteness(item) {
        let score = 0;
        const weights = {
            task: 0.4,
            assignee: 0.3,
            deadline: 0.2,
            priority: 0.1
        };

        // Tâche présente et non vide
        if (item.task && item.task.trim().length > 5) {
            score += weights.task;
        }

        // Responsable présent et non générique
        const assignee = (item.assignee || '').toLowerCase().trim();
        if (assignee && assignee !== 'tbd' && assignee !== 'à définir' && assignee !== 'to be defined') {
            score += weights.assignee;
        } else if (assignee) {
            score += weights.assignee * 0.5; // Partiel si TBD
        }

        // Deadline présente
        const deadline = (item.deadline || '').toLowerCase().trim();
        if (deadline && deadline !== 'tbd' && deadline !== 'à définir') {
            score += weights.deadline;
        } else if (deadline) {
            score += weights.deadline * 0.5;
        }

        // Priorité présente
        if (item.priority && ['haute', 'high', 'moyenne', 'medium', 'basse', 'low'].includes(item.priority.toLowerCase())) {
            score += weights.priority;
        }

        return score;
    }

    /**
     * Vérifie si la tâche match des patterns d'action connus
     * @private
     */
    _checkPatternMatch(item, originalTranscript) {
        const patterns = ACTION_PATTERNS[this.options.language] || ACTION_PATTERNS.fr;
        let matchCount = 0;

        // Vérifier si les patterns d'action sont présents dans la transcription
        for (const pattern of patterns) {
            if (pattern.test(originalTranscript)) {
                matchCount++;
            }
        }

        // Normaliser le score
        const maxMatches = 5; // On s'attend à trouver quelques patterns
        return Math.min(1, matchCount / maxMatches);
    }

    /**
     * Vérifie la cohérence interne de l'action item
     * @private
     */
    _checkConsistency(item) {
        let score = 0.5; // Score de base

        // Vérifier que la priorité est cohérente avec la deadline
        const deadline = (item.deadline || '').toLowerCase();
        const priority = (item.priority || '').toLowerCase();

        // Deadline urgente = priorité haute attendue
        if (/aujourd'hui|demain|asap|urgent|today|tomorrow/i.test(deadline)) {
            if (priority === 'haute' || priority === 'high') {
                score += 0.25;
            } else {
                score -= 0.1; // Incohérence légère
            }
        }

        // Deadline lointaine avec priorité haute = possible incohérence
        if (/mois\s+prochain|next\s+month|q[1-4]/i.test(deadline)) {
            if (priority === 'basse' || priority === 'low' || priority === 'moyenne' || priority === 'medium') {
                score += 0.25;
            }
        }

        // Vérifier que le contexte est cohérent avec la tâche
        if (item.context) {
            const taskWords = new Set((item.task || '').toLowerCase().split(/\s+/));
            const contextWords = new Set((item.context || '').toLowerCase().split(/\s+/));
            const intersection = [...taskWords].filter(w => contextWords.has(w) && w.length > 3);
            if (intersection.length > 0) {
                score += 0.25;
            }
        }

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Détecte les faux positifs (questions, hypothèses, passé)
     * @private
     */
    _checkFalsePositive(item, originalTranscript) {
        const task = item.task || '';

        for (const pattern of FALSE_POSITIVE_PATTERNS) {
            if (pattern.test(task)) {
                return true;
            }
        }

        // Vérifier si c'est une négation
        if (/\b(ne\s+pas|n'est\s+pas|won't|don't|can't|shouldn't)\b/i.test(task)) {
            return true;
        }

        return false;
    }

    /**
     * Cherche un contexte d'action autour des mots-clés dans la transcription
     * @private
     */
    _findActionContext(transcript, keywords) {
        const patterns = ACTION_PATTERNS[this.options.language] || ACTION_PATTERNS.fr;

        for (const keyword of keywords) {
            // Chercher le mot-clé avec un contexte de 50 caractères avant
            const regex = new RegExp(`.{0,50}${keyword}.{0,50}`, 'gi');
            const matches = transcript.match(regex);

            if (matches) {
                for (const match of matches) {
                    for (const pattern of patterns) {
                        if (pattern.test(match)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Normalise le texte pour la comparaison
     * @private
     */
    _normalizeText(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
            .replace(/[^\w\s]/g, ' ')         // Enlever la ponctuation
            .replace(/\s+/g, ' ')             // Normaliser les espaces
            .trim();
    }

    /**
     * Vérifie si un mot est un stop word
     * @private
     */
    _isStopWord(word) {
        const stopWords = new Set([
            // Français
            'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais',
            'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'sous', 'entre', 'vers',
            'que', 'qui', 'quoi', 'dont', 'où', 'ce', 'cette', 'ces', 'cet',
            'être', 'avoir', 'faire', 'pouvoir', 'devoir', 'vouloir', 'aller',
            'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'je', 'tu', 'on',
            'son', 'sa', 'ses', 'leur', 'leurs', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
            'très', 'plus', 'moins', 'bien', 'mal', 'aussi', 'donc', 'car', 'ainsi',
            // Anglais
            'the', 'a', 'an', 'and', 'or', 'but', 'for', 'by', 'on', 'in', 'with',
            'without', 'under', 'between', 'to', 'from', 'at', 'of',
            'that', 'which', 'who', 'whom', 'whose', 'this', 'these', 'those',
            'be', 'have', 'do', 'can', 'could', 'will', 'would', 'should', 'must',
            'he', 'she', 'it', 'they', 'we', 'you', 'i',
            'his', 'her', 'its', 'their', 'our', 'your', 'my',
            'very', 'more', 'less', 'well', 'also', 'so', 'thus'
        ]);
        return stopWords.has(word.toLowerCase());
    }
}

/**
 * Enrichit les action items avec des métadonnées supplémentaires
 * @param {Array} actionItems - Action items validés
 * @param {string} transcript - Transcription source
 * @returns {Array} Action items enrichis
 */
function enrichActionItems(actionItems, transcript) {
    return actionItems.map(item => {
        const enriched = { ...item };

        // Déduire la catégorie de la tâche
        enriched.category = inferCategory(item.task);

        // Calculer l'effort estimé
        enriched.estimatedEffort = estimateEffort(item.task);

        // Identifier les dépendances potentielles
        enriched.potentialDependencies = identifyDependencies(item, actionItems);

        return enriched;
    });
}

/**
 * Déduit la catégorie d'une tâche
 */
function inferCategory(task) {
    const taskLower = (task || '').toLowerCase();

    const categories = {
        'communication': /\b(email|appel|réunion|présentation|meeting|call|contact|envoyer|send)\b/,
        'documentation': /\b(document|rapport|spec|rédiger|écrire|write|report|doc)\b/,
        'développement': /\b(code|api|feature|bug|fix|implémenter|développer|test)\b/,
        'analyse': /\b(analyser|étudier|rechercher|investigate|review|audit)\b/,
        'planification': /\b(planifier|organiser|préparer|plan|schedule|roadmap)\b/,
        'validation': /\b(valider|approuver|confirmer|validate|approve|confirm)\b/,
        'livraison': /\b(livrer|déployer|release|ship|deliver|deploy)\b/
    };

    for (const [category, pattern] of Object.entries(categories)) {
        if (pattern.test(taskLower)) {
            return category;
        }
    }

    return 'autre';
}

/**
 * Estime l'effort requis pour une tâche
 */
function estimateEffort(task) {
    const taskLower = (task || '').toLowerCase();

    // Indicateurs de tâches courtes
    if (/\b(rapide|simple|petit|quick|small|minor|brief)\b/.test(taskLower)) {
        return 'faible';
    }

    // Indicateurs de tâches longues
    if (/\b(complet|exhaustif|détaillé|full|complete|comprehensive|thorough)\b/.test(taskLower)) {
        return 'élevé';
    }

    // Indicateurs de tâches complexes
    if (/\b(complexe|difficile|challenge|refactoring|migration|integration)\b/.test(taskLower)) {
        return 'élevé';
    }

    return 'moyen';
}

/**
 * Identifie les dépendances potentielles entre action items
 */
function identifyDependencies(item, allItems) {
    const dependencies = [];
    const taskLower = (item.task || '').toLowerCase();

    // Patterns indiquant une dépendance
    const depPatterns = [
        /après\s+(la|le|l')\s*(\w+)/i,
        /une\s+fois\s+(la|le|l'|que)\s*/i,
        /dès\s+que\s*/i,
        /quand\s+(la|le|l')\s*/i,
        /after\s+(the)?\s*(\w+)/i,
        /once\s+(the)?\s*/i,
        /when\s+(the)?\s*/i
    ];

    for (const pattern of depPatterns) {
        if (pattern.test(taskLower)) {
            // Chercher une tâche correspondante
            for (const otherItem of allItems) {
                if (otherItem !== item) {
                    const otherTask = (otherItem.task || '').toLowerCase();
                    // Vérifier s'il y a des mots en commun significatifs
                    const itemWords = new Set(taskLower.split(/\s+/).filter(w => w.length > 4));
                    const otherWords = otherTask.split(/\s+/).filter(w => w.length > 4);
                    const commonWords = otherWords.filter(w => itemWords.has(w));

                    if (commonWords.length > 0) {
                        dependencies.push({
                            task: otherItem.task,
                            assignee: otherItem.assignee,
                            type: 'prerequisite'
                        });
                    }
                }
            }
            break;
        }
    }

    return dependencies;
}

module.exports = {
    ActionItemValidator,
    enrichActionItems,
    inferCategory,
    estimateEffort,
    identifyDependencies,
    ACTION_PATTERNS,
    FALSE_POSITIVE_PATTERNS
};
