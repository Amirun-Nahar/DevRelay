/**
 * Test 1: Technical Email Detection & Non-Technical Inquiry Filtering
 * DevRelay Test Suite
 */

import { DevRelaySkill } from '../src/index.js';
import { EmailMessage } from '../src/types.js';

export async function runDetectionTests() {
  console.log(`\n🧪 [TEST 1] Technical Email Detection & Dual-Filter Engine`);
  const skill = new DevRelaySkill();

  // Scenario 1: Sales / Billing Email
  const billingEmail: EmailMessage = {
    id: 'test_billing_01',
    from: 'billing@clientcorp.com',
    to: 'support@mermail.com',
    subject: 'Question about Q3 Invoice and Seat Pricing Renewal',
    body: 'Hi, Can you please send an updated invoice and pricing sheet for our contract renewal? We need pricing for 50 additional seats. Thanks!',
    timestamp: new Date().toISOString()
  };

  const billingResult = await skill.processEmail(billingEmail);
  if (!billingResult.is_incident) {
    console.log(`  ✅ Non-technical billing email correctly ignored (is_incident: false)`);
    console.log(`     Reason: "${billingResult.reason}"`);
  } else {
    throw new Error(`Test 1 Failed: Expected non-technical email to be ignored, got incident: ${JSON.stringify(billingResult)}`);
  }

  // Scenario 2: General Marketing / Sales Demo
  const marketingEmail: EmailMessage = {
    id: 'test_marketing_02',
    from: 'sales.lead@partner.io',
    to: 'hello@mermail.com',
    subject: 'Partnership inquiry and reseller agreement demo',
    body: 'We would love to set up a sales demo to discuss reseller agreements for next quarter.',
    timestamp: new Date().toISOString()
  };

  const marketingResult = await skill.processEmail(marketingEmail);
  if (!marketingResult.is_incident) {
    console.log(`  ✅ Marketing/sales partnership email correctly ignored`);
  } else {
    throw new Error(`Test 1 Failed: Expected marketing email to be ignored`);
  }

  // Scenario 3: Legitimate Technical Incident
  const techEmail: EmailMessage = {
    id: 'test_tech_01',
    from: 'dev@app.com',
    to: 'support@mermail.com',
    subject: '500 error when calling POST /v1/checkout/charge',
    body: 'Our checkout endpoint is returning 500 Internal Server Error. Trace ID: tr_89123.',
    timestamp: new Date().toISOString()
  };

  const techResult = await skill.processEmail(techEmail);
  if (techResult.is_incident && techResult.status === 'PARSED') {
    console.log(`  ✅ Technical API incident correctly detected and parsed`);
    console.log(`     Assigned Incident ID: ${techResult.incident_id}`);
  } else {
    throw new Error(`Test 1 Failed: Expected technical email to be detected`);
  }

  return true;
}
