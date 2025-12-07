const { initializeFirebase, getFirestoreInstance } = require('./firebaseClient');
const { collection, getDocs, getDoc, doc } = require('firebase/firestore');

async function checkFirestoreSetup() {
    console.log('🔍 Vérification de la configuration Firestore...\n');

    try {
        // 1. Initialisation Firebase
        console.log('1️⃣ Connexion à Firebase');
        initializeFirebase();
        const db = getFirestoreInstance();
        console.log('✅ Connecté à Firebase\n');

        // 2. Vérification de la région
        console.log('2️⃣ Vérification de la région');
        const settings = db._settings || {};
        console.log('📍 Configuration actuelle :');
        console.log(JSON.stringify(settings, null, 2));
        
        // 3. Vérification des collections
        console.log('\n3️⃣ Vérification des collections');

        // Collection settings
        console.log('\nVérification de la collection settings...');
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
            console.log('✅ Collection settings trouvée');
            console.log('📄 Contenu:', settingsDoc.data());
        } else {
            console.log('❌ Collection settings non trouvée');
        }

        // Collection ai_models
        console.log('\nVérification de la collection ai_models...');
        const aiModelsDoc = await getDoc(doc(db, 'ai_models', 'default'));
        if (aiModelsDoc.exists()) {
            console.log('✅ Collection ai_models trouvée');
            console.log('📄 Contenu:', aiModelsDoc.data());
        } else {
            console.log('❌ Collection ai_models non trouvée');
        }

        // Collection system_prompts
        console.log('\nVérification de la collection system_prompts...');
        const promptsDoc = await getDoc(doc(db, 'system_prompts', 'default'));
        if (promptsDoc.exists()) {
            console.log('✅ Collection system_prompts trouvée');
            console.log('📄 Contenu:', promptsDoc.data());
        } else {
            console.log('❌ Collection system_prompts non trouvée');
        }

    } catch (error) {
        console.error('\n❌ Erreur pendant la vérification:', error);
        throw error;
    }
}

// Exécuter la vérification
checkFirestoreSetup().catch(console.error);
