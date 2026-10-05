/**
 * Customer Acknowledgment Draft Generator
 * DevRelay Skill Engine
 * 
 * Generates an empathetic, accurate, and non-committal response to the sender,
 * confirming receipt, establishing standard SLA timelines, and attaching an internal
 * reference tracking ID.
 */

import { EmailMessage, ExtractedData, SeverityLevel } from '../types.js';

export function generateCustomerReply(
  email: EmailMessage,
  extracted: ExtractedData,
  severity: SeverityLevel,
  slaWindow: string,
  incidentId: string
): string {
  // Extract customer first name if possible
  const fromNameMatch = email.from.match(/^([^<@.]+)/);
  let recipientName = 'Customer';
  if (fromNameMatch) {
    const raw = fromNameMatch[1].trim();
    recipientName = raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  const endpointText = extracted.affected_endpoint ? ` regarding ${extracted.affected_endpoint}` : '';
  const traceText = extracted.trace_id ? ` (Reference Trace ID: ${extracted.trace_id})` : '';

  // Case 1: Missing critical context (customer said "it's broken" without logs or endpoint)
  if (extracted.missing_critical_context) {
    return `Hi ${recipientName},

Thank you for contacting developer support. We have received your report and logged ticket [${incidentId}].

To help our engineering team diagnose and resolve this as quickly as possible, could you please provide:
1. The exact API endpoint URL and HTTP method being invoked
2. The Request / Trace ID returned in response headers (e.g., 'x-request-id' or 'tr_...')
3. The HTTP response status code and a sanitized snippet of the error response body
4. The environment where this occurred (Production, Staging, Sandbox)

Our team is standing by to investigate once we receive these details.

Best regards,
Developer Support & Reliability Team`;
  }

  // Case 2: Normal technical incident (P0, P1, P2, P3)
  const urgencyDescription = 
    severity === 'P0' ? 'critical system outage' :
    severity === 'P1' ? 'high-priority production issue' :
    severity === 'P2' ? 'technical issue' : 'support inquiry';

  let reply = `Hi ${recipientName},\n\n`;
  reply += `Thank you for reaching out. We have logged this ${urgencyDescription}${endpointText}${traceText} under incident tracking code [${incidentId}].\n\n`;

  if (severity === 'P0' || severity === 'P1') {
    reply += `Our engineering team has been paged and is actively investigating the ${extracted.error_code || 'reported error'}. `;
    reply += `We will provide our next operational update within ${slaWindow.replace('< ', '')}.\n\n`;
  } else if (severity === 'P2') {
    reply += `Our technical support and engineering team is reviewing the telemetry. We anticipate an update within ${slaWindow.replace('< ', '')}.\n\n`;
  } else {
    reply += `Our developer relations team is reviewing your report and will follow up with details or recommendations within ${slaWindow.replace('< ', '')}.\n\n`;
  }

  reply += `If you have additional logs or payload samples in the meantime, please reply directly to this email.\n\n`;
  reply += `Best regards,\n`;
  reply += `Developer Support & Reliability Operations`;

  return reply;
}
