#!/usr/bin/env node
/**
 * DevRelay CLI Test Runner
 * 
 * Usage:
 *   node scripts/send_test_email.js --fixture=critical_payment_failure.json
 *   node scripts/send_test_email.js --fixture=p0_outage.json --approve
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let DevRelaySkill;
const distPath = path.resolve(__dirname, '../dist/src/index.js');
if (fs.existsSync(distPath)) {
  const mod = await import('../dist/src/index.js');
  DevRelaySkill = mod.DevRelaySkill;
} else {
  const mod = await import('../src/index.js');
  DevRelaySkill = mod.DevRelaySkill;
}

async function main() {
  const args = process.argv.slice(2);
  let fixtureName = 'critical_payment_failure.json';
  let autoApprove = false;

  for (const arg of args) {
    if (arg.startsWith('--fixture=')) {
      fixtureName = arg.replace('--fixture=', '');
    } else if (arg === '--approve') {
      autoApprove = true;
    }
  }

  // Resolve fixture path
  let fixturePath = path.resolve(__dirname, '../examples/sample_emails', fixtureName);
  if (!fs.existsSync(fixturePath)) {
    // try if direct path
    if (fs.existsSync(fixtureName)) {
      fixturePath = path.resolve(fixtureName);
    } else {
      console.error(`❌ Fixture file not found: ${fixtureName} (checked ${fixturePath})`);
      process.exit(1);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🚀 DEVRELAY: Mermail Incident Relay Agent Skill CLI`);
  console.log(`======================================================`);
  console.log(`📂 Loading email fixture: ${path.basename(fixturePath)}`);

  const rawJson = fs.readFileSync(fixturePath, 'utf-8');
  const email = JSON.parse(rawJson);

  console.log(`📧 Inbound Email Metadata:`);
  console.log(`   From:    ${email.from}`);
  console.log(`   Subject: ${email.subject}`);
  console.log(`   Time:    ${email.timestamp}`);
  console.log(`------------------------------------------------------`);

  const skill = new DevRelaySkill();
  console.log(`⚡ Analyzing message with DevRelay Dual-Filter Engine...`);
  const result = await skill.processEmail(email);

  if (!result.is_incident) {
    console.log(`\n🚫 STATUS: IGNORED`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   No incident created. Zero internal alerts emitted.\n`);
    return;
  }

  console.log(`\n✅ INCIDENT DETECTED & STRUCTURED:`);
  console.log(`   Incident ID:      ${result.incident_id}`);
  console.log(`   Severity:         ${result.severity} (SLA: ${result.sla_window})`);
  console.log(`   Status:           ${result.status}`);
  console.log(`   Affected Target:  ${result.extracted_data.affected_endpoint || 'None'}`);
  console.log(`   Error Identifier: ${result.extracted_data.error_code || 'None'}`);
  console.log(`   Trace ID:         ${result.extracted_data.trace_id || 'None'}`);
  console.log(`   Environment:      ${result.extracted_data.environment}`);
  console.log(`   SDK Version:      ${result.extracted_data.sdk_version || 'None'}`);
  console.log(`\n🔍 Evidence-Based Reasoning Chain:`);
  console.log(`   ${result.reasoning}`);

  console.log(`\n📋 Escalation Recommendation:`);
  console.log(`   Target Channel:   ${result.escalation_recommendation?.target_channel}`);
  console.log(`   Action Type:      ${result.escalation_recommendation?.action_type}`);
  console.log(`   Urgency:          ${result.escalation_recommendation?.urgency}`);

  console.log(`\n📝 Customer Reply Draft:`);
  console.log(`------------------------------------------------------`);
  console.log(result.customer_reply_draft);
  console.log(`------------------------------------------------------`);

  console.log(`\n🔒 HUMAN APPROVAL GATE:`);
  console.log(`   Approval Status:  ${result.approval_status}`);
  console.log(`   Safety Guarantee: Execution is halted. No webhook or email sent without human approval.`);

  if (autoApprove) {
    console.log(`\n⚡ Simulating Human Operator Approval via CLI (--approve flag active)...`);
    const report = await skill.approveAndExecute(result.incident_id, {
      operatorName: 'CLI Operator (Alex SRE)'
    });
    console.log(`\n🎉 ACTIONS EXECUTED:`);
    console.log(`   Executed At:      ${report.executed_at}`);
    console.log(`   Email Sent:       ${report.email_sent} (Receipt: ${report.customer_receipt_id})`);
    console.log(`   Slack Delivered:  ${report.slack_delivered} (Channel: ${report.slack_channel})`);
    console.log(`   PagerDuty Paged:  ${report.pagerduty_triggered} (Dedup: ${report.pagerduty_dedup_key || 'N/A'})`);
    console.log(`\n📜 Execution Delivery Logs:`);
    for (const log of report.delivery_logs) {
      console.log(`   [${log.status}] ${log.step} -> ${log.details}`);
    }
  } else {
    console.log(`\n💡 To approve this action and execute webhooks, pass the '--approve' flag:`);
    console.log(`   node scripts/send_test_email.js --fixture=${path.basename(fixturePath)} --approve\n`);
  }
}

main().catch(err => {
  console.error(`❌ Execution Error:`, err);
  process.exit(1);
});
