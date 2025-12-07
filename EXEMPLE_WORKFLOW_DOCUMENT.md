# 🎯 Exemple Complet : Workflow → Document Professionnel

## 📝 Scénario d'Utilisation Réel

Imaginons que Sarah, une RH, souhaite créer une offre d'emploi pour un poste de développeur.

---

## 1️⃣ Étape 1 : Lancement du Workflow

Sarah ouvre Lucide et lance le workflow **"Create Job Posting"**.

**Interface :**
```
┌─────────────────────────────────────────────┐
│  📋 Create Job Posting                      │
├─────────────────────────────────────────────┤
│  Job Title:     [Développeur Full-Stack]    │
│  Department:    [Engineering]               │
│  Experience:    [Senior (5+ ans)]           │
│  Location:      [Paris, Hybride]            │
│                                             │
│              [🚀 Générer l'Offre]           │
└─────────────────────────────────────────────┘
```

---

## 2️⃣ Étape 2 : Enrichissement Automatique du Prompt

Le **WorkflowDocumentEnhancer** détecte que `create_job_posting` doit générer un document structuré.

### Prompt Original (Template du Workflow) :
```
Je souhaite créer une offre d'emploi professionnelle.

Informations nécessaires :
- Titre du poste : Développeur Full-Stack
- Département : Engineering
- Expérience requise : Senior (5+ ans)
- Localisation : Paris, Hybride

Merci de créer une offre attractive et complète qui met en valeur notre entreprise.
```

### Prompt Enrichi (Envoyé à l'IA) :
```
Je souhaite créer une offre d'emploi professionnelle.

Informations nécessaires :
- Titre du poste : Développeur Full-Stack
- Département : Engineering
- Expérience requise : Senior (5+ ans)
- Localisation : Paris, Hybride

Merci de créer une offre attractive et complète qui met en valeur notre entreprise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 IMPORTANT - FORMAT DE RÉPONSE STRUCTURÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Génère ta réponse sous forme de document structuré en utilisant ce format:

<<DOCUMENT:offre>>
title: Développeur Full-Stack
---
# Ton contenu ici en markdown

Utilise un formatage markdown professionnel:
- Headers: # ## ###
- Listes: - ou 1. 2. 3.
- Gras: **texte**
- Italique: *texte*
- Citations: > texte
- Tableaux si approprié

Ce format permettra au document d'être affiché professionnellement
et exporté en PDF, DOCX ou Markdown.

<</DOCUMENT>>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**✅ Aucune action manuelle requise - tout est automatique !**

---

## 3️⃣ Étape 3 : Réponse de l'IA avec Document Structuré

L'IA génère une réponse avec les marqueurs de document :

```
Voici l'offre d'emploi que j'ai créée pour vous :

<<DOCUMENT:offre>>
title: Développeur Full-Stack Senior - Engineering
---
# Développeur Full-Stack Senior

## 📍 Informations Générales

**Localisation** : Paris, France (Hybride)
**Département** : Engineering
**Type de contrat** : CDI
**Expérience requise** : 5+ ans

---

## 🎯 Mission

Nous recherchons un Développeur Full-Stack Senior passionné pour rejoindre notre équipe Engineering.
Vous serez au cœur de la conception et du développement de nos solutions innovantes.

---

## 💼 Responsabilités

- Concevoir et développer des applications web performantes
- Participer à l'architecture technique des projets
- Collaborer avec les équipes Product et Design
- Mentorer les développeurs juniors
- Assurer la qualité du code via code reviews

---

## ✅ Profil Recherché

### Compétences Techniques
- **Frontend** : React, Vue.js ou Angular
- **Backend** : Node.js, Python ou Java
- **Databases** : PostgreSQL, MongoDB
- **DevOps** : Docker, CI/CD, Cloud (AWS/GCP)

### Soft Skills
- Excellente communication
- Esprit d'équipe
- Autonomie et proactivité
- Passion pour la tech

---

## 🎁 Ce que Nous Offrons

- Salaire compétitif selon profil
- Télétravail flexible (2-3 jours/semaine)
- Formation continue
- Tickets restaurant
- Mutuelle premium
- RTT

---

## 📝 Candidature

Envoyez votre CV et portfolio à : recrutement@entreprise.fr

**Nous avons hâte de vous rencontrer !**

<</DOCUMENT>>

