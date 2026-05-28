/**
 * COMPLIANCE & DATA GOVERNANCE ORCHESTRATOR
 * Main orchestrator for compliance services, data pipelines, and monitoring
 * Enterprise-grade compliance framework for regulated sports recruiting platform
 */

import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import express from 'express';
import { OptimizedCosmosClient, COSMOS_SCHEMA } from './cosmos-schema';
import { ComplianceService } from './compliance-service';
import { DataExportPipeline, DataDeletionPipeline } from './data-pipelines';
import { ComplianceMonitor, ComplianceAlerting } from './compliance-monitoring';
import { eventPublisher } from './service-bus';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// ─── COMPLIANCE ORCHESTRATOR ─────────────────────────────────────────────────

export class ComplianceOrchestrator {
  private cosmosClient!: OptimizedCosmosClient;
  private serviceBusClient?: ServiceBusClient;
  private blobService?: BlobServiceClient;

  private complianceService!: ComplianceService;
  private exportPipeline!: DataExportPipeline;
  private deletionPipeline!: DataDeletionPipeline;
  private complianceMonitor!: ComplianceMonitor;
  private complianceAlerting!: ComplianceAlerting;

  private app: express.Application;
  private eventReceivers: any[] = [];

  constructor() {
    this.app = express();

    this.setupConfiguration();
    this.initializeComponents();
    this.setupRoutes();
    this.setupEventHandlers();
  }

