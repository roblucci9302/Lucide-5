# 📋 Guide de Test - Upload de Documents (Phases 1-4)

Ce guide vous permet de tester toutes les fonctionnalités d'upload et d'export de documents implémentées.

---

## ⚠️ Prérequis

### 1. Résoudre le problème npm install

Le build et l'exécution nécessitent que `node_modules` soit installé. Actuellement bloqué par l'erreur keytar/libsecret-1.

**Solutions possibles** :

#### Option A : Installer libsecret-1 (Linux)
```bash
# Ubuntu/Debian
sudo apt-get install libsecret-1-dev

# Fedora/RHEL
sudo dnf install libsecret-devel

# Arch Linux
sudo pacman -S libsecret
```

Puis :
```bash
cd /home/user/Lucide-pas-loin
npm install
```

#### Option B : Retirer temporairement keytar
Si keytar n'est pas essentiel, vous pouvez le retirer temporairement :
```bash
# Modifier package.json pour commenter/retirer la ligne keytar
# Puis
npm install
```

#### Option C : Utiliser --legacy-peer-deps
```bash
npm install --legacy-peer-deps
```

---

## 🚀 Lancement de l'application

Une fois `npm install` réussi :

```bash
cd /home/user/Lucide-pas-loin
npm start
```

---

## 📝 Tests - Phase 1 & 2 : Upload de Documents

### Test 1 : Upload d'un fichier texte

1. **Ouvrir Ask Window** : Cmd+Entrée (ou Ctrl+Entrée)
2. **Cliquer sur le bouton "+"** (à gauche de la barre de saisie)
3. **Sélectionner** : `test-samples/sample-document.txt`

**✅ Vérifications** :
- [ ] Le fichier apparaît dans AttachmentBubble
- [ ] L'icône est 📃 (pour TXT)
- [ ] Le statut passe de "⏳ Analyse..." à "✓ Analysé"
- [ ] La taille du fichier est affichée
- [ ] Le bouton "×" (supprimer) est visible

**❌ Si erreur** :
- Vérifier console : `Cmd+Shift+I` (DevTools)
- Chercher erreurs dans l'onglet Console

---

### Test 2 : Upload d'un fichier Markdown

1. **Cliquer sur "+"** à nouveau
2. **Sélectionner** : `test-samples/sample-cv.md`

**✅ Vérifications** :
- [ ] Icône : 📋 (pour MD)
- [ ] Statut "Analysé" après ~1 seconde
- [ ] Texte extrait contient "Jean Dupont"

---

### Test 3 : Utilisation du contexte dans une question

1. **Avec les 2 fichiers uploadés**, taper dans la barre :
   ```
   Résume les documents que je t'ai envoyés
   ```
2. **Envoyer** (Entrée)

**✅ Vérifications** :
- [ ] La réponse AI mentionne le contenu des documents
- [ ] Le CV de Jean Dupont est mentionné
- [ ] Le document de test est résumé
- [ ] Les attachments disparaissent après l'envoi

---

### Test 4 : Upload multiple simultané

1. **Cliquer sur "+"**
2. **Sélectionner les 2 fichiers en même temps** (Ctrl+Clic ou Cmd+Clic)

**✅ Vérifications** :
- [ ] Les 2 fichiers apparaissent simultanément
- [ ] Chaque fichier a son propre statut
- [ ] Les analyses se font en parallèle

---

### Test 5 : Suppression d'attachments

1. **Upload un fichier**
2. **Cliquer sur le bouton "×"** à droite du fichier

**✅ Vérifications** :
- [ ] Le fichier disparaît de la liste
- [ ] Aucune erreur dans console
- [ ] Les autres fichiers (si présents) restent intacts

---

## 🖼️ Tests - Phase 3 : OCR Images

### Test 6 : Upload d'une image avec texte

**Note** : Nécessite que `tesseract.js` soit installé (dépend de `npm install`)

