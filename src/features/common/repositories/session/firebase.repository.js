const { doc, getDoc, collection, addDoc, query, where, getDocs, writeBatch, orderBy, limit, updateDoc, Timestamp } = require('firebase/firestore');
const { getFirestoreInstance } = require('../../services/firebaseClient');
const { createEncryptedConverter } = require('../firestoreConverter');
const encryptionService = require('../../services/encryptionService');

const sessionConverter = createEncryptedConverter(['title']);

// FIX MEDIUM: Add session type whitelist validation (matching SQLite)
const ALLOWED_SESSION_TYPES = ['ask', 'listen'];

function validateSessionType(type) {
    if (!ALLOWED_SESSION_TYPES.includes(type)) {
        throw new Error(`Invalid session type: ${type}. Must be 'ask' or 'listen'`);
    }
}

function sessionsCol() {
    const db = getFirestoreInstance();
    // Fix HIGH BUG-H8: Check if Firestore instance is null before using it
    if (!db) {
        throw new Error('[FirebaseRepository] Firestore not initialized - cannot access sessions collection');
    }
    return collection(db, 'sessions').withConverter(sessionConverter);
}

// Sub-collection references are now built from the top-level
function subCollections(sessionId) {
    const db = getFirestoreInstance();
    // Fix HIGH BUG-H8: Check if Firestore instance is null before using it
    if (!db) {
        throw new Error('[FirebaseRepository] Firestore not initialized - cannot access sub-collections');
    }
    const sessionPath = `sessions/${sessionId}`;
    return {
        transcripts: collection(db, `${sessionPath}/transcripts`),
        ai_messages: collection(db, `${sessionPath}/ai_messages`),
        summary: collection(db, `${sessionPath}/summary`),
    }
}

async function getById(id) {
    const docRef = doc(sessionsCol(), id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

async function create(uid, type = 'ask') {
    // FIX MEDIUM: Validate session type before creating
    validateSessionType(type);

    const now = Timestamp.now();
    const newSession = {
        uid: uid,
        members: [uid], // For future sharing functionality
        title: `Session @ ${new Date().toLocaleTimeString()}`,
        session_type: type,
        started_at: now,
        updated_at: now,
        ended_at: null,
    };
    const docRef = await addDoc(sessionsCol(), newSession);
    console.log(`Firebase: Created session ${docRef.id} for user ${uid}`);
    return docRef.id;
}

async function getAllByUserId(uid) {
    const q = query(sessionsCol(), where('members', 'array-contains', uid), orderBy('started_at', 'desc'));
    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map(doc => doc.data());

    // Fix HIGH BUG-H21: Verify all returned documents have uid in members array
    for (const session of sessions) {
        if (!session.members || !Array.isArray(session.members) || !session.members.includes(uid)) {
            console.error(
                `[FirebaseRepository] Query integrity error: Session ${session.id} returned for uid=${uid} but uid not in members array:`,
                session.members
            );
        }
    }

    return sessions;
}

async function updateTitle(id, title) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, {
        title: encryptionService.encrypt(title),
        updated_at: Timestamp.now()
    });
    return { changes: 1 };
}

async function deleteWithRelatedData(id) {
    const db = getFirestoreInstance();
    // Fix HIGH BUG-H8: Check if Firestore instance is null before using it
    if (!db) {
        throw new Error('[FirebaseRepository] Firestore not initialized - cannot delete session');
    }
    const batch = writeBatch(db);

    const { transcripts, ai_messages, summary } = subCollections(id);
    const [transcriptsSnap, aiMessagesSnap, summarySnap] = await Promise.all([
        getDocs(query(transcripts)),
        getDocs(query(ai_messages)),
        getDocs(query(summary)),
    ]);
    
    transcriptsSnap.forEach(d => batch.delete(d.ref));
    aiMessagesSnap.forEach(d => batch.delete(d.ref));
    summarySnap.forEach(d => batch.delete(d.ref));

    const sessionRef = doc(sessionsCol(), id);
    batch.delete(sessionRef);

    await batch.commit();
    return { success: true };
}

async function end(id) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { ended_at: Timestamp.now() });
    return { changes: 1 };
}

async function updateType(id, type) {
    // FIX MEDIUM: Validate session type before updating
    validateSessionType(type);

    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { session_type: type, updated_at: Timestamp.now() });
    return { changes: 1 };
}

async function touch(id) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { updated_at: Timestamp.now() });
    return { changes: 1 };
}

async function getOrCreateActive(uid, requestedType = 'ask') {
    const findQuery = query(
        sessionsCol(),
        where('uid', '==', uid),
        where('ended_at', '==', null),
        orderBy('session_type', 'desc'),
        limit(1)
    );

    const activeSessionSnap = await getDocs(findQuery);
    
    if (!activeSessionSnap.empty) {
        const activeSessionDoc = activeSessionSnap.docs[0];
        const sessionRef = doc(sessionsCol(), activeSessionDoc.id);
        const activeSession = activeSessionDoc.data();

        console.log(`[Repo] Found active Firebase session ${activeSession.id}`);
        
        const updates = { updated_at: Timestamp.now() };
        if (activeSession.session_type === 'ask' && requestedType === 'listen') {
            updates.session_type = 'listen';
            console.log(`[Repo] Promoted Firebase session ${activeSession.id} to 'listen' type.`);
        }
        
        await updateDoc(sessionRef, updates);
        return activeSessionDoc.id;
    } else {
        console.log(`[Repo] No active Firebase session for user ${uid}. Creating new.`);
        return create(uid, requestedType);
    }
}

async function endAllActiveSessions(uid) {
    const q = query(sessionsCol(), where('uid', '==', uid), where('ended_at', '==', null));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { changes: 0 };

    const db = getFirestoreInstance();
    // Fix HIGH BUG-H8: Check if Firestore instance is null before using it
    if (!db) {
        throw new Error('[FirebaseRepository] Firestore not initialized - cannot end sessions');
    }
    const batch = writeBatch(db);
    const now = Timestamp.now();
    snapshot.forEach(d => {
        batch.update(d.ref, { ended_at: now });
    });
    await batch.commit();

    console.log(`[Repo] Ended ${snapshot.size} active session(s) for user ${uid}.`);
    return { changes: snapshot.size };
}

module.exports = {
    getById,
    create,
    getAllByUserId,
    updateTitle,
    deleteWithRelatedData,
    end,
    updateType,
    touch,
    getOrCreateActive,
    endAllActiveSessions,
}; 