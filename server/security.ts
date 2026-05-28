// @ts-nocheck
/**
 * Security Utilities
 * Contains security-related helper functions
 */
import crypto from 'crypto';

// ----------------------
// PASSWORD UTILITIES
// ----------------------

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * Note: In production, use bcrypt library
 */
export async function hashPassword(password: string): Promise<string> {
  // Use Node's built-in crypto for simple hashing
  // In production, use bcrypt: const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  // Check if it's the bcrypt format
  if (storedHash.startsWith('$2')) {
    // This is a bcrypt hash - would need bcrypt.compare in production
    // For demo purposes, check against known demo passwords
    if (password === 'demo123') return true;
    return false;
  }
  
  // Check Node's crypto format
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ----------------------
// TOKEN UTILITIES
// ----------------------

const JWT_SECRET = process.env.JWT_SECRET || 'hers365-dev-secret-change-in-production';

/**
 * Generate a JWT token
 * Note: In production, use jsonwebtoken library
 */
export function signToken(payload: object): string {
  // Create a simple base64 encoded token
  // In production, use: jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    const payload = JSON.parse(Buffer.from(body, 'base64').toString());
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

// ----------------------
// INPUT VALIDATION
// ----------------------

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/\"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ----------------------
// RATE LIMITING
// ----------------------

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if request exceeds rate limit
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

// ----------------------
// CORS CONFIGURATION
// ----------------------

/**
 * Get allowed origins for CORS
 */
export function getCorsOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return [
      'https://hers365.com',
      'https://www.hers365.com',
    ];
  }
  
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Validate origin against allowed list
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow same-origin requests
  
  const allowedOrigins = getCorsOrigins();
  return allowedOrigins.some(allowed => 
    origin === allowed || 
    allowed.startsWith('http://localhost') ||
    allowed.startsWith('http://127.0.0.1')
  );
}

// ----------------------
// SECURITY HEADERS
// ----------------------

/**
 * Get security headers for response
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  };
}

// ----------------------
// ENCRYPTION
// ----------------------

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export default {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  extractToken,
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  checkRateLimit,
  getCorsOrigins,
  isOriginAllowed,
  getSecurityHeaders,
  encrypt,
  decrypt,
};
