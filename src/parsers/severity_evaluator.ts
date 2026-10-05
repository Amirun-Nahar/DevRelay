/**
 * Severity Evaluator & Evidence-Based Reasoning Engine
 * DevRelay Skill Engine
 * 
 * Maps extracted diagnostic entities against strict operational criteria (P0 - P3),
 * calculates standard response SLAs, and builds transparent line-by-line reasoning.
 */

import { EmailMessage, ExtractedData, SeverityLevel, EscalationRecommendation } from '../types.js';

export interface SeverityEvaluationResult {
  severity: SeverityLevel;
  sla_window: string;
  reasoning: string;
  escalation: EscalationRecommendation;
}

export function evaluateSeverity(email: EmailMessage, extracted: ExtractedData): SeverityEvaluationResult {
  const combinedText = `${email.subject} ${email.body}`.toLowerCase();
  const endpoint = (extracted.affected_endpoint || '').toLowerCase();
  const errorCode = (extracted.error_code || '').toLowerCase();
  const env = extracted.environment;

  // Evidence reasoning steps
  const reasoningSteps: string[] = [];

  // Critical keywords indicating P0 global blackout / data loss
  const isGlobalDowntime = /\b(global outage|complete outage|everything is down|all endpoints failing|multi-tenant|data loss|data corruption|all customers affected|system wide blackout)\b/i.test(combinedText);

  // Critical core business endpoints (Payment, Auth, Ingestion)
  const isCoreEndpoint = 
    endpoint.includes('/charge') || 
    endpoint.includes('/checkout') || 
    endpoint.includes('/auth') || 
    endpoint.includes('/token') || 
    endpoint.includes('/payments') || 
    endpoint.includes('/v1/events') ||
    combinedText.includes('unable to process payments') ||
    combinedText.includes('blocking all user transactions') ||
    combinedText.includes('production ingestion pipeline');

  // Server error indicators
  const is5xx = errorCode.includes('500') || errorCode.includes('502') || errorCode.includes('503') || errorCode.includes('504');

  // Rate limits or minor error indicators
  const isRateLimitOrMinor = errorCode.includes('429') || combinedText.includes('rate limit') || combinedText.includes('workaround');

  // Low severity indicators
  const isDocOrTypoOrFeature = 
    combinedText.includes('typo') || 
    combinedText.includes('documentation') || 
    combinedText.includes('feature request') || 
    combinedText.includes('cosmetic') || 
    combinedText.includes('enhancement') ||
    combinedText.includes('suggestion') ||
    (email.subject.toLowerCase().includes('docs') && !is5xx);

  // 1. Evaluate P0 - Critical
  if (isGlobalDowntime || (env === 'Production' && combinedText.includes('data corruption'))) {
    reasoningSteps.push('1. System-wide / Multi-tenant outage or data corruption reported.');
    reasoningSteps.push(`2. Environment identified as: ${env}.`);
    reasoningSteps.push('3. Impact: Catastrophic availability loss affecting all tenant workloads.');
    reasoningSteps.push('4. Criterion: Global downtime with no workaround matches P0 threshold.');

    return {
      severity: 'P0',
      sla_window: '< 15 Minutes',
      reasoning: reasoningSteps.join(' '),
      escalation: {
        target_channel: '#eng-oncall',
        action_type: 'PAGERDUTY_ALERT',
        urgency: 'CRITICAL',
        recommended_role: 'Site Reliability Engineering (SRE) On-Call'
      }
    };
  }

  // 2. Evaluate P1 - High
  if ((isCoreEndpoint && is5xx) || (env === 'Production' && (isCoreEndpoint || combinedText.includes('blocking all') || combinedText.includes('total outage for production')))) {
    reasoningSteps.push(`1. Production impact detected on core workflow (${extracted.affected_endpoint || 'Core API'}).`);
    reasoningSteps.push(`2. Error identifier: ${extracted.error_code || 'Critical Failure'} reported in ${env} environment.`);
    reasoningSteps.push('3. Customer reports transaction blockage with immediate business revenue or operational degradation.');
    reasoningSteps.push('4. Rated P1 because core endpoint is failing in production with no immediate workaround, while overarching platform infrastructure remains reachable.');

    // Route payments to payment team, else eng oncall
    const target = endpoint.includes('checkout') || endpoint.includes('charge') || endpoint.includes('payment')
      ? '#eng-payments-oncall'
      : '#eng-oncall';

    return {
      severity: 'P1',
      sla_window: '< 30 Minutes',
      reasoning: reasoningSteps.join(' '),
      escalation: {
        target_channel: target,
        action_type: 'SLACK_NOTIFICATION',
        urgency: 'HIGH',
        recommended_role: 'Primary On-Call Service Engineer'
      }
    };
  }

  // 3. Evaluate P3 - Low
  if (isDocOrTypoOrFeature || (!is5xx && !isCoreEndpoint && (combinedText.includes('question') || combinedText.includes('how to')))) {
    reasoningSteps.push('1. Detected documentation typo, SDK inquiry, or non-blocking feature request.');
    reasoningSteps.push('2. Zero production service downtime or runtime business disruption reported.');
    reasoningSteps.push('3. Criterion: Low operational urgency with standard resolution window.');

    return {
      severity: 'P3',
      sla_window: '< 24 Hours',
      reasoning: reasoningSteps.join(' '),
      escalation: {
        target_channel: '#devrel-inbox',
        action_type: 'GITHUB_ISSUE',
        urgency: 'LOW',
        recommended_role: 'Developer Relations / SDK Maintainer'
      }
    };
  }

  // 4. Evaluate P2 - Medium (Default for other technical issues, staging bugs, rate limits, non-critical endpoints)
  if (env === 'Staging' || env === 'Sandbox' || isRateLimitOrMinor || is5xx || extracted.affected_endpoint) {
    reasoningSteps.push(`1. Technical issue reported on endpoint: ${extracted.affected_endpoint || 'Service Endpoint'}.`);
    reasoningSteps.push(`2. Environment: ${env}. Workaround available or issue confined to non-critical path/pre-production.`);
    reasoningSteps.push('3. Criterion: Non-critical feature broken or rate-limiting misconfiguration under P2 threshold.');

    return {
      severity: 'P2',
      sla_window: '< 4 Hours',
      reasoning: reasoningSteps.join(' '),
      escalation: {
        target_channel: '#devrel-tier2',
        action_type: 'SLACK_NOTIFICATION',
        urgency: 'MEDIUM',
        recommended_role: 'Tier-2 Technical Support Engineer'
      }
    };
  }

  // Fallback to P3 if context is minimal
  return {
    severity: 'P3',
    sla_window: '< 24 Hours',
    reasoning: 'Minimal technical telemetry provided. Defaulted to P3 triage tier pending human operator verification.',
    escalation: {
      target_channel: '#devrel-inbox',
      action_type: 'JIRA_TICKET',
      urgency: 'LOW',
      recommended_role: 'Triage Analyst'
    }
  };
}
