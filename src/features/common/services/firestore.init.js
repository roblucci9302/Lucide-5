const { initializeFirebase, getFirebaseAuth, getFirestoreInstance } = require('./firebaseClient');
const { getAuth } = require('firebase/auth');
const { doc, setDoc } = require('firebase/firestore');

async function initializeFirestoreStructure() {
    console.log('🏗️ Initialisation de la structure Firestore...\n');

    try {
        // 1. Initialisation Firebase
        console.log('1️⃣ Initialisation Firebase');
        initializeFirebase();
        const db = getFirestoreInstance();
        console.log('✅ Firebase initialisé\n');

        // 2. Création des collections et documents initiaux
        console.log('2️⃣ Création des collections initiales');

        // Collection settings (paramètres globaux)
        await setDoc(doc(db, 'settings', 'app'), {
            name: 'Lucide',
            version: '0.2.4',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Collection settings créée');

        // Collection ai_models (modèles IA disponibles)
        await setDoc(doc(db, 'ai_models', 'default'), {
            models: [
                {
                    id: 'gpt-4',
                    name: 'GPT-4',
                    provider: 'openai',
                    type: 'chat'
                },
                {
                    id: 'claude-3',
                    name: 'Claude 3',
                    provider: 'anthropic',
                    type: 'chat'
                }
            ],
            updated_at: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Collection ai_models créée');

        // Collection system_prompts (prompts système)
        await setDoc(doc(db, 'system_prompts', 'default'), {
            prompts: [
                {
                    id: 'default',
                    name: 'Assistant Standard',
                    content: 'Tu es un assistant IA serviable et précis.'
                },
                {
                    id: 'transcription',
                    name: 'Assistant Transcription',
                    content: 'Tu es spécialisé dans l\'analyse et la synthèse de transcriptions audio.'
                }
            ],
            updated_at: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Collection system_prompts créée');

        console.log('\n✅ Structure Firestore initialisée avec succès !');
        
    } catch (error) {
        console.error('\n❌ Erreur pendant l\'initialisation:', error);
        throw error;
    }
}

// Exécuter l'initialisation
initializeFirestoreStructure().catch(console.error);
