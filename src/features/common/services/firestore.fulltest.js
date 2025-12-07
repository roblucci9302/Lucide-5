const { initializeFirebase, getFirebaseAuth, getFirestoreInstance } = require('./firebaseClient');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp 
} = require('firebase/firestore');

async function runFirestoreTests() {
    console.log('🧪 Tests complets de Firestore...\n');

    try {
        // 1. Initialisation et Authentification
        console.log('1️⃣ Test d\'initialisation et authentification');
        initializeFirebase();
        const auth = getAuth();
        const db = getFirestoreInstance();
        
        const testEmail = 'test@lucide-dream.com';
        const testPassword = 'TestPassword123!';
        
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
            console.log('✅ Connexion réussie avec l\'utilisateur de test');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
                console.log('✅ Nouvel utilisateur de test créé');
            } else {
                throw error;
            }
        }
        
        const userId = userCredential.user.uid;
        console.log('📝 UserID:', userId);

        // 2. Test d'écriture - Préférences utilisateur
        console.log('\n2️⃣ Test d\'écriture - Préférences utilisateur');
        const userPrefs = {
            theme: 'dark',
            language: 'fr',
            notifications: true,
            updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', userId, 'preferences', 'app'), userPrefs);
        console.log('✅ Préférences utilisateur créées');

        // 3. Test d'écriture - Session de transcription
        console.log('\n3️⃣ Test d\'écriture - Session de transcription');
        const sessionData = {
            type: 'transcription',
            status: 'active',
            model: 'whisper-small',
            createdAt: serverTimestamp(),
            metadata: {
                source: 'test',
                duration: 0
            }
        };

        const sessionRef = await addDoc(collection(db, 'users', userId, 'sessions'), sessionData);
        console.log('✅ Session de test créée, ID:', sessionRef.id);

        // 4. Test de lecture - Préférences
        console.log('\n4️⃣ Test de lecture - Préférences');
        const prefsDoc = await getDocs(collection(db, 'users', userId, 'preferences'));
        console.log('✅ Préférences récupérées:', prefsDoc.size, 'documents');
        prefsDoc.forEach(doc => {
            console.log('📄 Contenu:', doc.data());
        });

        // 5. Test de lecture - Sessions
        console.log('\n5️⃣ Test de lecture - Sessions');
        const sessionsQuery = query(
            collection(db, 'users', userId, 'sessions'),
            where('type', '==', 'transcription')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        console.log('✅ Sessions trouvées:', sessionsSnapshot.size);
        sessionsSnapshot.forEach(doc => {
            console.log('📄 Session ID:', doc.id);
            console.log('📄 Contenu:', doc.data());
        });

        // 6. Test de mise à jour
        console.log('\n6️⃣ Test de mise à jour');
        await updateDoc(doc(db, 'users', userId, 'preferences', 'app'), {
            theme: 'light',
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Préférences mises à jour');

        // 7. Test de suppression
        console.log('\n7️⃣ Test de suppression');
        await deleteDoc(doc(db, 'users', userId, 'sessions', sessionRef.id));
        console.log('✅ Session de test supprimée');

        console.log('\n✅ Tous les tests sont terminés avec succès !');
        
    } catch (error) {
        console.error('\n❌ Erreur pendant les tests:', error);
        throw error;
    }
}

// Exécuter les tests
runFirestoreTests().catch(console.error);
