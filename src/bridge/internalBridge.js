// src/bridge/internalBridge.js
const { EventEmitter } = require('events');

// Bus d'événements interne reliant FeatureCore et WindowCore
const internalBridge = new EventEmitter();
module.exports = internalBridge;

// Exemple d'événement
// internalBridge.on('content-protection-changed', (enabled) => {
//   // Géré par windowManager
// });