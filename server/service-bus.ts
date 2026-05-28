/**
 * AZURE SERVICE BUS MESSAGING INFRASTRUCTURE
 * Enterprise-grade event-driven messaging with reliability and fault tolerance
 */

import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
  ServiceBusMessage,
  ServiceBusReceivedMessage,
  ServiceBusMessageBatch,
  ServiceBusReceiver,
  CreateQueueOptions,
  CreateTopicOptions,
  CreateSubscriptionOptions
} from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from './logger';
import { BaseEvent, DomainEvent, StoredEvent } from './events';
import { db } from './db';
import * as schema from './schema';
import { eq, and, lt, gt } from 'drizzle-orm';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

interface ServiceBusConfig {
  connectionString?: string;
  fullyQualifiedNamespace?: string;
  credential?: DefaultAzureCredential;
  retryOptions: {
    maxRetries: number;
    retryDelayInMs: number;
    maxRetryDelayInMs: number;
  };
  queueOptions: {
    defaultMaxDeliveryCount: number;
    lockDuration: string;
    defaultMessageTimeToLive: string;
    deadLetteringOnMessageExpiration: boolean;
    enablePartitioning: boolean;
    enableBatchedOperations: boolean;
  };
  topicOptions: {
    defaultMessageTimeToLive: string;
    enablePartitioning: boolean;
    enableBatchedOperations: boolean;
  };
}

const defaultConfig: ServiceBusConfig = {
  retryOptions: {
    maxRetries: 3,
    retryDelayInMs: 1000,
    maxRetryDelayInMs: 30000
  },
  queueOptions: {
    defaultMaxDeliveryCount: 5,
    lockDuration: 'PT5M', // 5 minutes
    defaultMessageTimeToLive: 'P7D', // 7 days
    deadLetteringOnMessageExpiration: true,
    enablePartitioning: true,
    enableBatchedOperations: true
  },
  topicOptions: {
    defaultMessageTimeToLive: 'P30D', // 30 days
    enablePartitioning: true,
    enableBatchedOperations: true
  }
};

// ─── SERVICE BUS CLIENT ───────────────────────────────────────────────────────

export class AzureServiceBusClient {
  private static instance: AzureServiceBusClient;
  private sbClient?: ServiceBusClient;
  private adminClient?: ServiceBusAdministrationClient;
  private config: ServiceBusConfig;
  private disabled: boolean = false;

  private constructor() {
    this.config = {
      ...defaultConfig,
      connectionString: process.env.AZURE_SERVICEBUS_CONNECTION_STRING,
      fullyQualifiedNamespace: process.env.AZURE_SERVICEBUS_NAMESPACE
    };

    if (this.config.connectionString) {
      this.sbClient = new ServiceBusClient(this.config.connectionString, {
        retryOptions: this.config.retryOptions
      });
      this.adminClient = new ServiceBusAdministrationClient(this.config.connectionString);
    } else if (this.config.fullyQualifiedNamespace) {
      const credential = new DefaultAzureCredential();
      this.sbClient = new ServiceBusClient(
        this.config.fullyQualifiedNamespace,
        credential,
        { retryOptions: this.config.retryOptions }
      );
      this.adminClient = new ServiceBusAdministrationClient(
        this.config.fullyQualifiedNamespace,
        credential
      );
    } else {
      logger.warn('⚠️ Azure Service Bus configuration missing - Service Bus features will be disabled');
      this.disabled = true;
    }
  }

  static getInstance(): AzureServiceBusClient {
    if (!AzureServiceBusClient.instance) {
      AzureServiceBusClient.instance = new AzureServiceBusClient();
    }
    return AzureServiceBusClient.instance;
  }

  // ─── INFRASTRUCTURE MANAGEMENT ──────────────────────────────────────────────

