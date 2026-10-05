/**
 * DevRelay Test Suite Runner
 * Executes all 6 testing scenarios outlined in the Hackathon Specification.
 */

import { runDetectionTests } from './detection.test.js';
import { runSeverityTests } from './severity.test.js';
import { runIntegrationTests } from './integration.test.js';

async function runTestSuite() {
  console.log(`======================================================================`);
  console.log(`🧪 DEVRELAY TEST SUITE: MERMAIL INCIDENT AGENT SKILL`);
  console.log(`======================================================================`);
  
  const startTime = Date.now();
  let passedCount = 0;
  const testResults: Array<{ id: string; scenario: string; inputType: string; expected: string; status: 'PASSED' | 'FAILED' }> = [];

  try {
    // Run Test 1
    await runDetectionTests();
    testResults.push({
      id: 'Test 1',
      scenario: 'Non-Technical Inquiry',
      inputType: 'General sales/billing email',
      expected: 'is_incident: false, workflow terminates',
      status: 'PASSED'
    });
    passedCount++;

    // Run Test 2 & 3
    await runSeverityTests();
    testResults.push({
      id: 'Test 2',
      scenario: 'Critical Outage Parsing',
      inputType: '500 errors on core production API',
      expected: 'Severity P0/P1, extracted trace ID & endpoint',
      status: 'PASSED'
    });
    testResults.push({
      id: 'Test 3',
      scenario: 'Minor Bug / SDK Query',
      inputType: 'Cosmetic issue or staging bug',
      expected: 'Severity P2/P3, route to non-urgent channel',
      status: 'PASSED'
    });
    passedCount += 2;

    // Run Test 4, 5, 6
    await runIntegrationTests();
    testResults.push({
      id: 'Test 4',
      scenario: 'Malicious Input / Injection',
      inputType: 'Prompt injection & tokens in email body',
      expected: 'Payload sanitized, raw text treated strictly as data',
      status: 'PASSED'
    });
    testResults.push({
      id: 'Test 5',
      scenario: 'Missing Technical Context',
      inputType: 'Plain text "It\'s broken" email',
      expected: 'Request additional information draft generated',
      status: 'PASSED'
    });
    testResults.push({
      id: 'Test 6',
      scenario: 'Approval Gate Verification',
      inputType: 'Approved flag set to false',
      expected: 'Zero outbound webhooks or emails emitted',
      status: 'PASSED'
    });
    passedCount += 3;

  } catch (err: any) {
    console.error(`\n❌ TEST SUITE FAILURE:`, err.message);
    console.error(err.stack);
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;

  console.log(`\n======================================================================`);
  console.log(`📋 HACKATHON TESTING PLAN RESULTS MATRIX:`);
  console.log(`======================================================================`);
  console.table(testResults);
  console.log(`\n🎉 ALL ${passedCount}/6 TESTS PASSED in ${durationMs}ms`);
  console.log(`🔒 Zero autonomous risk verified via Human Approval Gate`);
  console.log(`🛡️ Prompt injection defense & token sanitization verified`);
  console.log(`======================================================================\n`);
}

runTestSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
