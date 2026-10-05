/**
 * PagerDuty Events API v2 Formatter
 * DevRelay Skill Engine
 */

import { IncidentPayload } from '../types.js';

export function formatPagerDutyPayload(incident: IncidentPayload, routingKey: string = 'pd_integration_key_devrelay') {
  return {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: `devrelay-${incident.incident_id}`,
    payload: {
      summary: `[${incident.severity}] ${incident.extracted_data.affected_endpoint || 'API Failure'} - ${incident.extracted_data.error_code || 'Outage'}`,
      source: 'mermail-devrelay',
      severity: incident.severity === 'P0' ? 'critical' : incident.severity === 'P1' ? 'error' : 'warning',
      timestamp: new Date().toISOString(),
      component: incident.extracted_data.affected_endpoint || 'Core Backend',
      group: incident.extracted_data.environment,
      class: 'incident-alert',
      custom_details: {
        incident_id: incident.incident_id,
        reporter: incident.customer_email,
        trace_id: incident.extracted_data.trace_id,
        sdk_version: incident.extracted_data.sdk_version,
        reasoning: incident.reasoning,
        sla: incident.sla_window
      }
    },
    client: 'Mermail DevRelay',
    client_url: `https://app.mermail.internal/incidents/${incident.incident_id}`
  };
}
