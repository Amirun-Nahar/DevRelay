/**
 * Data Sanitizer & Prompt Injection Shield
 * DevRelay Security Model
 * 
 * Sanitizes sensitive credentials, authorization headers, private tokens,
 * and neutralizes potential prompt injection vectors.
 */

export interface SanitizationResult {
  sanitizedText: string;
  detectedSecrets: string[];
  injectionNeutralized: boolean;
}

const SENSITIVE_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: 'Bearer Token',
    regex: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi,
    replacement: 'Bearer [REDACTED_BEARER_TOKEN]'
  },
  {
    name: 'API Key (Sk/Ghp/Secret)',
    regex: /(?:sk_live_[a-zA-Z0-9]{24,}|sk_test_[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{36,}|key-[0-9a-zA-Z]{32,}|api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"])/gi,
    replacement: '[REDACTED_API_KEY]'
  },
  {
    name: 'Authorization Header',
    regex: /authorization\s*:\s*[^\r\n]+/gi,
    replacement: 'Authorization: [REDACTED_AUTH_HEADER]'
  },
  {
    name: 'Password Field',
    regex: /(?:password|passwd|secret)\s*[:=]\s*['"][^'"]+['"]/gi,
    replacement: 'password: "[REDACTED_CREDENTIAL]"'
  },
  {
    name: 'JWT Token',
    regex: /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacement: '[REDACTED_JWT_TOKEN]'
  },
  {
    name: 'Private Key',
    regex: /-----BEGIN\s+(?:RSA|OPENSSH|EC)?\s*PRIVATE KEY-----[\s\S]*?-----END\s+(?:RSA|OPENSSH|EC)?\s*PRIVATE KEY-----/gi,
    replacement: '[REDACTED_PRIVATE_KEY]'
  }
];

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*:\s*you\s+are\s+now/i,
  /disregard\s+(the\s+above|all\s+rules)/i,
  /bypass\s+(human\s+approval|safety\s+gate)/i,
  /override\s+severity\s+to\s+p0/i
];

export function sanitizeContent(text: string): SanitizationResult {
  let sanitized = text;
  const detectedSecrets: string[] = [];
  let injectionNeutralized = false;

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.regex.test(sanitized)) {
      detectedSecrets.push(pattern.name);
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }
  }

  for (const injectionRegex of INJECTION_PATTERNS) {
    if (injectionRegex.test(sanitized)) {
      injectionNeutralized = true;
      sanitized = sanitized.replace(injectionRegex, (match) => `[FLAGGED_PROMPT_INJECTION_INPUT: "${match.replace(/"/g, "'")}"]`);
    }
  }

  return {
    sanitizedText: sanitized,
    detectedSecrets: Array.from(new Set(detectedSecrets)),
    injectionNeutralized
  };
}
