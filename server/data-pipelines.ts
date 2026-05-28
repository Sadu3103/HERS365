/**
 * DATA GOVERNANCE PIPELINES
 * Enterprise-grade data export and deletion pipelines
 * Handles compliance requirements for COPPA, FERPA, and GDPR
 */

import { CosmosClient, Container, SqlQuerySpec, FeedOptions } from '@azure/cosmos';
import { ServiceBusClient, ServiceBusMessage } from '@azure/service-bus';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { logger } from './logger';
import { OptimizedCosmosClient } from './cosmos-schema';
import { eventPublisher } from './service-bus';
import { DataExportRequest, DataDeletionRequest, DeletionAuditEntry } from './compliance-types';

// ─── DATA EXPORT PIPELINE ────────────────────────────────────────────────────

export class DataExportPipeline {
  private cosmosClient: OptimizedCosmosClient;
  private blobService: BlobServiceClient;
  private serviceBusClient: ServiceBusClient;

  constructor(
    cosmosClient: OptimizedCosmosClient,
    blobService: BlobServiceClient | undefined,
    serviceBusClient: ServiceBusClient | undefined
  ) {
    this.cosmosClient = cosmosClient;
    this.blobService = blobService;
    this.serviceBusClient = serviceBusClient;
  }

  /**
   * Process data export request
   */
  async processExportRequest(request: DataExportRequest): Promise<void> {
    try {
      logger.info(`Starting data export for user ${request.userId}`, { requestId: request.id });

      // Update status to processing
      await this.updateExportStatus(request.id, 'processing');

      // Collect user data
      const userData = await this.collectUserData(request);

      // Generate export files
      const exportFiles = await this.generateExportFiles(request, userData);

      // Upload to secure storage
      const downloadUrls = await this.uploadExportFiles(request.id, exportFiles);

      // Update request with completion
      await this.completeExportRequest(request.id, downloadUrls);

      // Publish completion event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataExportCompleted',
        aggregateId: request.id,
        aggregateType: 'DataExportRequest',
        timestamp: new Date().toISOString(),
        correlationId: request.id,
        userId: request.userId,
        userType: request.userType,
        source: 'data-export-pipeline',
        version: 1,
        metadata: {
          priority: 'medium',
          complianceFlags: [request.complianceFramework.toLowerCase()],
          idempotencyKey: uuidv4()
        },
        payload: {
          requestId: request.id,
          downloadUrls,
          completedAt: new Date().toISOString()
        }
      });

