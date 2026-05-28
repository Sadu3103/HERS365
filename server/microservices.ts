/**
 * MICROSERVICES ARCHITECTURE
 * Bounded contexts and service definitions for event-driven architecture
 */

import express, { Request, Response, NextFunction } from 'express';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { eventPublisher, serviceBusClient } from './service-bus';
import { DomainEvent } from './events';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

// ─── BASE SERVICE CLASS ───────────────────────────────────────────────────────

export abstract class Microservice {
  protected app: express.Application;
  protected serviceName: string;
  protected serviceId: string;
  protected port: number;
  protected receivers: any[] = [];

  constructor(serviceName: string, port: number) {
    this.serviceName = serviceName;
    this.serviceId = uuidv4();
    this.port = port;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupEventHandlers();
    this.setupHealthChecks();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request correlation ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
      req.correlationId = correlationId;
      res.setHeader('x-correlation-id', correlationId);
      next();
    });

    // Idempotency middleware
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      if (idempotencyKey) {
        (req as any).idempotencyKey = idempotencyKey;
      }
      next();
    });
  }

  protected abstract setupRoutes(): void;
  protected abstract setupEventHandlers(): void;

  private setupHealthChecks(): void {
    this.app.get('/health', async (req: Request, res: Response) => {
      const health = await this.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    this.app.get('/ready', async (req: Request, res: Response) => {
      const ready = await this.isReady();
      res.status(ready ? 200 : 503).json({ ready });
    });
  }

  protected abstract getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
  }>;

  protected async isReady(): Promise<boolean> {
    // Check database connectivity, service bus, etc.
    return true;
  }

  async start(): Promise<void> {
    try {
      // Initialize service bus infrastructure
      await serviceBusClient.ensureInfrastructure();

      // Start event subscriptions
      await this.startEventSubscriptions();

      // Start HTTP server
      this.app.listen(this.port, () => {
        logger.info(`${this.serviceName} service started on port ${this.port} (ID: ${this.serviceId})`);
      });

      // Register with service discovery
      await this.registerService();

    } catch (error) {
      logger.error(`Failed to start ${this.serviceName} service:`, error as Error);
      throw error;
    }
  }

  private async registerService(): Promise<void> {
    // Service discovery registration would go here
    // For now, just log the service info
    logger.info(`Registered ${this.serviceName} service: ${this.serviceId}`);
  }

  protected abstract startEventSubscriptions(): Promise<void>;

  async stop(): Promise<void> {
    // Close event receivers
    for (const receiver of this.receivers) {
      await receiver.close();
    }

    logger.info(`${this.serviceName} service stopped`);
  }

  protected async publishEvent(event: DomainEvent): Promise<void> {
    await eventPublisher.publish(event);
  }

  protected async handleEvent(message: ServiceBusReceivedMessage): Promise<void> {
    try {
      const event: DomainEvent = message.body;

      // Add correlation context
      const correlationId = message.correlationId || uuidv4();

      logger.info(`Processing event: ${event.eventType} (${event.id}) [${correlationId}]`);

      await this.processEvent(event);

      logger.info(`Successfully processed event: ${event.eventType} (${event.id})`);

    } catch (error) {
      logger.error(`Error processing event ${message.messageId}:`, error as Error);
      throw error;
    }
  }

  protected abstract processEvent(event: DomainEvent): Promise<void>;
}

// ─── AUTHENTICATION SERVICE ──────────────────────────────────────────────────

export class AuthenticationService extends Microservice {
  constructor(port: number = 3001) {
    super('auth-service', port);
  }

  protected setupRoutes(): void {
    // Authentication endpoints
    this.app.post('/login', this.handleLogin.bind(this));
    this.app.post('/refresh', this.handleRefresh.bind(this));
    this.app.post('/logout', this.handleLogout.bind(this));
    this.app.post('/mfa/setup', this.handleMFASetup.bind(this));
    this.app.post('/mfa/verify', this.handleMFAVerify.bind(this));
  }

  protected setupEventHandlers(): void {
    // Handle user-related events
    this.app.post('/events/user-created', this.handleUserCreatedEvent.bind(this));
    this.app.post('/events/user-updated', this.handleUserUpdatedEvent.bind(this));
  }

