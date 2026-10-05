/**
 * Slack Block Kit Notification Formatter
 * DevRelay Skill Engine
 */

import { IncidentPayload } from '../types.js';

export function formatSlackPayload(incident: IncidentPayload) {
  const sevColor = 
    incident.severity === 'P0' ? '#FF0000' :
    incident.severity === 'P1' ? '#FF5500' :
    incident.severity === 'P2' ? '#FFAA00' : '#36A64F';

  const sevEmoji = 
    incident.severity === 'P0' ? '🚨' :
    incident.severity === 'P1' ? '⚠️' :
    incident.severity === 'P2' ? '🟡' : 'ℹ️';

  return {
    channel: incident.escalation_recommendation?.target_channel || '#eng-oncall',
    attachments: [
      {
        color: sevColor,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${sevEmoji} [DevRelay] ${incident.severity} Incident: ${incident.extracted_data.affected_endpoint || 'API Gateway'}`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Severity:*\n\`${incident.severity}\` (SLA: ${incident.sla_window})`
              },
              {
                type: 'mrkdwn',
                text: `*Environment:*\n\`${incident.extracted_data.environment}\``
              },
              {
                type: 'mrkdwn',
                text: `*Error Code:*\n\`${incident.extracted_data.error_code || 'Unknown'}\``
              },
              {
                type: 'mrkdwn',
                text: `*Trace ID:*\n\`${incident.extracted_data.trace_id || 'N/A'}\``
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Evidence-Based Reasoning:*\n${incident.reasoning}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Ticket ID:* \`${incident.incident_id}\` | *Reported By:* ${incident.customer_email} | *Via:* Mermail Human Approval Gate`
              }
            ]
          }
        ]
      }
    ]
  };
}
