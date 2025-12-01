# Analyse du Système de Gestion des Tâches - Lucide

**Date**: 2025-11-26
**Version**: Phase 3.x

## Vue d'ensemble

Le système de gestion des tâches extrait automatiquement les actions des réunions et fournit un suivi complet.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Transcription                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ LiveInsights    │ │ StructuredNotes │ │ SummaryService  │
│ (Pattern match) │ │ (AI extraction) │ │ (AI analysis)   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │    TaskManagementService    │
              │  ┌─────────────────────────┐│
              │  │ - Status tracking       ││
              │  │ - Email assignment      ││
              │  │ - Reminders             ││
              │  │ - Tags                  ││
              │  │ - Statistics            ││
              │  └─────────────────────────┘│
              └─────────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │   MeetingTasksRepository    │
              │        (SQLite)             │
              └─────────────────────────────┘
```

---

## 1. Extraction Automatique de Tâches

### Patterns de détection (liveInsightsService.js:93-104)

```javascript
action: [
    /\b(will|gonna|going to|need to|should|must|have to)\s+\w+/i,
    /\b(I'?ll|he'?ll|she'?ll|they'?ll|we'?ll)\s+\w+/i,
    /\b(responsible for|assigned to|in charge of)\b/i,
    /\b(action item|task|todo|to-?do)\b/i
]

deadline: [
    /\b(by|before|until|deadline|due)\s+(tomorrow|today|...)/i,
    /\b(by|before|until|deadline|due)\s+\w+\s+\d{1,2}/i
]
```

### Extraction AI (promptTemplates.js:498-514)

```
ACTION ITEM DETECTION (Most Important):
- Parse every statement for commitments
- Look for: "I will", "we should", "can you", "needs to", "must", "let's"
- Extract: Task + Owner + Deadline
- Example: "John said he'll send the report by Friday"
  → Task: Send report | Assigned: John | Deadline: Friday
```

---

## 2. Assignation aux Participants

### Logique de détection

| Pattern | Exemple | Extraction |
|---------|---------|------------|
| `Nom, il faut/tu peux...` | "Marie, il faut finir" | Marie |
| `Nom doit/devra...` | "Pierre doit vérifier" | Pierre |
| `assigné à/pour Nom` | "assigné à Sophie" | Sophie |
| `Nom au début` | "Jean, regarde ça" | Jean |

### Auto-assignation email (taskManagementService.js:19-80)

```javascript
async autoAssignEmails(sessionId) {
    // Get participant mapping from session
    const participantMapping = participantService.getParticipantMapping(sessionId);

    // Match assigned_to with participant names
    // 1. Direct match (exact name)
    // 2. Partial match (contains name)

    if (matchedParticipant && matchedParticipant.email) {
        meetingTasksRepository.update(task.id, {
            assigned_to_email: matchedParticipant.email
        });
    }
}
```

---

## 3. Inférence des Deadlines

### Patterns de parsing

| Input | Output |
|-------|--------|
| "pour vendredi" | Vendredi |
| "avant lundi" | Lundi |
| "d'ici demain" | Demain |
| "la semaine prochaine" | Semaine prochaine |
| "avant le 15" | 15 (du mois) |
| "quand tu as le temps" | Flexible |
| (aucun) | TBD |

### Validation des dates (taskManagementService.js:218-238)

```javascript
// Fix MEDIUM BUG-M21: Validate date format before parsing
if (!task.deadline || (typeof task.deadline !== 'string' && typeof task.deadline !== 'number')) {
    console.warn(`Invalid deadline format for task ${task.id}`);
    return false;
}

const deadline = new Date(task.deadline);
if (isNaN(deadline.getTime())) {
    console.warn(`Invalid deadline value for task ${task.id}`);
    return false;
}
```

### Limitation identifiée

⚠️ **Les dates relatives ("vendredi", "semaine prochaine") ne sont pas normalisées en dates ISO**

Le système stocke les deadlines telles quelles sans conversion. Cela signifie:
- `getOverdueTasks()` ne peut pas fonctionner avec des dates relatives
- Les rappels basés sur les dates ne fonctionneront pas correctement

---

## 4. Classification par Priorité

### Algorithme (promptTemplates.js:849-853)

```javascript
// HIGH priority indicators
/\b(urgent|urgemment|immédiatement|critique|absolument|priorité|asap)\b/i
/\b(il faut absolument|c'est urgent|prioritaire|critique)\b/i

// LOW priority indicators
/\b(quand tu as le temps|si possible|éventuellement|pas urgent)\b/i
/\b(when you have time|if possible|eventually|not urgent)\b/i

// MEDIUM: Default (no indicator)
```

### Résultat du test

| Phrase | Priorité détectée |
|--------|-------------------|
| "il faut **absolument** que tu finisses... **c'est urgent**" | HIGH ✅ |
| "tu peux regarder... **quand tu as le temps**" | LOW ✅ |
| "n'oubliez pas la réunion" | MEDIUM ✅ |

---

## 5. Suivi de Statut

### États disponibles

```
pending → in_progress → completed
    ↓         ↓
cancelled   blocked → in_progress
                ↓
            cancelled
```

### Transitions valides (taskManagementService.js:136-155)

```javascript
const statusTransitions = {
    pending: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'blocked', 'cancelled'],
    blocked: ['in_progress', 'cancelled'],
    completed: [],  // Terminal
    cancelled: []   // Terminal
};
```

### Gestion du statut "blocked"

```javascript
if (updates.status === 'blocked' && !updates.blocked_reason) {
    updates.blocked_reason = 'Reason not specified';
}
```

---

## 6. Planification de Rappels

### API (taskManagementService.js:296-356)

```javascript
// Set reminder
setReminder(taskId, reminderDate) {
    return this.updateTask(taskId, {
        reminder_date: reminderDate,
        reminder_sent: 0
    });
}

// Mark as sent
markReminderSent(taskId) {
    return this.updateTask(taskId, { reminder_sent: 1 });
}

// Get tasks needing reminders
getTasksNeedingReminders() {
    return allTasks.filter(task => {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        if (!task.reminder_date || task.reminder_sent) return false;
        return new Date(task.reminder_date) <= now;
    });
}
```

---

## 7. Estimation de Temps

### Heuristiques actuelles

| Type de tâche | Mots-clés | Estimation |
|---------------|-----------|------------|
| Complexe | rapport, analyse, développer, migration | 4h |
| Simple | vérifier, bug, email, appel, réunion | 1h |
| Défaut | (autres) | 2h |

### Limitation

⚠️ **L'estimation de temps n'est pas implémentée dans le service actuel**

Le champ `estimated_hours` existe dans le schéma mais n'est pas automatiquement calculé.

---

## 8. Organisation par Tags

### Tags automatiques

| Pattern | Tag généré |
|---------|------------|
| rapport, document, fichier | `documentation` |
| bug, erreur, problème | `bug` |
| client, réunion, meeting | `client` |
| financier, budget, coût | `finance` |

### API de gestion (taskManagementService.js:358-425)

```javascript
// Add tags
addTags(taskId, tags) {
    const existingTags = JSON.parse(task.tags || '[]');
    const mergedTags = [...new Set([...existingTags, ...tags])];
    return this.updateTask(taskId, { tags: JSON.stringify(mergedTags) });
}

// Remove tags
removeTags(taskId, tags) {
    const existingTags = JSON.parse(task.tags || '[]');
    const filteredTags = existingTags.filter(t => !tags.includes(t));
    return this.updateTask(taskId, { tags: JSON.stringify(filteredTags) });
}
```

---

## 9. Résultats du Test

### Transcript de test

```
"Marie, il faut absolument que tu finisses le rapport financier pour vendredi,
c'est urgent. Pierre, tu peux regarder le bug de connexion quand tu as le temps ?
Et n'oubliez pas la réunion client de la semaine prochaine."
```

### Tâches extraites

| # | Tâche | Assigné | Deadline | Priorité | Tags |
|---|-------|---------|----------|----------|------|
| 1 | Finir le rapport financier | Marie | Vendredi | HIGH | documentation, finance |
| 2 | Regarder le bug de connexion | Pierre | Flexible | LOW | bug |
| 3 | ❌ Réunion client | - | - | - | - |

### Analyse

- **Tâche 1**: ✅ Extraction parfaite (assignation, deadline, priorité, tags)
- **Tâche 2**: ✅ Extraction parfaite (priorité LOW correcte pour "quand tu as le temps")
- **Tâche 3**: ❌ Non extraite - "n'oubliez pas" n'est pas un pattern d'action reconnu

---

## 10. Problèmes Identifiés

### Problèmes corrigés

| Bug ID | Description | Status |
|--------|-------------|--------|
| BUG-M21 | Validation format date | ✅ FIXED |

### Gaps fonctionnels

| Gap | Impact | Recommandation |
|-----|--------|----------------|
| Dates relatives non normalisées | `getOverdueTasks()` ne fonctionne pas | Implémenter parsing de dates relatives |
| Estimation temps non calculée | Champ vide | Ajouter heuristiques au service |
| Pattern "n'oubliez pas" manquant | Rappels non extraits | Ajouter pattern de rappel |
| Tags en JSON string | Performance sur gros volumes | Considérer table séparée |

---

## 11. Statistiques (taskManagementService.js:429-493)

```javascript
getTaskStatistics(sessionId) {
    return {
        total: tasks.length,
        byStatus: {
            pending: 0,
            in_progress: 0,
            completed: 0,
            blocked: 0,
            cancelled: 0
        },
        byPriority: { low: 0, medium: 0, high: 0 },
        overdue: 0,
        withEmail: 0,
        withoutEmail: 0
    };
}
```

### Export CSV (taskManagementService.js:496-560)

```javascript
exportToCSV(sessionId) {
    const headers = [
        'Task Description', 'Assigned To', 'Email', 'Deadline',
        'Priority', 'Status', 'Context', 'Notes', 'Tags', 'Estimated Hours'
    ];
    // ...
}
```

---

## 12. Conclusion

### Score par fonctionnalité

| # | Fonctionnalité | Status | Score |
|---|----------------|--------|-------|
| 1 | Extraction de tâches | ✅ | 8/10 |
| 2 | Assignation participants | ✅ | 9/10 |
| 3 | Inférence deadlines | ⚠️ | 6/10 |
| 4 | Classification priorité | ✅ | 9/10 |
| 5 | Suivi de statut | ✅ | 10/10 |
| 6 | Planification rappels | ✅ | 8/10 |
| 7 | Estimation temps | ⚠️ | 3/10 |
| 8 | Organisation tags | ✅ | 8/10 |

**Score global: 7.6/10**

### Recommandations prioritaires

1. **Normaliser les dates relatives** en dates ISO pour que `getOverdueTasks()` et les rappels fonctionnent
2. **Implémenter l'estimation de temps** avec des heuristiques basées sur les mots-clés
3. **Ajouter le pattern "n'oubliez pas"** pour capturer les rappels
4. **Améliorer l'extraction de la 3ème phrase** ("réunion client") qui est un rappel implicite
