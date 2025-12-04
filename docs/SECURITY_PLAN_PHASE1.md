# 🛡️ PLAN D'AMÉLIORATION SÉCURITÉ & CONFORMITÉ RGPD
# Lucide - Roadmap de Correction

**Date:** 11 Novembre 2025
**Basé sur:** Audit de sécurité complet
**Objectif:** Atteindre 8.5/10 en sécurité + Conformité RGPD 100%

---

## 📊 RÉSUMÉ EXÉCUTIF

### Situation Actuelle
- **Score sécurité:** 4.5/10 ⚠️
- **Vulnérabilités critiques:** 8
- **Vulnérabilités élevées:** 15
- **Conformité RGPD:** 30% ❌

### Objectif
- **Score cible:** 8.5/10 ✅
- **Vulnérabilités critiques:** 0
- **Conformité RGPD:** 100% ✅

### Effort Estimé
- **Phase 1 (Critique):** 50-60h (1-2 semaines)
- **Phase 2 (Élevé):** 70-80h (2-3 semaines)
- **Phase 3 (RGPD):** 80-100h (3-4 semaines)
- **Phase 4 (Moyen):** 50-60h (2 semaines)
- **TOTAL:** 250-300h (8-12 semaines)

---

## 🚨 PHASE 1: CORRECTIFS CRITIQUES (0-7 jours)
**Priorité: URGENTE - Bloquer la production**

### ✅ Tâche 1.1: Supprimer les clés API hardcodées
**Durée:** 2-3 heures
**Assigné à:** Backend Dev

**Fichiers à modifier:**
1. `src/features/common/ai/providers/openai.js`
2. `src/features/common/services/firebaseClient.js`

**Étapes:**

```javascript
// 1. Créer .env.local (ne JAMAIS commiter)
PORTKEY_API_KEY=votre_nouvelle_cle
FIREBASE_API_KEY=AIzaSy...

// 2. Modifier openai.js
- AVANT:
'x-portkey-api-key': 'gRv2UGRMq6GGLJ8aVEB4e7adIewu',

+ APRÈS:
'x-portkey-api-key': process.env.PORTKEY_API_KEY,

// 3. Modifier firebaseClient.js
- AVANT:
const firebaseConfig = {
    apiKey: "AIzaSyAwHfSOD7s2-z5TCMyx-_VzwYT-a0m9hKo",
    ...
}

+ APRÈS:
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    ...
}

// 4. Ajouter à .gitignore
.env.local
.env.*.local

// 5. Révoquer les anciennes clés
// - Portkey Dashboard: Regenerate API Key
// - Firebase Console: Restrict API Key
```

**Vérification:**
```bash
# S'assurer qu'aucune clé n'est en dur
grep -r "gRv2UGRMq6GGLJ8aVEB4e7adIewu" src/
grep -r "AIzaSyAwHfSOD7s2-z5TCMyx-_VzwYT-a0m9hKo" src/
```

**Test:**
- [ ] App démarre avec variables d'environnement
- [ ] Connexion Firebase fonctionne
- [ ] API Portkey fonctionne
- [ ] Pas de clés dans le code

---

### ✅ Tâche 1.2: Corriger les règles Firestore
**Durée:** 3-4 heures
**Assigné à:** Backend Dev + Security Review

**Fichier:** `firestore.rules`

**Étapes:**