  async ensureInfrastructure(): Promise<void> {
    if (this.disabled || !this.adminClient) return;

    logger.info('Ensuring Service Bus infrastructure...');
    try {
      // Create topics for domain events
      await this.createTopicIfNotExists('user-events', {
        ...this.config.topicOptions,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT10M' // 10 minutes
      });

      await this.createTopicIfNotExists('auth-events', {
        ...this.config.topicOptions,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT5M' // 5 minutes
      });

      await this.createTopicIfNotExists('recruiting-events', {
        ...this.config.topicOptions,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT15M' // 15 minutes
      });

      await this.createTopicIfNotExists('payment-events', {
        ...this.config.topicOptions,
        requiresDuplicateDetection: true,
        duplicateDetectionHistoryTimeWindow: 'PT30M' // 30 minutes
      });

      await this.createTopicIfNotExists('audit-events', {
        ...this.config.topicOptions,
        enableBatchedOperations: false // Audit events must be processed individually
      });

      await this.createTopicIfNotExists('system-events', {
        ...this.config.topicOptions
      });

      // Create queues for service-specific processing
      await this.createQueueIfNotExists('user-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('auth-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('recruiting-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('payment-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('notification-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('analytics-service-queue', this.config.queueOptions);
      await this.createQueueIfNotExists('audit-service-queue', this.config.queueOptions);

      // Create dead letter queues for failed processing
      await this.createQueueIfNotExists('dead-letter-queue', {
        ...this.config.queueOptions,
        defaultMessageTimeToLive: 'P90D' // 90 days retention
      });

      logger.info('Azure Service Bus infrastructure initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Service Bus infrastructure:', error as Error);
      throw error;
    }
  }

  private async createTopicIfNotExists(topicName: string, options: CreateTopicOptions): Promise<void> {
    try {
      await this.adminClient.createTopic(topicName, options);
      logger.info(`Created topic: ${topicName}`);
    } catch (error: any) {
      if (error.code !== 'MessageEntityAlreadyExistsError') {
        throw error;
      }
    }
  }

  private async createQueueIfNotExists(queueName: string, options: CreateQueueOptions): Promise<void> {
    try {
      await this.adminClient.createQueue(queueName, options);
      logger.info(`Created queue: ${queueName}`);
    } catch (error: any) {
      if (error.code !== 'MessageEntityAlreadyExistsError') {
        throw error;
      }
    }
  }

  // ─── EVENT PUBLISHING ───────────────────────────────────────────────────────

  async publishEvent(event: DomainEvent): Promise<void> {
    try {
      // Store event in database first for reliability
      await this.storeEvent(event);

      if (this.disabled || !this.sbClient) {
        logger.debug(`Skipping publish of event ${event.eventType} (Service Bus disabled)`);
        return;
      }

      // Determine topic based on event type
      const topicName = this.getTopicForEvent(event.eventType);

      // Create Service Bus message
      const message: ServiceBusMessage = {
        messageId: event.id,
        correlationId: event.correlationId,
        subject: event.eventType,
        body: event,
        applicationProperties: {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          version: event.version,
          priority: event.metadata?.priority || 'medium',
          userId: event.userId ?? null,
          userType: event.userType ?? null,
          complianceFlags: event.metadata?.complianceFlags?.join(',') ?? null,
          idempotencyKey: event.metadata?.idempotencyKey ?? null
        },
        timeToLive: event.metadata?.ttl ? event.metadata?.ttl * 1000 : undefined
      };

      const sender = this.sbClient.createSender(topicName);
      await sender.sendMessages(message);
      await sender.close();

      logger.info(`Published event: ${event.eventType} (${event.id}) to ${topicName}`);

    } catch (error) {
      logger.error(`Failed to publish event ${event.id}:`, error as Error);
      throw error;
    }
  }

  async publishEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    // Group events by topic
    const eventsByTopic = new Map<string, DomainEvent[]>();
    for (const event of events) {
      const topic = this.getTopicForEvent(event.eventType);
      if (!eventsByTopic.has(topic)) {
        eventsByTopic.set(topic, []);
      }
      eventsByTopic.get(topic)!.push(event);
    }

    // Publish batches by topic
    for (const [topicName, topicEvents] of eventsByTopic) {
      try {
        // Store events in database
        await Promise.all(topicEvents.map(event => this.storeEvent(event)));

        // Create batch
        if (this.disabled || !this.sbClient) {
          logger.warn(`Service Bus disabled: Would have published ${topicEvents.length} events to ${topicName}`);
          continue;
        }

        const sender = this.sbClient.createSender(topicName);
        const batch = await sender.createMessageBatch();

        for (const event of topicEvents) {
          const message: ServiceBusMessage = {
            messageId: event.id,
            correlationId: event.correlationId,
            subject: event.eventType,
            body: event,
            applicationProperties: {
              aggregateId: event.aggregateId,
              aggregateType: event.aggregateType,
              version: event.version,
              priority: event.metadata?.priority || 'medium',
              userId: event.userId ?? null,
              userType: event.userType ?? null,
              complianceFlags: event.metadata?.complianceFlags?.join(',') ?? null,
              idempotencyKey: event.metadata?.idempotencyKey ?? null
            },
            timeToLive: event.metadata?.ttl ? event.metadata?.ttl * 1000 : undefined
          };

          const added = batch.tryAddMessage(message);
          if (!added) {
            // Send current batch and create new one
            await sender.sendMessages(batch);
            const newBatch = await sender.createMessageBatch();
            newBatch.tryAddMessage(message);
            Object.assign(batch, newBatch);
          }
        }

        if (batch.count > 0) {
          await sender.sendMessages(batch);
        }

        await sender.close();
        logger.info(`Published ${topicEvents.length} events to ${topicName}`);

      } catch (error) {
        logger.error(`Failed to publish batch to ${topicName}:`, error as Error);
        throw error;
      }
    }
  }

  private getTopicForEvent(eventType: string): string {
    const topicMap: Record<string, string> = {
      // User events
      'UserCreated': 'user-events',
      'UserUpdated': 'user-events',
      'UserDeleted': 'user-events',

      // Auth events
      'LoginAttempted': 'auth-events',
      'LoginSuccessful': 'auth-events',
      'LoginFailed': 'auth-events',
      'TokenRefreshed': 'auth-events',

      // Recruiting events
      'ScholarshipOffered': 'recruiting-events',
      'ScholarshipAccepted': 'recruiting-events',
      'MessageSent': 'recruiting-events',

      // Payment events
      'PaymentProcessed': 'payment-events',
      'NILDealCreated': 'payment-events',

      // Audit events
      'AuditEventLogged': 'audit-events',
      'ComplianceViolation': 'audit-events',

      // System events
      'ServiceHealth': 'system-events',
      'CircuitBreaker': 'system-events'
    };

    return topicMap[eventType] || 'system-events';
  }

  // ─── EVENT STORAGE ──────────────────────────────────────────────────────────

  private async storeEvent(event: DomainEvent): Promise<void> {
    try {
      await db.insert(schema.eventStore).values({
        id: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        causationId: event.causationId,
        userId: event.userId,
        userType: event.userType,
        source: event.source,
        version: event.version,
        metadata: JSON.stringify(event.metadata),
        payload: JSON.stringify(event.payload),
        processed: false,
        retryCount: 0,
        maxRetries: 3,
        deadLetter: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to store event ${event.id}:`, error as Error);
      throw error;
    }
  }

  async markEventProcessed(eventId: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      await db
        .update(schema.eventStore)
        .set({
          processed: true,
          processedAt: new Date().toISOString(),
          errorMessage: success ? undefined : errorMessage
        })
        .where(eq(schema.eventStore.id, eventId));
    } catch (error) {
      logger.error(`Failed to mark event ${eventId} as processed:`, error as Error);
    }
  }

  async incrementEventRetry(eventId: string): Promise<boolean> {
    try {
      const event = await db
        .select()
        .from(schema.eventStore)
        .where(eq(schema.eventStore.id, eventId))
        .limit(1);

      const eventRecord = event[0];
      if (!eventRecord) return false;

      const newRetryCount = (eventRecord.retryCount || 0) + 1;
      const shouldDeadLetter = newRetryCount >= (eventRecord.maxRetries || 3);

      await db
        .update(schema.eventStore)
        .set({
          retryCount: newRetryCount,
          deadLetter: shouldDeadLetter,
          deadLetterReason: shouldDeadLetter ? 'Max retries exceeded' : undefined,
          errorMessage: shouldDeadLetter ? 'Event moved to dead letter queue' : undefined
        })
        .where(eq(schema.eventStore.id, eventId));

      return shouldDeadLetter;
    } catch (error) {
      logger.error(`Failed to increment retry for event ${eventId}:`, error as Error);
      return false;
    }
  }

  // ─── EVENT CONSUMPTION ──────────────────────────────────────────────────────

  async subscribeToQueue(
    queueName: string,
    messageHandler: (message: ServiceBusReceivedMessage) => Promise<void>,
    errorHandler?: (error: any) => Promise<void>
  ): Promise<ServiceBusReceiver | undefined> {
    if (this.disabled || !this.sbClient) {
      logger.debug(`Skipping subscribeToQueue ${queueName} (Service Bus disabled)`);
      return undefined;
    }

    const receiver = this.sbClient.createReceiver(queueName, {
      receiveMode: 'peekLock'
    });

    receiver.subscribe({
      processMessage: async (message) => {
        try {
          await messageHandler(message);
          await receiver.completeMessage(message);
        } catch (error) {
          logger.error(`Error processing message ${message.messageId}:`, error as Error);

          // Increment retry count
          const shouldDeadLetter = await this.incrementEventRetry(String(message.messageId));
          if (shouldDeadLetter) {
            await receiver.deadLetterMessage(message, {
              deadLetterReason: 'Max retries exceeded',
              deadLetterErrorDescription: error instanceof Error ? error.message : 'Unknown error'
            });
          } else {
            await receiver.abandonMessage(message);
          }
        }
      },
      processError: async (error) => {
        logger.error(`Service Bus error for queue ${queueName}:`, error);
        if (errorHandler) {
          await errorHandler(error);
        }
      }
    });

    logger.info(`Subscribed to queue: ${queueName}`);
    return receiver;
  }

  async subscribeToTopic(
    topicName: string,
    subscriptionName: string,
    messageHandler: (message: ServiceBusReceivedMessage) => Promise<void>,
    errorHandler?: (error: any) => Promise<void>
  ): Promise<ServiceBusReceiver | undefined> {
    if (this.disabled || !this.sbClient) {
      logger.debug(`Skipping subscribeToTopic ${topicName}/${subscriptionName} (Service Bus disabled)`);
      return undefined;
    }

    // Ensure subscription exists
    await this.createSubscriptionIfNotExists(topicName, subscriptionName);

    const receiver = this.sbClient.createReceiver(topicName, subscriptionName, {
      receiveMode: 'peekLock'
    });

    receiver.subscribe({
      processMessage: async (message) => {
        try {
          await messageHandler(message);
          await receiver.completeMessage(message);
        } catch (error) {
          logger.error(`Error processing message ${message.messageId} from ${topicName}/${subscriptionName}:`, error as Error);

          // Increment retry count
          const shouldDeadLetter = await this.incrementEventRetry(String(message.messageId));
          if (shouldDeadLetter) {
            await receiver.deadLetterMessage(message, {
              deadLetterReason: 'Max retries exceeded',
              deadLetterErrorDescription: error instanceof Error ? error.message : 'Unknown error'
            });
          } else {
            await receiver.abandonMessage(message);
          }
        }
      },
      processError: async (error) => {
        logger.error(`Service Bus error for ${topicName}/${subscriptionName}:`, error);
        if (errorHandler) {
          await errorHandler(error);
        }
      }
    });

    logger.info(`Subscribed to topic: ${topicName}/${subscriptionName}`);
    return receiver;
  }

  private async createSubscriptionIfNotExists(topicName: string, subscriptionName: string): Promise<void> {
    if (this.disabled || !this.adminClient) return;

    try {
      await this.adminClient.createSubscription(topicName, subscriptionName, {
        lockDuration: 'PT5M',
        defaultMessageTimeToLive: 'P7D',
        deadLetteringOnMessageExpiration: true,
        enableBatchedOperations: true
      });
      logger.info(`Created subscription: ${topicName}/${subscriptionName}`);
    } catch (error: any) {
      if (error.code !== 'MessageEntityAlreadyExistsError') {
        throw error;
      }
    }
  }

  // ─── HEALTH MONITORING ──────────────────────────────────────────────────────

  async getQueueStats(queueName: string): Promise<{
    activeMessageCount: number;
    deadLetterMessageCount: number;
    scheduledMessageCount: number;
    transferMessageCount: number;
  } | undefined> {
    if (this.disabled || !this.adminClient) return undefined;

    const runtimeProperties = await this.adminClient.getQueueRuntimeProperties(queueName);
    return {
      activeMessageCount: runtimeProperties.activeMessageCount,
      deadLetterMessageCount: runtimeProperties.deadLetterMessageCount,
      scheduledMessageCount: runtimeProperties.scheduledMessageCount,
      transferMessageCount: runtimeProperties.transferMessageCount
    };
  }

  async getTopicStats(topicName: string): Promise<{
    subscriptionCount: number;
    scheduledMessageCount: number;
  } | undefined> {
    if (this.disabled || !this.adminClient) return undefined;

    const runtimeProperties = await this.adminClient.getTopicRuntimeProperties(topicName);
    return {
      subscriptionCount: runtimeProperties.subscriptionCount || 0,
      scheduledMessageCount: runtimeProperties.scheduledMessageCount
    };
  }

  // ─── CLEANUP ────────────────────────────────────────────────────────────────

  async close(): Promise<void> {
    if (this.sbClient) {
      await this.sbClient.close();
    }
    logger.info('Azure Service Bus client closed');
  }
}

// ─── EVENT PUBLISHER UTILITY ─────────────────────────────────────────────────

export class EventPublisher {
  private static instance: EventPublisher;
  private sbClient: AzureServiceBusClient;

  private constructor() {
    this.sbClient = AzureServiceBusClient.getInstance();
  }

  static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.sbClient.publishEvent(event);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    await this.sbClient.publishEvents(events);
  }

  // Helper methods for common events
  async publishUserCreated(userData: {
    userId: string;
    userType: string;
    email: string;
    name: string;
    correlationId: string;
    source: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: DomainEvent = {
      id: uuidv4(),
      eventType: 'UserCreated',
      aggregateId: userData.userId,
      aggregateType: 'User',
      timestamp: new Date().toISOString(),
      correlationId: userData.correlationId,
      userId: userData.userId,
      userType: userData.userType,
      source: userData.source,
      version: 1,
      metadata: {
        complianceFlags: ['gdpr', userData.userType === 'athlete' ? 'coppa' : undefined].filter(Boolean) as string[],
        priority: 'high',
        idempotencyKey: crypto.randomUUID()
      },
      payload: {
        userId: userData.userId,
        userType: userData.userType as any,
        email: userData.email,
        name: userData.name,
        metadata: userData.metadata as any
      }
    };

    await this.publish(event);
  }

  async publishLoginAttempted(loginData: {
    email: string;
    userType: string;
    ipAddress: string;
    userAgent: string;
    correlationId: string;
    source: string;
    deviceFingerprint?: string;
    location?: any;
  }): Promise<void> {
    const event: DomainEvent = {
      id: uuidv4(),
      eventType: 'LoginAttempted',
      aggregateId: loginData.email, // Use email as aggregate for login attempts
      aggregateType: 'LoginAttempt',
      timestamp: new Date().toISOString(),
      correlationId: loginData.correlationId,
      source: loginData.source,
      version: 1,
      metadata: {
        priority: 'high',
        ttl: 3600, // 1 hour
        idempotencyKey: crypto.randomUUID()
      },
      payload: {
        email: loginData.email,
        userType: loginData.userType,
        ipAddress: loginData.ipAddress,
        userAgent: loginData.userAgent,
        deviceFingerprint: loginData.deviceFingerprint,
        location: loginData.location
      }
    };

    await this.publish(event);
  }
}

export const eventPublisher = EventPublisher.getInstance();
export const serviceBusClient = AzureServiceBusClient.getInstance();