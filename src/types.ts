/**
 * DevRelay Type Definitions & Interfaces
 * Mermail Agent Framework Incident Relay Skill
 */

export type SeverityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export type EnvironmentType = 'Production' | 'Staging' | 'Sandbox' | 'Unknown';

export type EscalationActionType = 
  | 'PAGERDUTY_ALERT' 
  | 'SLACK_NOTIFICATION' 
  | 'JIRA_TICKET' 
  | 'GITHUB_ISSUE';

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  headers?: Record<string, string>;
}

export interface ExtractedData {
  affected_endpoint: string | null;
  error_code: string | null;
  trace_id: string | null;
  environment: EnvironmentType;
  sdk_version: string | null;
  http_method?: string | null;
  stack_trace?: string | null;
  detected_indicators: string[];
  sanitized_secrets_detected: string[];
  missing_critical_context: boolean;
}

export interface EscalationRecommendation {
  target_channel: string;
  action_type: EscalationActionType;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_role: string;
}

export interface WalletActionRecord {
  enabled: boolean;
  type: 'SLA_BREACH_CREDIT' | 'BUG_BOUNTY_REWARD' | 'NONE';
  recipient_address: string;
  amount_usdc: number;
  tx_hash?: string;
  network?: string;
  status: 'PENDING' | 'DISPATCHED' | 'SKIPPED';
}

export interface DeliveryLog {
  step: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED' | 'BLOCKED';
  timestamp: string;
  details: string;
}

export interface ExecutionReport {
  incident_id: string;
  executed_at: string;
  operator_approved: boolean;
  operator_name: string;
  email_sent: boolean;
  customer_receipt_id?: string;
  slack_delivered: boolean;
  slack_channel?: string;
  pagerduty_triggered: boolean;
  pagerduty_dedup_key?: string;
  github_issue_created?: boolean;
  github_issue_url?: string;
  wallet_payout?: WalletActionRecord;
  delivery_logs: DeliveryLog[];
}

export interface IncidentPayload {
  is_incident: true;
  status: 'PARSED' | 'IGNORED' | 'NEEDS_INFO';
  incident_id: string;
  source_email_id: string;
  customer_email: string;
  subject: string;
  extracted_data: ExtractedData;
  severity: SeverityLevel | null;
  sla_window: string | null;
  reasoning: string;
  incident_brief: string;
  customer_reply_draft: string;
  escalation_recommendation: EscalationRecommendation | null;
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  wallet_action?: WalletActionRecord;
  execution_report?: ExecutionReport;
  created_at: string;
}

export interface IgnoredEmailPayload {
  is_incident: false;
  status: 'IGNORED';
  source_email_id: string;
  customer_email: string;
  subject: string;
  reason: string;
  created_at: string;
}

export type SkillProcessResult = IncidentPayload | IgnoredEmailPayload;