1. **Créer une image de test** avec du texte (screenshot d'un document, photo de texte, etc.)
2. **Upload l'image** via le bouton "+"

**✅ Vérifications** :
- [ ] Icône : 🖼️ (pour JPG/PNG/GIF)
- [ ] Statut affiche progression OCR (0-100%)
- [ ] Console affiche : `[KnowledgeBridge] OCR Progress: X%`
- [ ] Texte extrait visible dans console
- [ ] Statut final : "✓ Analysé"

**❌ Si erreur "OCR support not available"** :
- Vérifier que `tesseract.js` est installé :
  ```bash
  ls node_modules/tesseract.js
  ```
- Réinstaller si nécessaire :
  ```bash
  npm install tesseract.js --save
  ```

---

### Test 7 : Image sans texte

1. **Upload une image vide ou sans texte lisible** (ex: photo de paysage)

**✅ Vérifications** :
- [ ] OCR se lance
- [ ] Erreur affichée : "No text could be extracted..."
- [ ] Statut : ❌ avec message d'erreur

---

## 📄 Tests - Phase 4 : Export de Documents

### Test 8 : Export PDF

**Note** : Pour tester, vous devez d'abord avoir un document généré par l'IA.

1. **Ouvrir la console DevTools** (Cmd+Shift+I)
2. **Créer un document de test** via console :
   ```javascript
   const testDoc = {
     title: "Mon Premier Test",
     content: "# Introduction\n\nCeci est un **test** d'export PDF.\n\n## Section 1\n\n- Point 1\n- Point 2\n\n## Section 2\n\nContenu normal.",
     type: "rapport",
     format: "pdf"
   };

   await window.api.documents.exportDocument(testDoc);
   ```

3. **Vérifier dans le dossier** :
   ```bash
   open ~/Documents/Lucide/Exports/
   # ou
   nautilus ~/Documents/Lucide/Exports/
   ```

**✅ Vérifications** :
- [ ] Fichier PDF créé avec timestamp
- [ ] Nom : `Mon_Premier_Test_2025-XX-XX.pdf`
- [ ] Ouverture du PDF :
  - [ ] Titre en grand
  - [ ] Headers formatés (h1, h2)
  - [ ] Listes à puces
  - [ ] Texte en gras
  - [ ] Footer : "Généré par Lucide - [date]"

---

### Test 9 : Export DOCX

1. **Dans la console** :
   ```javascript
   const testDoc = {
     title: "Test Export Word",
     content: "# Titre Principal\n\n## Sous-titre\n\nTexte avec **gras** et *italique*.\n\n- Liste 1\n- Liste 2\n\n1. Numéro 1\n2. Numéro 2",
     type: "lettre",
     format: "docx"
   };

   await window.api.documents.exportDocument(testDoc);
   ```

2. **Ouvrir le fichier** `.docx` dans Word/LibreOffice

**✅ Vérifications** :
- [ ] Titre en style HEADING_TITLE
- [ ] Headers H1, H2 avec styles appropriés
- [ ] **Gras** et *italique* fonctionnent
- [ ] Listes à puces formatées
- [ ] Listes numérotées formatées
- [ ] Footer "Généré par Lucide"

---

### Test 10 : Export Markdown

1. **Dans la console** :
   ```javascript
   const testDoc = {
     title: "Test Markdown",
     content: "## Introduction\n\nContenu en **markdown** natif.",
     type: "memo",
     format: "md"
   };

   await window.api.documents.exportDocument(testDoc);
   ```

2. **Ouvrir le fichier** `.md` dans un éditeur

**✅ Vérifications** :
- [ ] Header avec `# Titre`
- [ ] Métadonnées : Type et Date
- [ ] Ligne de séparation `---`
- [ ] Contenu préservé
- [ ] Footer "Généré par Lucide"

---

### Test 11 : Ouvrir le dossier d'exports

1. **Dans la console** :
   ```javascript
   await window.api.documents.openExportFolder();
   ```

**✅ Vérifications** :
- [ ] Le dossier `~/Documents/Lucide/Exports/` s'ouvre dans l'explorateur
- [ ] Tous les fichiers exportés sont visibles

---

## 🧪 Tests d'intégration

### Test 12 : Workflow complet

1. **Upload un document** (TXT/MD)
2. **Poser une question** utilisant le contexte
3. **L'IA répond** en utilisant le document
4. **Copier la réponse** (bouton copier)
5. **Créer un document** dans console avec la réponse
6. **Exporter en PDF**

**✅ Vérifications** :
- [ ] Tout le flux fonctionne sans erreur
- [ ] Le PDF contient la réponse de l'IA
- [ ] Formatage markdown préservé

---

### Test 13 : Multiple formats

1. **Créer un document riche** :
   ```javascript
   const richDoc = {
     title: "Document Complet",
     content: `# Rapport Technique

## Résumé Exécutif

Ce rapport présente les **résultats** de nos *recherches*.

## Méthodologie

1. Collecte de données
2. Analyse statistique
3. Validation croisée

### Outils utilisés

- Python 3.9
- pandas
- matplotlib

## Résultats

Les tests montrent une amélioration de **60%** des performances.

### Graphiques

\`\`\`python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3, 4])
\`\`\`

## Conclusion

Les résultats sont **concluants** et permettent de passer à la phase suivante.
`,
     type: "rapport"
   };
   ```

2. **Exporter dans les 3 formats** :
   ```javascript
   await window.api.documents.exportDocument({...richDoc, format: 'pdf'});
   await window.api.documents.exportDocument({...richDoc, format: 'docx'});
   await window.api.documents.exportDocument({...richDoc, format: 'md'});
   ```

3. **Comparer les 3 exports**

**✅ Vérifications** :
- [ ] PDF : Formatage professionnel, headers stylés
- [ ] DOCX : Styles Word natifs, éditable
- [ ] MD : Markdown pur, lisible

---

## 🐛 Debugging

### Console Logs à surveiller

Ouvrez DevTools (Cmd+Shift+I) et surveillez :

```
[KnowledgeBridge] Analyzing file for conversation: filename.ext
[KnowledgeBridge] Text extracted: XXXX characters
[KnowledgeBridge] Exporting document "Title" to PDF
[DocumentExportService] PDF exported successfully: /path/to/file.pdf
```

### Erreurs courantes

#### 1. "MODULE_NOT_FOUND: tesseract.js"
**Solution** : `npm install tesseract.js --save`

#### 2. "Failed to analyze file"
**Cause** : Format non supporté ou fichier corrompu
**Solution** : Vérifier que le format est dans la liste : PDF, DOCX, TXT, MD, JPG, PNG, GIF

#### 3. "Export failed: Cannot find module 'pdfkit'"
**Solution** : `npm install pdfkit docx --save`

#### 4. Attachments ne s'affichent pas
**Cause** : AttachmentBubble non importé
**Solution** : Vérifier `import './AttachmentBubble.js'` dans AskView.js

---

## 📊 Checklist complète

### Préparation
- [ ] `npm install` réussi
- [ ] `npm start` lance l'application
- [ ] Ask window s'ouvre (Cmd+Entrée)

### Phase 1-2 : Upload
- [ ] Bouton "+" visible
- [ ] Upload TXT fonctionne
- [ ] Upload MD fonctionne
- [ ] Upload PDF fonctionne (si disponible)
- [ ] Upload DOCX fonctionne (si disponible)
- [ ] AttachmentBubble affiche les fichiers
- [ ] Statuts "Analyzing" → "Analyzed"
- [ ] Bouton suppression fonctionne
- [ ] Contexte utilisé dans réponses AI

### Phase 3 : OCR
- [ ] Upload JPG/PNG/GIF accepté
- [ ] OCR démarre automatiquement
- [ ] Progression affichée (0-100%)
- [ ] Texte extrait de l'image
- [ ] Gestion erreur (image vide)

### Phase 4 : Export
- [ ] Export PDF fonctionne
- [ ] Export DOCX fonctionne
- [ ] Export MD fonctionne
- [ ] Fichiers dans ~/Documents/Lucide/Exports/
- [ ] Noms de fichiers uniques (timestamp)
- [ ] Formatage préservé dans exports
- [ ] Dossier s'ouvre via `openExportFolder()`

---

## 🎯 Tests de performance

### Fichiers volumineux

1. **Upload un PDF de 10+ pages**
   - Temps d'analyse < 5 secondes
   - Extraction complète

2. **Image haute résolution**
   - OCR prend 10-30 secondes
   - Progression affichée correctement

3. **Export document long (50+ pages)**
   - PDF généré sans crash
   - DOCX éditable

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs** dans DevTools Console
2. **Vérifier les fichiers** existent :
   - `src/ui/ask/AttachmentBubble.js`
   - `src/ui/ask/DocumentPreview.js`
   - `src/features/common/services/documentExportService.js`
3. **Vérifier les handlers IPC** dans knowledgeBridge.js
4. **Vérifier package.json** contient :
   - `tesseract.js: ^5.1.1`
   - `pdfkit: ^0.17.2`
   - `docx: ^9.5.1`

---

## ✅ Validation finale

Une fois tous les tests passés :

- [ ] Upload TXT/MD : ✅
- [ ] Upload PDF/DOCX : ✅
- [ ] Upload Images : ✅
- [ ] OCR extraction : ✅
- [ ] Export PDF : ✅
- [ ] Export DOCX : ✅
- [ ] Export MD : ✅
- [ ] Contexte AI : ✅
- [ ] Aucune erreur console : ✅

**🎉 Félicitations ! Toutes les fonctionnalités d'upload et d'export sont opérationnelles.**