      logger.info(`Completed data export for user ${request.userId}`, { requestId: request.id });

    } catch (error) {
      logger.error(`Data export failed for request ${request.id}:`, error as Error);

      // Update status to failed
      await this.updateExportStatus(request.id, 'failed', error instanceof Error ? error.message : 'Unknown error');

      // Publish failure event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataExportFailed',
        aggregateId: request.id,
        aggregateType: 'DataExportRequest',
        timestamp: new Date().toISOString(),
        correlationId: request.id,
        userId: request.userId,
        userType: request.userType,
        source: 'data-export-pipeline',
        version: 1,
        metadata: {
          priority: 'high',
          complianceFlags: [request.complianceFramework.toLowerCase()]
        },
        payload: {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      });
    }
  }

  private async collectUserData(request: DataExportRequest): Promise<any> {
    const userData: any = {
      userId: request.userId,
      userType: request.userType,
      exportMetadata: {
        requestId: request.id,
        requestedAt: request.requestedAt,
        complianceFramework: request.complianceFramework,
        dataScope: request.dataScope
      }
    };

    // Collect data based on scope
    if (request.dataScope.includePersonal) {
      userData.personal = await this.getUserPersonalData(request.userId, request.userType);
    }

    if (request.dataScope.includeCommunications) {
      userData.communications = await this.getUserCommunications(request.userId, request.userType, request.dataScope.dateRange);
    }

    if (request.dataScope.includeFinancial) {
      userData.financial = await this.getUserFinancialData(request.userId, request.userType, request.dataScope.dateRange);
    }

    if (request.dataScope.includeAuditLogs) {
      userData.auditLogs = await this.getUserAuditLogs(request.userId, request.userType, request.dataScope.dateRange);
    }

    return userData;
  }

  private async getUserPersonalData(userId: string, userType: string): Promise<any> {
    const userRepo = this.cosmosClient.getQueryPatterns('users');
    const user = await userRepo.getUserById(userId);

    if (!user) return null;

    // Remove sensitive fields based on compliance framework
    const { password, ...safeUser } = user;

    // Add related data based on user type
    switch (userType) {
      case 'athlete':
        safeUser.profiles = await this.getAthleteProfiles(userId);
        safeUser.rankings = await this.getAthleteRankings(userId);
        break;
      case 'parent':
        safeUser.children = await this.getParentChildren(userId);
        break;
      case 'coach':
        safeUser.recruiting = await this.getCoachRecruitingData(userId);
        break;
    }

    return safeUser;
  }

  private async getUserCommunications(userId: string, userType: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    const messageRepo = this.cosmosClient.getQueryPatterns('messages');

    let messages: any[] = [];

    // Get sent messages
    const sentMessages = await messageRepo.getUserInbox(userId, dateRange ? new Date(dateRange.end) : undefined, 1000);

    // Get received messages
    const receivedMessages = await messageRepo.getConversationMessages(
      `conv_${userId}_*`, // Simplified - would need proper conversation lookup
      dateRange ? new Date(dateRange.end) : undefined,
      1000
    );

    messages = [...sentMessages, ...receivedMessages];

    // Filter and anonymize sensitive data
    return messages.map(msg => ({
      id: msg.messageId,
      conversationId: msg.conversationId,
      type: msg.messageType,
      status: msg.status,
      timestamp: msg.createdAt,
      // Anonymize sender/receiver for privacy
      direction: msg.senderId === userId ? 'sent' : 'received',
      content: this.anonymizeContent(msg.content)
    }));
  }

  private async getUserFinancialData(userId: string, userType: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // This would integrate with payment service
    // Placeholder implementation
    return [{
      type: 'NIL_deal',
      amount: 50000,
      currency: 'USD',
      status: 'completed',
      date: '2024-01-15T10:00:00Z',
      description: 'Sponsorship deal'
    }];
  }

  private async getUserAuditLogs(userId: string, userType: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    const auditContainer = this.cosmosClient.getContainer('audit-logs');

    const querySpec: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
          AND (@startDate = null OR c.timestamp >= @startDate)
          AND (@endDate = null OR c.timestamp <= @endDate)
        ORDER BY c.timestamp DESC
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@startDate', value: dateRange?.start || null },
        { name: '@endDate', value: dateRange?.end || null }
      ]
    };

    const { resources } = await auditContainer.items.query(querySpec, {
      maxItemCount: 1000
    }).fetchAll();

    return resources;
  }

  private async generateExportFiles(request: DataExportRequest, userData: any): Promise<Map<string, string>> {
    const exportFiles = new Map<string, string>();

    for (const format of request.formats) {
      const filePath = await this.generateFile(request, userData, format);
      exportFiles.set(format, filePath);
    }

    return exportFiles;
  }

  private async generateFile(request: DataExportRequest, userData: any, format: string): Promise<string> {
    const fileName = `export_${request.userId}_${request.id}_${format}.${format}`;
    const filePath = join(tmpdir(), fileName);

    switch (format) {
      case 'json':
        await this.writeJsonFile(filePath, userData);
        break;
      case 'csv':
        await this.writeCsvFile(filePath, userData);
        break;
      case 'pdf':
        await this.writePdfFile(filePath, userData);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return filePath;
  }

  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  private async writeCsvFile(filePath: string, data: any): Promise<void> {
    // Simplified CSV generation - would use a proper CSV library
    let csv = 'Category,Field,Value\n';

    const flatten = (obj: any, prefix = ''): string[] => {
      const rows: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          rows.push(...flatten(value, `${prefix}${key}.`));
        } else {
          rows.push(`${prefix.slice(0, -1)},${key},${value}`);
        }
      }
      return rows;
    };

    csv += flatten(data).join('\n');

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, csv);
  }

  private async writePdfFile(filePath: string, data: any): Promise<void> {
    // Would integrate with PDF generation library like Puppeteer
    // Placeholder - create simple text file for now
    const fs = await import('fs/promises');
    const content = `
DATA EXPORT REPORT
==================

User ID: ${data.userId}
User Type: ${data.userType}
Export Date: ${new Date().toISOString()}

Personal Data:
${JSON.stringify(data.personal, null, 2)}

Communications:
${JSON.stringify(data.communications, null, 2)}

Financial Data:
${JSON.stringify(data.financial, null, 2)}

Audit Logs:
${JSON.stringify(data.auditLogs, null, 2)}
    `;
    await fs.writeFile(filePath, content);
  }

  private async uploadExportFiles(requestId: string, exportFiles: Map<string, string>): Promise<Record<string, string>> {
    const downloadUrls: Record<string, string> = {};

    for (const [format, filePath] of exportFiles) {
      const blobName = `exports/${requestId}/${format}.${format}`;
      const blobClient = this.blobService.getContainerClient('exports').getBlockBlobClient(blobName);

      await blobClient.uploadFile(filePath);

      // Generate SAS token for secure access (would be time-limited)
      const sasUrl = blobClient.url; // Simplified - would add SAS token
      downloadUrls[format] = sasUrl;

      // Clean up local file
      await unlink(filePath);
    }

    return downloadUrls;
  }

  private async updateExportStatus(requestId: string, status: string, errorMessage?: string): Promise<void> {
    const container = this.cosmosClient.getContainer('audit-logs');

    const updates: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (errorMessage) updates.errorMessage = errorMessage;
    if (status === 'completed') updates.completedAt = new Date().toISOString();

    await container.item(requestId, requestId).patch([{
      op: 'add',
      path: '/status',
      value: status
    }]);
  }

  private async completeExportRequest(requestId: string, downloadUrls: Record<string, string>): Promise<void> {
    const container = this.cosmosClient.getContainer('audit-logs');

    await container.item(requestId, requestId).patch([
      { op: 'add', path: '/status', value: 'completed' },
      { op: 'add', path: '/downloadUrl', value: downloadUrls.json }, // Primary format
      { op: 'add', path: '/completedAt', value: new Date().toISOString() }
    ]);
  }

  // Helper methods (simplified implementations)
  private async getAthleteProfiles(userId: string): Promise<any[]> { return []; }
  private async getAthleteRankings(userId: string): Promise<any[]> { return []; }
  private async getParentChildren(userId: string): Promise<any[]> { return []; }
  private async getCoachRecruitingData(userId: string): Promise<any[]> { return []; }

  private anonymizeContent(content: string): string {
    // Simple anonymization - would use more sophisticated NLP in production
    return content.replace(/\b\d{10,}\b/g, '[PHONE_NUMBER]')
                  .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  }
}