  protected async startEventSubscriptions(): Promise<void> {
    // Subscribe to user events
    const userReceiver = await serviceBusClient.subscribeToTopic(
      'user-events',
      `auth-service-${this.serviceId}`,
      this.handleEvent.bind(this)
    );
    this.receivers.push(userReceiver);

    // Subscribe to auth-specific queue
    const authReceiver = await serviceBusClient.subscribeToQueue(
      'auth-service-queue',
      this.handleAuthQueueMessage.bind(this)
    );
    this.receivers.push(authReceiver);
  }

  protected async processEvent(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'UserCreated':
        await this.processUserCreated(event);
        break;
      case 'UserUpdated':
        await this.processUserUpdated(event);
        break;
      case 'UserDeleted':
        await this.processUserDeleted(event);
        break;
      default:
        logger.warn(`Unhandled event type: ${event.eventType}`);
    }
  }

  private async handleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, userType } = req.body;
      const correlationId = req.correlationId!;

      // Publish login attempted event
      await eventPublisher.publishLoginAttempted({
        email,
        userType,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown',
        correlationId,
        source: 'auth-service',
        deviceFingerprint: req.body.deviceFingerprint
      });

      // Authentication logic would go here
      // For now, simulate successful login

      const loginSuccessfulEvent: DomainEvent = {
        id: uuidv4(),
        eventType: 'LoginSuccessful',
        aggregateId: email,
        aggregateType: 'Login',
        timestamp: new Date().toISOString(),
        correlationId,
        source: 'auth-service',
        version: 1,
        metadata: {
          priority: 'high',
          complianceFlags: ['gdpr']
        },
        payload: {
          userId: 'user-123',
          userType,
          sessionId: uuidv4(),
          mfaUsed: false,
          ipAddress: req.ip || 'unknown',
          deviceFingerprint: req.body.deviceFingerprint
        }
      };

      await this.publishEvent(loginSuccessfulEvent);

      res.json({
        success: true,
        sessionId: loginSuccessfulEvent.payload.sessionId,
        requiresMFA: false
      });

    } catch (error) {
      logger.error('Login error:', error as Error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }

  private async handleRefresh(req: Request, res: Response): Promise<void> {
    // Token refresh logic
    res.json({ success: true, message: 'Token refreshed' });
  }

  private async handleLogout(req: Request, res: Response): Promise<void> {
    // Logout logic
    res.json({ success: true, message: 'Logged out' });
  }

  private async handleMFASetup(req: Request, res: Response): Promise<void> {
    // MFA setup logic
    res.json({ success: true, message: 'MFA setup initiated' });
  }

  private async handleMFAVerify(req: Request, res: Response): Promise<void> {
    // MFA verification logic
    res.json({ success: true, message: 'MFA verified' });
  }

  private async handleUserCreatedEvent(req: Request, res: Response): Promise<void> {
    // Handle user created event via HTTP webhook
    const event: DomainEvent = req.body;
    await this.processUserCreated(event);
    res.json({ success: true });
  }

  private async handleUserUpdatedEvent(req: Request, res: Response): Promise<void> {
    // Handle user updated event via HTTP webhook
    const event: DomainEvent = req.body;
    await this.processUserUpdated(event);
    res.json({ success: true });
  }

  private async handleAuthQueueMessage(message: ServiceBusReceivedMessage): Promise<void> {
    // Handle auth-specific messages from queue
    await this.handleEvent(message);
  }

  private async processUserCreated(event: DomainEvent): Promise<void> {
    // Update auth service state based on user creation
    logger.info(`Processing user created: ${event.payload.userId}`);
  }

  private async processUserUpdated(event: DomainEvent): Promise<void> {
    // Update auth service state based on user update
    logger.info(`Processing user updated: ${event.payload.userId}`);
  }

  private async processUserDeleted(event: DomainEvent): Promise<void> {
    // Handle user deletion - revoke sessions, tokens, etc.
    logger.info(`Processing user deleted: ${event.payload.userId}`);
  }

  protected async getHealthStatus() {
    return {
      status: 'healthy' as const,
      checks: {
        database: { status: 'ok', responseTime: 10 },
        servicebus: { status: 'ok', responseTime: 5 }
      }
    };
  }
}

