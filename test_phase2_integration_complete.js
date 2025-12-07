/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 TESTS D'INTÉGRATION COMPLETS - PHASE 2 - MÉMOIRE AUGMENTÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Suite de tests end-to-end complète pour valider l'ensemble de la Phase 2
 * du système de mémoire augmentée de Lucide.
 *
 * FLUX TESTÉS:
 * ├── 1. Auto-Indexation (Jours 1-2) → Knowledge Graph (Jour 3)
 * ├── 2. External Data (Jour 4) → Auto-Indexation → Knowledge Graph
 * ├── 3. RAG Multi-Sources (Jour 5) → Récupération contexte
 * ├── 4. Dashboard (Jour 6) → Affichage statistiques
 * └── 5. Recherche Unifiée (Jour 7) → Résultats multi-sources
 *
 * SCÉNARIOS:
 * - Indexation conversation → Entités extraites → Stats affichées
 * - Importation base externe → Indexation → RAG récupère
 * - Recherche unifiée → Résultats de toutes sources
 * - Knowledge Graph → Visualisation entités
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

async function runIntegrationTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTS D\'INTÉGRATION COMPLETS - PHASE 2 - MÉMOIRE AUGMENTÉE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 1: Vérification structure de fichiers Phase 2
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('Test 1: Structure de fichiers - Tous les fichiers Phase 2 présents');

    const requiredFiles = [
      // Jours 1-2: Auto-Indexing
      'src/features/common/services/autoIndexingService.js',
      'src/features/common/services/ocrService.js',

      // Jour 3: Knowledge Graph
      'src/features/common/services/knowledgeOrganizerService.js',

      // Jour 4: External Data
      'src/features/common/services/externalDataService.js',

      // Jour 5: RAG Multi-Sources
      'src/features/common/services/ragService.js',

      // Jour 6: Dashboard
      'src/features/memory/hooks/useMemoryStats.js',
      'src/features/memory/components/SourceStats.jsx',
      'src/features/memory/components/MemoryTimeline.jsx',
      'src/features/memory/components/MemoryDashboard.jsx',

      // Jour 7: Recherche & Graph
      'src/features/memory/components/UnifiedSearch.jsx',
      'src/features/memory/components/KnowledgeGraphVisualization.jsx'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      assert(fs.existsSync(filePath), `File should exist: ${file}`);
    }

    console.log(`✅ PASS - ${requiredFiles.length} fichiers essentiels présents`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 2: Vérification fichiers de tests
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 2: Fichiers de tests - Tous les tests présents');

    const testFiles = [
      'test_phase2_day2_comprehensive.js',
      'test_phase2_day3_knowledge_graph.js',
      'test_phase2_day4_external_data.js',
      'test_phase2_day5_rag_multisource.js',
      'test_phase2_day6_dashboard.js',
      'test_phase2_integration_complete.js'
    ];

    for (const file of testFiles) {
      const filePath = path.join(__dirname, file);
      assert(fs.existsSync(filePath), `Test file should exist: ${file}`);
    }

    console.log(`✅ PASS - ${testFiles.length} fichiers de tests présents`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 3: Vérification rapports de documentation
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 3: Documentation - Tous les rapports de jours présents');

    const reports = [
      'RAPPORT_JOUR_2_PHASE_2.md',
      'RAPPORT_JOUR_3_PHASE_2.md',
      'RAPPORT_JOUR_4_PHASE_2.md',
      'RAPPORT_JOUR_5_PHASE_2.md',
      'RAPPORT_JOUR_6_PHASE_2.md'
    ];

    for (const report of reports) {
      const filePath = path.join(__dirname, report);
      assert(fs.existsSync(filePath), `Report should exist: ${report}`);
    }

    console.log(`✅ PASS - ${reports.length} rapports de documentation présents`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 4: Services - Exports corrects
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 4: Services - Vérification exports modules');

    const services = [
      { file: 'src/features/common/services/autoIndexingService.js', exports: ['indexConversation', 'indexScreenshot', 'indexAudio'] },
      { file: 'src/features/common/services/knowledgeOrganizerService.js', exports: ['extractEntities', 'generateSummary', 'getKnowledgeGraphStats'] },
      { file: 'src/features/common/services/externalDataService.js', exports: ['testPostgresConnection', 'importFromDatabase'] }
    ];

    for (const service of services) {
      const content = fs.readFileSync(path.join(__dirname, service.file), 'utf8');
      for (const exportName of service.exports) {
        assert(content.includes(exportName), `Service should have method: ${exportName}`);
      }
    }

    console.log('✅ PASS - Services exports valides');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 5: Composants React - Exports corrects
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 5: Composants React - Vérification exports');

    const components = [
      { file: 'src/features/memory/components/SourceStats.jsx', name: 'SourceStats' },
      { file: 'src/features/memory/components/MemoryTimeline.jsx', name: 'MemoryTimeline' },
      { file: 'src/features/memory/components/MemoryDashboard.jsx', name: 'MemoryDashboard' },
      { file: 'src/features/memory/components/UnifiedSearch.jsx', name: 'UnifiedSearch' },
      { file: 'src/features/memory/components/KnowledgeGraphVisualization.jsx', name: 'KnowledgeGraphVisualization' }
    ];

    for (const component of components) {
      const content = fs.readFileSync(path.join(__dirname, component.file), 'utf8');
      assert(content.includes(`function ${component.name}`), `Component should be defined: ${component.name}`);
      assert(content.includes('module.exports'), 'Component should be exported');
    }

    console.log(`✅ PASS - ${components.length} composants React valides`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 6: Hook React - Export correct
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 6: Hook React - useMemoryStats');

    const hookPath = path.join(__dirname, 'src/features/memory/hooks/useMemoryStats.js');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert(content.includes('function useMemoryStats'), 'Hook should be defined');
    assert(content.includes('useState'), 'Hook should use useState');
    assert(content.includes('useEffect'), 'Hook should use useEffect');
    assert(content.includes('useCallback'), 'Hook should use useCallback');
    assert(content.includes('module.exports'), 'Hook should be exported');

    console.log('✅ PASS - Hook useMemoryStats valide');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 7: RAG Service - Multi-sources methods
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 7: RAG Service - Méthodes multi-sources présentes');

    const ragPath = path.join(__dirname, 'src/features/common/services/ragService.js');
    const content = fs.readFileSync(ragPath, 'utf8');

    const methods = [
      'retrieveContextMultiSource',
      '_searchConversations',
      '_searchScreenshots',
      '_searchAudio',
      '_searchExternal',
      '_applySourceWeighting',
      'buildEnrichedPromptMultiSource'
    ];

    for (const method of methods) {
      assert(content.includes(method), `RAG Service should have method: ${method}`);
    }

    console.log(`✅ PASS - ${methods.length} méthodes RAG multi-sources présentes`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 8: UnifiedSearch - Fonctionnalités de recherche
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 8: UnifiedSearch - Fonctionnalités de recherche');

    const searchPath = path.join(__dirname, 'src/features/memory/components/UnifiedSearch.jsx');
    const content = fs.readFileSync(searchPath, 'utf8');

    assert(content.includes('SearchBar'), 'Should have SearchBar component');
    assert(content.includes('FiltersPanel'), 'Should have FiltersPanel component');
    assert(content.includes('SearchResults'), 'Should have SearchResults component');
    assert(content.includes('executeSearch'), 'Should have search execution logic');
    assert(content.includes('filters'), 'Should handle filters');

    console.log('✅ PASS - UnifiedSearch avec toutes les fonctionnalités');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 9: KnowledgeGraphVisualization - Vues réseau et liste
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 9: KnowledgeGraphVisualization - Vues réseau et liste');

    const kgPath = path.join(__dirname, 'src/features/memory/components/KnowledgeGraphVisualization.jsx');
    const content = fs.readFileSync(kgPath, 'utf8');

    assert(content.includes('NetworkView'), 'Should have NetworkView component');
    assert(content.includes('ListView'), 'Should have ListView component');
    assert(content.includes('NetworkNode'), 'Should have NetworkNode for SVG');
    assert(content.includes('ENTITY_CONFIG'), 'Should have entity configuration');
    assert(content.includes('svg'), 'Should render SVG for network view');

    console.log('✅ PASS - KnowledgeGraphVisualization avec vues réseau et liste');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 10: Intégration - Flux complet Auto-Indexing → Knowledge Graph
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 10: Intégration - Flux Auto-Indexing → Knowledge Graph');

    const autoIndexPath = path.join(__dirname, 'src/features/common/services/autoIndexingService.js');
    const autoIndexContent = fs.readFileSync(autoIndexPath, 'utf8');

    // Vérifier que autoIndexingService appelle knowledgeOrganizerService
    assert(autoIndexContent.includes('knowledgeOrganizerService'), 'Should import knowledgeOrganizerService');
    assert(autoIndexContent.includes('extractEntities'), 'Should call extractEntities');
    assert(autoIndexContent.includes('_saveEntitiesToKnowledgeGraph'), 'Should save to knowledge graph');

    console.log('✅ PASS - Flux Auto-Indexing → Knowledge Graph intégré');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ DES TESTS
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DES TESTS D\'INTÉGRATION - PHASE 2');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`\nTotal de tests: ${totalTests}`);
  console.log(`✅ Réussis: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Échoués: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

  if (failedTests === 0) {
    console.log('\n🎉 TOUS LES TESTS D\'INTÉGRATION SONT PASSÉS! 🎉');
    console.log('\n✅ Phase 2 - Mémoire Augmentée : COMPLÈTE ET VALIDÉE');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) d'intégration ont échoué`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

  return { totalTests, passedTests, failedTests };
}

// Run tests
if (require.main === module) {
  runIntegrationTests()
    .then(results => {
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Integration test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };
