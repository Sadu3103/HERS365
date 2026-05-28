/**
 * COMPLIANCE SERVICE
 * Core service handling RBAC, data governance, and audit logging
 * Enterprise-grade compliance framework for regulated platform
 */

import express, { Request, Response, NextFunction } from 'express';
import { CosmosClient, Container, SqlQuerySpec } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from './logger';
import { OptimizedCosmosClient } from './cosmos-schema';
import { eventPublisher } from './service-bus';
import {
  Role,
  Permission,
  UserRoleAssignment,
  DataExportRequest,
  DataDeletionRequest,
  ComplianceAuditLog,
  ConsentRecord,
  DataBreachIncident,
  ComplianceReport,
  ComplianceViolation
} from './compliance-types';

// ─── COMPLIANCE SERVICE CLASS ────────────────────────────────────────────────

export class ComplianceService {
  private app: express.Application;
  private cosmosClient: OptimizedCosmosClient;
  private serviceBusClient: ServiceBusClient;
  private auditChain: AuditChain;

  constructor(
    cosmosClient: OptimizedCosmosClient,
    serviceBusClient: ServiceBusClient | undefined
  ) {
    this.cosmosClient = cosmosClient;
    this.serviceBusClient = serviceBusClient;
    this.auditChain = new AuditChain();
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));

    // Correlation ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string ||
                           req.headers['x-request-id'] as string ||
                           uuidv4();
      (req as any).correlationId = correlationId;
      res.setHeader('x-correlation-id', correlationId);
      next();
    });

    // RBAC middleware
    this.app.use('/api/*', this.rbacMiddleware.bind(this));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.healthCheck.bind(this));

    // RBAC endpoints
    this.app.get('/api/roles', this.getRoles.bind(this));
    this.app.post('/api/roles', this.createRole.bind(this));
    this.app.put('/api/roles/:roleId', this.updateRole.bind(this));
    this.app.delete('/api/roles/:roleId', this.deleteRole.bind(this));

    this.app.post('/api/users/:userId/roles', this.assignRole.bind(this));
    this.app.delete('/api/users/:userId/roles/:roleId', this.revokeRole.bind(this));
    this.app.get('/api/users/:userId/permissions', this.getUserPermissions.bind(this));

    // Data governance endpoints
    this.app.post('/api/data/export', this.requestDataExport.bind(this));
    this.app.get('/api/data/export/:requestId', this.getExportStatus.bind(this));
    this.app.get('/api/data/export/:requestId/download', this.downloadExport.bind(this));

    this.app.post('/api/data/delete', this.requestDataDeletion.bind(this));
    this.app.get('/api/data/delete/:requestId', this.getDeletionStatus.bind(this));

    // Consent management
    this.app.post('/api/consent', this.recordConsent.bind(this));
    this.app.get('/api/consent/:userId', this.getConsentHistory.bind(this));
    this.app.delete('/api/consent/:consentId', this.revokeConsent.bind(this));

    // Compliance monitoring
    this.app.get('/api/compliance/status', this.getComplianceStatus.bind(this));
    this.app.get('/api/compliance/reports', this.getComplianceReports.bind(this));
    this.app.post('/api/compliance/violations', this.reportViolation.bind(this));

    // Audit endpoints
    this.app.get('/api/audit/logs', this.getAuditLogs.bind(this));
    this.app.post('/api/audit/breach', this.reportDataBreach.bind(this));

    // Admin endpoints
    this.app.post('/api/admin/compliance/check', this.runComplianceCheck.bind(this));
    this.app.post('/api/admin/compliance/report', this.generateComplianceReport.bind(this));
  }

  getApp(): express.Application {
    return this.app;
  }

  // ─── RBAC MIDDLEWARE ───────────────────────────────────────────────────────

  private async rbacMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const userType = req.headers['x-user-type'] as string;
      const action = `${req.method.toLowerCase()}_${this.getResourceFromPath(req.path)}`;

      if (!userId || !userType) {
        await this.logAuditEvent({
          userId,
          userType,
          action: 'access_denied',
          resource: req.path,
          operation: 'read',
          success: false,
          errorMessage: 'Missing user authentication',
          metadata: {
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] as string || 'unknown',
            correlationId: (req as any).correlationId!,
            complianceFlags: ['gdpr'],
            sensitivity: 'internal' as const,
            retentionPeriod: 365
          },
          timestamp: new Date().toISOString()
        });

        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasPermission = await this.checkPermission(userId, userType, req.path, action);

      if (!hasPermission) {
        await this.logAuditEvent({
          userId,
          userType,
          action: 'access_denied',
          resource: req.path,
          operation: 'read',
          success: false,
          errorMessage: 'Insufficient permissions',
          metadata: {
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] as string || 'unknown',
            correlationId: (req as any).correlationId!,
            complianceFlags: ['gdpr', userType === 'athlete' ? 'coppa' : undefined].filter(Boolean) as string[],
            sensitivity: 'internal' as const,
            retentionPeriod: 365
          },
          timestamp: new Date().toISOString()
        });

        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Log successful access
      await this.logAuditEvent({
        userId,
        userType,
        action: 'access_granted',
        resource: req.path,
        operation: 'read',
        success: true,
        metadata: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown',
          correlationId: (req as any).correlationId!,
          complianceFlags: [] as string[],
          sensitivity: 'internal' as const,
          retentionPeriod: 30
        },
        timestamp: new Date().toISOString()
      });

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error as Error);
      res.status(500).json({ error: 'Authorization error' });
    }
  }

  private getResourceFromPath(path: string): string {
    const segments = path.split('/').filter(s => s);
    if (segments.length >= 2) {
      return segments[1]; // e.g., 'roles', 'users', 'data'
    }
    return 'unknown';
  }

  // ─── RBAC IMPLEMENTATION ───────────────────────────────────────────────────

  private async checkPermission(
    userId: string,
    userType: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // Get user's active roles
      const roles = await this.getUserRoles(userId, userType);
      if (roles.length === 0) return false;

      // Check each role for the required permission
      for (const role of roles) {
        const hasPermission = this.checkRolePermission(role, resource, action);
        if (hasPermission) return true;
      }

      return false;
    } catch (error) {
      logger.error('Permission check error:', error as Error);
      return false;
    }
  }

  private checkRolePermission(role: Role, resource: string, action: string): boolean {
    return role.permissions.some(permission => {
      if (permission.resource !== resource && permission.resource !== '*') return false;

      const actionAllowed = permission.actions.includes(action) ||
                           permission.actions.includes('*') ||
                           permission.actions.includes(action.split('_')[0] + '_*');

      if (!actionAllowed) return false;

      // Check conditions
      if (permission.conditions) {
        // Add specific condition checks here based on requirements
        // For example: age restrictions, location restrictions, etc.
      }

      return true;
    });
  }

  private async getUserRoles(userId: string, userType: string): Promise<Role[]> {
    const container = this.cosmosClient.getContainer('audit-logs'); // Store roles in audit-logs container for immutability

    const querySpec: SqlQuerySpec = {
      query: `
        SELECT r.role
        FROM r
        WHERE r.type = 'role_assignment'
          AND r.userId = @userId
          AND r.userType = @userType
          AND r.active = true
          AND (r.expiresAt = null OR r.expiresAt > GetCurrentDateTime())
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@userType', value: userType }
      ]
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources.map(r => r.role).filter(Boolean);
  }

  // ─── DATA GOVERNANCE IMPLEMENTATION ────────────────────────────────────────

  private async requestDataExport(req: Request, res: Response): Promise<void> {
    try {
      const exportRequest: Omit<DataExportRequest, 'id' | 'requestedAt' | 'status'> = {
        userId: req.body.userId,
        userType: req.body.userType,
        requestType: req.body.requestType,
        complianceFramework: req.body.complianceFramework,
        requestedBy: req.headers['x-user-id'] as string,
        dataScope: req.body.dataScope,
        formats: req.body.formats || ['json'],
        deliveryMethod: req.body.deliveryMethod || 'download',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      const request: DataExportRequest = {
        ...exportRequest,
        id: uuidv4(),
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Store request
      const container = this.cosmosClient.getContainer('audit-logs');
      await container.items.create({
        type: 'data_export_request',
        ...request,
        ttl: 30 * 24 * 60 * 60 // 30 days
      });

      // Publish event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataExportRequested',
        aggregateId: request.id,
        aggregateType: 'DataExportRequest',
        timestamp: new Date().toISOString(),
        correlationId: (req as any).correlationId!,
        userId: request.userId,
        userType: request.userType,
        source: 'compliance-service',
        version: 1,
        metadata: {
          priority: 'high',
          complianceFlags: [request.complianceFramework.toLowerCase()],
          idempotencyKey: uuidv4()
        },
        payload: request
      });

      // Log audit event
      await this.logAuditEvent({
        userId: request.userId,
        userType: request.userType,
        action: 'data_export_requested',
        resource: 'user_data',
        operation: 'export',
        success: true,
        metadata: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown',
          correlationId: (req as any).correlationId!,
          complianceFlags: [request.complianceFramework.toLowerCase()],
          requestId: request.id,
          sensitivity: 'confidential' as const,
          retentionPeriod: 2555 // 7 years
        } as any,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        requestId: request.id,
        status: 'pending',
        estimatedCompletion: '24-48 hours'
      });

    } catch (error) {
      logger.error('Data export request error:', error as Error);
      res.status(500).json({ error: 'Failed to create export request' });
    }
  }

  private async requestDataDeletion(req: Request, res: Response): Promise<void> {
    try {
      const deletionRequest: Omit<DataDeletionRequest, 'id' | 'requestedAt' | 'status' | 'auditTrail'> = {
        userId: req.body.userId,
        userType: req.body.userType,
        complianceFramework: req.body.complianceFramework,
        deletionType: req.body.deletionType,
        requestedBy: req.headers['x-user-id'] as string,
        dataScope: req.body.dataScope,
        retentionPeriods: req.body.retentionPeriods || {
          personalData: req.body.complianceFramework === 'COPPA' ? 0 : 2555, // COPPA immediate, FERPA 7 years
          communications: 90,
          financialData: 2555,
          auditLogs: req.body.complianceFramework === 'GDPR' ? 0 : 2555
        }
      };

      // Validate deletion request based on framework
      const validationError = this.validateDeletionRequest(deletionRequest);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const request: DataDeletionRequest = {
        ...deletionRequest,
        id: uuidv4(),
        requestedAt: new Date().toISOString(),
        status: 'pending',
        auditTrail: []
      };

      // Store request
      const container = this.cosmosClient.getContainer('audit-logs');
      await container.items.create({
        type: 'data_deletion_request',
        ...request
      });

      // Publish event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataDeletionRequested',
        aggregateId: request.id,
        aggregateType: 'DataDeletionRequest',
        timestamp: new Date().toISOString(),
        correlationId: (req as any).correlationId!,
        userId: request.userId,
        userType: request.userType,
        source: 'compliance-service',
        version: 1,
        metadata: {
          priority: 'critical',
          complianceFlags: [request.complianceFramework.toLowerCase()],
          idempotencyKey: uuidv4()
        },
        payload: request
      });

      // Log audit event
      await this.logAuditEvent({
        userId: request.userId,
        userType: request.userType,
        action: 'data_deletion_requested',
        resource: 'user_data',
        operation: 'delete',
        success: true,
        metadata: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown',
          correlationId: (req as any).correlationId!,
          complianceFlags: [request.complianceFramework.toLowerCase()],
          deletionType: request.deletionType,
          requestId: request.id,
          sensitivity: 'confidential' as const,
          retentionPeriod: 2555
        } as any,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        requestId: request.id,
        status: 'pending',
        estimatedCompletion: request.deletionType === 'complete' ? '7-14 days' : '24-48 hours'
      });

    } catch (error) {
      logger.error('Data deletion request error:', error as Error);
      res.status(500).json({ error: 'Failed to create deletion request' });
    }
  }

  private validateDeletionRequest(request: Omit<DataDeletionRequest, 'id' | 'requestedAt' | 'status' | 'auditTrail'>): string | null {
    switch (request.complianceFramework) {
      case 'COPPA':
        if (request.userType !== 'athlete') {
          return 'COPPA deletion requests are only valid for athletes';
        }
        if (request.deletionType === 'complete' && !request.dataScope.personalData) {
          return 'COPPA requires complete personal data deletion';
        }
        break;

      case 'FERPA':
        if (!['athlete', 'parent'].includes(request.userType)) {
          return 'FERPA deletion requests are only valid for athletes and parents';
        }
        break;

      case 'GDPR':
        // GDPR allows any data subject to request deletion
        break;
    }

    return null;
  }

  // ─── AUDIT LOGGING IMPLEMENTATION ──────────────────────────────────────────

  private async logAuditEvent(event: Omit<ComplianceAuditLog, 'id' | 'eventId' | 'hash' | 'previousHash'>): Promise<void> {
    try {
      const eventId = uuidv4();
      const timestamp = event.timestamp || new Date().toISOString();

      // Get previous hash for chain
      const previousHash = await this.auditChain.getLatestHash();

      // Create event data
      const eventData = {
        ...event,
        id: eventId,
        eventId,
        timestamp,
        previousHash
      };

      // Calculate hash
      const hash = this.auditChain.calculateHash(eventData);

      const auditEvent: ComplianceAuditLog = {
        ...eventData,
        hash
      };

      // Store in immutable audit log
      const container = this.cosmosClient.getContainer('audit-logs');
      await container.items.create({
        type: 'audit_event',
        partitionKey: this.auditChain.getPartitionKey(timestamp),
        ...auditEvent,
        ttl: (auditEvent.metadata.retentionPeriod || 365) * 24 * 60 * 60 // Default to 1 year if not specified
      });

      // Update chain
      this.auditChain.updateLatestHash(hash);

    } catch (error) {
      logger.error('Audit logging error:', error as Error);
      // Audit logging failures are critical - should trigger alerts
      throw error;
    }
  }

  // ─── BASIC ROUTE IMPLEMENTATIONS ───────────────────────────────────────────

  private async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      service: 'compliance-service',
      timestamp: new Date().toISOString()
    });
  }

  private async getRoles(req: Request, res: Response): Promise<void> {
    // Implementation for getting roles
    res.json({ roles: [] });
  }

  private async createRole(req: Request, res: Response): Promise<void> {
    // Implementation for creating roles
    res.status(201).json({ roleId: uuidv4() });
  }

  private async updateRole(req: Request, res: Response): Promise<void> {
    // Implementation for updating roles
    res.json({ success: true });
  }

  private async deleteRole(req: Request, res: Response): Promise<void> {
    // Implementation for deleting roles
    res.json({ success: true });
  }

  private async assignRole(req: Request, res: Response): Promise<void> {
    // Implementation for assigning roles
    res.json({ success: true });
  }

  private async revokeRole(req: Request, res: Response): Promise<void> {
    // Implementation for revoking roles
    res.json({ success: true });
  }

  private async getUserPermissions(req: Request, res: Response): Promise<void> {
    // Implementation for getting user permissions
    res.json({ permissions: [] });
  }

  private async getExportStatus(req: Request, res: Response): Promise<void> {
    // Implementation for getting export status
    res.json({ status: 'pending' });
  }

  private async downloadExport(req: Request, res: Response): Promise<void> {
    // Implementation for downloading export
    res.status(404).json({ error: 'Export not ready' });
  }

  private async getDeletionStatus(req: Request, res: Response): Promise<void> {
    // Implementation for getting deletion status
    res.json({ status: 'pending' });
  }

  private async recordConsent(req: Request, res: Response): Promise<void> {
    // Implementation for recording consent
    res.status(201).json({ consentId: uuidv4() });
  }

  private async getConsentHistory(req: Request, res: Response): Promise<void> {
    // Implementation for getting consent history
    res.json({ consents: [] });
  }

  private async revokeConsent(req: Request, res: Response): Promise<void> {
    // Implementation for revoking consent
    res.json({ success: true });
  }

  private async getComplianceStatus(req: Request, res: Response): Promise<void> {
    // Implementation for getting compliance status
    res.json({ status: 'compliant' });
  }

  private async getComplianceReports(req: Request, res: Response): Promise<void> {
    // Implementation for getting compliance reports
    res.json({ reports: [] });
  }

  private async reportViolation(req: Request, res: Response): Promise<void> {
    // Implementation for reporting violations
    res.status(201).json({ violationId: uuidv4() });
  }

  private async getAuditLogs(req: Request, res: Response): Promise<void> {
    // Implementation for getting audit logs
    res.json({ logs: [] });
  }

  private async reportDataBreach(req: Request, res: Response): Promise<void> {
    // Implementation for reporting data breaches
    res.status(201).json({ incidentId: uuidv4() });
  }

  private async runComplianceCheck(req: Request, res: Response): Promise<void> {
    // Implementation for running compliance checks
    res.json({ results: [] });
  }

  private async generateComplianceReport(req: Request, res: Response): Promise<void> {
    // Implementation for generating compliance reports
    res.status(201).json({ reportId: uuidv4() });
  }
}

// ─── AUDIT CHAIN FOR IMMUTABILITY ────────────────────────────────────────────

class AuditChain {
  private latestHash: string = '';

  calculateHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  getLatestHash(): string {
    return this.latestHash;
  }

  updateLatestHash(hash: string): void {
    this.latestHash = hash;
  }

  getPartitionKey(timestamp: string): string {
    // Use date-based partitioning for audit logs
    const date = new Date(timestamp).toISOString().slice(0, 10);
    return `audit_${date}_001`; // Simplified - would use hash in production
  }

  async verifyChainIntegrity(container: Container, startDate: string, endDate: string): Promise<boolean> {
    // Implementation to verify the hash chain integrity
    // This would check that each event's previousHash matches the previous event's hash
    return true; // Placeholder
  }
}

// ─── EXPORT SERVICE ──────────────────────────────────────────────────────────