J'ai créé une offre d'emploi professionnelle et attractive qui met en avant
les aspects techniques et les avantages de votre entreprise. Le document est
prêt à être exporté en PDF ou DOCX pour publication.
```

---

## 4️⃣ Étape 4 : Parsing Automatique du Document

Le **DocumentParser** (côté backend) et **AskView.parseDocuments()** (côté frontend) extraient le document :

### Document Extrait :
```javascript
{
    id: "doc_1705842561234_k8j2h9x1c",
    type: "offre",
    title: "Développeur Full-Stack Senior - Engineering",
    content: "# Développeur Full-Stack Senior\n\n## 📍 Informations Générales...",
    metadata: {
        source: "ai_generated",
        timestamp: "2025-01-21T14:30:00.000Z",
        format: "markdown"
    }
}
```

### Texte Nettoyé (Affiché dans le Chat) :
```
Voici l'offre d'emploi que j'ai créée pour vous :

📄 **Document généré**: Développeur Full-Stack Senior - Engineering (offre)

J'ai créé une offre d'emploi professionnelle et attractive qui met en avant
les aspects techniques et les avantages de votre entreprise. Le document est
prêt à être exporté en PDF ou DOCX pour publication.
```

---

## 5️⃣ Étape 5 : Affichage Automatique du DocumentPreview

**Interface Finale :**

```
┌───────────────────────────────────────────────────────────────┐
│  💬 Ask Window                                                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Voici l'offre d'emploi que j'ai créée pour vous :          │
│                                                               │
│  📄 **Document généré**: Développeur Full-Stack Senior...     │
│                                                               │
│  J'ai créé une offre d'emploi professionnelle...             │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  📄 DOCUMENT PRÉVISUALISÉ                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📄 Développeur Full-Stack Senior - Engineering         │ │
│  │  Type: offre                                            │ │
│  │  ───────────────────────────────────────────────────── │ │
│  │                                                         │ │
│  │  # Développeur Full-Stack Senior                       │ │
│  │                                                         │ │
│  │  ## 📍 Informations Générales                          │ │
│  │  Localisation: Paris, France (Hybride)                 │ │
│  │  Département: Engineering                              │ │
│  │  ...                                                    │ │
│  │                                                         │ │
│  │  [▼ Voir Plus]                                         │ │
│  │                                                         │ │
│  │  Actions:                                              │ │
│  │  [📥 PDF]  [📥 DOCX]  [📥 Markdown]                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**✨ Magie ! Le document apparaît automatiquement avec les options d'export.**

---

## 6️⃣ Étape 6 : Export en Un Clic

Sarah clique sur **[📥 PDF]** et le document est exporté :

### Fichier Généré : `Developpeur-Full-Stack-Senior-Engineering.pdf`

```
┌────────────────────────────────────────────┐
│                                            │
│     Développeur Full-Stack Senior          │
│                                            │
│  📍 Informations Générales                 │
│                                            │
│  Localisation: Paris, France (Hybride)     │
│  Département: Engineering                  │
│  Type de contrat: CDI                      │
│  Expérience requise: 5+ ans                │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  🎯 Mission                                │
│                                            │
│  Nous recherchons un Développeur...        │
│  ...                                       │
│                                            │
└────────────────────────────────────────────┘
```

**✅ Document professionnel prêt à être publié !**

---

## 🎯 Workflows Supportés (23 workflows × 13 types de documents)

### HR Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `create_job_posting` | offre | Offre d'Emploi Développeur |
| `onboarding_plan` | plan | Plan d'Onboarding 30-60-90 |
| `performance_review` | rapport | Évaluation Performance Q4 |

### CEO Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `strategic_plan` | plan | Plan Stratégique 2025 |
| `quarterly_report` | rapport | Rapport Q1 2025 |
| `board_presentation` | presentation | Présentation Conseil d'Administration |

### IT Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `technical_spec` | specification | Spécification API REST |
| `incident_report` | rapport | Rapport Incident Production |
| `architecture_doc` | documentation | Architecture Microservices |

### Marketing Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `content_calendar` | plan | Calendrier Q1 2025 |
| `campaign_brief` | brief | Brief Campagne Lancement Produit |
| `marketing_report` | rapport | Rapport Performance Ads |

### Sales Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `sales_proposal` | proposition | Proposition Commerciale Enterprise |
| `sales_report` | rapport | Rapport Ventes Mensuel |

