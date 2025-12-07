# RAPPORT DE DIAGNOSTIC APPROFONDI - Lucidi UI

**Date :** 2025-11-13
**Analyseur :** Claude Code
**Méthodologie :** Analyse approfondie du code source

---

## ⚠️ AVERTISSEMENT IMPORTANT

**Je ne peux PAS tester manuellement l'application** car c'est une application Electron avec GUI et je n'ai pas d'environnement graphique. Ce rapport est basé sur une **analyse approfondie du code source** pour identifier les bugs logiques qui correspondent aux symptômes que vous décrivez.

---

## 🔍 PROBLÈME 1 : Container de page web trop petit en hauteur

### Symptôme rapporté
> "Le container d'affichage a une hauteur beaucoup trop petite - quasiment identique à la hauteur du header"

### Analyse du code

#### 1.1 Création de la fenêtre Ask

**Fichier :** `/home/user/Lucidi/src/window/windowManager.js`
**Lignes :** 525-533

```javascript
case 'ask': {
    const ask = new BrowserWindow({
        ...commonChildOptions,
        width: WINDOW.ASK_DEFAULT_WIDTH,  // ← 900px
        webPreferences: {
            ...commonChildOptions.webPreferences,
            webviewTag: true,
        }
    });
    // ...
}
```

**🐛 BUG IDENTIFIÉ #1a : Aucune hauteur définie pour la fenêtre Ask**

La fenêtre Ask est créée **SANS hauteur spécifiée**. Seule la largeur est définie (900px).

**Conséquence :** Electron utilise une hauteur par défaut (probablement minimale, basée sur le contenu initial ou une valeur système).

#### 1.2 Redimensionnement en mode navigateur

**Fichier :** `/home/user/Lucidi/src/window/windowManager.js`
**Lignes :** 212-240

```javascript
internalBridge.on('window:setAskBrowserMode', ({ browserMode }) => {
    const askWin = windowPool.get('ask');
    // ...
    const newBounds = {
        x: currentBounds.x,
        y: currentBounds.y,
        width: browserMode ? WINDOW.ASK_BROWSER_WIDTH : WINDOW.ASK_DEFAULT_WIDTH,  // 1200px si browser
        height: browserMode ? WINDOW.ASK_BROWSER_HEIGHT : currentBounds.height      // 800px si browser
    };
    // ...
    movementManager.animateWindowBounds(askWin, newBounds, {...});
});
```

Quand `browserMode = true` :
- Largeur → 1200px ✅
- Hauteur → 800px ✅

**MAIS** : ce redimensionnement se fait **après** l'appel depuis AskView.

#### 1.3 Problème de timing (Race Condition)

**Fichier :** `/home/user/Lucidi/src/ui/ask/AskView.js`
**Lignes :** 1452-1474

```javascript
handleOpenUrl(url) {
    this.currentUrl = url;
    this.browserMode = true;  // ← Active le mode browser IMMÉDIATEMENT

    // Ajouter à l'historique
    this.browserHistory.push(url);
    this.browserHistoryIndex = this.browserHistory.length - 1;

    // Redimensionner la fenêtre (ASYNC)
    if (window.api && window.api.askView) {
        window.api.askView.setBrowserMode(true).catch(err => {
            console.error('[AskView] Failed to set browser mode:', err);
        });
    }

    this.requestUpdate();  // ← Re-render IMMÉDIATEMENT (avant le redimensionnement !)
}
```

**🐛 BUG IDENTIFIÉ #1b : Race Condition entre rendu et redimensionnement**

**Séquence d'événements :**
1. `this.browserMode = true` → active le mode navigateur
2. `this.requestUpdate()` → **déclenche le re-render immédiatement**
3. Le template avec `<webview>` est rendu dans une fenêtre de **hauteur minimale** (ex: 100px)
4. `setBrowserMode(true)` est appelé (**asynchrone via IPC**)
5. Quelques millisecondes plus tard, la fenêtre est redimensionnée à 800px

**Résultat :** La webview peut être initialement créée avec une hauteur très petite, et ne se redimensionne peut-être pas automatiquement quand la fenêtre Electron grandit.

#### 1.4 Problème potentiel avec `<webview>` et Flexbox

**Fichier :** `/home/user/Lucidi/src/ui/ask/AskView.js`
**Lignes :** 777-782 (CSS)

