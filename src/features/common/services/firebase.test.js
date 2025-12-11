const { 
    initializeFirebase, 
    getFirebaseAuth, 
    getFirestoreInstance,
    getAnalyticsInstance 
} = require('./firebaseClient');

async function testFirebaseConnection() {
    console.log('🧪 Démarrage des tests Firebase...');

    try {
        // Test 1: Initialisation
        console.log('\n1️⃣ Test d\'initialisation Firebase');
        initializeFirebase();
        console.log('✅ Initialisation Firebase réussie');

        // Test 2: Auth
        console.log('\n2️⃣ Test de l\'authentification');
        const auth = getFirebaseAuth();
        console.log('✅ Service d\'authentification accessible:', auth !== null);

        // Test 3: Firestore
        console.log('\n3️⃣ Test de Firestore');
        const db = getFirestoreInstance();
        console.log('✅ Instance Firestore accessible:', db !== null);

        // Test 4: Analytics
        console.log('\n4️⃣ Test d\'Analytics');
        const analytics = getAnalyticsInstance();
        console.log('ℹ️ État d\'Analytics:', analytics ? 'Disponible' : 'Non disponible dans cet environnement');

        console.log('\n✅ Tous les tests sont terminés avec succès !');
    } catch (error) {
        console.error('\n❌ Erreur pendant les tests:', error);
        throw error;
    }
}

// Exécuter les tests
testFirebaseConnection().catch(console.error);