  private setupConfiguration(): void {
    // Initialize Azure clients
    this.cosmosClient = new OptimizedCosmosClient(COSMOS_SCHEMA);
    if (process.env.AZURE_SERVICEBUS_CONNECTION_STRING) {
      this.serviceBusClient = new ServiceBusClient(
        process.env.AZURE_SERVICEBUS_CONNECTION_STRING
      );
    } else {
      logger.warn('⚠️ Azure Service Bus connection string missing in compliance orchestrator');
    }

    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.blobService = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
    } else {
      logger.warn('⚠️ Azure Storage connection string missing in compliance orchestrator');
    }
  }

  private initializeComponents(): void {
    // Initialize core services
    this.complianceService = new ComplianceService(
      this.cosmosClient,
      this.serviceBusClient!
    );

    this.exportPipeline = new DataExportPipeline(
      this.cosmosClient,
      this.blobService!,
      this.serviceBusClient!
    );

    this.deletionPipeline = new DataDeletionPipeline(
      this.cosmosClient,
      this.serviceBusClient!
    );

    this.complianceMonitor = new ComplianceMonitor(
      this.cosmosClient,
      this.serviceBusClient!
    );

    this.complianceAlerting = new ComplianceAlerting(this.complianceMonitor);
  }

  private setupRoutes(): void {
    // Mount compliance service routes
    this.app.use('/compliance', this.complianceService.getApp());

    // Health check
    this.app.get('/health', async (req, res) => {
      res.json({
        status: 'healthy',
        service: 'compliance-orchestrator',
        timestamp: new Date().toISOString(),
        components: {
          complianceService: 'active',
          exportPipeline: 'active',
          deletionPipeline: 'active',
          complianceMonitor: 'active'
        }
      });
    });

    // Readiness check
    this.app.get('/ready', async (req, res) => {
      // Check if all components are ready
      const cosmosReady = true; // Would check actual connectivity
      const serviceBusReady = true; // Would check actual connectivity
      const blobReady = true; // Would check actual connectivity

      const ready = cosmosReady && serviceBusReady && blobReady;
      res.status(ready ? 200 : 503).json({ ready });
    });
  }

  private setupEventHandlers(): void {
    // Set up event receivers for data processing requests
    this.setupDataExportEventHandler();
    this.setupDataDeletionEventHandler();
    this.setupComplianceViolationHandler();
  }

  private async setupDataExportEventHandler(): Promise<void> {
    // Subscribe to data export requested events
    const { serviceBusClient } = await import('./service-bus');

    const receiver = await serviceBusClient.subscribeToTopic(
      'user-events',
      `compliance-export-${Date.now()}`,
      async (message) => {
        try {
          const event = message.body;

          if (event.eventType === 'DataExportRequested') {
            await this.exportPipeline.processExportRequest(event.payload);
          }
        } catch (error) {
          logger.error('Data export event processing error:', error as Error);
          throw error; // Re-throw to let the subscriber helper handle settlement
        }
      }
    );

    this.eventReceivers.push(receiver);
  }

  private async setupDataDeletionEventHandler(): Promise<void> {
    // Subscribe to data deletion requested events
    const { serviceBusClient } = await import('./service-bus');

    const receiver = await serviceBusClient.subscribeToTopic(
      'user-events',
      `compliance-deletion-${Date.now()}`,
      async (message) => {
        try {
          const event = message.body;

          if (event.eventType === 'DataDeletionRequested') {
            await this.deletionPipeline.processDeletionRequest(event.payload);
          }
        } catch (error) {
          logger.error('Data deletion event processing error:', error as Error);
          throw error;
        }
      }
    );

    this.eventReceivers.push(receiver);
  }

  private async setupComplianceViolationHandler(): Promise<void> {
    // Subscribe to compliance violation events
    const { serviceBusClient } = await import('./service-bus');

    const receiver = await serviceBusClient.subscribeToTopic(
      'audit-events',
      `compliance-alerting-${Date.now()}`,
      async (message) => {
        try {
          const event = message.body;

          if (event.eventType === 'ComplianceViolationDetected') {
            await this.complianceAlerting.sendViolationAlert(event.payload);
          } else if (event.eventType === 'DataBreachReported') {
            await this.complianceAlerting.sendBreachNotification(event.payload);
          }
        } catch (error) {
          logger.error('Compliance alerting event processing error:', error as Error);
          throw error;
        }
      }
    );

    this.eventReceivers.push(receiver);
  }

  /**
   * Start the compliance orchestrator
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Compliance & Data Governance Orchestrator...');

      // Initialize Cosmos DB
      await this.cosmosClient.initialize();
      logger.info('📊 Cosmos DB initialized for compliance operations');

      // Start compliance monitoring
      this.complianceMonitor.startMonitoring();
      logger.info('👁️  Compliance monitoring started');

      // Start the HTTP server
      const port = process.env.COMPLIANCE_PORT || 4001;
      this.app.listen(port, () => {
        logger.info(`🌐 Compliance orchestrator listening on port ${port}`);
        logger.info('📋 Available endpoints:');
        logger.info('  - GET  /health - Health check');
        logger.info('  - GET  /ready - Readiness check');
        logger.info('  - POST /compliance/data/export - Request data export');
        logger.info('  - POST /compliance/data/delete - Request data deletion');
        logger.info('  - GET  /compliance/compliance/status - Compliance status');
        logger.info('  - All RBAC endpoints under /compliance/api/*');
      });

      // Log system capabilities
      logger.info('🏢 Compliance Framework: COPPA, FERPA, GDPR');
      logger.info('🔐 Security: Role-based access control, immutable audit logs');
      logger.info('📊 Monitoring: Real-time compliance checks, automated alerting');
      logger.info('🗂️  Data Governance: Export/deletion pipelines, consent management');

    } catch (error) {
      logger.error('❌ Failed to start compliance orchestrator:', error as Error);
      throw error;
    }
  }

  /**
   * Stop the compliance orchestrator
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping Compliance & Data Governance Orchestrator...');

    // Stop compliance monitoring
    this.complianceMonitor.stopMonitoring();

    // Close event receivers
    for (const receiver of this.eventReceivers) {
      await receiver.close();
    }

    // Close clients
    await this.serviceBusClient.close();

    logger.info('✅ Compliance orchestrator stopped');
  }

  /**
   * Get orchestrator status
   */
  getStatus(): any {
    return {
      service: 'compliance-orchestrator',
      components: {
        complianceService: 'active',
        exportPipeline: 'active',
        deletionPipeline: 'active',
        complianceMonitor: 'active',
        complianceAlerting: 'active'
      },
      eventReceivers: this.eventReceivers.length,
      uptime: process.uptime()
    };
  }

  // ─── PUBLIC API METHODS ────────────────────────────────────────────────────

  /**
   * Manually trigger compliance check
   */
  async runComplianceCheck(): Promise<any> {
    return await this.complianceMonitor.runComplianceChecks();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(reportType: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> {
    // This would integrate with the compliance monitoring system
    return {
      reportType,
      generatedAt: new Date().toISOString(),
      status: 'generated'
    };
  }

  /**
   * Get data processing statistics
   */
  async getDataProcessingStats(): Promise<any> {
    // Return statistics about data exports, deletions, etc.
    return {
      exportsProcessed: 0,
      deletionsProcessed: 0,
      consentsManaged: 0,
      complianceViolations: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Emergency stop all data processing
   */
  async emergencyStop(): Promise<void> {
    logger.error('🚨 EMERGENCY STOP initiated for compliance operations');

    // Stop all pipelines
    this.complianceMonitor.stopMonitoring();

    // Close all receivers
    for (const receiver of this.eventReceivers) {
      await receiver.close();
    }

    // Log emergency stop
    await eventPublisher.publish({
      id: uuidv4(),
      eventType: 'ComplianceEmergencyStop' as any,
      aggregateId: 'emergency-stop',
      aggregateType: 'ComplianceSystem',
      timestamp: new Date().toISOString(),
      correlationId: uuidv4(),
      source: 'compliance-orchestrator',
      version: 1,
      metadata: {
        priority: 'critical',
        complianceFlags: ['coppa', 'ferpa', 'gdpr'],
        idempotencyKey: uuidv4()
      },
      payload: {
        reason: 'Emergency stop initiated',
        timestamp: new Date().toISOString(),
        initiatedBy: 'system'
      }
    });
  }
}

// ─── COMPLIANCE DASHBOARD ────────────────────────────────────────────────────

export class ComplianceDashboard {
  private orchestrator: ComplianceOrchestrator;

  constructor(orchestrator: ComplianceOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Get compliance dashboard data
   */
  async getDashboardData(): Promise<any> {
    const [
      orchestratorStatus,
      complianceStatus,
      dataProcessingStats
    ] = await Promise.all([
      Promise.resolve(this.orchestrator.getStatus()),
      this.orchestrator.runComplianceCheck(),
      this.orchestrator.getDataProcessingStats()
    ]);

    return {
      timestamp: new Date().toISOString(),
      orchestrator: orchestratorStatus,
      compliance: complianceStatus,
      dataProcessing: dataProcessingStats,
      alerts: await this.getActiveAlerts(),
      recommendations: await this.getComplianceRecommendations()
    };
  }

  private async getActiveAlerts(): Promise<any[]> {
    // Return active compliance alerts
    return [];
  }

  private async getComplianceRecommendations(): Promise<string[]> {
    return [
      'Review parental consent compliance for athletes under 13',
      'Implement automated data retention policies',
      'Enhance audit log integrity monitoring',
      'Regular compliance training for staff'
    ];
  }

  /**
   * Export dashboard data for reporting
   */
  async exportDashboardData(): Promise<any> {
    const dashboardData = await this.getDashboardData();

    return {
      ...dashboardData,
      exportedAt: new Date().toISOString(),
      format: 'json',
      complianceFrameworks: ['COPPA', 'FERPA', 'GDPR'],
      dataRetention: '7 years for audit logs, 30 days for operational data'
    };
  }
}

// ─── COMPLIANCE UTILITIES ────────────────────────────────────────────────────

export class ComplianceUtils {
  /**
   * Validate age for COPPA compliance
   */
  static isCOPPACompliant(age: number): boolean {
    return age >= 13;
  }

  /**
   * Calculate data retention period based on framework
   */
  static getRetentionPeriod(framework: 'COPPA' | 'FERPA' | 'GDPR', dataType: string): number {
    const retentionMap: Record<string, Record<string, number>> = {
      COPPA: {
        personal: 0, // Immediate deletion unless parental consent
        communications: 90,
        financial: 2555,
        audit: 2555
      },
      FERPA: {
        personal: 2555, // 7 years
        communications: 2555,
        financial: 2555,
        audit: 2555
      },
      GDPR: {
        personal: 0, // Right to erasure
        communications: 2555,
        financial: 2555,
        audit: 2555
      }
    };

    return retentionMap[framework]?.[dataType] || 2555;
  }

  /**
   * Check if user requires parental consent
   */
  static requiresParentalConsent(userType: string, age?: number): boolean {
    if (userType === 'athlete' && age !== undefined) {
      return age < 13;
    }
    return false;
  }

  /**
   * Validate data processing consent
   */
  static validateConsent(consent: any): boolean {
    return !!(
      consent.consented &&
      consent.consentVersion &&
      consent.grantedAt &&
      !consent.revokedAt
    );
  }

  /**
   * Generate compliance report summary
   */
  static generateComplianceSummary(metrics: any[]): any {
    const summary = {
      overallCompliance: 'compliant',
      criticalIssues: 0,
      warningIssues: 0,
      frameworks: {
        COPPA: { status: 'compliant', issues: 0 },
        FERPA: { status: 'compliant', issues: 0 },
        GDPR: { status: 'compliant', issues: 0 }
      }
    };

    for (const metric of metrics) {
      if (metric.status === 'critical') {
        summary.criticalIssues++;
        summary.frameworks[metric.framework].issues++;
        summary.frameworks[metric.framework].status = 'critical';
        summary.overallCompliance = 'critical';
      } else if (metric.status === 'warning') {
        summary.warningIssues++;
        if (summary.frameworks[metric.framework].status !== 'critical') {
          summary.frameworks[metric.framework].status = 'warning';
          if (summary.overallCompliance === 'compliant') {
            summary.overallCompliance = 'warning';
          }
        }
      }
    }

    return summary;
  }
}

// ─── EXPORT ORCHESTRATOR ─────────────────────────────────────────────────────