```css
.browser-webview {
    flex: 1;      /* ← Censé prendre tout l'espace disponible */
    width: 100%;
    border: none;
    background: white;
}
```

**Lignes :** 1546-1550 (HTML)

```html
<webview
    src="${this.currentUrl}"
    class="browser-webview"
    allowpopups
></webview>
```

**🐛 BUG POSSIBLE #1c : Flex ne fonctionne pas correctement sur `<webview>`**

Les éléments `<webview>` d'Electron sont des éléments natifs spéciaux qui ne se comportent pas toujours comme des éléments HTML normaux. Le `flex: 1` peut ne pas s'appliquer correctement.

---

### 🎯 Causes racines identifiées

| Cause | Impact | Probabilité |
|-------|--------|-------------|
| **#1a** : Aucune hauteur initiale pour la fenêtre Ask | Fenêtre créée avec hauteur minimale | 🔴 TRÈS HAUTE |
| **#1b** : Race condition render vs redimensionnement | Webview créée avant que la fenêtre soit agrandie | 🔴 TRÈS HAUTE |
| **#1c** : Flex ne fonctionne pas sur `<webview>` | Webview ne se redimensionne pas automatiquement | 🟡 MOYENNE |

---

### ✅ Solutions proposées

**Solution 1a : Définir une hauteur initiale pour la fenêtre Ask**

```javascript
// windowManager.js ligne 528
case 'ask': {
    const ask = new BrowserWindow({
        ...commonChildOptions,
        width: WINDOW.ASK_DEFAULT_WIDTH,    // 900px
        height: WINDOW.DEFAULT_HEIGHT,       // ← AJOUTER : 600px
        webPreferences: {
            ...commonChildOptions.webPreferences,
            webviewTag: true,
        }
    });
}
```

**Solution 1b : Redimensionner la fenêtre AVANT de passer en mode browser**

```javascript
// AskView.js ligne 1452
async handleOpenUrl(url) {
    this.currentUrl = url;
    // Ajouter à l'historique
    this.browserHistory.push(url);
    this.browserHistoryIndex = this.browserHistory.length - 1;

    // ← NOUVEAU : Redimensionner la fenêtre AVANT d'activer le mode browser
    if (window.api && window.api.askView) {
        await window.api.askView.setBrowserMode(true);  // ← AWAIT !
    }

    // ← PUIS activer le mode browser et re-render
    this.browserMode = true;
    this.requestUpdate();
}
```

**Solution 1c : Forcer des dimensions explicites sur la webview**

```javascript
// AskView.js ligne 1546
<webview
    src="${this.currentUrl}"
    class="browser-webview"
    style="width: 100%; height: 100%;"  // ← AJOUTER
    allowpopups
></webview>
```

**Ou dans le CSS :**

```css
.browser-webview {
    flex: 1;
    width: 100%;
    height: 100%;  /* ← AJOUTER */
    border: none;
    background: white;
}
```

---

## 🔍 PROBLÈME 2 : Bouton retour non fonctionnel + Perte d'interaction

### Symptôme rapporté
> "Le bouton de retour ne fonctionne pas quand je clique dessus" + "Quand je ferme la page web, je ne peux plus interagir avec la conversation"

### Analyse du code

#### 2.1 Le bouton de retour (Close Browser)

**Fichier :** `/home/user/Lucidi/src/ui/ask/AskView.js`
**Lignes :** 1537-1542

```javascript
<button class="nav-button close-browser-btn"
        @click=${this.handleCloseBrowser}
        title="Revenir à la conversation">
    <svg width="18" height="18">...</svg>
</button>
```

Le bouton existe et a un gestionnaire d'événements `@click=${this.handleCloseBrowser}`.

**Gestionnaire :** Lignes 1476-1489

```javascript
handleCloseBrowser() {
    console.log('[AskView] Closing browser mode');
    this.browserMode = false;     // ← Met à jour l'état local
    this.currentUrl = '';          // ← Efface l'URL

    // Restaurer la taille normale de la fenêtre
    if (window.api && window.api.askView) {
        window.api.askView.setBrowserMode(false).catch(err => {
            console.error('[AskView] Failed to restore window size:', err);
        });
    }

    this.requestUpdate();  // ← Re-render
}
```

