/**
 * DevRelay: Technical Incident Relay Agent Skill for Mermail
 * Main Skill Engine Entrypoint
 */

import {
  EmailMessage,
  IncidentPayload,
  IgnoredEmailPayload,
  SkillProcessResult,
  ExecutionReport
} from './types.js';
import { evaluateTechnicalNature, extractTechnicalEntities } from './parsers/technical_extractor.js';
import { evaluateSeverity } from './parsers/severity_evaluator.js';
import { generateIncidentBrief } from './templates/incident_brief.js';
import { generateCustomerReply } from './templates/customer_reply.js';
import { OutboundDispatcher } from './webhooks/dispatcher.js';
import { agentWallet } from './wallet/agent_wallet.js';

export class DevRelaySkill {
  private incidents: Map<string, IncidentPayload> = new Map();
  private ignoredEmails: Map<string, IgnoredEmailPayload> = new Map();
  private dispatcher: OutboundDispatcher;

  constructor() {
    this.dispatcher = new OutboundDispatcher();
  }

  /**
   * Primary Ingestion and Processing Pipeline
   */
  public async processEmail(email: EmailMessage): Promise<SkillProcessResult> {
    const detection = evaluateTechnicalNature(email);

    // 1. Dual-filter detection check
    if (!detection.isTechnical) {
      const ignored: IgnoredEmailPayload = {
        is_incident: false,
        status: 'IGNORED',
        source_email_id: email.id,
        customer_email: email.from,
        subject: email.subject,
        reason: detection.reason,
        created_at: new Date().toISOString()
      };
      this.ignoredEmails.set(email.id, ignored);
      return ignored;
    }

    // 2. Structured Information Extraction & Sanitization
    const extracted = extractTechnicalEntities(email);

    // 3. Severity Classification & Evidence-Based Reasoning
    const evaluation = evaluateSeverity(email, extracted);

    // 4. Generate Internal Tracking Incident ID (e.g. INC-TR-8F902A1B)
    const traceSuffix = extracted.trace_id 
      ? extracted.trace_id.replace(/^tr_|^req_/, '').substring(0, 8).toUpperCase()
      : Math.floor(1000 + Math.random() * 9000).toString();
    const incidentId = `DEVRELAY-INC-${traceSuffix}`;

    // 5. Generate Markdown Incident Brief
    const incidentBrief = generateIncidentBrief(
      email,
      extracted,
      evaluation.severity,
      evaluation.reasoning
    );

    // 6. Generate Empathetic Customer Acknowledgment Draft
    const customerReplyDraft = generateCustomerReply(
      email,
      extracted,
      evaluation.severity,
      evaluation.sla_window,
      incidentId
    );

    // 7. Optional Wallet Credit Suggestion for P0 breaches
    const walletAction = evaluation.severity === 'P0' 
      ? agentWallet.createPayoutRecord('SLA_BREACH_CREDIT', 250.0)
      : undefined;

    // 8. Construct Gated Incident Payload (HALTED FOR APPROVAL)
    const incident: IncidentPayload = {
      is_incident: true,
      status: extracted.missing_critical_context ? 'NEEDS_INFO' : 'PARSED',
      incident_id: incidentId,
      source_email_id: email.id,
      customer_email: email.from,
      subject: email.subject,
      extracted_data: extracted,
      severity: evaluation.severity,
      sla_window: evaluation.sla_window,
      reasoning: evaluation.reasoning,
      incident_brief: incidentBrief,
      customer_reply_draft: customerReplyDraft,
      escalation_recommendation: evaluation.escalation,
      approval_status: 'PENDING_APPROVAL',
      wallet_action: walletAction,
      created_at: new Date().toISOString()
    };

    this.incidents.set(incidentId, incident);
    return incident;
  }

  /**
   * Human Approval Gate Execution
   */
  public async approveAndExecute(
    incidentId: string,
    options: {
      operatorName?: string;
      editedCustomerReply?: string;
      enableWalletPayout?: boolean;
      walletAmount?: number;
    } = {}
  ): Promise<ExecutionReport> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (options.editedCustomerReply) {
      incident.customer_reply_draft = options.editedCustomerReply;
    }

    if (incident.wallet_action) {
      if (options.enableWalletPayout !== undefined) {
        incident.wallet_action.enabled = options.enableWalletPayout;
      }
      if (options.walletAmount !== undefined) {
        incident.wallet_action.amount_usdc = options.walletAmount;
      }
    }

    const report = await this.dispatcher.dispatchIncident(
      incident,
      true, // APPROVED
      options.operatorName || 'Mermail Operator'
    );

    incident.approval_status = 'APPROVED';
    incident.execution_report = report;
    this.incidents.set(incidentId, incident);

    return report;
  }

  /**
   * Rejection or Manual Cancellation
   */
  public rejectIncident(incidentId: string, reason: string = 'Rejected by operator'): IncidentPayload {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.approval_status = 'REJECTED';
    incident.reasoning += ` [Operator Override: ${reason}]`;
    this.incidents.set(incidentId, incident);
    return incident;
  }

  public getIncident(id: string): IncidentPayload | undefined {
    return this.incidents.get(id);
  }

  public getAllIncidents(): IncidentPayload[] {
    return Array.from(this.incidents.values()).reverse();
  }

  public getAllIgnored(): IgnoredEmailPayload[] {
    return Array.from(this.ignoredEmails.values()).reverse();
  }
}

export const devRelayInstance = new DevRelaySkill();
export * from './types.js';
