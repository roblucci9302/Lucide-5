/**
 * Task Estimation Utilities
 * Heuristics-based time estimation for meeting tasks
 */

/**
 * Complexity keywords and their time weights (in hours)
 */
const COMPLEXITY_KEYWORDS = {
    // High complexity tasks (2-8 hours)
    high: {
        keywords: [
            // English
            'implement', 'develop', 'design', 'create', 'build', 'architect',
            'research', 'analyze', 'investigate', 'audit', 'migrate', 'refactor',
            'integrate', 'deploy', 'setup', 'configure', 'document',
            // French
            'implémenter', 'développer', 'concevoir', 'créer', 'construire',
            'rechercher', 'analyser', 'investiguer', 'auditer', 'migrer',
            'intégrer', 'déployer', 'configurer', 'documenter', 'rédiger'
        ],
        baseHours: 4,
        maxHours: 8
    },

    // Medium complexity tasks (1-4 hours)
    medium: {
        keywords: [
            // English
            'prepare', 'update', 'modify', 'fix', 'resolve', 'review',
            'test', 'write', 'draft', 'plan', 'organize', 'coordinate',
            'schedule', 'arrange', 'finalize', 'complete', 'finish',
            // French
            'préparer', 'mettre à jour', 'modifier', 'corriger', 'résoudre',
            'tester', 'écrire', 'rédiger', 'planifier', 'organiser',
            'coordonner', 'finaliser', 'terminer', 'finir', 'faire'
        ],
        baseHours: 2,
        maxHours: 4
    },

    // Low complexity tasks (0.25-1 hour)
    low: {
        keywords: [
            // English
            'send', 'email', 'call', 'contact', 'check', 'verify', 'confirm',
            'follow up', 'reply', 'respond', 'forward', 'share', 'notify',
            'remind', 'ask', 'request', 'book', 'reserve',
            // French
            'envoyer', 'appeler', 'contacter', 'vérifier', 'confirmer',
            'relancer', 'répondre', 'transférer', 'partager', 'notifier',
            'rappeler', 'demander', 'réserver', 'regarder'
        ],
        baseHours: 0.5,
        maxHours: 1
    }
};

/**
 * Urgency modifiers based on deadline keywords
 */
const URGENCY_MODIFIERS = {
    immediate: {
        keywords: ['asap', 'urgent', 'immediately', 'right away', 'now',
                   'immédiatement', 'tout de suite', 'maintenant', 'urgence'],
        modifier: 0.8 // Reduce estimate (focus time)
    },
    soon: {
        keywords: ['today', 'tonight', 'this morning', 'this afternoon',
                   "aujourd'hui", 'ce soir', 'ce matin', 'cet après-midi'],
        modifier: 0.9
    },
    relaxed: {
        keywords: ['when possible', 'when you can', 'no rush', 'eventually',
                   'quand tu peux', 'quand possible', 'pas pressé'],
        modifier: 1.2 // Increase estimate (less pressure)
    }
};

/**
 * Scope multipliers based on scope keywords
 */
const SCOPE_MULTIPLIERS = {
    large: {
        keywords: ['all', 'every', 'entire', 'complete', 'full', 'comprehensive',
                   'tout', 'tous', 'entier', 'complet', 'exhaustif'],
        multiplier: 1.5
    },
    multiple: {
        keywords: ['several', 'multiple', 'various', 'many', 'few',
                   'plusieurs', 'divers', 'quelques'],
        multiplier: 1.3
    },
    partial: {
        keywords: ['quick', 'brief', 'short', 'simple', 'basic', 'small',
                   'rapide', 'bref', 'court', 'simple', 'basique', 'petit'],
        multiplier: 0.7
    }
};

/**
 * Estimate task duration based on description and context
 * @param {string} taskDescription - Task description text
 * @param {string} priority - Task priority (low, medium, high)
 * @param {string} context - Additional context (optional)
 * @returns {Object} Estimation result with hours and confidence
 */
