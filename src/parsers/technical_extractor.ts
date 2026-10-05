/**
 * Technical Extractor & Dual-Filter Engine
 * DevRelay Skill Engine
 * 
 * Scans inbound emails using a dual-filter engine combining pattern matching
 * (regex for logs, stack traces, HTTP status codes, API paths) and semantic context
 * evaluation to filter false positives (sales/billing/marketing) and extract structured entities.
 */

import { EmailMessage, ExtractedData, EnvironmentType } from '../types.js';
import { sanitizeContent } from './sanitizer.js';

// Non-technical heuristic keywords/patterns
const NON_TECHNICAL_KEYWORDS: RegExp[] = [
  /\b(pricing|invoice|billing|credit card update|subscription renewal|refund request|sales demo|partnership inquiry|cancel my subscription|discount|unsubscribe)\b/i,
  /\b(happy to connect|reach out regarding business|reseller agreement)\b/i
];

// Technical trigger patterns
const STATUS_CODE_REGEX = /\b(500(?:\s+Internal\s+Server\s+Error)?|502(?:\s+Bad\s+Gateway)?|503(?:\s+Service\s+Unavailable)?|504(?:\s+Gateway\s+Timeout)?|400(?:\s+Bad\s+Request)?|401(?:\s+Unauthorized)?|403(?:\s+Forbidden)?|404(?:\s+Not\s+Found)?|429(?:\s+Too\s+Many\s+Requests)?|ERR_[A-Z0-9_]+|ETIMEDOUT|ECONNREFUSED|ENOTFOUND)\b/i;