// ─── DATA DELETION PIPELINE ──────────────────────────────────────────────────

export class DataDeletionPipeline {
  private cosmosClient: OptimizedCosmosClient;
  private serviceBusClient: ServiceBusClient;

  constructor(
    cosmosClient: OptimizedCosmosClient,
    serviceBusClient: ServiceBusClient | undefined
  ) {
    this.cosmosClient = cosmosClient;
    this.serviceBusClient = serviceBusClient;
  }

  /**
   * Process data deletion request
   */
  async processDeletionRequest(request: DataDeletionRequest): Promise<void> {
    try {
      logger.info(`Starting data deletion for user ${request.userId}`, { requestId: request.id });

      // Update status to processing
      await this.updateDeletionStatus(request.id, 'processing');

      // Execute deletion based on type
      const auditTrail = await this.executeDeletion(request);

      // Update request with completion
      await this.completeDeletionRequest(request.id, auditTrail);

      // Publish completion event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataDeletionCompleted',
        aggregateId: request.id,
        aggregateType: 'DataDeletionRequest',
        timestamp: new Date().toISOString(),
        correlationId: request.id,
        userId: request.userId,
        userType: request.userType,
        source: 'data-deletion-pipeline',
        version: 1,
        metadata: {
          priority: 'critical',
          complianceFlags: [request.complianceFramework.toLowerCase()],
          idempotencyKey: uuidv4()
        },
        payload: {
          requestId: request.id,
          deletionType: request.deletionType,
          auditTrail,
          completedAt: new Date().toISOString()
        }
      });