function estimateTaskDuration(taskDescription, priority = 'medium', context = '') {
    if (!taskDescription || typeof taskDescription !== 'string') {
        return {
            estimatedHours: 1,
            confidence: 'low',
            reasoning: 'No task description provided'
        };
    }

    const fullText = `${taskDescription} ${context}`.toLowerCase();

    // Determine base complexity
    // Priority order: check medium first (most common), then low, then high
    // This ensures "finir" (medium) is detected before "document" (high)
    let complexity = 'medium';
    let baseHours = 2;
    let maxHours = 4;
    let foundMatch = false;

    // Check medium complexity first (most common task type)
    for (const keyword of COMPLEXITY_KEYWORDS.medium.keywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            complexity = 'medium';
            baseHours = COMPLEXITY_KEYWORDS.medium.baseHours;
            maxHours = COMPLEXITY_KEYWORDS.medium.maxHours;
            foundMatch = true;
            break;
        }
    }

    // If no medium match, check low complexity (quick tasks)
    if (!foundMatch) {
        for (const keyword of COMPLEXITY_KEYWORDS.low.keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                complexity = 'low';
                baseHours = COMPLEXITY_KEYWORDS.low.baseHours;
                maxHours = COMPLEXITY_KEYWORDS.low.maxHours;
                foundMatch = true;
                break;
            }
        }
    }

    // If no medium or low match, check high complexity
    if (!foundMatch) {
        for (const keyword of COMPLEXITY_KEYWORDS.high.keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                complexity = 'high';
                baseHours = COMPLEXITY_KEYWORDS.high.baseHours;
                maxHours = COMPLEXITY_KEYWORDS.high.maxHours;
                foundMatch = true;
                break;
            }
        }
    }

    // If no match found, default to medium with lower base hours
    if (!foundMatch) {
        baseHours = 1.5;
    }

    // Apply priority modifier
    let priorityModifier = 1.0;
    if (priority === 'high') {
        priorityModifier = 1.2; // High priority tasks may need buffer
    } else if (priority === 'low') {
        priorityModifier = 0.8; // Low priority tends to be simpler
    }

    // Apply urgency modifier
    let urgencyModifier = 1.0;
    for (const [, urgencyLevel] of Object.entries(URGENCY_MODIFIERS)) {
        for (const keyword of urgencyLevel.keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                urgencyModifier = urgencyLevel.modifier;
                break;
            }
        }
        if (urgencyModifier !== 1.0) break;
    }

    // Apply scope multiplier
    let scopeMultiplier = 1.0;
    for (const [, scopeLevel] of Object.entries(SCOPE_MULTIPLIERS)) {
        for (const keyword of scopeLevel.keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                scopeMultiplier = scopeLevel.multiplier;
                break;
            }
        }
        if (scopeMultiplier !== 1.0) break;
    }

    // Calculate final estimate
    let estimatedHours = baseHours * priorityModifier * urgencyModifier * scopeMultiplier;

    // Clamp to reasonable range
    estimatedHours = Math.max(0.25, Math.min(estimatedHours, maxHours * scopeMultiplier));

    // Round to nearest quarter hour
    estimatedHours = Math.round(estimatedHours * 4) / 4;

    // Determine confidence level
    let confidence = 'medium';
    if (complexity === 'high' || complexity === 'low') {
        confidence = 'high';
    }
    if (scopeMultiplier !== 1.0 || urgencyModifier !== 1.0) {
        // More context = better estimate
        confidence = confidence === 'high' ? 'high' : 'medium';
    }

    return {
        estimatedHours,
        confidence,
        complexity,
        reasoning: `${complexity} complexity task (${baseHours}h base) with ${priority} priority`
    };
}

/**
 * Quick estimation for bulk tasks
 * @param {Array<Object>} tasks - Array of task objects with description and priority
 * @returns {Array<Object>} Tasks with estimated_hours added
 */
function estimateBulkTasks(tasks) {
    if (!Array.isArray(tasks)) {
        return [];
    }

    return tasks.map(task => {
        const estimation = estimateTaskDuration(
            task.taskDescription || task.task_description,
            task.priority,
            task.context
        );

        return {
            ...task,
            estimated_hours: estimation.estimatedHours,
            estimation_confidence: estimation.confidence
        };
    });
}

/**
 * Get total estimated hours for a list of tasks
 * @param {Array<Object>} tasks - Array of task objects
 * @returns {Object} Total estimation summary
 */
function getTotalEstimation(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return {
            totalHours: 0,
            taskCount: 0,
            averageHours: 0,
            byPriority: { high: 0, medium: 0, low: 0 }
        };
    }

    let totalHours = 0;
    const byPriority = { high: 0, medium: 0, low: 0 };

    tasks.forEach(task => {
        const hours = task.estimated_hours || 1;
        totalHours += hours;

        const priority = task.priority || 'medium';
        if (byPriority[priority] !== undefined) {
            byPriority[priority] += hours;
        }
    });

    return {
        totalHours: Math.round(totalHours * 4) / 4,
        taskCount: tasks.length,
        averageHours: Math.round((totalHours / tasks.length) * 4) / 4,
        byPriority
    };
}

module.exports = {
    estimateTaskDuration,
    estimateBulkTasks,
    getTotalEstimation,
    COMPLEXITY_KEYWORDS,
    URGENCY_MODIFIERS,
    SCOPE_MULTIPLIERS
};