### Manager Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `team_report` | rapport | Rapport d'Équipe Sprint 15 |
| `project_plan` | plan | Plan Projet Migration Cloud |
| `meeting_minutes` | compte-rendu | CR Réunion Hebdo |

### Student Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `essay` | essai | Dissertation Philosophie |
| `research_paper` | article | Article de Recherche IA |
| `study_guide` | guide | Guide Révision Examen |

### Researcher Workflows
| Workflow | Type de Document | Exemple |
|----------|------------------|---------|
| `research_proposal` | proposition | Proposition Recherche Quantique |
| `literature_review` | revue | Revue Littérature Machine Learning |
| `research_report` | rapport | Rapport Expérimentation |

---

## 🔧 Architecture Technique

```
┌────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ Workflow UI  │ → │  Ask Window  │ → │ DocumentPreview│    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                       SERVICES LAYER                           │
│  ┌────────────────────┐    ┌──────────────────────────┐       │
│  │ workflowService.js │ → │ WorkflowDocumentEnhancer │       │
│  └────────────────────┘    └──────────────────────────┘       │
│           ↓                            ↓                       │
│    [buildPrompt()]              [enhancePrompt()]              │
└────────────────────────────────────────────────────────────────┘
                               ↓
                    ┌──────────────────┐
                    │   AI (Claude)    │
                    └──────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                      PARSING LAYER                             │
│  ┌──────────────────┐         ┌─────────────────────┐         │
│  │ documentParser.js│         │ AskView.parseDocuments│         │
│  │   (Backend)      │         │    (Frontend)        │         │
│  └──────────────────┘         └─────────────────────┘         │
│           ↓                            ↓                       │
│    [Extraction]                 [Affichage]                    │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                       EXPORT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         documentExportService.js                         │ │
│  │  [exportToPDF]  [exportToDOCX]  [exportToMarkdown]      │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Statistiques du Système

- **23 workflows** supportant la génération automatique de documents
- **13 types de documents** différents (offre, plan, rapport, presentation, etc.)
- **2 formats de marqueurs** supportés (full format et simple format)
- **3 formats d'export** disponibles (PDF, DOCX, Markdown)
- **0 configuration manuelle** requise (tout est automatique)

---

## 🚀 Avantages pour l'Utilisateur

### ✅ Avant (Sans le Système)
1. User lance workflow
2. IA génère texte brut dans le chat
3. User copie-colle dans Word/Google Docs
4. User formate manuellement
5. User exporte en PDF
6. **Total : ~10-15 minutes de travail manuel**

### ✨ Maintenant (Avec le Système)
1. User lance workflow
2. **Document professionnel généré et affiché automatiquement**
3. User clique sur "Export PDF"
4. **Total : ~30 secondes, 0 travail manuel**

**Gain de temps : 95% 🎉**

---

## 🧪 Comment Tester

### Test Rapide (Sans l'Application)
```bash
# Test du parser
node test-document-parser.js

# Test de l'enrichissement
node test-workflow-enhancer.js
```

### Test Complet (Avec l'Application)
```bash
# Lancer l'application
npm start

# 1. Ouvrir Ask Window (Cmd+Entrée)
# 2. Lancer workflow "Create Job Posting"
# 3. Remplir le formulaire
# 4. Observer :
#    - ✅ Prompt enrichi automatiquement
#    - ✅ Document généré par l'IA avec marqueurs
#    - ✅ DocumentPreview s'affiche automatiquement
#    - ✅ Export PDF/DOCX fonctionne
```

---

## 📚 Ressources

- **Guide Complet** : `GUIDE_WORKFLOW_DOCUMENTS.md`
- **Documentation Installation** : `INSTALLATION_RESOLUTION.md`
- **Tests Unitaires** : `test-document-parser.js`, `test-workflow-enhancer.js`
- **Services** :
  - `src/features/common/services/workflowDocumentEnhancer.js`
  - `src/features/common/services/documentParser.js`
  - `src/features/common/services/documentExportService.js`
- **UI Components** :
  - `src/ui/ask/AskView.js`
  - `src/ui/ask/DocumentPreview.js`

---

## 🎊 Résumé

**Le système workflows → documents est 100% opérationnel !**

- ✅ 23 workflows automatiquement connectés
- ✅ Documents générés et affichés automatiquement
- ✅ Export professionnel en un clic
- ✅ Zéro configuration manuelle requise
- ✅ Tests complets passés avec succès

**🚀 Prêt pour l'utilisation en production !**