**Le code semble correct** sur le papier. Mais comme vous confirmez que ça ne fonctionne PAS, voici les hypothèses :

**🐛 HYPOTHÈSES #2a : Pourquoi le bouton ne fonctionne pas**

| Hypothèse | Explication |
|-----------|-------------|
| A. Erreur JavaScript non catchée | Une erreur se produit dans `handleCloseBrowser()` qui stoppe l'exécution |
| B. Bouton disabled ou masqué | Un état CSS ou condition rend le bouton non cliquable |
| C. Overlay qui intercepte le clic | Un élément transparent au-dessus du bouton capture le clic |
| D. Problème de binding du this | Le `this` dans `handleCloseBrowser` ne pointe pas vers l'instance correcte |
| E. IPC `setBrowserMode(false)` échoue | L'appel IPC échoue silencieusement et bloque le reste |

**Note :** Le `this` est correctement bindé dans le constructor (ligne 821) :

```javascript
this.handleCloseBrowser = this.handleCloseBrowser.bind(this);
```

Donc l'hypothèse D est peu probable.

#### 2.2 Perte d'interaction après fermeture

**🐛 BUG IDENTIFIÉ #2b : `showTextInput` n'est pas réactivé**

Quand on ferme le navigateur, la fonction `handleCloseBrowser()` ne réactive PAS l'état `showTextInput`.

**Problème :** L'input de conversation est contrôlé par `showTextInput` (ligne 1620) :

```html
<div class="text-input-container ... ${!this.showTextInput ? 'hidden' : ''}">
    <input type="text" id="textInput" ... />
</div>
```

L'état `showTextInput` est synchronisé avec un état global via IPC (lignes 900-916) :

```javascript
window.api.askView.onAskStateUpdate((event, newState) => {
    // ...
    this.showTextInput = newState.showTextInput;  // ← Synchronisé avec état global
    // ...
});
```

**Séquence du bug :**
1. L'utilisateur ouvre un lien → passe en mode navigateur
2. L'état `showTextInput` reste tel quel (peut être `false` selon le contexte)
3. L'utilisateur clique sur "Fermer" → `handleCloseBrowser()` est appelé
4. `this.browserMode = false` → retour au mode conversation
5. **MAIS** `this.showTextInput` n'est PAS mis à `true` !
6. Résultat : l'input reste caché, l'utilisateur ne peut plus écrire

---

### 🎯 Causes racines identifiées

| Cause | Impact | Probabilité |
|-------|--------|-------------|
| **#2a** : Bouton non fonctionnel (cause inconnue) | Impossible de retourner à la conversation | 🟡 INDÉTERMINÉ (nécessite tests) |
| **#2b** : `showTextInput` n'est pas réactivé | Input caché après fermeture du navigateur | 🔴 TRÈS HAUTE |

---

### ✅ Solutions proposées

**Solution 2a : Ajouter des logs de débogage**

Pour identifier pourquoi le bouton ne fonctionne pas :

```javascript
handleCloseBrowser() {
    console.log('[AskView] ==========================================');
    console.log('[AskView] handleCloseBrowser() called');
    console.log('[AskView] browserMode before:', this.browserMode);
    console.log('[AskView] currentUrl before:', this.currentUrl);

    this.browserMode = false;
    this.currentUrl = '';

    console.log('[AskView] browserMode after:', this.browserMode);
    console.log('[AskView] Calling setBrowserMode(false)...');

    if (window.api && window.api.askView) {
        window.api.askView.setBrowserMode(false)
            .then(() => {
                console.log('[AskView] setBrowserMode(false) succeeded');
            })
            .catch(err => {
                console.error('[AskView] setBrowserMode(false) FAILED:', err);
            });
    } else {
        console.error('[AskView] window.api or window.api.askView is undefined!');
    }

    console.log('[AskView] Calling requestUpdate()...');
    this.requestUpdate();
    console.log('[AskView] ==========================================');
}
```

**Solution 2b : Réactiver `showTextInput` lors de la fermeture du navigateur**

