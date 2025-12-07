# 🧪 Guide de Test - Phase 1 : Système de Profils Lucy

## 📋 Objectif
Vérifier que les 3 agents spécialisés (RH, IT, Marketing) fonctionnent correctement et que l'utilisateur peut basculer entre les modes.

---

## 🚀 Démarrage de l'application

### Option 1 : Mode développement
```bash
cd /home/user/Lucide-101214
npm install  # Si ce n'est pas déjà fait
npm start    # Démarre l'application en mode dev
```

### Option 2 : Build complet
```bash
npm run setup  # Install + build + start
```

---

## ✅ Tests à effectuer

### Test 1 : Accès aux paramètres de profil

1. **Ouvrir l'application Lucide**
2. **Ouvrir le panneau des paramètres**
   - Raccourci clavier (vérifier dans l'app)
   - Ou cliquer sur l'icône paramètres
3. **Localiser la section "Mode de Lucy"**
   - Devrait apparaître après les sélections de modèles
   - Avant la section "Modifier les raccourcis"

**✓ Résultat attendu :**
- Section "Mode de Lucy" visible
- 4 profils affichés :
  - 🤖 Lucy - Assistant Général (par défaut)
  - 👩‍💼 Lucy - Expert RH
  - 💻 Lucy - Expert IT
  - 📱 Lucy - Expert Marketing
- Le profil actif a un fond bleu et une coche verte ✓

---

### Test 2 : Changement de profil

1. **Cliquer sur "Lucy - Expert RH"**
2. **Vérifier la console** (DevTools : Cmd/Ctrl + Shift + I)
   - Message : `Agent profile changed to: hr_specialist`

**✓ Résultat attendu :**
- Le profil RH devient actif (fond bleu + ✓)
- L'ancien profil redevient gris
- Pas d'erreur dans la console

**Répéter pour chaque profil :**
- 💻 Lucy - Expert IT → `it_expert`
- 📱 Lucy - Expert Marketing → `marketing_expert`
- 🤖 Lucy - Assistant Général → `lucide_assistant`

---

### Test 3 : Test de l'Agent RH 👩‍💼

1. **Sélectionner le profil "Lucy - Expert RH"**
2. **Poser une question RH** via la fonctionnalité Ask :

   **Questions test :**
   - "Rédige une offre d'emploi pour un développeur full-stack senior"
   - "Comment gérer un conflit entre deux employés ?"
   - "Quels avantages proposer pour retenir les talents ?"

**✓ Résultat attendu :**
- Réponse professionnelle et structurée
- Ton formel et empathique
- Mentions de : pratiques RH, conformité légale, bien-être employé
- Format avec sections claires (templates pour offres, étapes pour conflits)

**📊 Vérifier dans la console :**
```
[AskService] Using agent profile: hr_specialist
```

---

### Test 4 : Test de l'Agent IT 💻

1. **Sélectionner le profil "Lucy - Expert IT"**
2. **Poser une question technique** :

   **Questions test :**
   - "J'ai une erreur 'Cannot read property of undefined' en JavaScript, comment la corriger ?"
   - "Explique-moi l'architecture REST vs GraphQL"
   - "Écris un snippet pour gérer les erreurs async/await en Node.js"

**✓ Résultat attendu :**
- Réponse technique précise
- Exemples de code avec syntaxe highlighting
- Explication du "pourquoi" (root cause)
- Mention de : debugging, best practices, sécurité

**📊 Vérifier dans la console :**
```
[AskService] Using agent profile: it_expert
```

---

### Test 5 : Test de l'Agent Marketing 📱

1. **Sélectionner le profil "Lucy - Expert Marketing"**
2. **Poser une question marketing** :

   **Questions test :**
   - "Crée une campagne pour le lancement d'une app mobile fitness"
   - "Rédige 3 variantes d'email pour une promo Black Friday"
   - "Quelle stratégie social media pour une startup B2B SaaS ?"

**✓ Résultat attendu :**
- Réponse créative et stratégique
- Multiples options/variantes
- Ton persuasif et engageant
- Structure campagne : objectif, audience, message, canaux, métriques

**📊 Vérifier dans la console :**
```
[AskService] Using agent profile: marketing_expert
```

---

### Test 6 : Persistance du profil

1. **Sélectionner un profil** (ex: IT Expert)
2. **Fermer complètement l'application**
3. **Redémarrer l'application**
4. **Ouvrir les paramètres**

**✓ Résultat attendu :**
- Le profil IT Expert est toujours actif (✓)
- La base de données SQLite a bien persisté le choix

**📊 Vérifier dans la console au démarrage :**
```
[AgentProfileService] Loaded profile: it_expert for user [uid]
```

---

### Test 7 : Vérification base de données

**Option 1 : Via l'application**
- La persistance devrait fonctionner automatiquement (Test 6)

**Option 2 : Inspection directe SQLite**
```bash
# Localiser la base de données
# macOS: ~/Library/Application Support/Lucide/lucide.db
# Windows: %APPDATA%\Lucide\lucide.db

# Ouvrir avec SQLite
sqlite3 ~/Library/Application\ Support/Lucide/lucide.db

# Vérifier la colonne
SELECT uid, active_agent_profile FROM users;
```

**✓ Résultat attendu :**
```
uid                  active_agent_profile
-------------------  --------------------
default_user         it_expert
```

---

## 🐛 Tests de régression

### Vérifier que les fonctionnalités existantes marchent toujours :

1. **✅ Ask feature** fonctionne avec capture d'écran
2. **✅ Listen feature** (si applicable) n'est pas affecté
3. **✅ Sélection de modèle LLM** fonctionne
4. **✅ Sélection de modèle STT** fonctionne
5. **✅ Raccourcis clavier** fonctionnent
6. **✅ Login/Logout Firebase** fonctionne

---

## 📝 Checklist finale

- [ ] Les 4 profils s'affichent dans les settings
- [ ] On peut basculer entre les profils
- [ ] Le profil actif est visuellement distinct (bleu + ✓)
- [ ] Agent RH répond avec expertise RH
- [ ] Agent IT répond avec code et solutions techniques
- [ ] Agent Marketing répond avec créativité et stratégie
- [ ] Le profil persiste après redémarrage
- [ ] Pas d'erreur dans la console
- [ ] Les fonctionnalités existantes marchent toujours

---

## 🚨 Problèmes connus / À surveiller

### Si le profil ne change pas :
- Vérifier les logs console : `[AskService] Using agent profile: ...`
- Vérifier que `agentProfileService.initialize()` est appelé au login

### Si l'UI ne s'affiche pas :
- Vérifier que `availableProfiles` n'est pas vide
- Vérifier les erreurs dans DevTools console
- Vérifier que les IPC handlers sont bien enregistrés

### Si la base de données échoue :
- Vérifier que la migration de schéma s'est bien passée
- Vérifier les logs : `[DatabaseInitializer]`

---

## 🎯 Critères de succès

✅ **Phase 1 validée si :**
1. Tous les 4 profils sont accessibles
2. Chaque agent répond de manière spécialisée
3. Le profil persiste entre les sessions
4. Aucune régression sur les features existantes
5. Aucune erreur critique en console

---

## 📞 Retour utilisateur

**Après les tests, noter :**
- Bugs rencontrés : ___________________________________
- Suggestions UI : ___________________________________
- Qualité des réponses par agent : ___________________
- Performance (lag?) : _______________________________

---

**Prêt pour la Phase 2** une fois ces tests validés ! 🚀
