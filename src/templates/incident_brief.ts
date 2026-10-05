/**
 * Standardized Incident Brief Generator
 * DevRelay Skill Engine
 * 
 * Produces structured Markdown incident briefs ready for GitHub Issues,
 * Jira tickets, or Linear issues.
 */

import { EmailMessage, ExtractedData, SeverityLevel } from '../types.js';
import { sanitizeContent } from '../parsers/sanitizer.js';

export function generateIncidentBrief(
  email: EmailMessage,
  extracted: ExtractedData,
  severity: SeverityLevel,
  reasoning: string
): string {
  const endpointDisplay = extracted.affected_endpoint || 'API Gateway / Unknown Service';
  const errorDisplay = extracted.error_code || 'Unspecified Error';
  const traceDisplay = extracted.trace_id ? `\`${extracted.trace_id}\`` : 'Not provided in message';
  const sdkDisplay = extracted.sdk_version ? `\`${extracted.sdk_version}\`` : 'Not specified';
  const envDisplay = extracted.environment;

  let brief = `### [${severity}] Incident: ${endpointDisplay}\n\n`;
  brief += `**Reported By:** ${email.from}\n`;
  brief += `**Environment:** ${envDisplay}\n`;
  brief += `**Impact:** ${errorDisplay} impacting client operations.\n\n`;

  brief += `#### Diagnostic Information\n`;
  brief += `* **Endpoint:** \`${endpointDisplay}\`\n`;
  brief += `* **Error Identifier:** \`${errorDisplay}\`\n`;
  brief += `* **Trace ID:** ${traceDisplay}\n`;
  brief += `* **SDK / Library:** ${sdkDisplay}\n`;

  if (extracted.http_method) {
    brief += `* **HTTP Method:** \`${extracted.http_method}\`\n`;
  }

  if (extracted.sanitized_secrets_detected.length > 0) {
    brief += `* **Security Scrub:** Sanitized ${extracted.sanitized_secrets_detected.join(', ')} from incoming body.\n`;
  }

  brief += `\n#### Summary & Evidence Reasoning\n`;
  brief += `${reasoning}\n\n`;

  if (extracted.stack_trace) {
    brief += `#### Extracted Stack Trace\n`;
    brief += `\`\`\`text\n${extracted.stack_trace}\n\`\`\`\n\n`;
  }

  brief += `#### Original Inbound Report\n`;
  brief += `> **Subject:** ${email.subject}\n`;
  brief += `> **Received:** ${email.timestamp}\n\n`;
  
  // Sanitize and truncate email body quote if very long
  const sanitizedBody = sanitizeContent(email.body).sanitizedText;
  const truncatedBody = sanitizedBody.length > 600 ? `${sanitizedBody.substring(0, 600)}... [truncated]` : sanitizedBody;
  const quoteLines = truncatedBody.split('\n').map(l => `> ${l}`).join('\n');
  brief += `${quoteLines}\n`;

  return brief;
}
