/**
 * THREAT MODELING ANALYSIS
 * HERS365 Sports Recruiting Platform Authentication System
 *
 * Platform Context:
 * - Involves minors (student athletes) - COPPA compliance required
 * - Financial transactions (NIL deals) - GDPR/PCI DSS compliance
 * - Real-time communication between athletes, parents, coaches
 * - Enterprise scale: 50K+ concurrent users expected
 * - Malicious abuse scenarios: account takeover, data theft, fraud
 */

export const THREAT_MODEL = {
  // STRIDE Framework Analysis
  STRIDE: {
    SPOOFING: [
      {
        threat: "Credential Stuffing",
        description: "Attackers use breached credentials from other services",
        impact: "HIGH",
        likelihood: "HIGH",
        mitigation: [
          "MFA mandatory for all users",
          "Account lockout after failed attempts",
          "Progressive delays on login failures",
          "Credential strength requirements",
          "Monitor for suspicious login patterns"
        ]
      },
      {
        threat: "Session Hijacking",
        description: "Stolen JWT tokens used to impersonate users",
        impact: "CRITICAL",
        likelihood: "MEDIUM",
        mitigation: [
          "Short-lived access tokens (15-30 min)",
          "Refresh token rotation",
          "Device fingerprinting",
          "Session revocation capabilities",
          "Secure token storage (HttpOnly, Secure, SameSite)"
        ]
      },
      {
        threat: "Parent Impersonation",
        description: "Malicious actors posing as parents to access minor athlete data",
        impact: "CRITICAL",
        likelihood: "MEDIUM",
        mitigation: [
          "COPPA-compliant verification process",
          "Document verification for parent-child relationships",
          "Age verification for minors",
          "Parental consent tracking",
          "Audit logging of all access"
        ]
      }
    ],

    TAMPERING: [
      {
        threat: "Token Tampering",
        description: "JWT tokens modified to escalate privileges",
        impact: "CRITICAL",
        likelihood: "LOW",
        mitigation: [
          "Cryptographic signatures on all tokens",
          "Token validation on every request",
          "Short token expiration",
          "Secure key management",
          "Audit logging of token operations"
        ]
      },
      {
        threat: "Data Manipulation",
        description: "NIL transaction amounts or athlete data altered",
        impact: "CRITICAL",
        likelihood: "LOW",
        mitigation: [
          "Database integrity checks",
          "Transaction audit trails",
          "Immutable audit logs",
          "Financial transaction verification",
          "Blockchain-style transaction chaining"
        ]
      }
    ],

    REPUDIATION: [
      {
        threat: "Action Deniability",
        description: "Users deny performing actions (NIL deals, data access)",
        impact: "HIGH",
        likelihood: "MEDIUM",
        mitigation: [
          "Comprehensive audit logging",
          "Digital signatures on transactions",
          "Timestamped immutable logs",
          "User session tracking",
          "Compliance with GDPR right to erasure"
        ]
      }
    ],

    INFORMATION_DISCLOSURE: [
      {
        threat: "PII Leakage",
        description: "Personal identifiable information of minors exposed",
        impact: "CRITICAL",
        likelihood: "MEDIUM",
        mitigation: [
          "Data encryption at rest and in transit",
          "COPPA-compliant data minimization",
          "GDPR data processing agreements",
          "Privacy by design principles",
          "Regular security assessments"
        ]
      },
      {
        threat: "NIL Deal Exposure",
        description: "Financial transaction details leaked",
        impact: "HIGH",
        likelihood: "LOW",
        mitigation: [
          "End-to-end encryption for communications",
          "Financial data segregation",
          "Access control based on business need",
          "Transaction privacy controls"
        ]
      }
    ],

    DENIAL_OF_SERVICE: [
      {
        threat: "Login DoS",
        description: "Brute force attacks overwhelm authentication system",
        impact: "HIGH",
        likelihood: "HIGH",
        mitigation: [
          "Rate limiting with progressive backoff",
          "Distributed rate limiting",
          "Captcha integration for suspicious activity",
          "IP-based blocking",
          "Cloud-based DDoS protection"
        ]
      },
      {
        threat: "Session Exhaustion",
        description: "Massive concurrent sessions overwhelm Redis/cache",
        impact: "MEDIUM",
        likelihood: "MEDIUM",
        mitigation: [
          "Session limits per user",
          "Automatic session cleanup",
          "Distributed caching with Redis Cluster",
          "Load balancing across regions",
          "Auto-scaling infrastructure"
        ]
      }
    ],

    ELEVATION_OF_PRIVILEGE: [
      {
        threat: "Privilege Escalation",
        description: "Regular users gaining admin/coach access",
        impact: "CRITICAL",
        likelihood: "LOW",
        mitigation: [
          "Role-based access control (RBAC)",
          "Principle of least privilege",
          "Regular privilege reviews",
          "Secure token claims",
          "Audit logging of privilege changes"
        ]
      },
      {
        threat: "Coach Impersonation",
        description: "Fake coaches accessing athlete recruitment data",
        impact: "HIGH",
        likelihood: "MEDIUM",
        mitigation: [
          "Coach verification process",
          "Institutional email validation",
          "Background checks for coaches",
          "Two-way verification for recruitment"
        ]
      }
    ]
  },

  // Compliance Requirements
  COMPLIANCE: {
    COPPA: [
      "Parental consent for data collection",
      "Age verification for users under 13",
      "Data minimization for minors",
      "Right to deletion for minors",
      "Privacy notice for parents"
    ],
    FERPA: [
      "Educational record protection",
      "Parent access to student data",
      "Coach access restrictions",
      "Data sharing limitations"
    ],
    GDPR: [
      "Data processing consent",
      "Right to access personal data",
      "Right to data portability",
      "Right to erasure",
      "Data breach notification"
    ],
    PCI_DSS: [
      "Secure payment processing",
      "Tokenization of financial data",
      "Regular security assessments",
      "Access control for financial data"
    ]
  },

  // Attack Vectors Specific to Platform
  ATTACK_VECTORS: {
    ATHLETE_TARGETING: [
      "Social engineering via sports interests",
      "Credential harvesting from sports forums",
      "Phishing via recruitment emails",
      "Malware targeting sports apps"
    ],
    FINANCIAL_EXPLOITATION: [
      "NIL deal manipulation",
      "Payment fraud",
      "Scholarship fraud",
      "Identity theft for financial gain"
    ],
    SCALE_EXPLOITATION: [
      "Mass account creation",
      "Automated scraping of athlete data",
      "Distributed brute force attacks",
      "API abuse for data harvesting"
    ]
  },

  // Risk Assessment Matrix
  RISK_MATRIX: {
    CRITICAL: [
      "Unauthorized access to minor data",
      "Financial transaction manipulation",
      "Session hijacking leading to identity theft",
      "Privilege escalation to admin access"
    ],
    HIGH: [
      "Brute force account compromise",
      "PII data leakage",
      "Denial of service attacks",
      "Repudiation of financial transactions"
    ],
    MEDIUM: [
      "Session exhaustion",
      "Minor data tampering",
      "Unauthorized coach access",
      "Compliance violations"
    ]
  }
};

/**
 * SECURITY CONTROLS IMPLEMENTATION PRIORITY
 *
 * Phase 1 (Critical - Must Implement):
 * 1. MFA for all users
 * 2. Refresh token rotation
 * 3. Session management & revocation
 * 4. Enhanced brute force protection
 * 5. COPPA compliance verification
 *
 * Phase 2 (High Priority):
 * 6. Comprehensive audit logging
 * 7. Token lifecycle management
 * 8. Distributed rate limiting
 * 9. Privacy by design implementation
 *
 * Phase 3 (Medium Priority):
 * 10. Advanced threat detection
 * 11. Zero-trust architecture
 * 12. Regular security assessments
 */