// ─── USER MANAGEMENT SERVICE ─────────────────────────────────────────────────

export class UserManagementService extends Microservice {
  constructor(port: number = 3002) {
    super('user-service', port);
  }

  protected setupRoutes(): void {
    this.app.post('/users', this.handleCreateUser.bind(this));
    this.app.put('/users/:id', this.handleUpdateUser.bind(this));
    this.app.delete('/users/:id', this.handleDeleteUser.bind(this));
    this.app.get('/users/:id', this.handleGetUser.bind(this));
  }

  protected setupEventHandlers(): void {
    // Handle auth-related events
    this.app.post('/events/login-successful', this.handleLoginSuccessful.bind(this));
  }

  protected async startEventSubscriptions(): Promise<void> {
    // Subscribe to auth events
    const authReceiver = await serviceBusClient.subscribeToTopic(
      'auth-events',
      `user-service-${this.serviceId}`,
      this.handleEvent.bind(this)
    );
    this.receivers.push(authReceiver);

    // Subscribe to user-specific queue
    const userReceiver = await serviceBusClient.subscribeToQueue(
      'user-service-queue',
      this.handleUserQueueMessage.bind(this)
    );
    this.receivers.push(userReceiver);
  }

  protected async processEvent(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'LoginSuccessful':
        await this.processLoginSuccessful(event);
        break;
      default:
        logger.warn(`Unhandled event type: ${event.eventType}`);
    }
  }

  private async handleCreateUser(req: Request, res: Response): Promise<void> {
    // Create user logic
    res.json({ success: true, message: 'User created' });
  }

  private async handleUpdateUser(req: Request, res: Response): Promise<void> {
    // Update user logic
    res.json({ success: true, message: 'User updated' });
  }

  private async handleDeleteUser(req: Request, res: Response): Promise<void> {
    // Delete user logic
    res.json({ success: true, message: 'User deleted' });
  }

  private async handleGetUser(req: Request, res: Response): Promise<void> {
    // Get user logic
    res.json({ success: true, user: { id: req.params.id } });
  }

  private async handleLoginSuccessful(req: Request, res: Response): Promise<void> {
    const event: DomainEvent = req.body;
    await this.processLoginSuccessful(event);
    res.json({ success: true });
  }

  private async handleUserQueueMessage(message: ServiceBusReceivedMessage): Promise<void> {
    await this.handleEvent(message);
  }

  private async processLoginSuccessful(event: DomainEvent): Promise<void> {
    // Update last login timestamp, etc.
    logger.info(`Processing login successful: ${event.payload.userId}`);
  }

  protected async getHealthStatus() {
    return {
      status: 'healthy' as const,
      checks: {
        database: { status: 'ok', responseTime: 8 },
        servicebus: { status: 'ok', responseTime: 3 }
      }
    };
  }
}

// ─── SERVICE ORCHESTRATOR ────────────────────────────────────────────────────

export class ServiceOrchestrator {
  private services: Microservice[] = [];
  private serviceDiscovery: Map<string, Microservice> = new Map();

  async startServices(): Promise<void> {
    logger.info('Starting microservices...');

    // Initialize services
    const authService = new AuthenticationService(3001);
    const userService = new UserManagementService(3002);

    this.services = [authService, userService];
    this.serviceDiscovery.set('auth-service', authService);
    this.serviceDiscovery.set('user-service', userService);

    // Start all services
    await Promise.all(this.services.map(service => service.start()));

    logger.info('All microservices started successfully');
  }

  async stopServices(): Promise<void> {
    logger.info('Stopping microservices...');

    await Promise.all(this.services.map(service => service.stop()));

    logger.info('All microservices stopped');
  }

  getService(serviceName: string): Microservice | undefined {
    return this.serviceDiscovery.get(serviceName);
  }

  getAllServices(): Microservice[] {
    return this.services;
  }
}

export const serviceOrchestrator = new ServiceOrchestrator();