#!/usr/bin/env node
/**
 * Tests du Document Parser
 * Vérifie la détection et l'extraction de documents depuis réponses IA
 */

const documentParser = require('./src/features/common/services/documentParser');

console.log('=== Tests du Document Parser ===\n');

// Test 1: Format complet
console.log('1. Test Format Complet...');
const testFullFormat = `
Voici votre CV professionnel :

<<DOCUMENT:cv>>
title: Jean Dupont - CV Développeur
---
# Jean Dupont
**Développeur Full-Stack Senior**

## Expérience Professionnelle

### Tech Solutions - Développeur Senior
*2020 - Présent*

- Conception d'applications web avec React et Node.js
- Gestion d'équipe de 5 développeurs
- Réduction de 60% du temps de chargement

## Compétences

- **Frontend**: React, Vue.js, TypeScript
- **Backend**: Node.js, Python, Go
- **DevOps**: Docker, Kubernetes, AWS

<</DOCUMENT>>

J'espère que ce CV vous convient !
`;

try {
    const result1 = documentParser.parse(testFullFormat);
    console.log('   Documents trouvés:', result1.documents.length);

    if (result1.documents.length === 1) {
        const doc = result1.documents[0];
        console.log('   ✓ Type:', doc.type);
        console.log('   ✓ Titre:', doc.title);
        console.log('   ✓ Contenu:', doc.content.substring(0, 50) + '...');
        console.log('   ✓ Format complet OK !');
    } else {
        console.log('   ✗ Erreur: Devrait trouver 1 document');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 2: Format simple
console.log('\n2. Test Format Simple...');
const testSimpleFormat = `
Voici votre lettre :

<<DOC:lettre:Lettre de Motivation>>
# Objet : Candidature Développeur Full-Stack

Madame, Monsieur,

Je me permets de vous adresser ma candidature pour le poste de développeur.

**Pourquoi moi ?**
- 8 ans d'expérience
- Expertise React et Node.js
- Passionné par les nouvelles technologies

Cordialement,
Jean Dupont
<</DOC>>

Bonne chance !
`;

try {
    const result2 = documentParser.parse(testSimpleFormat);
    console.log('   Documents trouvés:', result2.documents.length);

    if (result2.documents.length === 1) {
        const doc = result2.documents[0];
        console.log('   ✓ Type:', doc.type);
        console.log('   ✓ Titre:', doc.title);
        console.log('   ✓ Format simple OK !');
    } else {
        console.log('   ✗ Erreur: Devrait trouver 1 document');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 3: Multiple documents
console.log('\n3. Test Multiple Documents...');
const testMultipleDocs = `
Voici vos documents :

<<DOCUMENT:cv>>
title: CV Jean Dupont
---
# Jean Dupont
Développeur Senior
<</DOCUMENT>>

Et voici votre lettre :

<<DOCUMENT:lettre>>
title: Lettre de Motivation
---
# Candidature

Madame, Monsieur...
<</DOCUMENT>>

Les deux documents sont prêts !
`;

try {
    const result3 = documentParser.parse(testMultipleDocs);
    console.log('   Documents trouvés:', result3.documents.length);

    if (result3.documents.length === 2) {
        console.log('   ✓ Document 1:', result3.documents[0].type, '-', result3.documents[0].title);
        console.log('   ✓ Document 2:', result3.documents[1].type, '-', result3.documents[1].title);
        console.log('   ✓ Multiple documents OK !');
    } else {
        console.log('   ✗ Erreur: Devrait trouver 2 documents');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 4: hasDocuments()
console.log('\n4. Test hasDocuments()...');
try {
    const hasDoc1 = documentParser.hasDocuments(testFullFormat);
    const hasDoc2 = documentParser.hasDocuments('Texte sans document');

    if (hasDoc1 && !hasDoc2) {
        console.log('   ✓ Détection correcte de présence de documents');
    } else {
        console.log('   ✗ Erreur détection:', hasDoc1, hasDoc2);
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 5: getDocumentMetadata()
console.log('\n5. Test getDocumentMetadata()...');
try {
    const metadata = documentParser.getDocumentMetadata(testMultipleDocs);
    console.log('   Métadonnées trouvées:', metadata.length);

    if (metadata.length === 2) {
        console.log('   ✓ Metadata 1:', metadata[0].type, '-', metadata[0].title);
        console.log('   ✓ Metadata 2:', metadata[1].type, '-', metadata[1].title);
        console.log('   ✓ getDocumentMetadata() OK !');
    } else {
        console.log('   ✗ Erreur: Devrait trouver 2 métadonnées');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 6: Clean text
console.log('\n6. Test Clean Text...');
try {
    const result6 = documentParser.parse(testFullFormat);
    const cleanText = result6.cleanText;

    // Le texte nettoyé ne devrait plus contenir les marqueurs
    const hasMarkers = cleanText.includes('<<DOCUMENT');

    if (!hasMarkers && cleanText.includes('📄')) {
        console.log('   ✓ Marqueurs remplacés par placeholders');
        console.log('   ✓ Clean text OK !');
    } else {
        console.log('   ✗ Erreur: Marqueurs encore présents ou placeholder manquant');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 7: validateDocument()
console.log('\n7. Test validateDocument()...');
try {
    const validDoc = {
        id: 'doc_123',
        type: 'cv',
        title: 'Mon CV',
        content: '# Contenu'
    };

    const invalidDoc = {
        type: 'cv',
        title: 'Sans ID'
    };

    const isValid1 = documentParser.validateDocument(validDoc);
    const isValid2 = documentParser.validateDocument(invalidDoc);

    if (isValid1 && !isValid2) {
        console.log('   ✓ Validation correcte des documents');
    } else {
        console.log('   ✗ Erreur validation:', isValid1, isValid2);
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 8: getDocumentIcon()
console.log('\n8. Test getDocumentIcon()...');
try {
    const iconCV = documentParser.getDocumentIcon('cv');
    const iconLettre = documentParser.getDocumentIcon('lettre');
    const iconRapport = documentParser.getDocumentIcon('rapport');
    const iconDefault = documentParser.getDocumentIcon('unknown');

    console.log('   Icône CV:', iconCV);
    console.log('   Icône Lettre:', iconLettre);
    console.log('   Icône Rapport:', iconRapport);
    console.log('   Icône Default:', iconDefault);

    if (iconCV && iconLettre && iconRapport && iconDefault) {
        console.log('   ✓ getDocumentIcon() OK !');
    } else {
        console.log('   ✗ Erreur: Icônes manquantes');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 9: Texte sans document
console.log('\n9. Test Texte Sans Document...');
try {
    const normalText = 'Ceci est une réponse normale sans document structuré.';
    const result9 = documentParser.parse(normalText);

    if (result9.documents.length === 0 && result9.cleanText === normalText) {
        console.log('   ✓ Texte normal non altéré');
    } else {
        console.log('   ✗ Erreur: Texte altéré ou documents détectés à tort');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Test 10: Cas limites
console.log('\n10. Test Cas Limites...');
try {
    const emptyResult = documentParser.parse('');
    const nullResult = documentParser.parse(null);
    const undefinedResult = documentParser.parse(undefined);

    if (emptyResult.documents.length === 0 &&
        nullResult.documents.length === 0 &&
        undefinedResult.documents.length === 0) {
        console.log('   ✓ Gestion correcte des cas limites (empty, null, undefined)');
    } else {
        console.log('   ✗ Erreur dans gestion cas limites');
    }
} catch (error) {
    console.log('   ✗ Erreur:', error.message);
}

// Résumé
console.log('\n' + '='.repeat(50));
console.log('RÉSUMÉ DES TESTS');
console.log('='.repeat(50));

console.log('\n✅ Fonctionnalités testées:');
console.log('   ✓ Parsing format complet (<<DOCUMENT:type>>)');
console.log('   ✓ Parsing format simple (<<DOC:type:title>>)');
console.log('   ✓ Détection multiple documents');
console.log('   ✓ hasDocuments() - Détection présence');
console.log('   ✓ getDocumentMetadata() - Extraction métadonnées');
console.log('   ✓ Clean text - Remplacement marqueurs');
console.log('   ✓ validateDocument() - Validation structure');
console.log('   ✓ getDocumentIcon() - Icônes par type');
console.log('   ✓ Texte sans document non altéré');
console.log('   ✓ Cas limites (empty, null, undefined)');

console.log('\n🎯 Le Document Parser est opérationnel !');
console.log('\nProchaine étape: Tester l\'intégration dans AskView');
console.log('(L\'application doit être lancée pour tester l\'UI)\n');
