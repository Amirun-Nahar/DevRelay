/**
 * Test 2 & 3: Severity Classification & Evidence-Based Reasoning
 * DevRelay Test Suite
 */

import { DevRelaySkill } from '../src/index.js';
import { EmailMessage } from '../src/types.js';

export async function runSeverityTests() {
  console.log(`\n🧪 [TEST 2 & 3] Severity Classification & Evidence-Based Reasoning`);
  const skill = new DevRelaySkill();

  // Scenario 1: P0 Complete Global Outage (Test 2)
  const p0Email: EmailMessage = {
    id: 'test_p0_01',
    from: 'sre.lead@megacorp.com',
    to: 'support@mermail.com',
    subject: 'EMERGENCY: Complete Global Outage across all API regions and data loss',
    body: 'Complete outage affecting all users and regions. Multi-tenant failure across all production clusters. Trace ID: tr_outage_001.',
    timestamp: new Date().toISOString()
  };

  const p0Result = await skill.processEmail(p0Email);
  if (p0Result.is_incident && p0Result.severity === 'P0') {
    console.log(`  ✅ P0 Critical Outage accurately classified (SLA: ${p0Result.sla_window})`);
    console.log(`     Target Channel: ${p0Result.escalation_recommendation?.target_channel} (${p0Result.escalation_recommendation?.action_type})`);
    console.log(`     Evidence Reasoning: ${p0Result.reasoning.substring(0, 80)}...`);
  } else {
    throw new Error(`Test 2 Failed: Expected P0 severity, got ${p0Result.is_incident ? p0Result.severity : 'IGNORED'}`);
  }

  // Scenario 2: P1 Core Endpoint Production Failure (Test 2)
  const p1Email: EmailMessage = {
    id: 'test_p1_01',
    from: 'alex.dev@enterpriseapp.io',
    to: 'support@mermail.com',
    subject: 'CRITICAL: API returning 500 on /v1/checkout/charge',
    body: 'Our production app is completely unable to process payments. We are receiving 500 Internal Server Error responses on every call to POST https://api.service.com/v1/checkout/charge. Trace ID: tr_99214_prod. SDK: mermail-node-v3.4.1. This is blocking all user transactions.',
    timestamp: new Date().toISOString()
  };

  const p1Result = await skill.processEmail(p1Email);
  if (p1Result.is_incident && p1Result.severity === 'P1') {
    console.log(`  ✅ P1 Core Payment Failure accurately classified (SLA: ${p1Result.sla_window})`);
    console.log(`     Extracted Endpoint: ${p1Result.extracted_data.affected_endpoint}`);
    console.log(`     Extracted Trace: ${p1Result.extracted_data.trace_id}`);
    console.log(`     Target Channel: ${p1Result.escalation_recommendation?.target_channel}`);
  } else {
    throw new Error(`Test 2 Failed: Expected P1 severity, got ${p1Result.is_incident ? p1Result.severity : 'IGNORED'}`);
  }

  // Scenario 3: P2 Staging Rate-Limit with Workaround (Test 3)
  const p2Email: EmailMessage = {
    id: 'test_p2_01',
    from: 'tester@dev.org',
    to: 'support@mermail.com',
    subject: 'Unexpected 429 Too Many Requests in Staging Sandbox environment',
    body: 'We are getting HTTP 429 in Staging sandbox on /v2/analytics. We enabled local caching workaround, but rate quota seems misconfigured. Request ID: req_stg_123.',
    timestamp: new Date().toISOString()
  };

  const p2Result = await skill.processEmail(p2Email);
  if (p2Result.is_incident && p2Result.severity === 'P2') {
    console.log(`  ✅ P2 Medium issue with workaround classified (SLA: ${p2Result.sla_window})`);
    console.log(`     Target Channel: ${p2Result.escalation_recommendation?.target_channel}`);
  } else {
    throw new Error(`Test 3 Failed: Expected P2 severity, got ${p2Result.is_incident ? p2Result.severity : 'IGNORED'}`);
  }

  // Scenario 4: P3 Documentation Typo / Minor SDK Query (Test 3)
  const p3Email: EmailMessage = {
    id: 'test_p3_01',
    from: 'dev@studio.co',
    to: 'support@mermail.com',
    subject: 'Minor typo in mermail-python docs & feature suggestion',
    body: 'Found a small typo in documentation for mermail-python. Would also love async batch helper in future releases.',
    timestamp: new Date().toISOString()
  };

  const p3Result = await skill.processEmail(p3Email);
  if (p3Result.is_incident && p3Result.severity === 'P3') {
    console.log(`  ✅ P3 Low severity query classified (SLA: ${p3Result.sla_window})`);
    console.log(`     Action Type: ${p3Result.escalation_recommendation?.action_type} (Non-urgent route)`);
  } else {
    throw new Error(`Test 3 Failed: Expected P3 severity, got ${p3Result.is_incident ? p3Result.severity : 'IGNORED'}`);
  }

  return true;
}