```javascript
// REMPLACER TOUT LE FICHIER firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Fonction helper: utilisateur authentifié
    function isAuthenticated() {
      return request.auth != null;
    }

    // Fonction helper: propriétaire de la ressource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // =====================================================
    // USERS - L'utilisateur ne peut accéder qu'à ses données
    // =====================================================
    match /users/{userId} {
      // Lecture: seulement ses propres données
      allow read: if isAuthenticated() && isOwner(userId);

      // Création: seulement lors de l'inscription
      allow create: if isAuthenticated() && isOwner(userId);

      // Mise à jour: seulement ses propres données
      allow update: if isAuthenticated() && isOwner(userId);

      // Suppression: seulement ses propres données
      allow delete: if isAuthenticated() && isOwner(userId);
    }

    // =====================================================
    // SESSIONS - Isolation stricte par utilisateur
    // =====================================================
    match /sessions/{sessionId} {
      // Vérifier que la session appartient à l'utilisateur
      allow read: if isAuthenticated() &&
        resource.data.uid == request.auth.uid;

      allow create: if isAuthenticated() &&
        request.resource.data.uid == request.auth.uid;

      allow update: if isAuthenticated() &&
        resource.data.uid == request.auth.uid;

      allow delete: if isAuthenticated() &&
        resource.data.uid == request.auth.uid;
    }

    // =====================================================
    // AI_MESSAGES - Via la session parente
    // =====================================================
    match /ai_messages/{messageId} {
      // Vérifier que le message appartient à une session de l'utilisateur
      function ownsSession() {
        let sessionId = resource.data.session_id;
        let session = get(/databases/$(database)/documents/sessions/$(sessionId));
        return session.data.uid == request.auth.uid;
      }

      allow read: if isAuthenticated() && ownsSession();

      allow create: if isAuthenticated() &&
        request.resource.data.session_id != null &&
        get(/databases/$(database)/documents/sessions/$(request.resource.data.session_id)).data.uid == request.auth.uid;

      allow update: if isAuthenticated() && ownsSession();
      allow delete: if isAuthenticated() && ownsSession();
    }

    // =====================================================
    // TRANSCRIPTS
    // =====================================================
    match /transcripts/{transcriptId} {
      function ownsTranscript() {
        return resource.data.uid == request.auth.uid;
      }

      allow read: if isAuthenticated() && ownsTranscript();
      allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
      allow update: if isAuthenticated() && ownsTranscript();
      allow delete: if isAuthenticated() && ownsTranscript();
    }

    // =====================================================
    // SUMMARIES
    // =====================================================
    match /summaries/{summaryId} {
      function ownsSummary() {
        return resource.data.uid == request.auth.uid;
      }

      allow read: if isAuthenticated() && ownsSummary();
      allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
      allow update: if isAuthenticated() && ownsSummary();
      allow delete: if isAuthenticated() && ownsSummary();
    }

    // =====================================================
    // DOCUMENTS & CHUNKS
    // =====================================================
    match /documents/{documentId} {
      function ownsDocument() {
        return resource.data.uid == request.auth.uid;
      }

      allow read: if isAuthenticated() && ownsDocument();
      allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
      allow update: if isAuthenticated() && ownsDocument();
      allow delete: if isAuthenticated() && ownsDocument();

      // Chunks sous-collection
      match /chunks/{chunkId} {
        allow read: if isAuthenticated() && ownsDocument();
        allow write: if isAuthenticated() && ownsDocument();
      }
    }

    // =====================================================
    // CITATIONS
    // =====================================================
    match /citations/{citationId} {
      function ownsCitation() {
        return resource.data.uid == request.auth.uid;
      }

      allow read: if isAuthenticated() && ownsCitation();
      allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
      allow update: if isAuthenticated() && ownsCitation();
      allow delete: if isAuthenticated() && ownsCitation();
    }

    // =====================================================
    // PROVIDER_SETTINGS
    // =====================================================
    match /provider_settings/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);
    }

    // =====================================================
    // DEFAULT: DENY ALL
    // =====================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Déploiement:**
```bash
# 1. Tester les règles localement
firebase emulators:start --only firestore

# 2. Déployer en production
firebase deploy --only firestore:rules

# 3. Vérifier dans Firebase Console
```

**Tests à effectuer:**
```javascript
// Test 1: Utilisateur A ne peut pas lire les sessions de B
// Test 2: Utilisateur A ne peut pas modifier les données de B
// Test 3: Utilisateur peut créer ses propres données
// Test 4: Utilisateur peut lire/modifier ses données
```

**Vérification:**
- [ ] Règles déployées
- [ ] Tests passent
- [ ] Aucun accès cross-user possible
- [ ] Logs Firebase sans erreurs

---

### ✅ Tâche 1.3: Mettre à jour les dépendances vulnérables
**Durée:** 2 heures
**Assigné à:** DevOps / Lead Dev

**Étapes:**

```bash
# 1. Auditer toutes les vulnérabilités
npm audit

# 2. Mettre à jour automatiquement
npm audit fix

# 3. Si des vulnérabilités persistent, forcer les versions
npm install axios@^1.12.0
npm install form-data@^4.0.4
npm install tar-fs@^2.1.4

# 4. Vérifier qu'il n'y a plus de vulnérabilités
npm audit

# 5. Tester l'application
npm test
npm run build

