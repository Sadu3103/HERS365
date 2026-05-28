/**
 * EVENT-DRIVEN MICROSERVICES ARCHITECTURE
 * Azure Service Bus integration for asynchronous communication
 * Designed for enterprise-scale sports recruiting platform
 */

import { ServiceBusClient, ServiceBusMessage, ServiceBusReceivedMessage } from '@azure/service-bus';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import crypto from 'crypto';

// ─── EVENT DEFINITIONS ────────────────────────────────────────────────────────

export interface BaseEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  userType?: string;
  source: string;
  version: number;
  metadata: {
    complianceFlags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    ttl?: number; // Time to live in seconds
    idempotencyKey?: string;
  };
  payload: any;
}

// User Domain Events
export interface UserCreatedEvent extends BaseEvent {
  eventType: 'UserCreated';
  payload: {
    userId: string;
    userType: 'athlete' | 'parent' | 'coach' | 'admin';
    email: string;
    name: string;
    metadata: {
      parentalConsent?: boolean;
      age?: number;
      school?: string;
      verificationStatus?: string;
    };
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  eventType: 'UserUpdated';
  payload: {
    userId: string;
    userType: string;
    changes: Record<string, any>;
    updatedBy: string;
  };
}

export interface UserDeletedEvent extends BaseEvent {
  eventType: 'UserDeleted';
  payload: {
    userId: string;
    userType: string;
    reason: string;
    deletedBy: string;
    dataRetentionPeriod: number; // Days
  };
}

// Authentication Events
export interface LoginAttemptedEvent extends BaseEvent {
  eventType: 'LoginAttempted';
  payload: {
    email: string;
    userType: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    location?: {
      country: string;
      city: string;
      coordinates?: [number, number];
    };
  };
}

export interface LoginSuccessfulEvent extends BaseEvent {
  eventType: 'LoginSuccessful';
  payload: {
    userId: string;
    userType: string;
    sessionId: string;
    mfaUsed: boolean;
    ipAddress: string;
    deviceFingerprint?: string;
  };
}

export interface LoginFailedEvent extends BaseEvent {
  eventType: 'LoginFailed';
  payload: {
    email: string;
    userType: string;
    reason: 'invalid_credentials' | 'account_locked' | 'mfa_failed' | 'rate_limited';
    failureCount: number;
    ipAddress: string;
    userAgent: string;
  };
}

export interface TokenRefreshedEvent extends BaseEvent {
  eventType: 'TokenRefreshed';
  payload: {
    userId: string;
    userType: string;
    sessionId: string;
    oldTokenId: string;
    newTokenId: string;
    ipAddress: string;
  };
}

// Recruiting Domain Events
export interface ScholarshipOfferedEvent extends BaseEvent {
  eventType: 'ScholarshipOffered';
  payload: {
    scholarshipId: string;
    athleteId: string;
    coachId: string;
    schoolId: string;
    amount: number;
    sport: string;
    academicYear: string;
    conditions?: string[];
    expiresAt: string;
  };
}

export interface ScholarshipAcceptedEvent extends BaseEvent {
  eventType: 'ScholarshipAccepted';
  payload: {
    scholarshipId: string;
    athleteId: string;
    coachId: string;
    acceptedAt: string;
    conditions: string[];
    parentConsent?: boolean;
  };
}

export interface MessageSentEvent extends BaseEvent {
  eventType: 'MessageSent';
  payload: {
    messageId: string;
    senderId: string;
    senderType: string;
    recipientId: string;
    recipientType: string;
    messageType: 'direct' | 'recruitment' | 'scholarship' | 'system';
    content: string;
    attachments?: Array<{
      id: string;
      type: string;
      url: string;
      size: number;
    }>;
    priority: 'low' | 'medium' | 'high';
    expiresAt?: string;
  };
}

// Payment Domain Events
export interface PaymentProcessedEvent extends BaseEvent {
  eventType: 'PaymentProcessed';
  payload: {
    paymentId: string;
    athleteId: string;
    amount: number;
    currency: string;
    paymentType: 'nil_deal' | 'scholarship' | 'event_fee' | 'subscription';
    paymentMethod: string;
    transactionId: string;
    status: 'completed' | 'pending' | 'failed';
    complianceData: {
      parentConsent: boolean;
      ageVerification: boolean;
      transactionPurpose: string;
    };
  };
}

export interface NILDealCreatedEvent extends BaseEvent {
  eventType: 'NILDealCreated';
  payload: {
    dealId: string;
    athleteId: string;
    brandId: string;
    amount: number;
    currency: string;
    dealType: string;
    deliverables: string[];
    startDate: string;
    endDate: string;
    status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
    parentConsent: boolean;
    legalReview: boolean;
  };
}

// Audit & Compliance Events
export interface AuditEventLoggedEvent extends BaseEvent {
  eventType: 'AuditEventLogged';
  payload: {
    auditId: string;
    action: string;
    resource: string;
    userId?: string;
    userType?: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    complianceFlags: string[];
    sensitiveData: boolean;
    retentionPeriod: number; // Days
  };
}

export interface ComplianceViolationEvent extends BaseEvent {
  eventType: 'ComplianceViolation';
  payload: {
    violationId: string;
    violationType: 'coppa' | 'ferpa' | 'gdpr' | 'pci' | string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedUsers: string[] | number;
    remediationRequired: boolean;
    reportedToAuthorities: boolean;
  };
}

export interface ComplianceViolationDetectedEvent extends BaseEvent {
  eventType: 'ComplianceViolationDetected';
  payload: any;
}

export interface DataBreachReportedEvent extends BaseEvent {
  eventType: 'DataBreachReported';
  payload: any;
}

export interface DataExportRequestedEvent extends BaseEvent {
  eventType: 'DataExportRequested';
  payload: any;
}

export interface DataExportCompletedEvent extends BaseEvent {
  eventType: 'DataExportCompleted';
  payload: any;
}

export interface DataExportFailedEvent extends BaseEvent {
  eventType: 'DataExportFailed';
  payload: any;
}

export interface DataDeletionRequestedEvent extends BaseEvent {
  eventType: 'DataDeletionRequested';
  payload: any;
}

export interface DataDeletionCompletedEvent extends BaseEvent {
  eventType: 'DataDeletionCompleted';
  payload: any;
}

export interface DataDeletionFailedEvent extends BaseEvent {
  eventType: 'DataDeletionFailed';
  payload: any;
}

// System Events
export interface ServiceHealthEvent extends BaseEvent {
  eventType: 'ServiceHealth';
  payload: {
    serviceName: string;
    serviceId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, {
      name: string;
      status: 'ok' | 'warning' | 'error';
      responseTime?: number;
      error?: string;
    }>;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface CircuitBreakerEvent extends BaseEvent {
  eventType: 'CircuitBreaker';
  payload: {
    serviceName: string;
    operation: string;
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    successCount: number;
    lastFailure?: string;
    recoveryTime?: string;
  };
}

// ─── EVENT STORE SCHEMA ───────────────────────────────────────────────────────

export interface StoredEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  userType?: string;
  source: string;
  version: number;
  metadata: string; // JSON
  payload: string; // JSON
  processed: boolean;
  processedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  deadLetter: boolean;
  deadLetterReason?: string;
  createdAt: string;
}

// Event type union for type safety
export type DomainEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | LoginAttemptedEvent
  | LoginSuccessfulEvent
  | LoginFailedEvent
  | TokenRefreshedEvent
  | ScholarshipOfferedEvent
  | ScholarshipAcceptedEvent
  | MessageSentEvent
  | PaymentProcessedEvent
  | NILDealCreatedEvent
  | AuditEventLoggedEvent
  | ComplianceViolationEvent
  | ComplianceViolationDetectedEvent
  | DataBreachReportedEvent
  | DataExportRequestedEvent
  | DataExportCompletedEvent
  | DataExportFailedEvent
  | DataDeletionRequestedEvent
  | DataDeletionCompletedEvent
  | DataDeletionFailedEvent
  | ServiceHealthEvent
  | CircuitBreakerEvent;