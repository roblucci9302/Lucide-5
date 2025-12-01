# 📄 Guide - Génération Automatique de Documents avec Workflows

Ce guide explique comment utiliser la nouvelle fonctionnalité de génération automatique de documents professionnels intégrée aux workflows.

---

## 🎯 Vue d'ensemble

**Fonctionnalité** : Les workflows peuvent maintenant générer des documents structurés qui sont automatiquement affichés dans DocumentPreview et exportables en PDF/DOCX/MD.

**Avantages** :
- ✅ Documents affichés professionnellement dans la conversation
- ✅ Export en un clic (PDF, DOCX, Markdown)
- ✅ Format markdown pour faciliter l'édition
- ✅ Intégration automatique (pas de configuration manuelle)

---

## 🏗️ Architecture

### Flux complet

```
1. Utilisateur lance un workflow (ex: "Créer une offre d'emploi")
      ↓
2. WorkflowService construit le prompt avec WorkflowDocumentEnhancer
      ↓
3. Prompt enrichi envoyé à l'IA avec instructions de format
      ↓
4. IA génère la réponse avec marqueurs <<DOCUMENT:type>>
      ↓
5. AskView parse la réponse avec parseDocuments()
      ↓
6. Documents extraits → stockés dans generatedDocuments[]
      ↓
7. DocumentPreview affiché automatiquement avec boutons export
      ↓
8. Utilisateur peut exporter en PDF/DOCX/MD
```

### Composants clés

| Composant | Rôle |
|-----------|------|
| **WorkflowDocumentEnhancer** | Enrichit les prompts de workflows pour générer des documents |
| **DocumentParser** (backend) | Service Node.js pour parsing côté serveur (optionnel) |
| **AskView.parseDocuments()** | Parser client-side intégré dans AskView |
| **DocumentPreview** | Composant d'affichage et d'export |
| **documentExportService** | Service d'export PDF/DOCX/MD |

---

## 📝 Format des Documents

### Format Complet

```markdown
<<DOCUMENT:type>>
title: Titre du Document
---
# Contenu en markdown

## Section 1
Contenu...

## Section 2
Contenu...

<</DOCUMENT>>
```

### Format Simplifié

```markdown
<<DOC:type:Titre du Document>>
# Contenu en markdown

Contenu...

<</DOC>>
```

### Types de documents supportés

```javascript
const types = {
    // HR
    'offre': 'Offre d\'emploi',
    'plan': 'Plan (onboarding, stratégique, projet)',
    'rapport': 'Rapport (performance, ventes, équipe)',

    // IT
    'specification': 'Spécification technique',
    'documentation': 'Documentation',

    // Marketing
    'brief': 'Brief de campagne',
    'calendrier': 'Calendrier de contenu',

    // Sales
    'proposition': 'Proposition commerciale',

    // General
    'lettre': 'Lettre',
    'memo': 'Mémo',
    'compte-rendu': 'Compte-rendu',
    'guide': 'Guide',
    'essai': 'Essai / Dissertation',
    'article': 'Article',
    'revue': 'Revue de littérature'
};
```

---

## 🔧 Workflows Supportés (30+)

### HR Specialist
- ✅ `create_job_posting` → Type: `offre`
- ✅ `onboarding_plan` → Type: `plan`
- ✅ `performance_review` → Type: `rapport`

### CEO
- ✅ `strategic_plan` → Type: `plan`
- ✅ `quarterly_report` → Type: `rapport`
- ✅ `board_presentation` → Type: `presentation`

### IT Manager
- ✅ `technical_spec` → Type: `specification`
- ✅ `incident_report` → Type: `rapport`
- ✅ `architecture_doc` → Type: `documentation`

### Marketing Manager
- ✅ `content_calendar` → Type: `plan`
- ✅ `campaign_brief` → Type: `brief`
- ✅ `marketing_report` → Type: `rapport`

### Sales Manager
- ✅ `sales_proposal` → Type: `proposition`
- ✅ `sales_report` → Type: `rapport`

### Manager
- ✅ `team_report` → Type: `rapport`
- ✅ `project_plan` → Type: `plan`
- ✅ `meeting_minutes` → Type: `compte-rendu`