# 6. Commit
git add package.json package-lock.json
git commit -m "security: update vulnerable dependencies (axios, form-data, tar-fs)"
```

**Vérification:**
- [ ] `npm audit` retourne 0 vulnérabilités
- [ ] Tests passent
- [ ] Build réussit
- [ ] Application fonctionne normalement

---

### ✅ Tâche 1.4: Implémenter Rate Limiting sur /login
**Durée:** 3 heures
**Assigné à:** Backend Dev

**Fichier:** `lucide-backend/src/auth/auth.routes.js`

**Étapes:**

```javascript
// 1. Installer express-rate-limit (déjà fait)
// 2. Créer un limiter spécifique pour auth

const rateLimit = require('express-rate-limit');

// Rate limiter strict pour l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    skipSuccessfulRequests: false, // Compter même les succès
    message: {
        error: 'TooManyRequests',
        message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
        retryAfter: 15
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});

// Rate limiter pour signup (moins strict)
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // 3 créations de compte max par heure
    message: {
        error: 'TooManyRequests',
        message: 'Trop de créations de compte. Veuillez réessayer dans 1 heure.'
    }
});

// 3. Appliquer aux routes
router.post('/login', authLimiter, async (req, res, next) => {
    // ... existing login code
});

router.post('/signup', signupLimiter, async (req, res, next) => {
    // ... existing signup code
});

// 4. Ajouter un système de blocage IP pour brute force
const loginAttempts = new Map();

async function checkBruteForce(email, ip) {
    const key = `${email}:${ip}`;
    const attempts = loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };

    // Reset après 1 heure
    if (Date.now() - attempts.firstAttempt > 3600000) {
        loginAttempts.delete(key);
        return { blocked: false };
    }

    // Bloquer après 10 tentatives
    if (attempts.count >= 10) {
        return {
            blocked: true,
            retryAfter: Math.ceil((3600000 - (Date.now() - attempts.firstAttempt)) / 60000)
        };
    }

    return { blocked: false };
}

function recordLoginAttempt(email, ip, success) {
    const key = `${email}:${ip}`;

    if (success) {
        // Reset sur succès
        loginAttempts.delete(key);
    } else {
        // Incrémenter sur échec
        const attempts = loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
        attempts.count++;
        loginAttempts.set(key, attempts);
    }
}

// 5. Intégrer dans la route login
router.post('/login', authLimiter, async (req, res, next) => {
    const { email, password } = req.body;
    const ip = req.ip;

    // Vérifier brute force
    const bruteCheck = await checkBruteForce(email, ip);
    if (bruteCheck.blocked) {
        return res.status(429).json({
            error: 'TooManyAttempts',
            message: `Compte temporairement bloqué. Réessayez dans ${bruteCheck.retryAfter} minutes.`
        });
    }

    try {
        // ... login logic ...

        // Si succès
        recordLoginAttempt(email, ip, true);
        return res.json({ token, user });

    } catch (error) {
        // Si échec
        recordLoginAttempt(email, ip, false);
        return res.status(401).json({ error: 'InvalidCredentials' });
    }
});
```

**Tests:**
```bash
# Test: 6 tentatives rapides doivent être bloquées
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# La 6ème doit retourner 429
```

**Vérification:**
- [ ] Rate limiting fonctionne (429 après 5 tentatives)
- [ ] Brute force detection fonctionne (429 après 10 tentatives)
- [ ] Reset après délai fonctionne
- [ ] Tests automatisés ajoutés

---

### ✅ Tâche 1.5: Protection XSS avec DOMPurify
**Durée:** 4 heures
**Assigné à:** Frontend Dev

**Fichier:** `src/ui/ask/AskView.js`

**Étapes:**

```javascript
// 1. Installer DOMPurify
npm install dompurify

// 2. Importer dans AskView.js
import DOMPurify from 'dompurify';

// 3. Configurer DOMPurify de manière stricte
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
        'code', 'pre', 'blockquote',
        'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    SAFE_FOR_TEMPLATES: true,
    RETURN_TRUSTED_TYPE: false
};

// 4. Créer une fonction helper de sanitization
function sanitizeHTML(dirty) {
    return DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG);
}

// 5. Remplacer TOUS les innerHTML par des versions sanitized

// AVANT (ligne 1121):
responseContainer.innerHTML = cleanHtml;

// APRÈS:
responseContainer.innerHTML = sanitizeHTML(cleanHtml);

// AVANT (ligne 1025):
messageDiv.innerHTML = `<strong>Vous:</strong> ${content}`;

// APRÈS:
messageDiv.innerHTML = `<strong>Vous:</strong> ${sanitizeHTML(content)}`;

// 6. Pour le texte brut, utiliser textContent
// AVANT:
element.innerHTML = userName;

// APRÈS:
element.textContent = userName; // Plus sûr pour texte brut

// 7. Ajouter des tests XSS
function testXSSSafety() {
    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>'
    ];

    xssPayloads.forEach(payload => {
        const cleaned = sanitizeHTML(payload);
        console.assert(
            !cleaned.includes('script') && !cleaned.includes('onerror'),
            `XSS payload not properly sanitized: ${payload}`
        );
    });

    console.log('✅ All XSS tests passed');
}
```

**Ajouter CSP (Content Security Policy):**

```javascript
// Dans main.js (Electron main process)
const mainWindow = new BrowserWindow({
    webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,

        // Ajouter CSP
        additionalArguments: [
            '--disable-web-security=false'
        ]
    }
});

// Ajouter headers CSP
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
                "default-src 'self';",
                "script-src 'self' 'unsafe-inline';", // À réduire progressivement
                "style-src 'self' 'unsafe-inline';",
                "img-src 'self' data: https:;",
                "connect-src 'self' https://api.openai.com https://api.anthropic.com https://*.supabase.co;",
                "font-src 'self' data:;",
                "object-src 'none';",
                "base-uri 'self';",
                "form-action 'self';"
            ].join(' ')
        }
    });
});
```

**Vérification:**
- [ ] DOMPurify installé et configuré
- [ ] Tous les innerHTML sont sanitized
- [ ] Tests XSS passent
- [ ] CSP headers ajoutés
- [ ] Pas de console errors

---

### ✅ Tâche 1.6: Créer Politique de Confidentialité RGPD
**Durée:** 6-8 heures
**Assigné à:** Legal + Product Manager

**Créer:** `/legal/POLITIQUE_CONFIDENTIALITE.md`

```markdown
# Politique de Confidentialité - Lucide

*Dernière mise à jour: [DATE]*

## 1. IDENTITÉ DU RESPONSABLE DE TRAITEMENT

**Lucide SAS**
Siège social: [ADRESSE]
SIRET: [NUMÉRO]
Email: contact@lucide.app
DPO: dpo@lucide.app

## 2. DONNÉES COLLECTÉES

### 2.1 Données d'identification
- Adresse email
- Nom d'affichage
- Identifiant unique

### 2.2 Données de contenu
- Conversations avec les assistants IA
- Sessions de travail
- Documents uploadés (si applicable)

### 2.3 Données techniques
- Adresse IP
- Type de navigateur
- Système d'exploitation
- Logs de connexion

## 3. FINALITÉS DU TRAITEMENT

Nous collectons et traitons vos données pour:

1. **Fourniture du service** (base légale: exécution du contrat)
   - Authentification
   - Fonctionnement des assistants IA
   - Synchronisation multi-appareils

2. **Amélioration du service** (base légale: intérêt légitime)
   - Analyse d'usage
   - Correction de bugs
   - Optimisation des performances

3. **Obligations légales** (base légale: obligation légale)
   - Conservation des logs (LCEN)
   - Lutte contre la fraude

## 4. DESTINATAIRES DES DONNÉES

Vos données peuvent être partagées avec:

- **Sous-traitants**:
  - Firebase (Google) - Hébergement base de données (USA - CCT)
  - Supabase - Synchronisation cloud (Europe)
  - OpenAI / Anthropic - Traitement IA (USA - CCT)

- **Autorités**: Sur réquisition judiciaire uniquement

Nous ne vendons JAMAIS vos données à des tiers.

## 5. TRANSFERTS HORS UE

Certaines données sont transférées vers les États-Unis:
- Firebase (Google)
- OpenAI
- Anthropic

Ces transferts sont sécurisés par:
- Clauses Contractuelles Types (CCT) de la Commission Européenne
- Garanties de sécurité appropriées

## 6. DURÉE DE CONSERVATION

| Type de donnée | Durée |
|----------------|-------|
| Compte actif | Durée du contrat |
| Après suppression compte | 30 jours |
| Logs de sécurité | 1 an |
| Logs d'audit (Enterprise) | 3 ans |
| Données anonymisées | Illimitée |

