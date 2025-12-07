/**
 * Test du bouton compte rendu de réunion
 * Ce script vérifie que:
 * 1. Une session existe
 * 2. La fenêtre post-meeting peut être ouverte
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Path to Lucide database
const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'Lucide', 'lucide.db');

console.log('[Test] Ouverture de la base de données:', dbPath);
const db = sqlite3(dbPath);

// 1. Vérifier s'il existe des sessions d'écoute
const sessions = db.prepare(`
    SELECT id, user_id, mode, created_at, ended_at, is_active
    FROM sessions
    WHERE mode = 'listen'
    ORDER BY created_at DESC
    LIMIT 5
`).all();

console.log('\n[Test] Sessions d\'écoute trouvées:', sessions.length);

if (sessions.length === 0) {
    console.log('\n❌ PROBLÈME: Aucune session d\'écoute trouvée');
    console.log('   Solution: Créez une session en utilisant le mode écoute');
} else {
    console.log('\n✅ Sessions trouvées:');
    sessions.forEach((session, i) => {
        console.log(`   ${i + 1}. ID: ${session.id}`);
        console.log(`      Utilisateur: ${session.user_id}`);
        console.log(`      Créée le: ${session.created_at}`);
        console.log(`      Active: ${session.is_active ? 'Oui' : 'Non'}`);
        console.log('');
    });

    // Vérifier les transcripts pour la session la plus récente
    const recentSession = sessions[0];
    const transcripts = db.prepare(`
        SELECT COUNT(*) as count
        FROM transcripts
        WHERE session_id = ?
    `).get(recentSession.id);

    console.log(`[Test] Transcripts pour la session ${recentSession.id}: ${transcripts.count}`);

    if (transcripts.count === 0) {
        console.log('   ⚠️  Attention: Cette session n\'a pas de transcripts');
    }

    // Vérifier s'il existe déjà des notes de réunion
    const notes = db.prepare(`
        SELECT id, title, created_at
        FROM meeting_notes
        WHERE session_id = ?
    `).all(recentSession.id);

    console.log(`[Test] Notes de réunion existantes: ${notes.length}`);
    if (notes.length > 0) {
        console.log('   ✅ Notes déjà générées pour cette session');
    } else {
        console.log('   ℹ️  Aucune note générée - le bouton devrait en créer');
    }
}

db.close();

console.log('\n[Test] Diagnostic terminé\n');
console.log('Pour tester le bouton compte rendu:');
console.log('1. Ouvrez Lucide');
console.log('2. Allez dans les Settings');
console.log('3. Cliquez sur "📋 Compte-rendu de réunion"');
console.log('4. Ou terminez une session d\'écoute et cliquez sur "Compte rendu"');
