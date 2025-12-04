/**
 * Phase 2 Master Test Runner
 * Executes all Phase 2 tests and provides comprehensive results
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('PHASE 2 COMPREHENSIVE TEST SUITE');
console.log('Testing: Automation du Follow-up');
console.log('='.repeat(70) + '\n');

const tests = [
    {
        name: 'Phase 2.1 - Participant Attribution',
        file: 'test_phase2.1_participants.js',
        description: 'Speaker detection, assignment, and label replacement'
    },
    {
        name: 'Phase 2.2 - Email Generation',
        file: 'test_phase2.2_email.js',
        description: 'Template and AI-powered email generation'
    },
    {
        name: 'Phase 2.3 - Task Management',
        file: 'test_phase2.3_tasks.js',
        description: 'Advanced task management with reminders and tags'
    },
    {
        name: 'Phase 2.4 - Follow-up Suggestions',
        file: 'test_phase2.4_suggestions.js',
        description: 'Intelligent suggestion generation and execution'
    }
];

const results = {
    totalPassed: 0,
    totalFailed: 0,
    phaseResults: []
};

async function runTest(test) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'▶'.repeat(3)} Running: ${test.name}`);
        console.log(`   ${test.description}`);
        console.log('─'.repeat(70));

        const testPath = path.join(__dirname, test.file);
        const childProcess = spawn('node', [testPath], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..', '..')
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                console.log('─'.repeat(70));
                console.log(`✅ ${test.name} completed\n`);
                resolve({ success: true });
            } else {
                console.log('─'.repeat(70));
                console.log(`⚠️  ${test.name} completed with errors (code: ${code})\n`);
                resolve({ success: false, code });
            }
        });

        childProcess.on('error', (error) => {
            console.error(`❌ Failed to run ${test.name}:`, error);
            reject(error);
        });
    });
}

async function runAllTests() {
    const startTime = Date.now();

    console.log(`Starting test execution at ${new Date().toISOString()}\n`);

    for (const test of tests) {
        try {
            const result = await runTest(test);
            results.phaseResults.push({
                name: test.name,
                success: result.success
            });
        } catch (error) {
            console.error(`Error running ${test.name}:`, error);
            results.phaseResults.push({
                name: test.name,
                success: false,
                error: error.message
            });
        }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 2 TEST SUITE SUMMARY');
    console.log('='.repeat(70));

    results.phaseResults.forEach((result, index) => {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${index + 1}. ${status} - ${result.name}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const totalTests = results.phaseResults.length;
    const passedTests = results.phaseResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log('\n' + '─'.repeat(70));
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${duration}s`);
    console.log('─'.repeat(70));

    if (failedTests === 0) {
        console.log('\n🎉 ALL PHASE 2 TESTS PASSED! 🎉');
        console.log('\nPhase 2 implementation is working correctly.');
        console.log('You can now:');
        console.log('  • Move to Phase 3 (Live Insights)');
        console.log('  • Create a Pull Request for review');
        console.log('  • Test the features in the UI manually');
    } else {
        console.log(`\n⚠️  ${failedTests} test suite(s) failed.`);
        console.log('\nPlease review the errors above and fix any issues.');
    }

    console.log('\n' + '='.repeat(70) + '\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