## 7. VOS DROITS RGPD

Vous disposez des droits suivants:

### Droit d'accès
Obtenir une copie de vos données personnelles.

### Droit de rectification
Corriger vos données inexactes ou incomplètes.

### Droit à l'effacement ("droit à l'oubli")
Demander la suppression de vos données.

### Droit à la portabilité
Recevoir vos données dans un format structuré (JSON).

### Droit d'opposition
Vous opposer au traitement de vos données.

### Droit à la limitation
Limiter temporairement le traitement.

**Pour exercer vos droits:**
- Email: dpo@lucide.app
- Formulaire: https://lucide.app/privacy/request
- Délai de réponse: 1 mois maximum

## 8. SÉCURITÉ DES DONNÉES

Nous mettons en œuvre des mesures techniques et organisationnelles:

- Chiffrement HTTPS/TLS
- Authentification JWT
- Chiffrement des données sensibles (AES-256)
- Firewall et détection d'intrusion
- Sauvegardes chiffrées
- Accès restreint aux données
- Audits de sécurité réguliers

## 9. COOKIES

Nous utilisons des cookies techniques essentiels:

| Cookie | Finalité | Durée |
|--------|----------|-------|
| session_token | Authentification | 7 jours |
| csrf_token | Protection CSRF | Session |
| preferences | Préférences UI | 1 an |

Vous pouvez refuser les cookies non-essentiels dans les paramètres.

## 10. MODIFICATIONS

Nous pouvons modifier cette politique.
Vous serez notifié par email de tout changement majeur.

## 11. RÉCLAMATION

En cas de litige, vous pouvez introduire une réclamation auprès de la CNIL:
- Site: https://www.cnil.fr/
- Adresse: 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07
- Téléphone: 01 53 73 22 22

## 12. CONTACT

Pour toute question:
- Email général: contact@lucide.app
- DPO: dpo@lucide.app
- Support: support@lucide.app

---

*Cette politique est conforme au RGPD (EU 2016/679) et à la loi Informatique et Libertés.*
```

**Intégrer dans l'application:**

```javascript
// 1. Ajouter un lien dans le footer
<footer>
    <a href="/legal/privacy">Politique de Confidentialité</a>
    <a href="/legal/terms">Conditions d'Utilisation</a>
    <a href="/legal/cookies">Gestion des Cookies</a>
</footer>

// 2. Ajouter une case à cocher à l'inscription
<input type="checkbox" id="acceptPrivacy" required>
<label for="acceptPrivacy">
    J'accepte la <a href="/legal/privacy">Politique de Confidentialité</a>
</label>

// 3. Enregistrer le consentement
const user = {
    ...userData,
    privacy_consent: {
        accepted: true,
        version: '1.0',
        timestamp: new Date().toISOString()
    }
};
```

**Vérification:**
- [ ] Politique créée et complète
- [ ] Liens ajoutés dans l'app
- [ ] Case à cocher à l'inscription
- [ ] Consentement enregistré en base
- [ ] Validée par un juriste (recommandé)

---

## ⏰ CHECKPOINT PHASE 1

**Avant de passer à la Phase 2, vérifier:**

- [ ] ✅ Toutes les clés API sont dans .env
- [ ] ✅ Règles Firestore déployées et testées
- [ ] ✅ Dépendances npm à jour (0 vulnérabilités)
- [ ] ✅ Rate limiting fonctionne sur /login
- [ ] ✅ XSS protection avec DOMPurify
- [ ] ✅ Politique de confidentialité publiée

**Tests de validation:**
```bash
npm audit  # Doit retourner 0 vulnerabilities
npm test   # Tous les tests passent
npm run build  # Build réussit
```

**Déploiement:**
```bash
git add .
git commit -m "security: Phase 1 - Critical security fixes

- Remove hardcoded API keys
- Fix Firestore rules (user isolation)
- Update vulnerable dependencies
- Add rate limiting on auth endpoints
- Implement XSS protection (DOMPurify + CSP)
- Add GDPR privacy policy"

git push origin main
```

---

**📝 Note:** La Phase 1 est BLOQUANTE. Ne pas passer à la Phase 2 sans avoir terminé et validé tous les correctifs critiques.

**Prochain document:** [PLAN_PHASE2.md](./PLAN_PHASE2.md) - Correctifs Élevés