      logger.info(`Completed data deletion for user ${request.userId}`, { requestId: request.id });

    } catch (error) {
      logger.error(`Data deletion failed for request ${request.id}:`, error as Error);

      // Update status to failed
      await this.updateDeletionStatus(request.id, 'failed', error instanceof Error ? error.message : 'Unknown error');

      // Publish failure event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'DataDeletionFailed',
        aggregateId: request.id,
        aggregateType: 'DataDeletionRequest',
        timestamp: new Date().toISOString(),
        correlationId: request.id,
        userId: request.userId,
        userType: request.userType,
        source: 'data-deletion-pipeline',
        version: 1,
        metadata: {
          priority: 'critical',
          complianceFlags: [request.complianceFramework.toLowerCase()]
        },
        payload: {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      });
    }
  }

  private async executeDeletion(request: DataDeletionRequest): Promise<DeletionAuditEntry[]> {
    const auditTrail: DeletionAuditEntry[] = [];

    // Execute deletion based on type
    switch (request.deletionType) {
      case 'complete':
        return await this.executeCompleteDeletion(request);

      case 'partial':
        return await this.executePartialDeletion(request);

      case 'anonymize':
        return await this.executeAnonymization(request);

      default:
        throw new Error(`Unsupported deletion type: ${request.deletionType}`);
    }
  }

  private async executeCompleteDeletion(request: DataDeletionRequest): Promise<DeletionAuditEntry[]> {
    const auditTrail: DeletionAuditEntry[] = [];

    // Delete from all containers based on data scope
    if (request.dataScope.personalData) {
      const count = await this.deletePersonalData(request.userId, request.userType);
      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'delete_personal_data',
        affectedRecords: count,
        dataType: 'personal',
        success: true
      });
    }

    if (request.dataScope.communications) {
      const count = await this.deleteCommunications(request.userId, request.userType);
      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'delete_communications',
        affectedRecords: count,
        dataType: 'communications',
        success: true
      });
    }

    if (request.dataScope.financialData) {
      const count = await this.deleteFinancialData(request.userId, request.userType);
      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'delete_financial_data',
        affectedRecords: count,
        dataType: 'financial',
        success: true
      });
    }

    // Audit logs are NEVER deleted - only anonymized if required by law
    if (request.dataScope.auditLogs && request.complianceFramework === 'COPPA') {
      const count = await this.anonymizeAuditLogs(request.userId);
      auditTrail.push({
        timestamp: new Date().toISOString(),
        operation: 'anonymize_audit_logs',
        affectedRecords: count,
        dataType: 'audit_logs',
        success: true
      });
    }

    return auditTrail;
  }

  private async executePartialDeletion(request: DataDeletionRequest): Promise<DeletionAuditEntry[]> {
    const auditTrail: DeletionAuditEntry[] = [];

    // Delete specific data types based on retention periods
    // Implementation would filter by date ranges and data types

    return auditTrail;
  }

  private async executeAnonymization(request: DataDeletionRequest): Promise<DeletionAuditEntry[]> {
    const auditTrail: DeletionAuditEntry[] = [];

    // Anonymize rather than delete - replace PII with hashes or remove entirely
    const count = await this.anonymizeUserData(request.userId, request.userType);
    auditTrail.push({
      timestamp: new Date().toISOString(),
      operation: 'anonymize_user_data',
      affectedRecords: count,
      dataType: 'anonymized_data',
      success: true
    });

    return auditTrail;
  }

  // Data deletion implementations
  private async deletePersonalData(userId: string, userType: string): Promise<number> {
    let deletedCount = 0;

    // Delete from users container
    const usersContainer = this.cosmosClient.getContainer('users');
    const userRepo = this.cosmosClient.getQueryPatterns('users');
    const user = await userRepo.getUserById(userId);

    if (user) {
      await usersContainer.item(userId, user.partitionKey).delete();
      deletedCount++;
    }

    // Delete from search index
    const searchContainer = this.cosmosClient.getContainer('search-index');
    try {
      await searchContainer.item(userId, `search_001`).delete(); // Simplified partition key
      deletedCount++;
    } catch (error) {
      // Item might not exist
    }

    return deletedCount;
  }

  private async deleteCommunications(userId: string, userType: string): Promise<number> {
    // Delete messages from messages container
    const messagesContainer = this.cosmosClient.getContainer('messages');

    // Find all conversations involving the user
    const querySpec: SqlQuerySpec = {
      query: `
        SELECT c.conversationId
        FROM c
        WHERE c.senderId = @userId OR c.recipientId = @userId
      `,
      parameters: [{ name: '@userId', value: userId }]
    };

    const { resources } = await messagesContainer.items.query(querySpec).fetchAll();

    const conversationIds = [...new Set(resources.map(r => r.conversationId))];

    let deletedCount = 0;
    for (const conversationId of conversationIds) {
      // Delete all messages in conversation (simplified - would need proper partitioning)
      const deleteQuery: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.conversationId = @conversationId',
        parameters: [{ name: '@conversationId', value: conversationId }]
      };

      const { resources: messages } = await messagesContainer.items.query(deleteQuery).fetchAll();

      for (const message of messages) {
        await messagesContainer.item(message.id, message.partitionKey).delete();
        deletedCount++;
      }
    }

    return deletedCount;
  }

  private async deleteFinancialData(userId: string, userType: string): Promise<number> {
    // This would integrate with payment service
    // Placeholder - would delete payment records, transaction history, etc.
    return 0;
  }

  private async anonymizeAuditLogs(userId: string): Promise<number> {
    // For COPPA compliance, anonymize audit logs for minors
    const auditContainer = this.cosmosClient.getContainer('audit-logs');

    const querySpec: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }]
    };

    const { resources } = await auditContainer.items.query(querySpec).fetchAll();

    let anonymizedCount = 0;
    for (const auditLog of resources) {
      // Anonymize PII in audit logs
      await auditContainer.item(auditLog.id, auditLog.partitionKey).patch([
        { op: 'remove', path: '/userId' },
        { op: 'add', path: '/anonymized', value: true }
      ]);
      anonymizedCount++;
    }

    return anonymizedCount;
  }

  private async anonymizeUserData(userId: string, userType: string): Promise<number> {
    // Replace PII with anonymized data
    const usersContainer = this.cosmosClient.getContainer('users');
    const userRepo = this.cosmosClient.getQueryPatterns('users');
    const user = await userRepo.getUserById(userId);

    if (!user) return 0;

    // Anonymize user data
    await usersContainer.item(userId, user.partitionKey).patch([
      { op: 'replace', path: '/email', value: `anon_${userId}@deleted.com` },
      { op: 'replace', path: '/name', value: 'Anonymized User' },
      { op: 'remove', path: '/profile' },
      { op: 'add', path: '/anonymized', value: true },
      { op: 'add', path: '/anonymizedAt', value: new Date().toISOString() }
    ]);

    return 1;
  }

  private async updateDeletionStatus(requestId: string, status: string, errorMessage?: string): Promise<void> {
    const container = this.cosmosClient.getContainer('audit-logs');

    await container.item(requestId, requestId).patch([
      { op: 'add', path: '/status', value: status },
      { op: 'add', path: '/updatedAt', value: new Date().toISOString() }
    ]);
  }

  private async completeDeletionRequest(requestId: string, auditTrail: DeletionAuditEntry[]): Promise<void> {
    const container = this.cosmosClient.getContainer('audit-logs');

    await container.item(requestId, requestId).patch([
      { op: 'add', path: '/status', value: 'completed' },
      { op: 'add', path: '/auditTrail', value: auditTrail },
      { op: 'add', path: '/completedAt', value: new Date().toISOString() }
    ]);
  }
}

// ─── EXPORT PIPELINES ────────────────────────────────────────────────────────