const ENDPOINT_REGEX = /(?:(?:POST|GET|PUT|DELETE|PATCH)\s+)?(?:https?:\/\/[^\s"'`]+|\/(?:v[0-9]+|api|auth|checkout|events|users|webhooks|payments)[a-zA-Z0-9_\-\/]*)/i;

const TRACE_ID_REGEX = /(?:trace[_-]?id|request[_-]?id|req[_-]?id|x-request-id)[\s:=]+([a-zA-Z0-9_\-]+)|\b(tr_[a-zA-Z0-9_\-]+|req_[a-zA-Z0-9_\-]+)\b/i;

const SDK_REGEX = /(?:mermail-[a-zA-Z0-9_\-]+(?:-v?[0-9.]+)?|@mermail\/[a-zA-Z0-9_\-]+(?:@?[0-9.]*)?|sdk[\s:=]+[a-zA-Z0-9_\-.]+(?:v[0-9.]+)?)/i;

const STACK_TRACE_REGEX = /(?:Exception in thread|Traceback \(most recent call last\)|Error: |at [a-zA-Z0-9_$.]+\s*\([^)]+:[0-9]+:[0-9]+\)|(?:\r?\n\s+at\s+[\s\S]+?)(?=\r?\n\r?\n|$))/i;

export interface DetectionResult {
  isTechnical: boolean;
  confidence: number;
  reason: string;
}

export function evaluateTechnicalNature(email: EmailMessage): DetectionResult {
  const combinedText = `${email.subject} ${email.body}`;

  // Check if explicitly matching non-technical business patterns
  const nonTechMatches = NON_TECHNICAL_KEYWORDS.filter(pattern => pattern.test(combinedText));
  
  // Check technical indicators
  const hasStatusCode = STATUS_CODE_REGEX.test(combinedText);
  const hasEndpoint = ENDPOINT_REGEX.test(combinedText);
  const hasTraceId = TRACE_ID_REGEX.test(combinedText);
  const hasSdk = SDK_REGEX.test(combinedText);
  const hasStackTrace = STACK_TRACE_REGEX.test(combinedText);
  const hasGenericTechnical = /\b(api|endpoint|payload|webhook|exception|crash|downtime|outage|stack trace|timeout|json parse|http error|latency spike|sdk|documentation|docs|library|feature suggestion|feature request|bug|typo)\b/i.test(combinedText);

  const technicalHits = [hasStatusCode, hasEndpoint, hasTraceId, hasSdk, hasStackTrace, hasGenericTechnical].filter(Boolean).length;

  // If clearly non-technical business email and zero technical hits:
  if (nonTechMatches.length > 0 && technicalHits === 0) {
    return {
      isTechnical: false,
      confidence: 0.95,
      reason: 'Non-technical email: Matched general sales/billing/account query without technical entities.'
    };
  }

  // If there are explicit technical indicators:
  if (technicalHits >= 1) {
    return {
      isTechnical: true,
      confidence: Math.min(1.0, 0.5 + technicalHits * 0.15),
      reason: `Technical incident report: Detected ${technicalHits} technical indicators (status codes, endpoints, traces, or SDK references).`
    };
  }

  // If user says "it is broken" or "not working" in subject/body
  if (/\b(broken|down|not working|failing|error|fails)\b/i.test(combinedText)) {
    return {
      isTechnical: true,
      confidence: 0.65,
      reason: 'Technical inquiry with minimal context: Customer reports failure or system malfunction.'
    };
  }

  return {
    isTechnical: false,
    confidence: 0.85,
    reason: 'Non-technical inquiry: No error codes, stack traces, API endpoints, or diagnostic entities detected.'
  };
}

export function extractTechnicalEntities(email: EmailMessage): ExtractedData {
  const combinedText = `${email.subject}\n${email.body}`;

  // 1. Sanitize text for security & prompt injection safety
  const sanitization = sanitizeContent(combinedText);
  const safeText = sanitization.sanitizedText;

  // 2. Extract Status Code / Error Identifier
  let errorCode: string | null = null;
  const statusMatch = safeText.match(STATUS_CODE_REGEX);
  if (statusMatch) {
    errorCode = (statusMatch[1] || statusMatch[0]).trim();
  }

  // 3. Extract Affected Endpoint & HTTP Method
  let affectedEndpoint: string | null = null;
  let httpMethod: string | null = null;
  
  const methodMatch = safeText.match(/\b(POST|GET|PUT|DELETE|PATCH)\b/);
  if (methodMatch) {
    httpMethod = methodMatch[1].toUpperCase();
  }

  const endpointMatch = safeText.match(ENDPOINT_REGEX);
  if (endpointMatch) {
    affectedEndpoint = endpointMatch[0].trim();
    // Prepend method if endpoint does not already include it
    if (httpMethod && !affectedEndpoint.startsWith(httpMethod)) {
      affectedEndpoint = `${httpMethod} ${affectedEndpoint}`;
    }
  }

  // 4. Extract Trace / Request ID
  let traceId: string | null = null;
  const traceMatch = safeText.match(TRACE_ID_REGEX);
  if (traceMatch) {
    traceId = traceMatch[1] || traceMatch[2] || traceMatch[0];
  }

  // 5. Extract Environment (Production, Staging, Sandbox, Unknown)
  let environment: EnvironmentType = 'Unknown';
  if (/\b(production|prod|live)\b/i.test(safeText)) {
    environment = 'Production';
  } else if (/\b(staging|stage|pre-prod|qa)\b/i.test(safeText)) {
    environment = 'Staging';
  } else if (/\b(sandbox|test|dev|local)\b/i.test(safeText)) {
    environment = 'Sandbox';
  }

  // 6. Extract SDK / Library Version
  let sdkVersion: string | null = null;
  const sdkMatch = safeText.match(SDK_REGEX);
  if (sdkMatch) {
    sdkVersion = sdkMatch[0].trim();
    // Normalize format like "SDK: mermail-node-v3.4.1" -> "mermail-node-v3.4.1"
    sdkVersion = sdkVersion.replace(/^sdk[\s:=]+/i, '').trim();
  }

  // 7. Extract Stack Trace snippet if present
  let stackTrace: string | null = null;
  const stackMatch = safeText.match(STACK_TRACE_REGEX);
  if (stackMatch) {
    stackTrace = stackMatch[0].trim();
  }

  // 8. Detected indicators list
  const detectedIndicators: string[] = [];
  if (errorCode) detectedIndicators.push(`Status/Error: ${errorCode}`);
  if (affectedEndpoint) detectedIndicators.push(`Endpoint: ${affectedEndpoint}`);
  if (traceId) detectedIndicators.push(`Trace ID: ${traceId}`);
  if (sdkVersion) detectedIndicators.push(`SDK: ${sdkVersion}`);
  if (environment !== 'Unknown') detectedIndicators.push(`Environment: ${environment}`);

  // 9. Missing critical context check
  // If the user reports broken functionality without endpoint or trace or specific error
  const missingCriticalContext = !affectedEndpoint && !traceId && !errorCode;

  return {
    affected_endpoint: affectedEndpoint,
    error_code: errorCode,
    trace_id: traceId,
    environment,
    sdk_version: sdkVersion,
    http_method: httpMethod,
    stack_trace: stackTrace,
    detected_indicators: detectedIndicators,
    sanitized_secrets_detected: sanitization.detectedSecrets,
    missing_critical_context: missingCriticalContext
  };
}