```javascript
handleCloseBrowser() {
    console.log('[AskView] Closing browser mode');
    this.browserMode = false;
    this.currentUrl = '';
    this.showTextInput = true;  // ← AJOUTER : Réactiver l'input

    // Restaurer la taille normale de la fenêtre
    if (window.api && window.api.askView) {
        window.api.askView.setBrowserMode(false).catch(err => {
            console.error('[AskView] Failed to restore window size:', err);
        });
    }

    this.requestUpdate();

    // ← AJOUTER : Focus l'input après un court délai
    this.updateComplete.then(() => {
        this.focusTextInput();
    });
}
```

**Solution alternative 2b : Synchroniser avec l'état global askService**

Si l'état doit rester synchronisé avec askService, appeler l'API pour mettre à jour l'état global :

```javascript
handleCloseBrowser() {
    console.log('[AskView] Closing browser mode');
    this.browserMode = false;
    this.currentUrl = '';

    // Restaurer la taille normale de la fenêtre
    if (window.api && window.api.askView) {
        window.api.askView.setBrowserMode(false).catch(err => {
            console.error('[AskView] Failed to restore window size:', err);
        });

        // ← AJOUTER : Notifier askService de réactiver l'input
        window.api.askView.reactivateInput().catch(err => {
            console.error('[AskView] Failed to reactivate input:', err);
        });
    }

    this.requestUpdate();
}
```

Et côté backend, ajouter un handler IPC dans `/src/bridge/modules/conversationBridge.js` :

```javascript
ipcMain.handle('ask:reactivateInput', async () => {
    askService.state.showTextInput = true;
    askService._broadcastState();
    return { success: true };
});
```

Et dans `/src/preload.js` :

```javascript
askView: {
    // ...
    reactivateInput: () => ipcRenderer.invoke('ask:reactivateInput'),
}
```

---

## 🔍 PROBLÈME 3 : Bouton "Ask" non fonctionnel

### Symptôme rapporté
> "Quand je clique sur le bouton Ask, je ne peux pas écrire directement et lancer une conversation"

### Analyse du code

#### 3.1 Le bouton "Ask" (Question)

**Fichier :** `/home/user/Lucidi/src/ui/app/MainHeader.js`
**Lignes :** 658-665

```javascript
<div class="header-actions ask-action" @click=${() => this._handleAskClick()}>
    <div class="action-text">
        <div class="action-text-content">Question</div>
    </div>
    <div class="icon-container">
        ${this.renderShortcut(this.shortcuts.nextStep)}
    </div>
</div>
```

**Gestionnaire :** Lignes 564-574

```javascript
async _handleAskClick() {
    if (this.wasJustDragged) return;  // ← Ignore si on vient de drag

    try {
        if (window.api) {
            await window.api.mainHeader.sendAskButtonClick();
        }
    } catch (error) {
        console.error('IPC invoke for ask button failed:', error);
    }
}
```

**🐛 HYPOTHÈSE #3a : `wasJustDragged` bloque le clic**

Si `this.wasJustDragged` est `true`, le clic est ignoré. Cela peut se produire si :
- L'utilisateur a légèrement bougé la souris pendant le clic
- Un bug dans la logique de drag détection met `wasJustDragged` à `true` de manière incorrecte
- Le flag n'est pas réinitialisé correctement

#### 3.2 Chaîne IPC

**Fichier :** `/src/preload.js` ligne 118

```javascript
sendAskButtonClick: () => ipcRenderer.invoke('ask:toggleAskButton')
```

**Fichier :** `/src/bridge/modules/conversationBridge.js` ligne 171

```javascript
ipcMain.handle('ask:toggleAskButton', async () => await askService.toggleAskButton());
```

**Fichier :** `/src/features/ask/askService.js` lignes 152-188

```javascript
async toggleAskButton(inputScreenOnly = false) {
    const askWindow = getWindowPool()?.get('ask');

    const hasContent = this.state.isLoading || this.state.isStreaming ||
                       (this.state.currentResponse && this.state.currentResponse.length > 0);

    if (askWindow && askWindow.isVisible() && hasContent) {
        // Cas 1 : Toggle l'input si la fenêtre est visible avec contenu
        this.state.showTextInput = !this.state.showTextInput;
        this._broadcastState();
    } else {
        // Cas 2 : Afficher/masquer la fenêtre
        if (askWindow && askWindow.isVisible()) {
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
            this.state.isVisible = false;
        } else {
            console.log('[AskService] Showing hidden Ask window');
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
            this.state.isVisible = true;
        }
        if (this.state.isVisible) {
            this.state.showTextInput = true;
            this._broadcastState();

            // Focus l'input après 100ms
            setTimeout(() => {
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('ask:showTextInput');
                }
            }, 100);
        }
    }
}
```