### Student
- ✅ `essay` → Type: `essai`
- ✅ `research_paper` → Type: `article`
- ✅ `study_guide` → Type: `guide`

### Researcher
- ✅ `research_proposal` → Type: `proposition`
- ✅ `literature_review` → Type: `revue`
- ✅ `research_report` → Type: `rapport`

---

## 🚀 Utilisation

### 1. Lancer un workflow documenté

1. **Ouvrir Ask Window** (Cmd+Entrée)
2. **Cliquer sur Quick Actions** (bouton rapide ou workflows)
3. **Sélectionner un workflow** (ex: "Créer une offre d'emploi")
4. **Remplir le formulaire** si présent
5. **Envoyer**

### 2. IA génère le document

L'IA reçoit automatiquement des instructions pour formater sa réponse comme un document structuré.

**Exemple de prompt enrichi** :
```
[Prompt original du workflow]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 IMPORTANT - FORMAT DE RÉPONSE STRUCTURÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Génère ta réponse sous forme de document structuré:

<<DOCUMENT:offre>>
title: Développeur Full-Stack Senior
---
# [Ton contenu professionnel ici]

<</DOCUMENT>>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Document affiché automatiquement

Le document apparaît dans DocumentPreview avec:
- ✨ Titre et icône
- 📊 Métadonnées (type, mots, caractères)
- 👁️ Prévisualisation expandable
- 💾 Boutons d'export (PDF, DOCX, MD)

### 4. Exporter le document

Cliquer sur un bouton d'export:
- **PDF** : Document formaté en A4 avec styles professionnels
- **DOCX** : Document Word éditable avec headers et formatage
- **MD** : Markdown natif avec métadonnées

**Dossier d'export** : `~/Documents/Lucide/Exports/`

---

## 💻 API pour Développeurs

### WorkflowDocumentEnhancer

```javascript
const workflowDocumentEnhancer = require('./workflowDocumentEnhancer');

// Vérifier si un workflow génère un document
const shouldGenerate = workflowDocumentEnhancer.shouldGenerateDocument('create_job_posting');
// → true

// Obtenir la configuration du document
const config = workflowDocumentEnhancer.getDocumentConfig('create_job_posting');
// → { type: 'offre', defaultTitle: 'Offre d\'Emploi' }

// Enrichir un prompt
const enhanced = workflowDocumentEnhancer.enhancePrompt(
    'create_job_posting',
    originalPrompt,
    { jobTitle: 'Développeur Full-Stack' }
);
// → Prompt avec instructions de formatage

// Statistiques
const stats = workflowDocumentEnhancer.getStats();
// → { totalWorkflows: 30, documentTypes: 15, ... }
```

### AskView.parseDocuments()

```javascript
// Dans AskView (côté client)
const response = `
Voici votre offre d'emploi:

<<DOCUMENT:offre>>
title: Développeur Full-Stack Senior
---
# Développeur Full-Stack Senior

## À propos du poste
Nous recherchons...

<</DOCUMENT>>
`;

const { documents, cleanText } = this.parseDocuments(response);
// documents: [{ id, type, title, content, metadata }]
// cleanText: Texte sans les marqueurs de documents
```

### DocumentExportService (backend)

```javascript
const documentExportService = require('./documentExportService');

// Export PDF
const result = await documentExportService.exportDocument({
    title: "Offre d'Emploi",
    content: "# Développeur...",
    type: "offre"
}, 'pdf');

// → { success: true, filePath: '/path/to/file.pdf', filename: '...', format: 'pdf' }

// Export DOCX
await documentExportService.exportDocument(doc, 'docx');

// Export Markdown
await documentExportService.exportDocument(doc, 'md');

