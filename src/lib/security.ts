/**
 * Security utilities for CharterAI
 * Handles input sanitization, XSS prevention, and rate limiting
 */

// Simple HTML entity encoding to prevent XSS
export function sanitizeHtml(input: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return String(input).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
}

// Sanitize user input for AI prompts to prevent injection
export function sanitizePromptInput(input: string): string {
  // Remove potential prompt injection patterns
  const dangerous = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /human\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|.*?\|>/gi,
    /###\s*system/gi,
    /###\s*instruction/gi,
  ];
  
  let sanitized = input;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  });
  
  // Limit length to prevent prompt overflow
  sanitized = sanitized.slice(0, 2000);
  
  // Basic HTML sanitization
  sanitized = sanitizeHtml(sanitized);
  
  return sanitized.trim();
}

// Validate and sanitize location input
export function sanitizeLocation(location: string): string {
  // Remove potentially dangerous characters
  const cleaned = location
    .replace(/[<>{}[\]\\]/g, '') // Remove HTML-like chars
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .slice(0, 200); // Limit length
  
  if (cleaned.length < 1) {
    throw new Error('Invalid location input');
  }
  
  return cleaned;
}

// Simple rate limiting using localStorage (client-side only)
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class ClientRateLimit {
  private key: string;
  private config: RateLimitConfig;
  
  constructor(key: string, config: RateLimitConfig) {
    this.key = `rateLimit_${key}`;
    this.config = config;
  }
  
  checkLimit(): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests from localStorage
    const stored = localStorage.getItem(this.key);
    let requests: number[] = stored ? JSON.parse(stored) : [];
    
    // Filter out old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    const allowed = requests.length < this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - requests.length);
    const resetTime = requests.length > 0 ? requests[0] + this.config.windowMs : now + this.config.windowMs;
    
    // If allowed, add current request
    if (allowed) {
      requests.push(now);
      localStorage.setItem(this.key, JSON.stringify(requests));
    }
    
    return { allowed, remaining, resetTime };
  }
  
  /**
   * Peek at the rate limit status without consuming an attempt.
   */
  getStatus(): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const stored = localStorage.getItem(this.key);
    let requests: number[] = stored ? JSON.parse(stored) : [];

    // Filter out old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);

    const allowed = requests.length < this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - requests.length);
    const resetTime = requests.length > 0 ? requests[0] + this.config.windowMs : now + this.config.windowMs;

    return { allowed, remaining, resetTime };
  }
  
  reset(): void {
    localStorage.removeItem(this.key);
  }
}

// Validate JWT token structure (basic check)
export function isValidJWT(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Check if each part is valid base64
    parts.forEach(part => {
      atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    });
    return true;
  } catch {
    return false;
  }
}

// Extract user ID from JWT safely
export function extractUserIdFromJWT(token: string): string | null {
  if (!isValidJWT(token)) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Check if string contains only safe characters for logging
export function isSafeForLogging(input: string): boolean {
  // Only allow alphanumeric, spaces, and basic punctuation
  const safePattern = /^[a-zA-Z0-9\s.,!?-_@()[\]{}:;"'\/]*$/;
  return safePattern.test(input) && input.length <= 1000;
}

// Mask sensitive information in logs
export function maskSensitiveData(input: string): string {
  return input
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\bsk_[a-zA-Z0-9]{24,}\b/g, '[STRIPE_KEY]')
    .replace(/\bpk_[a-zA-Z0-9]{24,}\b/g, '[STRIPE_PK]')
    .replace(/\bsb-[a-zA-Z0-9-]{24,}\b/g, '[SUPABASE_KEY]')
    .replace(/\beyJ[a-zA-Z0-9-_]{10,}\b/g, '[JWT]')
    .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD_NUMBER]');
}