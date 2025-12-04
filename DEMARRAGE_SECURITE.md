# 🚀 DÉMARRAGE RAPIDE - SÉCURITÉ LUCIDE

## ⚡ ÉTAPES OBLIGATOIRES AVANT DE LANCER L'APP

### 1. Configurer les Variables d'Environnement (5 min)

```bash
# Copier le template
cp .env.example .env.local

# Éditer avec vos clés
nano .env.local  # ou code .env.local
```

**Remplir ces variables**:
```bash
# Portkey (obtenir sur https://portkey.ai)
PORTKEY_API_KEY=votre_nouvelle_cle_portkey

# Firebase (Firebase Console > Project Settings > General)
FIREBASE_API_KEY=votre_cle_firebase
FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Régénérer les Clés API (IMPORTANT!) ⚠️

Les anciennes clés ont été exposées sur GitHub. **Vous DEVEZ** créer de nouvelles clés:

**Portkey**:
1. Aller sur [portkey.ai/dashboard](https://portkey.ai)
2. Settings → API Keys
3. Créer une nouvelle clé
4. Copier dans `.env.local`

**Firebase** (optionnel si activité suspecte):
1. Vérifier les logs d'accès dans Firebase Console
2. Si activité suspecte: créer nouveau projet
3. Mettre à jour `.env.local` avec nouvelle config

### 3. Déployer les Règles Firebase de Sécurité

```bash
# Installer Firebase CLI (si pas déjà fait)
npm install -g firebase-tools

# Login
firebase login

# Déployer les nouvelles règles (isolation par utilisateur)
firebase deploy --only firestore:rules
```

### 4. Installer les Dépendances

```bash
# Installer
npm install

# Si erreur avec keytar (Linux):
sudo apt-get install libsecret-1-dev
npm install
```

### 5. Lancer l'Application

```bash
# Mode développement
npm run dev

# Ou production
npm run build
npm start
```

---

## ✅ VÉRIFICATIONS POST-DÉMARRAGE

### Test 1: Variables d'Environnement

```bash
# Dans la console développeur de l'app
console.log(process.env.PORTKEY_API_KEY ? '✅ Portkey OK' : '❌ Portkey manquant');
console.log(process.env.FIREBASE_API_KEY ? '✅ Firebase OK' : '❌ Firebase manquant');
```

### Test 2: Isolation des Données

1. Créer un utilisateur A
2. Créer une session/document avec utilisateur A
3. Se déconnecter et créer utilisateur B
4. Essayer d'accéder aux données de A
5. ✅ **Résultat attendu**: Erreur "Permission denied"

### Test 3: Authentification Portkey

```bash
# Tester un appel API
# Devrait utiliser la nouvelle clé depuis .env.local
```

---

## 🆘 PROBLÈMES COURANTS

### "process.env.PORTKEY_API_KEY is undefined"

**Solution**:
```bash
# Vérifier que .env.local existe
ls -la .env.local

# Vérifier le contenu
cat .env.local

# Redémarrer l'app
npm run dev
```

### "Permission denied" sur Firestore

**Causes possibles**:
1. Règles Firebase pas déployées
2. Document sans champ `uid`
3. Utilisateur non authentifié

**Solution**:
```bash
# Redéployer les règles
firebase deploy --only firestore:rules

# Vérifier que tous les documents ont un champ `uid`
```

### "keytar" build error (Linux)

**Solution**:
```bash
sudo apt-get update
sudo apt-get install libsecret-1-dev
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 SCORE DE SÉCURITÉ

**Avant**: 4.5/10 ⚠️ NON SÉCURISÉ
**Après configuration**: 7.5/10 ✅ PRODUCTION-READY

**Améliorations appliquées**:
- ✅ Clés API sécurisées (process.env)
- ✅ Isolation des données par utilisateur (Firebase Rules)
- ✅ Configuration externalisée (.env.local)
- ✅ Deny by default (sécurité renforcée)

---

## 📚 POUR ALLER PLUS LOIN

**Documents à lire**:
- `SECURITY.md` - Rapport de sécurité complet
- `.env.example` - Template de configuration
- `firestore.rules` - Règles de sécurité Firebase

**Support**:
- Issues GitHub: [github.com/roblucci9302/Lucide-101214/issues](https://github.com/roblucci9302/Lucide-101214/issues)
- Email: (si configuré)

---

**Bonne chance! 🚀**