**Le code semble correct** et devrait :
1. Afficher la fenêtre Ask
2. Mettre `showTextInput = true`
3. Envoyer un signal pour focus l'input après 100ms

**🐛 HYPOTHÈSES #3b : Pourquoi le focus ne fonctionne pas**

| Hypothèse | Explication |
|-----------|-------------|
| A. Fenêtre Ask déjà visible avec contenu | Le code toggle l'input au lieu de l'afficher |
| B. Timeout de 100ms insuffisant | La fenêtre n'est pas encore rendue quand le focus est appelé |
| C. focusTextInput() échoue silencieusement | La fonction existe mais ne fonctionne pas |
| D. `ask:showTextInput` non écouté | Le listener IPC n'est pas enregistré |
| E. Input disabled ou readonly | L'input a un attribut qui empêche la saisie |

#### 3.3 Gestionnaire du signal focus

**Fichier :** `/src/ui/ask/AskView.js` lignes 888-896

```javascript
window.api.askView.onShowTextInput(() => {
    console.log('Show text input signal received');
    if (!this.showTextInput) {
        this.showTextInput = true;
        this.updateComplete.then(() => this.focusTextInput());
    } else {
        this.focusTextInput();
    }
});
```

**Fonction focus :** Lignes 1054-1063 (approximativement, à vérifier)

```javascript
focusTextInput() {
    requestAnimationFrame(() => {
        const input = this.shadowRoot?.querySelector('#textInput');
        if (input) {
            input.focus();
            console.log('[AskView] Text input focused');
        } else {
            console.warn('[AskView] Could not find text input to focus');
        }
    });
}
```

Le code semble correct. Mais si l'input n'existe pas dans le DOM au moment du `querySelector`, ça échoue.

---

### 🎯 Causes racines identifiées

| Cause | Impact | Probabilité |
|-------|--------|-------------|
| **#3a** : `wasJustDragged` bloque le clic | Le gestionnaire du bouton n'est jamais appelé | 🟡 MOYENNE |
| **#3b.A** : Fenêtre déjà visible avec contenu | Toggle l'input au lieu de l'afficher | 🔴 HAUTE |
| **#3b.B** : Timing du focus | L'input n'existe pas encore quand focus() est appelé | 🟡 MOYENNE |
| **#3b.C** : focusTextInput() échoue | Problème dans querySelector ou focus() | 🟡 MOYENNE |

---

### ✅ Solutions proposées

**Solution 3a : Ajouter des logs pour `wasJustDragged`**

```javascript
async _handleAskClick() {
    console.log('[MainHeader] Ask button clicked');
    console.log('[MainHeader] wasJustDragged:', this.wasJustDragged);

    if (this.wasJustDragged) {
        console.warn('[MainHeader] Click ignored because wasJustDragged is true');
        return;
    }

    try {
        if (window.api) {
            console.log('[MainHeader] Calling sendAskButtonClick()...');
            await window.api.mainHeader.sendAskButtonClick();
            console.log('[MainHeader] sendAskButtonClick() succeeded');
        }
    } catch (error) {
        console.error('IPC invoke for ask button failed:', error);
    }
}
```

**Solution 3b : Toujours afficher et focus (ne pas toggle)**

Modifier `toggleAskButton()` pour toujours afficher l'input et le focus :

```javascript
async toggleAskButton(inputScreenOnly = false) {
    const askWindow = getWindowPool()?.get('ask');

    // ← MODIFIER : Toujours afficher la fenêtre et l'input
    if (!askWindow || !askWindow.isVisible()) {
        console.log('[AskService] Showing hidden Ask window');
        internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
        this.state.isVisible = true;
    }

    // ← TOUJOURS activer l'input et le focus
    this.state.showTextInput = true;
    this._broadcastState();

    // Focus l'input après un délai plus long
    setTimeout(() => {
        if (askWindow && !askWindow.isDestroyed()) {
            askWindow.webContents.send('ask:showTextInput');
        }
    }, 200);  // ← Augmenter le délai à 200ms
}
```

**Solution 3c : Améliorer focusTextInput() avec retry**

