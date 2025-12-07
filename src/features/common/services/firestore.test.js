const { initializeFirebase, getFirebaseAuth, getFirestoreInstance } = require('./firebaseClient');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { collection, addDoc, query, where, getDocs, doc, setDoc } = require('firebase/firestore');

async function testFirestoreOperations() {
    console.log('🧪 Démarrage des tests Firestore...\n');

    try {
        // 1. Initialisation Firebase
        console.log('1️⃣ Test d\'initialisation Firebase');
        initializeFirebase();
        console.log('✅ Firebase initialisé\n');

        // 2. Test d'authentification
        console.log('2️⃣ Test d\'authentification');
        const auth = getAuth();
        const testEmail = 'test@lucide-dream.com';
        const testPassword = 'TestPassword123!';
        
        try {
            // Essayer de créer un nouvel utilisateur
            const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
            console.log('✅ Nouvel utilisateur créé');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                // Si l'utilisateur existe déjà, se connecter
                const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
                console.log('✅ Connexion réussie avec utilisateur existant');
            } else {
                throw error;
            }
        }

        // 3. Test d'écriture Firestore
        console.log('\n3️⃣ Test d\'écriture Firestore');
        const db = getFirestoreInstance();
        const userId = auth.currentUser.uid;

        // Créer le document utilisateur principal
        console.log('Création du document utilisateur principal...');
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
            email: testEmail,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Document utilisateur créé/mis à jour');

        // Créer une préférence utilisateur
        console.log('Création des préférences utilisateur...');
        const userPrefsRef = doc(db, 'users', userId, 'preferences', 'default');
        await setDoc(userPrefsRef, {
            theme: 'dark',
            language: 'fr',
            updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Préférences utilisateur créées');

        // Créer une session de test
        console.log('Création d\'une session de test...');
        const sessionsRef = collection(db, 'users', userId, 'sessions');
        const sessionDoc = await addDoc(sessionsRef, {
            type: 'test',
            createdAt: new Date().toISOString(),
            status: 'active'
        });
        console.log('✅ Session de test créée');

        // 4. Test de lecture Firestore
        console.log('\n4️⃣ Test de lecture Firestore');
        const sessionsQuery = query(
            collection(db, 'users', userId, 'sessions'),
            where('type', '==', 'test')
        );
        const querySnapshot = await getDocs(sessionsQuery);
        console.log(`✅ Sessions trouvées: ${querySnapshot.size}`);

        console.log('\n✅ Tous les tests sont terminés avec succès !');
        
    } catch (error) {
        console.error('\n❌ Erreur pendant les tests:', error);
        throw error;
    }
}

// Exécuter les tests
testFirestoreOperations().catch(console.error);