// Ouvrir dossier exports
await documentExportService.openExportDirectory();
```

---

## 🧪 Tests

### Test 1 : Générer un document avec workflow

1. Lancer Lucide : `npm start`
2. Ouvrir Ask Window (Cmd+Entrée)
3. Sélectionner workflow "Créer une offre d'emploi"
4. Remplir : Titre="Développeur Full-Stack"
5. Envoyer

**✅ Vérifications** :
- [ ] IA génère réponse avec marqueurs `<<DOCUMENT:offre>>`
- [ ] DocumentPreview s'affiche automatiquement
- [ ] Titre correct : "Développeur Full-Stack"
- [ ] Type affiché : "OFFRE"
- [ ] Compteurs (mots, caractères) affichés

### Test 2 : Export PDF

1. Avec le document affiché
2. Cliquer sur bouton "📄 PDF"
3. Attendre spinner

**✅ Vérifications** :
- [ ] Export réussit (console log)
- [ ] Fichier créé dans `~/Documents/Lucide/Exports/`
- [ ] Nom unique avec timestamp
- [ ] PDF bien formaté avec headers, listes

### Test 3 : Export DOCX

1. Cliquer sur bouton "📝 DOCX"

**✅ Vérifications** :
- [ ] Export réussit
- [ ] DOCX ouvrable dans Word/LibreOffice
- [ ] Headers avec styles natifs
- [ ] Formatage inline (gras/italique) préservé

### Test 4 : Export Markdown

1. Cliquer sur bouton "📋 MD"

**✅ Vérifications** :
- [ ] Fichier .md créé
- [ ] Markdown valide
- [ ] Métadonnées présentes

### Test 5 : Multiple documents

1. Lancer 2 workflows différents successivement
2. Vérifier que les 2 documents s'affichent

**✅ Vérifications** :
- [ ] Les 2 DocumentPreview visibles
- [ ] Chacun indépendant
- [ ] Exports fonctionnent pour les 2

---

## 🐛 Dépannage

### Le document ne s'affiche pas

**Causes possibles** :
1. IA n'a pas utilisé le format correct
2. Marqueurs mal formés
3. Streaming en cours (attendre fin de génération)

**Solutions** :
```javascript
// Vérifier dans console DevTools :
console.log('[AskView] Found X generated documents')
// Si X = 0, le parsing a échoué

// Vérifier la réponse brute :
console.log(this.currentResponse)
// Doit contenir <<DOCUMENT:type>> et <</DOCUMENT>>
```

### Export échoue

**Causes** :
1. Document vide ou invalide
2. Permissions fichier
3. Dossier d'export inaccessible

**Solutions** :
```bash
# Vérifier dossier
ls ~/Documents/Lucide/Exports/

# Créer manuellement si besoin
mkdir -p ~/Documents/Lucide/Exports/

# Permissions
chmod 755 ~/Documents/Lucide/Exports/
```

### Formatage markdown incorrect

**Cause** : IA n'utilise pas le bon formatage

**Solution** : Modifier le prompt du workflow pour être plus explicite sur le formatage attendu.

---

## 📈 Statistiques

### Workflows supportés

```javascript
const stats = workflowDocumentEnhancer.getStats();
console.log(stats);

// Output:
{
    totalWorkflows: 30,
    documentTypes: 15,
    types: ['offre', 'plan', 'rapport', ...],
    workflowsByType: {
        'rapport': ['performance_review', 'quarterly_report', ...],
        'plan': ['onboarding_plan', 'strategic_plan', ...],
        ...
    }
}
```

### Types de documents par nombre de workflows

| Type | Workflows | Exemple |
|------|-----------|---------|
| rapport | 8 | Performance review, Quarterly report |
| plan | 6 | Onboarding, Strategic plan, Project plan |
| proposition | 3 | Sales proposal, Research proposal |
| offre | 1 | Job posting |
| specification | 1 | Technical spec |
| ... | ... | ... |

---

## 🔄 Flux de Données Détaillé

### 1. Enrichissement du Prompt

```
User clicks workflow
       ↓
WorkflowService.buildPrompt(profileId, workflowId, formData)
       ↓
WorkflowDocumentEnhancer.enhancePrompt(workflowId, prompt, formData)
       ├─► shouldGenerateDocument(workflowId) → true/false
       ├─► getDocumentConfig(workflowId) → {type, defaultTitle}
       ├─► extractTitleFromFormData(formData) → title
       └─► Append document instructions to prompt
       ↓
Enhanced prompt → AI
```

### 2. Parsing de la Réponse

```
AI response received
       ↓