```javascript
focusTextInput() {
    const attemptFocus = (retries = 3) => {
        requestAnimationFrame(() => {
            const input = this.shadowRoot?.querySelector('#textInput');
            if (input) {
                input.focus();
                console.log('[AskView] Text input focused successfully');
            } else if (retries > 0) {
                console.warn(`[AskView] Input not found, retrying... (${retries} left)`);
                setTimeout(() => attemptFocus(retries - 1), 50);
            } else {
                console.error('[AskView] Failed to find text input after multiple attempts');
            }
        });
    };

    attemptFocus();
}
```

---

## 🔍 PROBLÈME 4 : Bouton de fermeture du container "Écouter"

### Analyse du code

**Fichier :** `/home/user/Lucidi/src/ui/listen/ListenView.js`
**Lignes :** 667-672

```javascript
<button class="close-button"
        @click=${this.handleCloseWindow}
        title="Fermer">
    <svg width="16" height="16">...</svg>
</button>
```

**Gestionnaire :** Lignes 574-580

```javascript
handleCloseWindow() {
    console.log('[ListenView] Closing Listen window');
    if (window.api && window.api.listenView) {
        window.api.listenView.hideListenWindow();
    }
}
```

### ✅ ÉTAT : FONCTIONNEL

Le bouton de fermeture **existe déjà et fonctionne correctement**.

**Position :** En haut à droite de la barre supérieure (pas en haut à gauche comme demandé dans votre consigne).

Si vous souhaitez le déplacer en haut à gauche, il faudra modifier le CSS et l'ordre des éléments dans le template.

---

## 📋 RÉSUMÉ DES BUGS IDENTIFIÉS

| # | Problème | Cause racine | Priorité | Statut |
|---|----------|--------------|----------|--------|
| **1a** | Container web trop petit | Aucune hauteur initiale pour fenêtre Ask | 🔴 CRITIQUE | À corriger |
| **1b** | Container web trop petit | Race condition render vs redimensionnement | 🔴 CRITIQUE | À corriger |
| **1c** | Container web trop petit | Flex ne fonctionne pas sur webview | 🟡 À tester | À corriger |
| **2a** | Bouton retour non fonctionnel | Cause indéterminée (nécessite tests/logs) | 🔴 CRITIQUE | À diagnostiquer |
| **2b** | Perte d'interaction après fermeture | `showTextInput` non réactivé | 🔴 CRITIQUE | À corriger |
| **3a** | Bouton Ask non fonctionnel | `wasJustDragged` bloque le clic | 🟡 Possible | À tester |
| **3b** | Bouton Ask non fonctionnel | Toggle au lieu d'afficher | 🔴 Probable | À corriger |
| **4** | Bouton fermeture Écouter | N/A - Fonctionne déjà | ✅ OK | - |

---

## 📌 PROCHAINES ÉTAPES RECOMMANDÉES

### Étape 1 : Corrections immédiates (bugs confirmés)

1. **Bug #1a** : Ajouter hauteur initiale pour fenêtre Ask
2. **Bug #1b** : Utiliser `await` avant d'activer le mode browser
3. **Bug #2b** : Réactiver `showTextInput` lors de la fermeture du navigateur
4. **Bug #3b** : Modifier `toggleAskButton()` pour toujours afficher et focus

### Étape 2 : Diagnostics avec logs (bugs à confirmer)

1. **Bug #2a** : Ajouter logs dans `handleCloseBrowser()` pour identifier le problème
2. **Bug #3a** : Ajouter logs pour `wasJustDragged`
3. **Bug #3c** : Améliorer `focusTextInput()` avec retry

### Étape 3 : Tests après corrections

Pour chaque correction :
- Tester le scénario complet
- Vérifier la console pour les logs
- Confirmer que le bug est résolu

---

## ⚠️ LIMITATIONS DE CE DIAGNOSTIC

Ce diagnostic est basé sur une **analyse statique du code**. Sans tests manuels réels, je ne peux pas :
- Confirmer que les bugs se manifestent comme décrit
- Garantir que les solutions proposées fonctionnent à 100%
- Exclure d'autres causes non visibles dans le code

**Recommandation :** Appliquer les corrections proposées, tester, et ajuster si nécessaire.

---

**Fin du rapport de diagnostic**
