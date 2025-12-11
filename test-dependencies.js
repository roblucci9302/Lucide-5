#!/usr/bin/env node
/**
 * Test script to verify critical dependencies work correctly
 */

console.log('=== Test des dépendances critiques ===\n');

// Test 1: tesseract.js
console.log('1. Test tesseract.js...');
try {
    const { createWorker } = require('tesseract.js');
    console.log('   ✓ tesseract.js import OK');
    console.log('   Note: createWorker est disponible (test complet nécessite image)');
} catch (error) {
    console.log('   ✗ tesseract.js ERROR:', error.message);
}

// Test 2: pdf-parse
console.log('\n2. Test pdf-parse...');
try {
    const pdfParse = require('pdf-parse');
    console.log('   ✓ pdf-parse import OK');
} catch (error) {
    console.log('   ✗ pdf-parse ERROR:', error.message);
}

// Test 3: mammoth (DOCX)
console.log('\n3. Test mammoth...');
try {
    const mammoth = require('mammoth');
    console.log('   ✓ mammoth import OK');
} catch (error) {
    console.log('   ✗ mammoth ERROR:', error.message);
}

// Test 4: pdfkit
console.log('\n4. Test pdfkit...');
try {
    const PDFDocument = require('pdfkit');
    console.log('   ✓ pdfkit import OK');
} catch (error) {
    console.log('   ✗ pdfkit ERROR:', error.message);
}

// Test 5: docx
console.log('\n5. Test docx...');
try {
    const { Document, Packer } = require('docx');
    console.log('   ✓ docx import OK');
} catch (error) {
    console.log('   ✗ docx ERROR:', error.message);
}

// Test 6: better-sqlite3
console.log('\n6. Test better-sqlite3...');
try {
    const Database = require('better-sqlite3');
    // Try to create in-memory database
    const db = new Database(':memory:');
    db.close();
    console.log('   ✓ better-sqlite3 fonctionne (test in-memory OK)');
} catch (error) {
    console.log('   ✗ better-sqlite3 ERROR:', error.message);
}

// Test 7: sharp
console.log('\n7. Test sharp...');
try {
    const sharp = require('sharp');
    console.log('   ✓ sharp import OK');
} catch (error) {
    console.log('   ✗ sharp ERROR:', error.message);
}

// Test 8: marked
console.log('\n8. Test marked...');
try {
    const { marked } = require('marked');
    console.log('   ✓ marked import OK');
} catch (error) {
    console.log('   ✗ marked ERROR:', error.message);
}

console.log('\n=== Résumé ===');
console.log('Si tous les tests montrent ✓, les dépendances sont prêtes !');
console.log('Les modules natifs (better-sqlite3, sharp) utilisent des binaires précompilés.\n');