AskView.renderContent()
       ↓
this.parseDocuments(currentResponse)
       ├─► fullRegex.exec(text) → match documents
       ├─► Extract: type, title, content
       ├─► Create document object: {id, type, title, content, metadata}
       └─► Clean text (replace markers with placeholder)
       ↓
Store in this.generatedDocuments[]
       ↓
this.requestUpdate() → Re-render
```

### 3. Affichage

```
render()
       ↓
Check: this.generatedDocuments.length > 0
       ↓
Map documents:
${this.generatedDocuments.map(doc => html`
    <document-preview .document=${doc} ...></document-preview>
`)}
       ↓
DocumentPreview renders:
       ├─► Header (title, icon, type, stats)
       ├─► Content (expandable markdown)
       └─► Footer (export buttons)
```

### 4. Export

```
User clicks export button (PDF/DOCX/MD)
       ↓
DocumentPreview.handleExport(format)
       ↓
window.api.documents.exportDocument({title, content, type, format})
       ↓
IPC → Main Process
       ↓
documentExportService.exportDocument(data, format)
       ├─► PDF: PDFDocument + pdfkit → file
       ├─► DOCX: Document + docx + Packer → file
       └─► MD: String manipulation → file
       ↓
Save to: ~/Documents/Lucide/Exports/Title_Timestamp.ext
       ↓
Return: {success, filePath, filename, format}
       ↓
IPC → Renderer
       ↓
DocumentPreview emits: export-success/export-error
```

---

## 🎨 Personnalisation

### Ajouter un nouveau workflow documenté

**1. Ajouter dans workflowDocumentEnhancer.js :**

```javascript
this.documentWorkflows = {
    // ...existing workflows...

    'my_new_workflow': {
        type: 'custom_type',
        defaultTitle: 'Mon Document'
    }
};
```

**2. Le workflow sera automatiquement enrichi !**

Aucune autre modification nécessaire. WorkflowService appliquera automatiquement l'enrichissement.

### Ajouter un nouveau type de document

**1. Ajouter l'icône dans DocumentPreview.js :**

```javascript
getDocumentIcon(type) {
    const iconMap = {
        // ...existing types...
        'custom_type': '📌',  // Votre icône
    };
    return iconMap[type?.toLowerCase()] || iconMap.default;
}
```

### Modifier le format du document marker

**Attention** : Modification déconseillée car nécessite de changer le parsing.

Si vraiment nécessaire :
1. Modifier regex dans `AskView.parseDocuments()`
2. Modifier regex dans `documentParser.js` (backend)
3. Mettre à jour instructions dans `workflowDocumentEnhancer.js`

---

## 📚 Références

### Fichiers créés/modifiés

| Fichier | Rôle | Lignes |
|---------|------|--------|
| **workflowDocumentEnhancer.js** | Enrichit prompts workflows | 254 lignes |
| **documentParser.js** | Parser backend (optionnel) | 320 lignes |
| **AskView.js** | Parser client + affichage | +100 lignes |
| **DocumentPreview.js** | Composant preview + export | 472 lignes |
| **documentExportService.js** | Export PDF/DOCX/MD | 486 lignes |
| **workflowService.js** | Intégration enhancer | +10 lignes |

### Dépendances npm

| Package | Usage |
|---------|-------|
| pdfkit | Génération PDF |
| docx | Génération DOCX |
| marked | Parsing markdown (optionnel) |

---

## ✅ Résumé

### Fonctionnalités implémentées

✅ Enrichissement automatique de 30+ workflows
✅ Parsing client-side des documents
✅ Affichage professionnel avec DocumentPreview
✅ Export PDF/DOCX/MD en un clic
✅ Formatage markdown préservé
✅ Métadonnées et statistiques
✅ Gestion d'erreur complète
✅ Build réussi et syntaxe validée

### Prêt pour utilisation !

🎉 **L'intégration workflows → DocumentPreview est complète et opérationnelle !**

Pour commencer :
```bash
npm start
# Puis Cmd+Entrée → Sélectionner un workflow → Générer document → Exporter
```

---

**Version** : 1.0
**Date** : 2025-01-15
**Auteur** : Claude Code Assistant
